// Optimized engagement velocity service with caching and batch queries
import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as cacheManager_1 from 'cache-manager';

export interface EngagementMetrics {
    postId: string;
    last24h: number;
    last7d: number;
    last30d: number;
    velocity: number;
    trend: 'rising' | 'stable' | 'falling';
}

@Injectable()
export class PostsVelocityService {
    private readonly logger = new Logger(PostsVelocityService.name);

    constructor(
        private prisma: PrismaService,
        @Inject(CACHE_MANAGER) private cacheManager: cacheManager_1.Cache,
    ) { }

    /**
     * Get engagement velocity for multiple posts in a single batch query
     * OPTIMIZED: Reduces 6N queries to 3 queries total
     */
    async getPostsVelocityBatch(postIds: string[]): Promise<Map<string, EngagementMetrics>> {
        if (postIds.length === 0) return new Map();

        // Check cache first
        const cachedResults = new Map<string, EngagementMetrics>();
        const uncachedIds: string[] = [];

        for (const postId of postIds) {
            const cached = await this.cacheManager.get<EngagementMetrics>(`velocity:${postId}`);
            if (cached) {
                cachedResults.set(postId, cached);
            } else {
                uncachedIds.push(postId);
            }
        }

        if (uncachedIds.length === 0) {
            this.logger.debug(`All ${postIds.length} velocities served from cache`);
            return cachedResults;
        }

        this.logger.debug(`Calculating velocity for ${uncachedIds.length} posts (${cachedResults.size} from cache)`);

        const now = new Date();
        const time24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const time7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const time30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Batch query for votes
        const voteMetrics = await this.prisma.$queryRaw<Array<{
            postId: string;
            votes_24h: bigint;
            votes_7d: bigint;
            votes_30d: bigint;
        }>>`
      SELECT 
        "postId",
        COUNT(CASE WHEN "createdAt" >= ${time24h} THEN 1 END)::bigint as votes_24h,
        COUNT(CASE WHEN "createdAt" >= ${time7d} THEN 1 END)::bigint as votes_7d,
        COUNT(CASE WHEN "createdAt" >= ${time30d} THEN 1 END)::bigint as votes_30d
      FROM "Vote"
      WHERE "postId" = ANY(${uncachedIds})
      GROUP BY "postId"
    `;

        // Batch query for comments
        const commentMetrics = await this.prisma.$queryRaw<Array<{
            postId: string;
            comments_24h: bigint;
            comments_7d: bigint;
        }>>`
      SELECT 
        "postId",
        COUNT(CASE WHEN "createdAt" >= ${time24h} THEN 1 END)::bigint as comments_24h,
        COUNT(CASE WHEN "createdAt" >= ${time7d} THEN 1 END)::bigint as comments_7d
      FROM "Comment"
      WHERE "postId" = ANY(${uncachedIds})
      GROUP BY "postId"
    `;

        // Batch query for views (with error handling)
        let viewMetrics: Array<{ postId: string; views_24h: bigint }> = [];
        try {
            viewMetrics = await this.prisma.$queryRaw<Array<{
                postId: string;
                views_24h: bigint;
            }>>`
        SELECT 
          "postId",
          COUNT(*)::bigint as views_24h
        FROM "PostView"
        WHERE "postId" = ANY(${uncachedIds})
          AND "createdAt" >= ${time24h}
        GROUP BY "postId"
      `;
        } catch (error) {
            this.logger.warn('PostView table not available, skipping view metrics');
        }

        // Convert to maps for easy lookup
        const votesMap = new Map(voteMetrics.map(m => [m.postId, m]));
        const commentsMap = new Map(commentMetrics.map(m => [m.postId, m]));
        const viewsMap = new Map(viewMetrics.map(m => [m.postId, m]));

        // Calculate metrics for each post
        const results = new Map<string, EngagementMetrics>();

        for (const postId of uncachedIds) {
            const votes = votesMap.get(postId);
            const comments = commentsMap.get(postId);
            const views = viewsMap.get(postId);

            const votes24h = Number(votes?.votes_24h || 0);
            const votes7d = Number(votes?.votes_7d || 0);
            const votes30d = Number(votes?.votes_30d || 0);
            const comments24h = Number(comments?.comments_24h || 0);
            const comments7d = Number(comments?.comments_7d || 0);
            const views24h = Number(views?.views_24h || 0);

            // Calculate engagement scores
            const engagement24h = votes24h + comments24h * 2 + views24h * 0.1;
            const engagement7d = votes7d + comments7d * 2;
            const engagement30d = votes30d;

            // Calculate velocity
            const dailyAverage7d = engagement7d / 7;
            const velocity = engagement24h - dailyAverage7d;
            const velocityPercentage = dailyAverage7d > 0 ? (velocity / dailyAverage7d) * 100 : 0;

            // Determine trend
            let trend: 'rising' | 'stable' | 'falling';
            if (velocityPercentage > 20) {
                trend = 'rising';
            } else if (velocityPercentage < -20) {
                trend = 'falling';
            } else {
                trend = 'stable';
            }

            const metrics: EngagementMetrics = {
                postId,
                last24h: engagement24h,
                last7d: engagement7d,
                last30d: engagement30d,
                velocity: velocityPercentage,
                trend,
            };

            results.set(postId, metrics);

            // Cache for 5 minutes
            await this.cacheManager.set(`velocity:${postId}`, metrics, 300);
        }

        // Merge cached and calculated results
        return new Map([...cachedResults, ...results]);
    }

    /**
     * Get velocity for a single post (with caching)
     */
    async getPostVelocity(postId: string): Promise<EngagementMetrics> {
        const results = await this.getPostsVelocityBatch([postId]);
        return results.get(postId) || this.getDefaultMetrics(postId);
    }

    /**
     * Clear velocity cache for a post (call after new engagement)
     */
    async clearVelocityCache(postId: string): Promise<void> {
        await this.cacheManager.del(`velocity:${postId}`);
    }

    /**
     * Clear velocity cache for multiple posts
     */
    async clearVelocityCacheBatch(postIds: string[]): Promise<void> {
        await Promise.all(postIds.map(id => this.cacheManager.del(`velocity:${id}`)));
    }

    private getDefaultMetrics(postId: string): EngagementMetrics {
        return {
            postId,
            last24h: 0,
            last7d: 0,
            last30d: 0,
            velocity: 0,
            trend: 'stable',
        };
    }
}
