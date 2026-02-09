// apps/api/src/posts/posts.service.ts
import { Injectable, NotFoundException, ForbiddenException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Post,
  Prisma,
  PostType,
  ModerationStatus,
  ResourceType,
  MemberStatus,
  Role
} from '@prisma/client';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsFilterDto } from './dto/posts-filter.dto';
import { AiService } from '../ai/ai.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppLoggerService } from '../common/logging';

// ========================================
// 🆕 NEW INTERFACES FOR PERSONALIZATION
// ========================================

interface FeedWeights {
  recency: number;
  relevance: number;
  engagement: number;
}

interface UserProfile {
  id: string;
  specialization: string[];
  role: string;
  preferences?: any;
  followingIds?: string[];
  interactedPostIds?: string[];
  viewedCategories?: string[];
}

interface PostWithScore {
  id: string;
  title: string;
  content: string;
  summary?: string;
  type: string;
  category: string;
  tags: string[];
  authorId: string;
  upvotes: number;
  downvotes: number;
  views: number;
  createdAt: Date;
  updatedAt: Date;
  score?: number;
  engagementVelocity?: number;
  author?: any;
  _count?: any;
}

export interface EngagementMetrics {
  postId: string;
  last24h: number;
  last7d: number;
  last30d: number;
  velocity: number;
  trend: 'rising' | 'stable' | 'falling';
}

// ========================================
// 🆕 AI PROCESSING MODE CONFIGURATION
// ========================================
/**
 * Defines the AI processing strategy for post creation.
 * - SYNC: All AI operations block the response (highest latency, immediate safety)
 * - HYBRID: Safety checks (PII, Moderation) are sync, enhancements are async (balanced)
 * - ASYNC: All AI operations are async (lowest latency, delayed safety/visibility)
 */
export type PostSaveType = 'SYNC' | 'HYBRID' | 'ASYNC';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);
  private readonly useAi: boolean;
  private readonly postSaveType: PostSaveType;

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    private appLogger: AppLoggerService,
  ) {
    // Check if AI should be enabled
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.useAi = !!(apiKey && apiKey !== 'your-openai-api-key-here');

    // Read AI processing mode from config
    const configuredSaveType = this.configService.get<string>('POST_SAVE_TYPE', 'HYBRID').toUpperCase();
    if (['SYNC', 'HYBRID', 'ASYNC'].includes(configuredSaveType)) {
      this.postSaveType = configuredSaveType as PostSaveType;
    } else {
      this.logger.warn(`Invalid POST_SAVE_TYPE '${configuredSaveType}', defaulting to 'HYBRID'`);
      this.postSaveType = 'HYBRID';
    }

    if (this.useAi) {
      this.logger.log(`AI features enabled for posts. Processing mode: ${this.postSaveType}`);
    } else {
      this.logger.warn('AI features disabled - OpenAI API key not configured');
    }
    this.appLogger.setContext('PostsService');
  }

  // ========================================
  // 🆕 ENHANCED PERSONALIZATION METHODS
  // ========================================

  /**
   * Calculate a comprehensive score for a post based on multiple factors
   */
  private calculatePostScore(
    post: PostWithScore,
    weights: FeedWeights,
    userProfile?: UserProfile,
    engagementVelocity?: number
  ): number {
    // Calculate individual component scores (0-1 range)
    const recencyScore = this.calculateRecencyScore(post.createdAt);
    const relevanceScore = userProfile
      ? this.calculateRelevanceScore(post, userProfile)
      : 0.5; // Default relevance if no user profile
    const engagementScore = this.calculateEngagementScore(
      post,
      engagementVelocity
    );

    // Apply weights to calculate final score
    const weightedScore =
      (weights.recency * recencyScore) +
      (weights.relevance * relevanceScore) +
      (weights.engagement * engagementScore);

    // Add bonus scores for quality indicators
    const qualityBonus = this.calculateQualityBonus(post);

    // Final score (0-100 scale)
    return Math.round((weightedScore + qualityBonus) * 100);
  }

  /**
   * Calculate recency score using exponential decay
   */
  private calculateRecencyScore(createdAt: Date): number {
    const now = new Date();
    const ageInHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    // Exponential decay with half-life of 48 hours
    const halfLife = 48;
    const decayRate = Math.log(2) / halfLife;
    const score = Math.exp(-decayRate * ageInHours);

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate relevance score based on user profile
   */
  private calculateRelevanceScore(
    post: PostWithScore,
    userProfile: UserProfile
  ): number {
    let score = 0;
    let factors = 0;

    // Category match
    if (userProfile.specialization?.includes(post.category)) {
      score += 1;
      factors++;
    }

    // Tag overlap
    const tagOverlap = post.tags.filter(tag =>
      userProfile.specialization?.includes(tag)
    ).length;
    if (post.tags.length > 0) {
      score += tagOverlap / post.tags.length;
      factors++;
    }

    // Author relevance (if user follows the author)
    if (userProfile.followingIds?.includes(post.authorId)) {
      score += 1;
      factors++;
    }

    // Historical interaction pattern
    if (userProfile.viewedCategories?.includes(post.category)) {
      score += 0.5;
      factors++;
    }

    // Professional role alignment
    const roleRelevanceMap: Record<string, string[]> = {
      'THERAPIST': ['CASE_STUDY', 'RESOURCE', 'DISCUSSION'],
      'EDUCATOR': ['RESOURCE', 'DISCUSSION', 'QUESTION'],
      'PARENT': ['QUESTION', 'DISCUSSION', 'RESOURCE'],
      'ORGANIZATION': ['ANNOUNCEMENT', 'RESOURCE', 'CASE_STUDY'],
    };

    if (roleRelevanceMap[userProfile.role]?.includes(post.type)) {
      score += 0.5;
      factors++;
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Calculate engagement score with velocity consideration
   */
  private calculateEngagementScore(
    post: PostWithScore,
    velocity?: number
  ): number {
    // Base engagement metrics
    const totalEngagement = post.upvotes + (post.views / 10);

    // Normalize using logarithmic scale
    const baseScore = Math.log10(totalEngagement + 1) / 4; // Assuming 10,000 as max

    // Apply velocity multiplier if available
    const velocityMultiplier = velocity ? (1 + velocity / 100) : 1;

    // Calculate engagement rate (engagement per view)
    const engagementRate = post.views > 0
      ? (post.upvotes + post.downvotes) / post.views
      : 0;

    // Combine scores
    const score = (baseScore * 0.7 + engagementRate * 0.3) * velocityMultiplier;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate quality bonus for verified authors and high-quality content
   */
  private calculateQualityBonus(post: any): number {
    let bonus = 0;

    // Verified author bonus
    if (post.author?.verificationStatus === 'VERIFIED') {
      bonus += 0.1;
    }

    // Content quality indicators
    if (post.summary && post.summary.length > 100) {
      bonus += 0.05;
    }

    if (post.tags && post.tags.length >= 3) {
      bonus += 0.05;
    }

    // High engagement ratio
    const engagementRatio = post.views > 0
      ? post.upvotes / post.views
      : 0;
    if (engagementRatio > 0.1) {
      bonus += 0.05;
    }

    return bonus;
  }

  /**
   * Calculate engagement velocity for posts
   */
  async calculateEngagementVelocity(
    postId: string,
    timeWindow: '24h' | '7d' | '30d' = '24h'
  ): Promise<EngagementMetrics> {
    const now = new Date();
    const timeWindows = {
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    };

    // Get engagement events within time windows
    const [votes24h, votes7d, votes30d, comments24h, comments7d, views24h] =
      await Promise.all([
        // Votes in last 24h
        this.prisma.vote.count({
          where: {
            postId,
            createdAt: { gte: timeWindows['24h'] },
          },
        }),
        // Votes in last 7 days
        this.prisma.vote.count({
          where: {
            postId,
            createdAt: { gte: timeWindows['7d'] },
          },
        }),
        // Votes in last 30 days
        this.prisma.vote.count({
          where: {
            postId,
            createdAt: { gte: timeWindows['30d'] },
          },
        }),
        // Comments in last 24h
        this.prisma.comment.count({
          where: {
            postId,
            createdAt: { gte: timeWindows['24h'] },
          },
        }),
        // Comments in last 7 days
        this.prisma.comment.count({
          where: {
            postId,
            createdAt: { gte: timeWindows['7d'] },
          },
        }),
        // View events in last 24h (if you track view events)
        this.prisma.postView.count({
          where: {
            postId,
            createdAt: { gte: timeWindows['24h'] },
          },
        }).catch(() => 0), // Fallback if PostView model doesn't exist
      ]);

    // Calculate engagement metrics
    const engagement24h = votes24h + comments24h * 2 + views24h * 0.1;
    const engagement7d = votes7d + comments7d * 2;
    const engagement30d = votes30d;

    // Calculate velocity (rate of change)
    const dailyAverage7d = engagement7d / 7;
    const dailyAverage30d = engagement30d / 30;

    const velocity = engagement24h - dailyAverage7d;
    const velocityPercentage = dailyAverage7d > 0
      ? (velocity / dailyAverage7d) * 100
      : 0;

    // Determine trend
    let trend: 'rising' | 'stable' | 'falling';
    if (velocityPercentage > 20) {
      trend = 'rising';
    } else if (velocityPercentage < -20) {
      trend = 'falling';
    } else {
      trend = 'stable';
    }

    return {
      postId,
      last24h: engagement24h,
      last7d: engagement7d,
      last30d: engagement30d,
      velocity: velocityPercentage,
      trend,
    };
  }

  /**
   * Get posts with engagement velocity metrics
   */
  async getPostsWithVelocity(
    postIds: string[]
  ): Promise<Map<string, EngagementMetrics>> {
    const velocityMap = new Map<string, EngagementMetrics>();

    // Calculate velocity for each post in parallel
    const velocityPromises = postIds.map(async (postId) => {
      const metrics = await this.calculateEngagementVelocity(postId, '24h');
      return { postId, metrics };
    });

    const results = await Promise.all(velocityPromises);

    results.forEach(({ postId, metrics }) => {
      velocityMap.set(postId, metrics);
    });

    return velocityMap;
  }

  /**
   * Find similar users based on interaction patterns
   */
  async findSimilarUsers(
    userId: string,
    limit: number = 10
  ): Promise<string[]> {
    // Get user's interaction history
    const userInteractions = await this.getUserInteractionProfile(userId);

    // Find users with similar specializations and roles
    const similarUsers = await this.prisma.user.findMany({
      where: {
        AND: [
          { id: { not: userId } },
          {
            OR: [
              // Similar specialization
              {
                specialization: {
                  hasSome: userInteractions.specializations,
                },
              },
              // Same role
              { role: userInteractions.role },
            ],
          },
        ],
      },
      select: {
        id: true,
        specialization: true,
        role: true,
      },
      take: 50, // Get more candidates for scoring
    });

    // Score similarity for each user
    const userSimilarityScores = await Promise.all(
      similarUsers.map(async (candidateUser) => {
        const similarity = await this.calculateUserSimilarity(
          userInteractions,
          candidateUser
        );
        return { userId: candidateUser.id, similarity };
      })
    );

    // Sort by similarity and return top N
    return userSimilarityScores
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.userId);
  }

  /**
   * Get user's interaction profile for collaborative filtering
   */
  private async getUserInteractionProfile(userId: string) {
    const [user, interactions, votes, comments] = await Promise.all([
      // User basic info
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          role: true,
          specialization: true,
        },
      }),
      // Posts user interacted with
      this.prisma.post.findMany({
        where: {
          OR: [
            { votes: { some: { userId } } },
            { comments: { some: { authorId: userId } } },
            { bookmarks: { some: { userId } } },
          ],
        },
        select: {
          category: true,
          tags: true,
          type: true,
        },
        take: 100,
      }),
      // User's voting patterns
      this.prisma.vote.findMany({
        where: { userId },
        select: { value: true },
        take: 100,
      }),
      // User's comment count
      this.prisma.comment.count({
        where: { authorId: userId },
      }),
    ]);

    // Aggregate interaction categories and tags
    const categoryFrequency = new Map<string, number>();
    const tagFrequency = new Map<string, number>();
    const typeFrequency = new Map<string, number>();

    interactions.forEach((post) => {
      categoryFrequency.set(
        post.category,
        (categoryFrequency.get(post.category) || 0) + 1
      );

      post.tags.forEach(tag => {
        tagFrequency.set(tag, (tagFrequency.get(tag) || 0) + 1);
      });

      typeFrequency.set(
        post.type,
        (typeFrequency.get(post.type) || 0) + 1
      );
    });

    // Calculate engagement style
    const upvoteRatio = votes.length > 0
      ? votes.filter(v => v.value > 0).length / votes.length
      : 0.5;

    return {
      userId,
      role: user?.role || 'USER',
      specializations: user?.specialization || [],
      preferredCategories: Array.from(categoryFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat]) => cat),
      preferredTags: Array.from(tagFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag]) => tag),
      preferredTypes: Array.from(typeFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type]) => type),
      engagementLevel: votes.length + comments,
      upvoteRatio,
    };
  }

  /**
   * Calculate similarity between two users
   */
  private async calculateUserSimilarity(
    user1Profile: any,
    user2: any
  ): Promise<number> {
    let similarity = 0;
    let factors = 0;

    // Role similarity
    if (user1Profile.role === user2.role) {
      similarity += 0.3;
    }
    factors++;

    // Specialization overlap (Jaccard similarity)
    const spec1 = new Set(user1Profile.specializations);
    const spec2 = new Set(user2.specialization || []);
    const specIntersection = new Set(
      [...spec1].filter(x => spec2.has(x))
    );
    const specUnion = new Set([...spec1, ...spec2]);

    if (specUnion.size > 0) {
      similarity += (specIntersection.size / specUnion.size) * 0.4;
    }
    factors++;

    // Get user2's interaction profile for deeper comparison
    const user2Interactions = await this.prisma.post.findMany({
      where: {
        OR: [
          { votes: { some: { userId: user2.id } } },
          { comments: { some: { authorId: user2.id } } },
        ],
      },
      select: { category: true, tags: true },
      take: 50,
    });

    // Category preference overlap
    const user2Categories = new Set(user2Interactions.map(p => p.category));
    const categoryOverlap = user1Profile.preferredCategories.filter(
      (cat: string) => user2Categories.has(cat)
    ).length;

    if (user1Profile.preferredCategories.length > 0) {
      similarity += (categoryOverlap / user1Profile.preferredCategories.length) * 0.3;
      factors++;
    }

    return similarity / factors;
  }

  /**
   * Get collaborative filtering score for a post
   */
  async getCollaborativeScore(
    post: PostWithScore,
    userId: string,
    similarUsers: string[]
  ): Promise<number> {
    if (similarUsers.length === 0) return 0;

    // Get interactions from similar users
    const similarUserInteractions = await this.prisma.vote.findMany({
      where: {
        postId: post.id,
        userId: { in: similarUsers },
      },
      select: {
        value: true,
        userId: true,
      },
    });

    // Calculate weighted score based on similar user interactions
    let totalScore = 0;
    let totalWeight = 0;

    similarUserInteractions.forEach((interaction, index) => {
      // Weight decreases for less similar users
      const weight = 1 - (index / similarUsers.length) * 0.5;
      totalScore += interaction.value * weight;
      totalWeight += weight;
    });

    // Normalize score to 0-1 range
    const collaborativeScore = totalWeight > 0
      ? totalScore / totalWeight
      : 0;

    return Math.max(0, Math.min(1, collaborativeScore));
  }

  /**
   * Get user profile for personalization
   */
  private async getUserProfile(userId: string): Promise<UserProfile> {
    const [user, following, interactions, viewHistory] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          specialization: true,
          preferences: true,
        },
      }),
      this.prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      }),
      this.prisma.post.findMany({
        where: {
          OR: [
            { votes: { some: { userId } } },
            { bookmarks: { some: { userId } } },
          ],
        },
        select: { id: true, category: true },
        take: 50,
      }),
      // If you have a PostView model
      this.prisma.postView.findMany({
        where: { userId },
        select: { post: { select: { category: true } } },
        take: 100,
        orderBy: { createdAt: 'desc' },
      }).catch(() => []), // Fallback if PostView doesn't exist
    ]);

    const viewedCategories = new Set<string>();
    interactions.forEach(post => viewedCategories.add(post.category));
    (viewHistory as Array<{ post: { category: string } }>).forEach(view => viewedCategories.add(view.post.category));

    return {
      id: userId,
      role: user?.role || 'USER',
      specialization: user?.specialization || [],
      preferences: user?.preferences,
      followingIds: following.map(f => f.followingId),
      interactedPostIds: interactions.map(p => p.id),
      viewedCategories: Array.from(viewedCategories),
    };
  }

  /**
   * Helper to get date for time range
   */
  private getTimeRangeDate(timeRange: string): Date {
    const now = new Date();
    switch (timeRange) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(0); // All time
    }
  }

  /**
   * Get personalized feed with all scoring algorithms applied
   */
  async getPersonalizedFeed(
    userId: string,
    filters: any,
    weights: FeedWeights = { recency: 0.3, relevance: 0.4, engagement: 0.3 }
  ) {
    const {
      page = 1,
      limit = 10,
      categories = [],
      types = [],
      tags = [],
      timeRange,
      verifiedOnly,
      minEngagement,
      excludeTopics = [],
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.PostWhereInput = {
      isPublished: true,
      ...(categories.length > 0 && { category: { in: categories } }),
      ...(types.length > 0 && { type: { in: types } }),
      ...(tags.length > 0 && { tags: { hasSome: tags } }),
      ...(verifiedOnly && {
        author: { verificationStatus: 'VERIFIED' },
      }),
      ...(minEngagement && { upvotes: { gte: minEngagement } }),
      ...(excludeTopics.length > 0 && {
        NOT: {
          OR: [
            { tags: { hasSome: excludeTopics } },
            { category: { in: excludeTopics } },
          ],
        },
      }),
      ...(timeRange && {
        createdAt: {
          gte: this.getTimeRangeDate(timeRange),
        },
      }),
    };

    // Get initial post set
    const posts = await this.prisma.post.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            verificationStatus: true,
          },
        },
        _count: {
          select: {
            comments: true,
            bookmarks: true,
            votes: true,
          },
        },
      },
      take: limit * 3, // Get more posts for scoring
    });

    // Get user profile for personalization
    const userProfile = await this.getUserProfile(userId);

    // Find similar users for collaborative filtering
    const similarUsers = await this.findSimilarUsers(userId, 5);

    // Get engagement velocity for all posts
    const postIds = posts.map(p => p.id);
    const velocityMap = await this.getPostsWithVelocity(postIds);

    // Score and rank posts
    const scoredPosts = await Promise.all(
      posts.map(async (post) => {
        const velocity = velocityMap.get(post.id);
        const collaborativeScore = await this.getCollaborativeScore(
          post as unknown as PostWithScore,
          userId,
          similarUsers
        );

        const baseScore = this.calculatePostScore(
          post as unknown as PostWithScore,
          weights,
          userProfile,
          velocity?.velocity
        );

        // Add collaborative filtering bonus
        const finalScore = baseScore + (collaborativeScore * 10);

        return {
          ...post,
          score: finalScore,
          engagementVelocity: velocity,
        };
      })
    );

    // Sort by score and paginate
    const sortedPosts = scoredPosts
      .sort((a, b) => b.score - a.score)
      .slice(skip, skip + limit);

    // Get total count for pagination
    const total = await this.prisma.post.count({ where });

    return {
      posts: sortedPosts,
      total,
      page,
      pages: Math.ceil(total / limit),
      hasMore: skip + limit < total,
      meta: {
        scoringWeights: weights,
        similarUsersCount: similarUsers.length,
      },
    };
  }

  // ========================================
  // POST CREATION WITH CONFIGURABLE AI MODE
  // ========================================

  async create(userId: string, createPostDto: CreatePostDto): Promise<Post> {
    try {
      // COMMUNITY VALIDATION - If communityId is provided, validate membership
      if (createPostDto.communityId) {
        this.logger.debug(`Validating community membership for user ${userId} in community ${createPostDto.communityId}`);

        const membership = await this.prisma.communityMember.findUnique({
          where: {
            userId_communityId: {
              userId,
              communityId: createPostDto.communityId,
            },
          },
        });

        if (!membership) {
          throw new ForbiddenException('You must be a member of this community to post');
        }

        if (membership.status !== MemberStatus.ACTIVE) {
          throw new ForbiddenException('Your membership is not active. Please wait for approval or contact community moderators');
        }

        this.logger.debug(`Community membership validated for user ${userId}`);
      }

      // Route to appropriate processing mode
      if (!this.useAi) {
        // AI disabled - simple create without any AI processing
        return this.createPostWithoutAi(userId, createPostDto);
      }

      switch (this.postSaveType) {
        case 'SYNC':
          return this.createPostSync(userId, createPostDto);
        case 'HYBRID':
          return this.createPostHybrid(userId, createPostDto);
        case 'ASYNC':
          return this.createPostAsync(userId, createPostDto);
        default:
          // Fallback to HYBRID
          return this.createPostHybrid(userId, createPostDto);
      }
    } catch (error) {
      this.logger.error('Failed to create post:', error);
      throw error;
    }
  }

  // #region NO-AI Mode
  // ========================================
  // NO-AI MODE: Simple post creation
  // ========================================
  private async createPostWithoutAi(userId: string, createPostDto: CreatePostDto): Promise<Post> {
    this.logger.debug('Creating post without AI processing');

    const post = await this.prisma.post.create({
      data: {
        title: createPostDto.title,
        content: createPostDto.content,
        summary: createPostDto.summary,
        type: createPostDto.type ?? PostType.DISCUSSION,
        category: createPostDto.category ?? '',
        tags: createPostDto.tags || [],
        authorId: userId,
        communityId: createPostDto.communityId || null,
        insights: [],
        embedding: [],
        isPublished: true,
        needsReview: false,
        moderationStatus: ModerationStatus.APPROVED,
        moderationNotes: null,
        metadata: {
          aiProcessed: false,
          originalLength: createPostDto.content.length,
          processedLength: createPostDto.content.length,
        } as Prisma.JsonObject,
      },
      include: this.getPostInclude(),
    });

    this.emitPostCreatedEvent(post, userId, createPostDto.communityId);
    return post;
  }
  // #endregion

  // #region SYNC Mode
  // ========================================
  // SYNC MODE: All AI operations are synchronous
  // Highest latency (~15-25s), immediate safety & full data
  // ========================================
  private async createPostSync(userId: string, createPostDto: CreatePostDto): Promise<Post> {
    this.logger.debug('Creating post with SYNC AI processing');
    const start = Date.now();

    // 1. Safety: Redact PII and Moderate Content (Parallel)
    const [redactedContent, moderationResult] = await Promise.all([
      this.aiService.redactSensitiveInfo(createPostDto.content),
      this.aiService.moderateHealthContent(createPostDto.content)
    ]);

    const isSafe = moderationResult.safe;
    const moderationNotes = isSafe ? null : moderationResult.concerns.join('; ');
    const moderationStatus = isSafe ? ModerationStatus.APPROVED : ModerationStatus.PENDING;

    if (!isSafe) {
      this.logger.warn(`Post flagged for review: ${moderationNotes}`);
    }

    // 2. Enhancements (Parallel) - Only if content is safe
    let summary: string | null = createPostDto.summary || null;
    let insights: string[] = [];
    let tags = createPostDto.tags || [];
    let embedding: number[] = [];

    if (isSafe) {
      const [generatedSummary, extractedInsights, aiTags, generatedEmbedding] = await Promise.all([
        redactedContent.length > 500
          ? this.aiService.generatePostSummary(redactedContent, userId, createPostDto.type)
          : Promise.resolve(null),
        this.aiService.extractKeyInsights(redactedContent, userId),
        this.aiService.generateSmartTags(redactedContent, createPostDto.title, userId, createPostDto.type),
        this.aiService.generateEmbedding(`${createPostDto.title} ${redactedContent}`)
      ]);

      summary = generatedSummary || summary;
      insights = extractedInsights;
      embedding = generatedEmbedding;

      // Merge user tags with AI tags
      const userTags = tags.map(t => t.toLowerCase().replace(/\s+/g, '-'));
      const generatedTags = aiTags.map(t => t.toLowerCase().replace(/\s+/g, '-'));
      tags = [...new Set([...userTags, ...generatedTags])].slice(0, 10);
    }

    // 3. Create Post with all AI data
    const post = await this.prisma.post.create({
      data: {
        title: createPostDto.title,
        content: redactedContent,
        summary: summary,
        type: createPostDto.type ?? PostType.DISCUSSION,
        category: createPostDto.category ?? '',
        tags: tags,
        authorId: userId,
        communityId: createPostDto.communityId || null,
        insights: insights,
        embedding: embedding,
        isPublished: isSafe,
        needsReview: !isSafe,
        moderationStatus: moderationStatus,
        moderationNotes: moderationNotes,
        metadata: {
          aiProcessed: true,
          aiProcessingPending: false,
          postSaveType: 'SYNC',
          originalLength: createPostDto.content.length,
          processedLength: redactedContent.length,
          processingTimeMs: Date.now() - start,
          aiGenerated: {
            summary: !!summary && !createPostDto.summary,
            tags: tags.length > (createPostDto.tags?.length || 0),
            insights: insights.length > 0
          }
        } as Prisma.JsonObject,
      },
      include: this.getPostInclude(),
    });

    this.logger.debug(`SYNC mode completed in ${Date.now() - start}ms`);

    // Trigger post-processing asynchronously
    if (isSafe && insights.length > 0) {
      this.suggestResourcesAsync(post.id, insights.join(', '), userId);
    }
    if (embedding.length > 0) {
      this.findAndStoreSimilarPosts(post.id);
    }

    this.emitPostCreatedEvent(post, userId, createPostDto.communityId);
    return post;
  }
  // #endregion

  // #region HYBRID Mode
  // ========================================
  // HYBRID MODE: Safety sync, Enhancements async
  // Balanced latency (~3-5s), immediate safety
  // ========================================
  private async createPostHybrid(userId: string, createPostDto: CreatePostDto): Promise<Post> {
    this.logger.debug('Creating post with HYBRID AI processing');

    // 1. SYNCHRONOUS: Safety checks (PII Redaction + Content Moderation)
    const [redactedContent, moderationResult] = await Promise.all([
      this.aiService.redactSensitiveInfo(createPostDto.content),
      this.aiService.moderateHealthContent(createPostDto.content)
    ]);

    const isSafe = moderationResult.safe;
    const moderationNotes = isSafe ? null : moderationResult.concerns.join('; ');
    const moderationStatus = isSafe ? ModerationStatus.APPROVED : ModerationStatus.PENDING;

    if (!isSafe) {
      this.logger.warn(`Post flagged for review: ${moderationNotes}`);
    }

    // 2. Create Post with safety-processed data (enhancements pending)
    const post = await this.prisma.post.create({
      data: {
        title: createPostDto.title,
        content: redactedContent,
        summary: createPostDto.summary,
        type: createPostDto.type ?? PostType.DISCUSSION,
        category: createPostDto.category ?? '',
        tags: createPostDto.tags || [],
        authorId: userId,
        communityId: createPostDto.communityId || null,
        insights: [],
        embedding: [],
        isPublished: isSafe,
        needsReview: !isSafe,
        moderationStatus: moderationStatus,
        moderationNotes: moderationNotes,
        metadata: {
          aiProcessed: true,
          aiProcessingPending: isSafe, // Enhancements pending only if safe
          postSaveType: 'HYBRID',
          originalLength: createPostDto.content.length,
          processedLength: redactedContent.length,
          aiGenerated: {
            summary: false,
            tags: false,
            insights: false
          }
        } as Prisma.JsonObject,
      },
      include: this.getPostInclude(),
    });

    // 3. ASYNCHRONOUS: Enhancements (only if content is safe)
    if (isSafe) {
      this.processEnhancementsAsync(
        post.id,
        redactedContent,
        createPostDto.title,
        userId,
        createPostDto.type,
        createPostDto.tags || []
      ).catch(err => {
        this.logger.error(`HYBRID async enhancements failed for post ${post.id}:`, err);
      });
    }

    this.emitPostCreatedEvent(post, userId, createPostDto.communityId);
    return post;
  }
  // #endregion

  // #region ASYNC Mode
  // ========================================
  // ASYNC MODE: All AI operations are asynchronous
  // Lowest latency (<1s), delayed safety/visibility
  // ========================================
  private async createPostAsync(userId: string, createPostDto: CreatePostDto): Promise<Post> {
    this.logger.debug('Creating post with ASYNC AI processing');

    // 1. Create Post immediately with RAW content (unpublished, pending moderation)
    const post = await this.prisma.post.create({
      data: {
        title: createPostDto.title,
        content: createPostDto.content, // RAW content
        summary: createPostDto.summary,
        type: createPostDto.type ?? PostType.DISCUSSION,
        category: createPostDto.category ?? '',
        tags: createPostDto.tags || [],
        authorId: userId,
        communityId: createPostDto.communityId || null,
        insights: [],
        embedding: [],
        isPublished: false, // NOT published until AI moderation
        needsReview: false,
        moderationStatus: ModerationStatus.PENDING,
        moderationNotes: null,
        metadata: {
          aiProcessed: false,
          aiProcessingPending: true, // All AI pending
          postSaveType: 'ASYNC',
          originalLength: createPostDto.content.length,
          processedLength: createPostDto.content.length,
          aiGenerated: {
            summary: false,
            tags: false,
            insights: false
          }
        } as Prisma.JsonObject,
      },
      include: this.getPostInclude(),
    });

    // 2. ASYNCHRONOUS: All AI tasks (Safety + Enhancements)
    this.processFullAiAsync(
      post.id,
      createPostDto.content,
      createPostDto.title,
      userId,
      createPostDto.type,
      createPostDto.tags || []
    ).catch(err => {
      this.logger.error(`ASYNC AI processing failed for post ${post.id}:`, err);
    });

    this.emitPostCreatedEvent(post, userId, createPostDto.communityId);
    return post;
  }
  // #endregion

  // #region Shared Helpers
  // ========================================
  // SHARED HELPERS
  // ========================================
  private getPostInclude() {
    return {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          verificationStatus: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
        },
      },
      _count: {
        select: {
          comments: true,
          votes: true,
          bookmarks: true,
        },
      },
    };
  }

  private emitPostCreatedEvent(post: Post, userId: string, communityId?: string) {
    this.logger.log(`Post created successfully: ${post.id}${communityId ? ` in community ${communityId}` : ''}`);
    this.eventEmitter.emit('post.created', {
      postId: post.id,
      authorId: userId,
      communityId: communityId,
      title: post.title,
      type: post.type,
    });
  }
  // #endregion

  /**
   * Process ALL AI tasks in the background (Safety + Enhancements)
   */
  private async processBackgroundAiTasks(
    postId: string,
    rawContent: string,
    title: string,
    userId: string,
    postType?: PostType,
    initialTags: string[] = []
  ): Promise<void> {
    this.logger.debug(`Starting background AI tasks (Safety + Enhancements) for post ${postId}`);
    const start = Date.now();

    try {
      // ---------------------------------------------------------
      // 1. CRITICAL SAFETY CHECKS (Async)
      // ---------------------------------------------------------
      const [redactedContent, moderationResult] = await Promise.all([
        this.aiService.redactSensitiveInfo(rawContent),
        this.aiService.moderateHealthContent(rawContent)
      ]);

      const isSafe = moderationResult.safe;
      const moderationNotes = isSafe ? null : moderationResult.concerns.join('; ');
      const moderationStatus = isSafe ? ModerationStatus.APPROVED : ModerationStatus.PENDING; // Keep pending if unsafe, waiting for manual review

      // Update DB with safety results immediately
      await this.prisma.post.update({
        where: { id: postId },
        data: {
          content: redactedContent, // REPLACE raw content with redacted
          needsReview: !isSafe,
          moderationStatus: moderationStatus,
          moderationNotes: moderationNotes,
          isPublished: isSafe // Publish if safe
        }
      });

      if (!isSafe) {
        this.logger.warn(`Post ${postId} flagged for review: ${moderationNotes}`);
        // Stop processing enhancements if content is unsafe
        return;
      }

      // ---------------------------------------------------------
      // 2. ENHANCEMENTS (Async)
      // ---------------------------------------------------------

      // Use REDACTED content for enhancements
      const contentToProcess = redactedContent;

      const [summary, insights, aiTags, embedding] = await Promise.all([
        // Generate summary
        contentToProcess.length > 500
          ? this.aiService.generatePostSummary(contentToProcess, userId, postType)
          : Promise.resolve(null),

        // Extract insights
        this.aiService.extractKeyInsights(contentToProcess, userId),

        // Generate smart tags
        this.aiService.generateSmartTags(contentToProcess, title, userId, postType),

        // Generate embedding
        this.aiService.generateEmbedding(`${title} ${contentToProcess}`)
      ]);

      // Combine tags
      const userTags = initialTags.map(t => t.toLowerCase().replace(/\s+/g, '-'));
      const generatedTags = aiTags.map(t => t.toLowerCase().replace(/\s+/g, '-'));
      const combinedTags = [...new Set([...userTags, ...generatedTags])].slice(0, 10);

      const now = new Date();

      // Final Update with Enhancements
      await this.prisma.post.update({
        where: { id: postId },
        data: {
          summary: summary || undefined,
          insights: insights,
          tags: combinedTags,
          embedding: embedding,
          metadata: {
            aiProcessed: true,
            aiProcessingPending: false, // Done
            originalLength: rawContent.length,
            processedLength: redactedContent.length,
            aiGenerated: {
              summary: !!summary,
              tags: generatedTags.length > 0,
              insights: insights.length > 0
            },
            processingTimeMs: Date.now() - start,
            processingCompletedAt: now
          } as any
        }
      });

      this.logger.debug(`Background AI tasks completed for post ${postId} in ${Date.now() - start}ms`);

      // Trigger post-processing actions
      if (insights.length > 0) {
        this.suggestResourcesAsync(postId, insights.join(', '), userId);
      }

      if (embedding.length > 0) {
        this.findAndStoreSimilarPosts(postId);
      }

    } catch (error) {
      this.logger.error(`Error in processBackgroundAiTasks for post ${postId}:`, error);
    }
  }

  // #region HYBRID Mode Background Processor
  /**
   * Process only ENHANCEMENTS asynchronously (for HYBRID mode)
   * Safety checks are already completed synchronously
   */
  private async processEnhancementsAsync(
    postId: string,
    redactedContent: string,
    title: string,
    userId: string,
    postType?: PostType,
    initialTags: string[] = []
  ): Promise<void> {
    this.logger.debug(`[HYBRID] Starting async enhancements for post ${postId}`);
    const start = Date.now();

    try {
      const [summary, insights, aiTags, embedding] = await Promise.all([
        redactedContent.length > 500
          ? this.aiService.generatePostSummary(redactedContent, userId, postType)
          : Promise.resolve(null),
        this.aiService.extractKeyInsights(redactedContent, userId),
        this.aiService.generateSmartTags(redactedContent, title, userId, postType),
        this.aiService.generateEmbedding(`${title} ${redactedContent}`)
      ]);

      // Merge tags
      const userTags = initialTags.map(t => t.toLowerCase().replace(/\s+/g, '-'));
      const generatedTags = aiTags.map(t => t.toLowerCase().replace(/\s+/g, '-'));
      const combinedTags = [...new Set([...userTags, ...generatedTags])].slice(0, 10);

      const now = new Date();

      await this.prisma.post.update({
        where: { id: postId },
        data: {
          summary: summary || undefined,
          insights: insights,
          tags: combinedTags,
          embedding: embedding,
          metadata: {
            aiProcessed: true,
            aiProcessingPending: false,
            postSaveType: 'HYBRID',
            processingTimeMs: Date.now() - start,
            processingCompletedAt: now,
            aiGenerated: {
              summary: !!summary,
              tags: generatedTags.length > 0,
              insights: insights.length > 0
            }
          } as any
        }
      });

      this.logger.debug(`[HYBRID] Enhancements completed for post ${postId} in ${Date.now() - start}ms`);

      // Post-processing
      if (insights.length > 0) {
        this.suggestResourcesAsync(postId, insights.join(', '), userId);
      }
      if (embedding.length > 0) {
        this.findAndStoreSimilarPosts(postId);
      }

    } catch (error) {
      this.logger.error(`[HYBRID] Enhancements failed for post ${postId}:`, error);
    }
  }
  // #endregion

  // #region ASYNC Mode Background Processor
  /**
   * Process ALL AI tasks asynchronously (for ASYNC mode)
   * Safety checks + Enhancements
   */
  private async processFullAiAsync(
    postId: string,
    rawContent: string,
    title: string,
    userId: string,
    postType?: PostType,
    initialTags: string[] = []
  ): Promise<void> {
    this.logger.debug(`[ASYNC] Starting full AI processing for post ${postId}`);
    const start = Date.now();

    try {
      // 1. Safety Checks
      const [redactedContent, moderationResult] = await Promise.all([
        this.aiService.redactSensitiveInfo(rawContent),
        this.aiService.moderateHealthContent(rawContent)
      ]);

      const isSafe = moderationResult.safe;
      const moderationNotes = isSafe ? null : moderationResult.concerns.join('; ');
      const moderationStatus = isSafe ? ModerationStatus.APPROVED : ModerationStatus.PENDING;

      // Update with safety results
      await this.prisma.post.update({
        where: { id: postId },
        data: {
          content: redactedContent,
          needsReview: !isSafe,
          moderationStatus: moderationStatus,
          moderationNotes: moderationNotes,
          isPublished: isSafe
        }
      });

      if (!isSafe) {
        this.logger.warn(`[ASYNC] Post ${postId} flagged for review: ${moderationNotes}`);
        return; // Stop if unsafe
      }

      // 2. Enhancements (only if safe)
      const [summary, insights, aiTags, embedding] = await Promise.all([
        redactedContent.length > 500
          ? this.aiService.generatePostSummary(redactedContent, userId, postType)
          : Promise.resolve(null),
        this.aiService.extractKeyInsights(redactedContent, userId),
        this.aiService.generateSmartTags(redactedContent, title, userId, postType),
        this.aiService.generateEmbedding(`${title} ${redactedContent}`)
      ]);

      // Merge tags
      const userTags = initialTags.map(t => t.toLowerCase().replace(/\s+/g, '-'));
      const generatedTags = aiTags.map(t => t.toLowerCase().replace(/\s+/g, '-'));
      const combinedTags = [...new Set([...userTags, ...generatedTags])].slice(0, 10);

      const now = new Date();

      // Final update with all AI data
      await this.prisma.post.update({
        where: { id: postId },
        data: {
          summary: summary || undefined,
          insights: insights,
          tags: combinedTags,
          embedding: embedding,
          metadata: {
            aiProcessed: true,
            aiProcessingPending: false,
            postSaveType: 'ASYNC',
            originalLength: rawContent.length,
            processedLength: redactedContent.length,
            processingTimeMs: Date.now() - start,
            processingCompletedAt: now,
            aiGenerated: {
              summary: !!summary,
              tags: generatedTags.length > 0,
              insights: insights.length > 0
            }
          } as any
        }
      });

      this.logger.debug(`[ASYNC] Full AI processing completed for post ${postId} in ${Date.now() - start}ms`);

      // Post-processing
      if (insights.length > 0) {
        this.suggestResourcesAsync(postId, insights.join(', '), userId);
      }
      if (embedding.length > 0) {
        this.findAndStoreSimilarPosts(postId);
      }

    } catch (error) {
      this.logger.error(`[ASYNC] Full AI processing failed for post ${postId}:`, error);
    }
  }
  // #endregion

  // Async method to suggest resources (runs in background)
  private async suggestResourcesAsync(postId: string, topic: string, userId: string): Promise<void> {
    try {
      const resources = await this.aiService.suggestResources(topic, userId);

      if (resources.length > 0) {
        await this.prisma.resource.createMany({
          data: resources.map(resource => ({
            postId,
            title: resource.title,
            source: resource.source,
            url: resource.url,
            type: 'ARTICLE', // Default type, could be mapped from resource.type
            relevance: resource.relevance,
          })),
        });
        this.logger.debug(`Added ${resources.length} suggested resources to post ${postId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to suggest resources for post ${postId}:`, error);
    }
  }

  // Async method to find similar posts
  private async findAndStoreSimilarPosts(postId: string): Promise<void> {
    try {
      const similarPosts = await this.aiService.findSimilarPosts(postId, 5);

      if (similarPosts.length > 0) {
        await this.prisma.similarPost.createMany({
          data: similarPosts
            .filter(sp => sp.similarity > 0.7) // Only store high similarity matches
            .map(sp => ({
              originalPostId: postId,
              relatedPostId: sp.postId,
              similarity: sp.similarity,
              reason: `Content similarity: ${(sp.similarity * 100).toFixed(1)}%`,
            })),
          skipDuplicates: true,
        });
        this.logger.debug(`Found ${similarPosts.length} similar posts for ${postId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to find similar posts for ${postId}:`, error);
    }
  }

  async findAll(filter: PostsFilterDto) {
    const {
      page = 1,
      limit = 10,
      category,
      type,
      authorId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      tags,
      communityId, // ADD COMMUNITY FILTER
    } = filter;

    const skip = (page - 1) * limit;

    const where: Prisma.PostWhereInput = {
      isPublished: true,
      ...(category && { category }),
      ...(type && { type }),
      ...(authorId && { authorId }),
      ...(communityId && { communityId }), // ADD COMMUNITY FILTER
      ...(tags && { tags: { hasSome: tags } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
          { summary: { contains: search, mode: 'insensitive' } },
          { tags: { has: search } },
        ],
      }),
    };

    const orderBy: Prisma.PostOrderByWithRelationInput = {};

    if (sortBy === 'upvotes') {
      orderBy.upvotes = sortOrder as Prisma.SortOrder;
    } else if (sortBy === 'views') {
      orderBy.views = { _count: sortOrder as Prisma.SortOrder };
    } else if (sortBy === 'comments') {
      orderBy.comments = { _count: sortOrder as Prisma.SortOrder };
    } else {
      orderBy.createdAt = sortOrder as Prisma.SortOrder;
    }

    // Add pinned posts first
    const [pinnedPosts, regularPosts, total] = await Promise.all([
      // Get pinned posts
      this.prisma.post.findMany({
        where: { ...where, isPinned: true },
        take: 2, // Limit pinned posts
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
              verificationStatus: true,
              specialization: true,
            },
          },
          community: { // ADD COMMUNITY TO RESPONSE
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              comments: true,
              votes: true,
              bookmarks: true,
            },
          },
        },
      }),
      // Get regular posts
      this.prisma.post.findMany({
        where: { ...where, isPinned: false },
        skip,
        take: limit - 2, // Adjust for pinned posts
        orderBy,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
              verificationStatus: true,
              specialization: true,
            },
          },
          community: { // ADD COMMUNITY TO RESPONSE
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              comments: true,
              votes: true,
              bookmarks: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    // Combine pinned and regular posts
    const posts = page === 1 ? [...pinnedPosts, ...regularPosts] : regularPosts;

    return {
      data: posts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  async findOne(id: string, userId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            verificationStatus: true,
            specialization: true,
            organization: true,
          },
        },
        community: { // ADD COMMUNITY TO POST DETAIL
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            icon: true,
          },
        },
        comments: {
          where: { parentId: null },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true,
                verificationStatus: true,
              },
            },
            replies: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                    role: true,
                    verificationStatus: true,
                  },
                },
              },
            },
            _count: {
              select: { votes: true },
            },
          },
        },
        resources: {
          orderBy: { relevance: 'desc' },
          take: 5,
        },
        similarPosts: {
          take: 3,
          orderBy: { similarity: 'desc' },
          include: {
            relatedPost: {
              select: {
                id: true,
                title: true,
                category: true,
                author: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        votes: userId ? {
          where: { userId },
          select: { value: true },
        } : false,
        bookmarks: userId ? {
          where: { userId },
          select: { id: true },
        } : false,
        _count: {
          select: {
            comments: true,
            votes: true,
            bookmarks: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if post needs moderation (admin/moderator only)
    if (post.needsReview && userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user || !['ADMIN', 'MODERATOR'].includes(user.role)) {
        throw new ForbiddenException('This post is under review');
      }
    }

    // Increment view count
    await this.prisma.post.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    // Track analytics
    if (userId) {
      await this.prisma.analytics.create({
        data: {
          userId,
          postId: id,
          event: 'post_view',
          metadata: {
            timestamp: new Date().toISOString(),
            category: post.category,
            type: post.type,
            communityId: post.communityId, // ADD COMMUNITY TO ANALYTICS
          } as Prisma.JsonObject,
        },
      }).catch(err => this.logger.error('Failed to track analytics:', err));
    }

    // Format response
    const userVote = userId && post.votes && post.votes.length > 0 ? post.votes[0].value : 0;
    const isBookmarked = userId && post.bookmarks && post.bookmarks.length > 0;

    return {
      ...post,
      userVote,
      isBookmarked,
    };
  }

  async update(id: string, userId: string, userRole: string, updatePostDto: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if user can update
    if (post.authorId !== userId && !['ADMIN', 'MODERATOR'].includes(userRole)) {
      throw new ForbiddenException('You can only edit your own posts');
    }

    // If changing community, validate membership
    if (updatePostDto.communityId && updatePostDto.communityId !== post.communityId) {
      const membership = await this.prisma.communityMember.findUnique({
        where: {
          userId_communityId: {
            userId,
            communityId: updatePostDto.communityId,
          },
        },
      });

      if (!membership || membership.status !== MemberStatus.ACTIVE) {
        throw new ForbiddenException('You must be an active member of the target community');
      }
    }

    let processedData: any = { ...updatePostDto };

    // If content is being updated and AI is available, process it
    if (updatePostDto.content && this.useAi) {
      processedData.content = await this.aiService.redactSensitiveInfo(updatePostDto.content);

      // Regenerate summary if content changed significantly
      if (!updatePostDto.summary) {
        processedData.summary = await this.aiService.generatePostSummary(
          processedData.content,
          userId,
          updatePostDto.type || post.type
        );
      }

      // Re-moderate content
      const moderation = await this.aiService.moderateHealthContent(processedData.content);
      if (!moderation.safe) {
        processedData.needsReview = true;
        processedData.moderationStatus = ModerationStatus.PENDING;
        processedData.moderationNotes = moderation.concerns.join('; ');
      }

      // Update embedding
      processedData.embedding = await this.aiService.generateEmbedding(
        `${updatePostDto.title || post.title} ${processedData.content}`
      );
    }

    return this.prisma.post.update({
      where: { id },
      data: processedData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            verificationStatus: true,
          },
        },
        community: { // INCLUDE COMMUNITY IN UPDATE RESPONSE
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            comments: true,
            votes: true,
            bookmarks: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string, userRole: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if user can delete
    if (post.authorId !== userId && !['ADMIN', 'MODERATOR'].includes(userRole)) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    // Log moderation action if deleted by moderator/admin
    if (post.authorId !== userId) {
      await this.prisma.moderationLog.create({
        data: {
          moderatorId: userId,
          userId: post.authorId,
          action: 'delete',
          targetType: 'post',
          targetId: id,
          reason: 'Deleted by moderator/admin',
        },
      });
    }

    await this.prisma.post.delete({
      where: { id },
    });

    return { message: 'Post deleted successfully' };
  }

  // NEW METHOD: Get posts for a specific community
  async getCommunityPosts(communityId: string, query: any) {
    const { page = 1, limit = 10, sort = 'recent' } = query;

    const skip = (page - 1) * limit;

    // Build the where clause
    const where: Prisma.PostWhereInput = {
      communityId,
      isPublished: true,
    };

    // Build the orderBy clause
    let orderBy: any = {};
    switch (sort) {
      case 'popular':
        orderBy = { upvotes: 'desc' };
        break;
      case 'trending':
        orderBy = [
          { viewCount: 'desc' },
          { upvotes: 'desc' },
          { createdAt: 'desc' },
        ];
        break;
      case 'recent':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    // Get posts with pagination
    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
              verificationStatus: true,
            },
          },
          community: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              comments: true,
              bookmarks: true,
              votes: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      posts: posts.map(post => ({
        ...post,
        commentCount: post._count.comments,
        bookmarkCount: post._count.bookmarks,
        voteCount: post._count.votes,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
      hasMore: skip + posts.length < total,
    };
  }

  // Rest of the methods remain the same...
  async togglePin(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return this.prisma.post.update({
      where: { id },
      data: { isPinned: !post.isPinned },
    });
  }

  async toggleLock(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return this.prisma.post.update({
      where: { id },
      data: { isLocked: !post.isLocked },
    });
  }

  async togglePublish(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return this.prisma.post.update({
      where: { id },
      data: { isPublished: !post.isPublished },
    });
  }

  async getCategories() {
    const categories = await this.prisma.post.findMany({
      where: { isPublished: true },
      select: { category: true },
      distinct: ['category'],
    });

    const categoryCounts = await Promise.all(
      categories.map(async (cat) => {
        const count = await this.prisma.post.count({
          where: { category: cat.category, isPublished: true },
        });
        return { category: cat.category, count };
      })
    );

    return categoryCounts.sort((a, b) => b.count - a.count);
  }

  async getTrendingTags(limit: number = 10) {
    const posts = await this.prisma.post.findMany({
      where: { isPublished: true },
      select: { tags: true },
    });

    const tagCount: Record<string, number> = {};
    posts.forEach(post => {
      post.tags.forEach(tag => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCount)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async getUserPosts(userId: string, currentUserId?: string) {
    const isOwnProfile = userId === currentUserId;

    return this.prisma.post.findMany({
      where: {
        authorId: userId,
        ...(isOwnProfile ? {} : { isPublished: true }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            verificationStatus: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            comments: true,
            votes: true,
            bookmarks: true,
          },
        },
      },
    });
  }

  async getBookmarkedPosts(userId: string) {
    const bookmarks = await this.prisma.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                verificationStatus: true,
              },
            },
            community: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            _count: {
              select: {
                comments: true,
                votes: true,
                bookmarks: true,
              },
            },
          },
        },
      },
    });

    return bookmarks.map(bookmark => bookmark.post);
  }

  async getStatistics() {
    const [
      totalPosts,
      publishedPosts,
      pendingReview,
      postsByType,
      topCategories,
      topAuthors,
      aiProcessedPosts,
      communityPosts,
    ] = await Promise.all([
      this.prisma.post.count(),
      this.prisma.post.count({ where: { isPublished: true } }),
      this.prisma.post.count({ where: { needsReview: true } }),
      this.prisma.post.groupBy({
        by: ['type'],
        _count: true,
      }),
      this.prisma.post.groupBy({
        by: ['category'],
        _count: true,
        orderBy: { _count: { category: 'desc' } },
        take: 5,
      }),
      this.prisma.post.groupBy({
        by: ['authorId'],
        _count: true,
        orderBy: { _count: { authorId: 'desc' } },
        take: 5,
      }),
      this.prisma.post.count({
        where: {
          NOT: { embedding: { equals: [] } }
        }
      }),
      this.prisma.post.count({
        where: {
          NOT: { communityId: null }
        }
      }),
    ]);

    // Get author details for top authors
    const topAuthorsWithDetails = await Promise.all(
      topAuthors.map(async (author) => {
        const user = await this.prisma.user.findUnique({
          where: { id: author.authorId },
          select: { id: true, name: true, email: true, role: true },
        });
        return {
          ...user,
          postCount: author._count,
        };
      })
    );

    return {
      totalPosts,
      publishedPosts,
      draftPosts: totalPosts - publishedPosts,
      pendingReview,
      aiProcessedPosts,
      communityPosts, // ADD COMMUNITY POSTS COUNT
      postsByType: postsByType.map(item => ({
        type: item.type,
        count: item._count,
      })),
      topCategories: topCategories.map(item => ({
        category: item.category,
        count: item._count,
      })),
      topAuthors: topAuthorsWithDetails,
    };
  }

  // Semantic search using embeddings
  async semanticSearch(query: string, limit: number = 10): Promise<any[]> {
    if (!this.useAi) {
      // Fallback to regular text search
      return this.prisma.post.findMany({
        where: {
          isPublished: true,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
            { summary: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit,
        include: {
          author: {
            select: {
              name: true,
              role: true,
            },
          },
          community: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      });
    }

    try {
      // Generate embedding for the search query
      const queryEmbedding = await this.aiService.generateEmbedding(query);

      // Get all posts with embeddings
      const posts = await this.prisma.post.findMany({
        where: {
          isPublished: true,
          NOT: { embedding: { equals: [] } }
        },
        select: {
          id: true,
          title: true,
          summary: true,
          category: true,
          embedding: true,
          communityId: true,
          author: {
            select: {
              name: true,
              role: true,
            },
          },
          community: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      });

      // Calculate similarities
      const postsWithSimilarity = await Promise.all(
        posts.map(async (post) => {
          const similarity = await this.aiService.calculateSimilarity(
            queryEmbedding,
            post.embedding
          );
          return {
            ...post,
            similarity,
            embedding: undefined, // Remove embedding from response
          };
        })
      );

      // Sort by similarity and return top results
      return postsWithSimilarity
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      this.logger.error('Semantic search failed, falling back to text search:', error);

      // Fallback to regular search
      return this.prisma.post.findMany({
        where: {
          isPublished: true,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit,
      });
    }
  }

  // Approve a post that was under review
  async approvePost(postId: string, moderatorId: string): Promise<Post> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (!post.needsReview) {
      throw new ForbiddenException('Post is not pending review');
    }

    // Update post status
    const approvedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        isPublished: true,
        needsReview: false,
        moderationStatus: ModerationStatus.APPROVED,
        moderationNotes: null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Log moderation action
    await this.prisma.moderationLog.create({
      data: {
        moderatorId: moderatorId,
        action: 'approve',
        targetType: 'post',
        targetId: postId,
        reason: '', // No reason provided for approval
        userId: moderatorId,
      },
    });

    this.logger.log(`Post ${postId} approved by moderator ${moderatorId}`);

    return approvedPost;
  }

  // Reject a post under review
  async rejectPost(postId: string, moderatorId: string, reason: string): Promise<Post> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Update post status
    const rejectedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        isPublished: false,
        needsReview: false,
        moderationStatus: ModerationStatus.REJECTED,
        moderationNotes: reason,
      },
    });

    // Log moderation action
    await this.prisma.moderationLog.create({
      data: {
        moderatorId: moderatorId,
        action: 'FLAGGED',
        targetType: 'post',
        targetId: postId,
        reason: reason,
        userId: moderatorId,
      },
    });

    this.logger.log(`Post ${postId} rejected by moderator ${moderatorId}`);

    return rejectedPost;
  }

  // Toggle bookmark for a post
  async toggleBookmark(postId: string, userId: string) {
    // Check if the post exists
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, isPublished: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (!post.isPublished) {
      throw new ForbiddenException('Cannot bookmark unpublished posts');
    }

    // Check if bookmark already exists
    const existingBookmark = await this.prisma.bookmark.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (existingBookmark) {
      // Remove bookmark
      await this.prisma.bookmark.delete({
        where: {
          userId_postId: {
            userId,
            postId,
          },
        },
      });

      // Track analytics
      await this.prisma.analytics.create({
        data: {
          userId,
          postId,
          event: 'bookmark_removed',
          metadata: {
            timestamp: new Date().toISOString(),
          } as Prisma.JsonObject,
        },
      }).catch(err => this.logger.error('Failed to track analytics:', err));

      this.logger.debug(`Bookmark removed for post ${postId} by user ${userId}`);

      return {
        bookmarked: false,
        message: 'Bookmark removed',
      };
    } else {
      // Add bookmark
      await this.prisma.bookmark.create({
        data: {
          userId,
          postId,
        },
      });

      // Track analytics
      await this.prisma.analytics.create({
        data: {
          userId,
          postId,
          event: 'bookmark_added',
          metadata: {
            timestamp: new Date().toISOString(),
          } as Prisma.JsonObject,
        },
      }).catch(err => this.logger.error('Failed to track analytics:', err));

      this.logger.debug(`Bookmark added for post ${postId} by user ${userId}`);

      return {
        bookmarked: true,
        message: 'Post bookmarked',
      };
    }
  }

  // Get trending posts
  async getTrending(period: string = '7d', limit: number = 20) {
    // Calculate date threshold
    let dateThreshold = new Date();
    switch (period) {
      case '24h':
        dateThreshold.setHours(dateThreshold.getHours() - 24);
        break;
      case '7d':
        dateThreshold.setDate(dateThreshold.getDate() - 7);
        break;
      case '30d':
        dateThreshold.setDate(dateThreshold.getDate() - 30);
        break;
      default:
        dateThreshold = new Date(0);
    }

    const posts = await this.prisma.post.findMany({
      where: {
        isPublished: true,
        createdAt: { gte: dateThreshold },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            verificationStatus: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            comments: true,
            bookmarks: true,
          },
        },
      },
      orderBy: [
        { viewCount: 'desc' },
        { upvotes: 'desc' },
      ],
      take: limit,
    });

    // Calculate trending score and return
    return posts.map(post => {
      const ageInHours = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
      const score = (post.upvotes * 2 + post.viewCount * 0.1 + post._count.comments * 3) / Math.pow(ageInHours + 2, 1.5);
      return {
        ...post,
        trendingScore: score,
        commentCount: post._count.comments,
      };
    }).sort((a, b) => b.trendingScore - a.trendingScore);
  }

  // Get questions
  async getQuestions(status: string = 'all', skip = 0, take = 20, sort = 'newest') {
    const where: Prisma.PostWhereInput = {
      type: 'QUESTION',
      isPublished: true,
    };

    if (status === 'answered') {
      where.comments = { some: {} };
    } else if (status === 'unanswered') {
      where.comments = { none: {} };
    }

    const orderBy = sort === 'newest'
      ? { createdAt: 'desc' as const }
      : { upvotes: 'desc' as const };

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
              verificationStatus: true,
            },
          },
          community: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              comments: true,
              bookmarks: true,
            },
          },
        },
        skip,
        take,
        orderBy,
      }),
      this.prisma.post.count({ where }),
    ]);

    // Transform the data to include commentCount at the top level
    const transformedPosts = posts.map(post => ({
      ...post,
      commentCount: post._count.comments,
    }));

    return {
      posts: transformedPosts,
      total,
      page: Math.floor(skip / take) + 1,
      pages: Math.ceil(total / take),
      hasMore: skip + take < total,
    };
  }

  // Get resources
  async getResources(category?: string, skip = 0, take = 20) {
    const where: Prisma.PostWhereInput = {
      type: 'RESOURCE',
      isPublished: true,
    };

    if (category && category !== 'all') {
      where.category = category;
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
              verificationStatus: true,
            },
          },
          community: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              comments: true,
              bookmarks: true,
            },
          },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.post.count({ where }),
    ]);

    // Transform the data
    const transformedPosts = posts.map(post => ({
      ...post,
      commentCount: post._count.comments,
    }));

    return {
      posts: transformedPosts,
      total,
      page: Math.floor(skip / take) + 1,
      pages: Math.ceil(total / take),
      hasMore: skip + take < total,
    };
  }
}