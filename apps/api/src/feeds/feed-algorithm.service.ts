// apps/api/src/feeds/feed-algorithm.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PersonalizationService } from './personalization.service';

@Injectable()
export class FeedAlgorithmService {
  constructor(
    private prisma: PrismaService,
    private personalization: PersonalizationService,
  ) {}

  async generateForYouFeed(userId: string, page: number, limit: number) {
    // Get user preferences and interests
    const interests = await this.personalization.calculateUserInterests(userId);
    
    // Build query with personalization
    const candidatePosts = await this.getCandidatePosts(userId, interests, limit * 3);
    
    // Score and rank posts
    const scoredPosts = await Promise.all(
      candidatePosts.map(async post => ({
        ...post,
        score: await this.personalization.getPersonalizedScore(userId, post),
      }))
    );
    
    // Sort by score and apply diversity rules
    const diversifiedFeed = this.applyDiversityRules(scoredPosts);
    
    // Paginate
    const start = (page - 1) * limit;
    const paginatedFeed = diversifiedFeed.slice(start, start + limit);
    
    return {
      posts: paginatedFeed,
      hasMore: diversifiedFeed.length > start + limit,
      page,
      totalScore: paginatedFeed.reduce((sum, p) => sum + p.score, 0) / paginatedFeed.length,
    };
  }

  private async getCandidatePosts(userId: string, interests: any, limit: number) {
    // Multi-stage candidate selection
    const stages = [
      // Stage 1: High-interest categories
      this.prisma.post.findMany({
        where: {
          category: { in: Object.keys(interests.categories).slice(0, 5) },
          isPublished: true,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        take: Math.floor(limit * 0.4),
        orderBy: { createdAt: 'desc' },
        include: this.getPostIncludes(),
      }),
      
      // Stage 2: Trending in user's interests
      this.prisma.post.findMany({
        where: {
          tags: { hasSome: Object.keys(interests.tags).slice(0, 10) },
          isPublished: true,
          upvotes: { gte: 5 },
        },
        take: Math.floor(limit * 0.3),
        orderBy: [{ upvotes: 'desc' }, { createdAt: 'desc' }],
        include: this.getPostIncludes(),
      }),
      
      // Stage 3: From followed users
      this.getFollowedUserPosts(userId, Math.floor(limit * 0.2)),
      
      // Stage 4: Discovery (outside interests for diversity)
      this.getDiscoveryPosts(userId, interests, Math.floor(limit * 0.1)),
    ];
    
    const results = await Promise.all(stages);
    return this.deduplicatePosts(results.flat());
  }

  private async getFollowedUserPosts(userId: string, limit: number) {
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    if (following.length === 0) return [];

    return this.prisma.post.findMany({
      where: {
        authorId: { in: following.map(f => f.followingId) },
        isPublished: true,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: this.getPostIncludes(),
    });
  }

  private async getDiscoveryPosts(userId: string, interests: any, limit: number) {
    // Get posts outside user's usual interests for discovery
    const knownCategories = Object.keys(interests.categories);
    
    return this.prisma.post.findMany({
      where: {
        isPublished: true,
        NOT: {
          category: { in: knownCategories },
        },
        upvotes: { gte: 10 }, // Higher quality threshold for discovery
      },
      take: limit,
      orderBy: [{ upvotes: 'desc' }, { viewCount: 'desc' }],
      include: this.getPostIncludes(),
    });
  }

  private deduplicatePosts(posts: any[]): any[] {
    const seen = new Set<string>();
    return posts.filter(post => {
      if (seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    });
  }

  private applyDiversityRules(posts: any[]): any[] {
    const diversified: any[] = [];
    const categoryCounts = new Map<string, number>();
    const authorCounts = new Map<string, number>();
    
    for (const post of posts) {
      const categoryCount = categoryCounts.get(post.category) || 0;
      const authorCount = authorCounts.get(post.authorId) || 0;
      
      // Limit same category/author consecutively
      if (categoryCount < 2 && authorCount < 2) {
        diversified.push(post);
        categoryCounts.set(post.category, categoryCount + 1);
        authorCounts.set(post.authorId, authorCount + 1);
      } else {
        // Push to end for later consideration
        diversified.push(...diversified.splice(diversified.indexOf(post), 1));
      }
      
      // Reset counts every 5 posts
      if (diversified.length % 5 === 0) {
        categoryCounts.clear();
        authorCounts.clear();
      }
    }
    
    return diversified;
  }

  private getPostIncludes() {
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
      _count: {
        select: {
          comments: true,
          bookmarks: true,
        },
      },
    };
  }
}