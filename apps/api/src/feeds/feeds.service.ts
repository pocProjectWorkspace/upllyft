// apps/api/src/feeds/feeds.service.ts
import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PersonalizationService } from './personalization.service';
import { FeedAlgorithmService } from './feed-algorithm.service';
import { UserPreferencesService } from './user-preferences.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager'; // Use type import
import { 
  FeedView, 
  InteractionType, 
  PostType,
  ModerationStatus,
  Prisma
} from '@prisma/client';

@Injectable()
export class FeedsService {
  private readonly logger = new Logger(FeedsService.name);

  constructor(
    private prisma: PrismaService,
    private personalization: PersonalizationService,
    private feedAlgorithm: FeedAlgorithmService,
    private preferences: UserPreferencesService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getPersonalizedFeed(
    userId: string,
    options: {
      page: number;
      limit: number;
      view: string;
    }
  ) {
    const { page, limit, view } = options;
    const cacheKey = `feed:${userId}:${view}:${page}:${limit}`;
    
    // Check cache first
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for feed: ${cacheKey}`);
      return cached;
    }

    let result;

    switch (view) {
      case 'FOR_YOU':
        result = await this.feedAlgorithm.generateForYouFeed(userId, page, limit);
        break;
        
      case 'FOLLOWING':
        result = await this.getFollowingFeed(userId, page, limit);
        break;
        
      case 'COMMUNITIES':
        result = await this.getCommunitiesFeed(userId, page, limit);
        break;
        
      case 'BOOKMARKS':
        result = await this.getBookmarksFeed(userId, page, limit);
        break;
        
      case 'TRENDING':
        result = await this.getTrendingFeed(page, limit);
        break;
        
      case 'RECENT':
        result = await this.getRecentFeed(page, limit);
        break;
        
      default:
        result = await this.getRecentFeed(page, limit);
    }

    // Cache the result
    await this.cacheManager.set(cacheKey, result, 300); // 5 minutes
    
    return result;
  }

  async getFilteredFeed(userId: string, filters: any) {
    const {
      page = 1,
      limit = 20,
      categories = [],
      tags = [],
      postTypes = [],
      dateRange,
      minEngagement = 0,
      authorRoles = [],
      excludeKeywords = [],
      languages = [],
      sort = 'relevance',
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      isPublished: true,
      moderationStatus: ModerationStatus.APPROVED,
    };

    // Apply filters
    if (categories.length > 0) {
      where.category = { in: categories };
    }

    if (tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    if (postTypes.length > 0) {
      where.type = { in: postTypes };
    }

    if (dateRange?.from || dateRange?.to) {
      where.createdAt = {};
      if (dateRange.from) where.createdAt.gte = new Date(dateRange.from);
      if (dateRange.to) where.createdAt.lte = new Date(dateRange.to);
    }

    if (authorRoles.length > 0) {
      where.author = { role: { in: authorRoles } };
    }

    if (excludeKeywords.length > 0) {
      where.NOT = excludeKeywords.map(keyword => ({
        OR: [
          { title: { contains: keyword, mode: 'insensitive' } },
          { content: { contains: keyword, mode: 'insensitive' } },
        ],
      }));
    }

    // Calculate engagement score in query
    if (minEngagement > 0) {
      where.OR = [
        { upvotes: { gte: minEngagement } },
        { comments: { _count: { gte: minEngagement } } },
      ];
    }

    // Get posts with user data
    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: this.getSortOrder(sort),
        include: this.getPostIncludes(userId),
      }),
      this.prisma.post.count({ where }),
    ]);

    // Enhance posts with user-specific data
    const enhancedPosts = await this.enhancePostsWithUserData(posts, userId);

    return {
      posts: enhancedPosts,
      total,
      page,
      pages: Math.ceil(total / limit),
      hasMore: page < Math.ceil(total / limit),
      filters,
    };
  }

  async trackInteraction(
    userId: string,
    interaction: {
      postId: string;
      action: string;
      duration?: number;
      scrollDepth?: number;
    }
  ) {
    try {
      // Record interaction
      await this.prisma.feedInteraction.create({
        data: {
          userId,
          postId: interaction.postId,
          action: interaction.action as InteractionType,
          duration: interaction.duration,
          scrollDepth: interaction.scrollDepth,
        },
      });

      // Update user interests asynchronously
      this.personalization.calculateUserInterests(userId).catch(err => {
        this.logger.error('Failed to update user interests', err);
      });

      // Invalidate cache for this user's feed
      const pattern = `feed:${userId}:*`;
      const keys = await this.cacheManager.store.keys(pattern);
      if (keys && keys.length > 0) {
        await Promise.all(keys.map(key => this.cacheManager.del(key)));
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to track interaction', error);
      return { success: false };
    }
  }

  async getAvailableViews(userId: string) {
    // Check which views are available for this user
    const [followingCount, communitiesCount, bookmarksCount] = await Promise.all([
      this.prisma.follow.count({ where: { followerId: userId } }),
      this.prisma.communityMember.count({ 
        where: { 
          userId, 
          status: 'ACTIVE' 
        } 
      }),
      this.prisma.bookmark.count({ where: { userId } }),
    ]);

    return [
      { id: 'FOR_YOU', label: 'For You', available: true },
      { id: 'FOLLOWING', label: 'Following', available: followingCount > 0 },
      { id: 'RECENT', label: 'Recent', available: true },
      { id: 'TRENDING', label: 'Trending', available: true },
      { id: 'COMMUNITIES', label: 'Communities', available: communitiesCount > 0 },
      { id: 'BOOKMARKS', label: 'Bookmarks', available: bookmarksCount > 0 },
    ];
  }

  private async getFollowingFeed(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    // Get followed users
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = following.map(f => f.followingId);

    if (followingIds.length === 0) {
      return { posts: [], total: 0, page, pages: 0, hasMore: false };
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          authorId: { in: followingIds },
          isPublished: true,
          moderationStatus: ModerationStatus.APPROVED,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.getPostIncludes(userId),
      }),
      this.prisma.post.count({
        where: {
          authorId: { in: followingIds },
          isPublished: true,
          moderationStatus: ModerationStatus.APPROVED,
        },
      }),
    ]);

    const enhancedPosts = await this.enhancePostsWithUserData(posts, userId);

    return {
      posts: enhancedPosts,
      total,
      page,
      pages: Math.ceil(total / limit),
      hasMore: page < Math.ceil(total / limit),
    };
  }

  private async getCommunitiesFeed(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    // Get user's communities
    const memberships = await this.prisma.communityMember.findMany({
      where: { 
        userId, 
        status: 'ACTIVE' 
      },
      select: { communityId: true },
    });

    const communityIds = memberships.map(m => m.communityId);

    if (communityIds.length === 0) {
      return { posts: [], total: 0, page, pages: 0, hasMore: false };
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          communityId: { in: communityIds },
          isPublished: true,
          moderationStatus: ModerationStatus.APPROVED,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.getPostIncludes(userId),
      }),
      this.prisma.post.count({
        where: {
          communityId: { in: communityIds },
          isPublished: true,
          moderationStatus: ModerationStatus.APPROVED,
        },
      }),
    ]);

    const enhancedPosts = await this.enhancePostsWithUserData(posts, userId);

    return {
      posts: enhancedPosts,
      total,
      page,
      pages: Math.ceil(total / limit),
      hasMore: page < Math.ceil(total / limit),
    };
  }

  private async getBookmarksFeed(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [bookmarks, total] = await Promise.all([
      this.prisma.bookmark.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          post: {
            include: this.getPostIncludes(userId),
          },
        },
      }),
      this.prisma.bookmark.count({ where: { userId } }),
    ]);

    const posts = bookmarks.map(b => b.post);
    const enhancedPosts = await this.enhancePostsWithUserData(posts, userId);

    return {
      posts: enhancedPosts,
      total,
      page,
      pages: Math.ceil(total / limit),
      hasMore: page < Math.ceil(total / limit),
    };
  }

  private async getTrendingFeed(page: number, limit: number) {
    const skip = (page - 1) * limit;
    
    // Calculate trending score
    const posts = await this.prisma.$queryRaw`
      SELECT p.*, 
        (p.upvotes * 2 + p.views * 0.1 + COUNT(c.id) * 3) / 
        POWER(EXTRACT(EPOCH FROM (NOW() - p."createdAt")) / 3600 + 2, 1.8) as trending_score
      FROM "Post" p
      LEFT JOIN "Comment" c ON c."postId" = p.id
      WHERE p."isPublished" = true 
        AND p."moderationStatus" = 'APPROVED'
        AND p."createdAt" > NOW() - INTERVAL '7 days'
      GROUP BY p.id
      ORDER BY trending_score DESC
      LIMIT ${limit}
      OFFSET ${skip}
    `;

    const total = await this.prisma.post.count({
      where: {
        isPublished: true,
        moderationStatus: ModerationStatus.APPROVED,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    return {
      posts,
      total,
      page,
      pages: Math.ceil(total / limit),
      hasMore: page < Math.ceil(total / limit),
    };
  }

  private async getRecentFeed(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          isPublished: true,
          moderationStatus: ModerationStatus.APPROVED,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.getPostIncludes(),
      }),
      this.prisma.post.count({
        where: {
          isPublished: true,
          moderationStatus: ModerationStatus.APPROVED,
        },
      }),
    ]);

    return {
      posts,
      total,
      page,
      pages: Math.ceil(total / limit),
      hasMore: page < Math.ceil(total / limit),
    };
  }

  private getPostIncludes(userId?: string) {
    return {
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
      _count: {
        select: {
          comments: true,
          bookmarks: true,
          votes: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    };
  }

  private async enhancePostsWithUserData(posts: any[], userId: string) {
    if (!userId) return posts;

    const postIds = posts.map(p => p.id);

    // Get user's votes and bookmarks
    const [votes, bookmarks] = await Promise.all([
      this.prisma.vote.findMany({
        where: {
          userId,
          postId: { in: postIds },
        },
      }),
      this.prisma.bookmark.findMany({
        where: {
          userId,
          postId: { in: postIds },
        },
      }),
    ]);

    const voteMap = new Map(votes.map(v => [v.postId, v.value]));
    const bookmarkSet = new Set(bookmarks.map(b => b.postId));

    return posts.map(post => ({
      ...post,
      userVote: voteMap.get(post.id) || null,
      isBookmarked: bookmarkSet.has(post.id),
      commentCount: post._count.comments,
      bookmarkCount: post._count.bookmarks,
    }));
  }

  private getSortOrder(sort: string): Prisma.PostOrderByWithRelationInput | Prisma.PostOrderByWithRelationInput[] {
    switch (sort) {
      case 'relevance':
        return [
          { upvotes: 'desc' as Prisma.SortOrder }, 
          { viewCount: 'desc' as Prisma.SortOrder }
        ];
      case 'date':
        return { createdAt: 'desc' as Prisma.SortOrder };
      case 'popularity':
        return { viewCount: 'desc' as Prisma.SortOrder };
      case 'engagement':
        return { upvotes: 'desc' as Prisma.SortOrder };
      default:
        return { createdAt: 'desc' as Prisma.SortOrder };
    }
  }
}