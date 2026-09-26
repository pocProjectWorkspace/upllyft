// apps/api/src/feeds/personalization.service.ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface UserInterestProfile {
  categories: Record<string, number>;
  tags: Record<string, number>;
}

type AuthorInteractionRow = { authorId: string; count: number };

const POSITIVE_ACTIONS = ['VOTE', 'COMMENT', 'BOOKMARK'] as const;

const DEFAULT_WEIGHTS = {
  recencyWeight: 30,
  relevanceWeight: 40,
  engagementWeight: 30,
};

@Injectable()
export class PersonalizationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Read-only interest profile derived from the user's last 100 interactions.
   * One statement; never writes. Used on the feed read path.
   */
  async computeInterests(userId: string): Promise<UserInterestProfile> {
    const interactions = await this.prisma.feedInteraction.findMany({
      where: { userId },
      select: {
        action: true,
        timestamp: true,
        post: { select: { category: true, tags: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    const categoryScores = new Map<string, number>();
    const tagScores = new Map<string, number>();

    for (const interaction of interactions) {
      const weight = this.getInteractionWeight(interaction.action);
      const recencyMultiplier = this.getRecencyMultiplier(interaction.timestamp);

      const category = interaction.post.category;
      categoryScores.set(
        category,
        (categoryScores.get(category) || 0) + weight * recencyMultiplier,
      );

      for (const tag of interaction.post.tags) {
        tagScores.set(
          tag,
          (tagScores.get(tag) || 0) + weight * recencyMultiplier * 0.5,
        );
      }
    }

    return {
      categories: Object.fromEntries(categoryScores),
      tags: Object.fromEntries(tagScores),
    };
  }

  /**
   * Recompute the interest profile and persist the per-category scores.
   * Called from the interaction write path (FeedsService.trackInteraction),
   * never from a feed read.
   */
  async calculateUserInterests(userId: string): Promise<UserInterestProfile> {
    const interests = await this.computeInterests(userId);
    await this.updateUserInterests(userId, interests.categories);
    return interests;
  }

  private async updateUserInterests(
    userId: string,
    categoryScores: Record<string, number>,
  ) {
    const updates = Object.entries(categoryScores).map(([category, score]) =>
      this.prisma.userInterests.upsert({
        where: { userId_category: { userId, category } },
        update: {
          score,
          interactions: { increment: 1 },
          lastEngaged: new Date(),
        },
        create: { userId, category, score, interactions: 1 },
      }),
    );

    await Promise.all(updates);
  }

  private async getUserPreferences(userId: string) {
    const preferences = await this.prisma.userPreferences.findUnique({
      where: { userId },
      select: {
        recencyWeight: true,
        relevanceWeight: true,
        engagementWeight: true,
      },
    });

    // Defaults match the UserPreferences schema; the row itself is created
    // lazily by UserPreferencesService, not by a feed read.
    return preferences ?? DEFAULT_WEIGHTS;
  }

  /**
   * Author affinity for every distinct author in two statements total:
   * followed authors score 0.5; otherwise 0.1 per past positive interaction
   * with that author, capped at 0.3.
   */
  private async getAuthorScores(
    userId: string,
    authorIds: string[],
  ): Promise<Map<string, number>> {
    const scores = new Map<string, number>();
    if (authorIds.length === 0) return scores;

    const [follows, interactionRows] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followerId: userId, followingId: { in: authorIds } },
        select: { followingId: true },
      }),
      this.prisma.$queryRaw<AuthorInteractionRow[]>(Prisma.sql`
        SELECT p."authorId" AS "authorId", COUNT(*)::int AS "count"
        FROM "FeedInteraction" fi
        JOIN "Post" p ON p."id" = fi."postId"
        WHERE fi."userId" = ${userId}
          AND fi."action"::text IN (${Prisma.join([...POSITIVE_ACTIONS])})
          AND p."authorId" IN (${Prisma.join(authorIds)})
        GROUP BY p."authorId"
      `),
    ]);

    for (const row of interactionRows) {
      scores.set(row.authorId, Math.min(Number(row.count) * 0.1, 0.3));
    }
    for (const follow of follows) {
      scores.set(follow.followingId, 0.5);
    }
    return scores;
  }

  /**
   * Score a batch of candidate posts for one user. Issues exactly three
   * statements (preferences, follows, author interaction counts) no matter
   * how many posts are passed in.
   */
  async scorePosts<T extends { id: string; authorId: string }>(
    userId: string,
    posts: T[],
    interests: UserInterestProfile,
  ): Promise<Array<T & { score: number }>> {
    if (posts.length === 0) return [];

    const authorIds = [...new Set(posts.map((p) => p.authorId))];
    const [preferences, authorScores] = await Promise.all([
      this.getUserPreferences(userId),
      this.getAuthorScores(userId, authorIds),
    ]);

    return posts.map((post) => {
      const relevanceScore = this.calculateRelevance(post, interests);
      const recencyScore = this.calculateRecency((post as any).createdAt);
      const engagementScore = this.calculateEngagement(post);
      const authorScore = authorScores.get(post.authorId) ?? 0;

      const score =
        (relevanceScore * preferences.relevanceWeight) / 100 +
        (recencyScore * preferences.recencyWeight) / 100 +
        (engagementScore * preferences.engagementWeight) / 100 +
        authorScore * 0.1; // Fixed 10% weight for author

      return { ...post, score };
    });
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
    return Math.max(0.1, 1 - daysSince / 30); // Decay over 30 days
  }

  private calculateRelevance(post: any, interests: UserInterestProfile): number {
    let score = 0;

    if (interests.categories && interests.categories[post.category]) {
      score += interests.categories[post.category] * 0.6;
    }

    if (interests.tags && post.tags) {
      for (const tag of post.tags as string[]) {
        if (interests.tags[tag]) {
          score += interests.tags[tag] * 0.4;
        }
      }
    }

    return Math.min(1, score);
  }

  private calculateRecency(createdAt: Date): number {
    const hoursSince = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSince < 1) return 1;
    if (hoursSince < 24) return 0.8;
    if (hoursSince < 72) return 0.6;
    if (hoursSince < 168) return 0.4; // 1 week
    return Math.max(0.1, 1 - hoursSince / 720); // Decay over 30 days
  }

  private calculateEngagement(post: any): number {
    // Candidate rows carry `_count.comments` / `_count.bookmarks` from the
    // include and `viewCount` from the Post row itself.
    const comments = post._count?.comments ?? post.commentCount ?? 0;
    const bookmarks = post._count?.bookmarks ?? post.bookmarkCount ?? 0;
    const views = post.viewCount ?? post.views ?? 0;

    const totalEngagement = (post.upvotes || 0) + comments * 2 + bookmarks * 1.5;
    const viewRatio = totalEngagement / Math.max(1, views);
    return Math.min(1, viewRatio * 10);
  }
}
