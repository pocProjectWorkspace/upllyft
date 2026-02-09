// apps/api/src/feeds/personalization.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager'; // Use type import

@Injectable()
export class PersonalizationService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async calculateUserInterests(userId: string) {
    // Get user's interaction history
    const interactions = await this.prisma.feedInteraction.findMany({
      where: { userId },
      include: { post: true },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    // Calculate interest scores by category
    const categoryScores = new Map<string, number>();
    const tagScores = new Map<string, number>();

    interactions.forEach(interaction => {
      const weight = this.getInteractionWeight(interaction.action);
      const recencyMultiplier = this.getRecencyMultiplier(interaction.timestamp);
      
      // Update category score
      const category = interaction.post.category;
      const currentScore = categoryScores.get(category) || 0;
      categoryScores.set(category, currentScore + (weight * recencyMultiplier));
      
      // Update tag scores
      interaction.post.tags.forEach(tag => {
        const tagScore = tagScores.get(tag) || 0;
        tagScores.set(tag, tagScore + (weight * recencyMultiplier * 0.5));
      });
    });

    // Normalize scores and update database
    await this.updateUserInterests(userId, categoryScores, tagScores);
    
    return { 
      categories: Object.fromEntries(categoryScores),
      tags: Object.fromEntries(tagScores)
    };
  }

  private async updateUserInterests(
    userId: string, 
    categoryScores: Map<string, number>, 
    tagScores: Map<string, number>
  ) {
    // Update user interests in database
    const updates: Promise<any>[] = [];
    
    for (const [category, score] of categoryScores) {
      updates.push(
        this.prisma.userInterests.upsert({
          where: {
            userId_category: {
              userId,
              category,
            },
          },
          update: {
            score,
            interactions: { increment: 1 },
            lastEngaged: new Date(),
          },
          create: {
            userId,
            category,
            score,
            interactions: 1,
          },
        })
      );
    }
    
    await Promise.all(updates);
  }

  private async getUserInterests(userId: string) {
    const interests = await this.prisma.userInterests.findMany({
      where: { userId },
      orderBy: { score: 'desc' },
    });

    const categories: Record<string, number> = {};
    const tags: Record<string, number> = {};

    interests.forEach(interest => {
      categories[interest.category] = interest.score;
    });

    return { categories, tags };
  }

  private async getUserPreferences(userId: string) {
    let preferences = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });

    if (!preferences) {
      preferences = await this.prisma.userPreferences.create({
        data: {
          userId,
          defaultFeedView: 'FOR_YOU',
          feedDensity: 'COMFORTABLE',
          showAnonymousPosts: true,
          autoplayVideos: false,
          preferredCategories: [],
          mutedKeywords: [],
          mutedAuthors: [],
          preferredLanguages: ['English'],
          recencyWeight: 30,
          relevanceWeight: 40,
          engagementWeight: 30,
        },
      });
    }

    return preferences;
  }

  private async calculateAuthorScore(userId: string, authorId: string): Promise<number> {
    // Check if user follows the author
    const follows = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: authorId,
        },
      },
    });

    if (follows) return 0.5;

    // Check past positive interactions with author
    const interactions = await this.prisma.feedInteraction.count({
      where: {
        userId,
        post: { authorId },
        action: { in: ['VOTE', 'COMMENT', 'BOOKMARK'] },
      },
    });

    return Math.min(interactions * 0.1, 0.3);
  }

  async getPersonalizedScore(userId: string, post: any): Promise<number> {
    const cacheKey = `score:${userId}:${post.id}`;
    const cached = await this.cacheManager.get<number>(cacheKey);
    if (cached !== undefined) return cached;

    const userInterests = await this.getUserInterests(userId);
    const preferences = await this.getUserPreferences(userId);
    
    // Calculate component scores
    const relevanceScore = this.calculateRelevance(post, userInterests);
    const recencyScore = this.calculateRecency(post.createdAt);
    const engagementScore = this.calculateEngagement(post);
    const authorScore = await this.calculateAuthorScore(userId, post.authorId);
    
    // Apply user preference weights
    const finalScore = 
      (relevanceScore * preferences.relevanceWeight / 100) +
      (recencyScore * preferences.recencyWeight / 100) +
      (engagementScore * preferences.engagementWeight / 100) +
      (authorScore * 0.1); // Fixed 10% weight for author
    
    await this.cacheManager.set(cacheKey, finalScore, 300); // Cache for 5 minutes
    return finalScore;
  }

  private getInteractionWeight(action: string): number {
    const weights: Record<string, number> = {
      VIEW: 1,
      CLICK: 2,
      VOTE: 3,
      COMMENT: 5,
      BOOKMARK: 4,
      SHARE: 6,
      HIDE: -5,
      REPORT: -10,
    };
    return weights[action] || 1;
  }

  private getRecencyMultiplier(timestamp: Date): number {
    const daysSince = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0.1, 1 - (daysSince / 30)); // Decay over 30 days
  }

  private calculateRelevance(post: any, interests: any): number {
    let score = 0;
    
    // Category match
    if (interests.categories && interests.categories[post.category]) {
      score += interests.categories[post.category] * 0.6;
    }
    
    // Tag matches
    if (interests.tags && post.tags) {
      post.tags.forEach((tag: string) => {
        if (interests.tags[tag]) {
          score += interests.tags[tag] * 0.4;
        }
      });
    }
    
    return Math.min(1, score);
  }

  private calculateRecency(createdAt: Date): number {
    const hoursSince = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSince < 1) return 1;
    if (hoursSince < 24) return 0.8;
    if (hoursSince < 72) return 0.6;
    if (hoursSince < 168) return 0.4; // 1 week
    return Math.max(0.1, 1 - (hoursSince / 720)); // Decay over 30 days
  }

  private calculateEngagement(post: any): number {
    const totalEngagement = (post.upvotes || 0) + ((post.commentCount || 0) * 2) + ((post.bookmarkCount || 0) * 1.5);
    const viewRatio = totalEngagement / Math.max(1, post.views || 1);
    return Math.min(1, viewRatio * 10);
  }
}