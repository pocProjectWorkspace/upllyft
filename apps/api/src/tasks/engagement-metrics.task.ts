// apps/api/src/tasks/engagement-metrics.task.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PostsService } from '../posts/posts.service';

@Injectable()
export class EngagementMetricsTask {
  private readonly logger = new Logger(EngagementMetricsTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly postsService: PostsService
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES) // Every 5 minutes
  async updateEngagementMetrics() {
    try {
      this.logger.log('Starting engagement metrics update...');

      // Get posts that need metrics update
      const posts = await this.prisma.post.findMany({
        where: {
          OR: [
            // Posts without engagement metrics
            {
              engagementMetrics: null,
            },
            // Posts with old metrics (older than 5 minutes)
            {
              engagementMetrics: {
                lastCalculatedAt: {
                  lt: new Date(Date.now() - 5 * 60 * 1000),
                },
              },
            },
          ],
        },
        take: 50, // Process 50 posts at a time
        orderBy: {
          createdAt: 'desc', // Prioritize newer posts
        },
      });

      this.logger.log(`Found ${posts.length} posts to update`);

      for (const post of posts) {
        try {
          // Calculate engagement velocity
          const metrics = await this.postsService.calculateEngagementVelocity(
            post.id,
            '24h'
          );

          // Upsert engagement metrics
          await this.prisma.postEngagementMetrics.upsert({
            where: { postId: post.id },
            create: {
              postId: post.id,
              engagementLast24h: metrics.last24h,
              engagementLast7d: metrics.last7d || 0,
              engagementLast30d: metrics.last30d || 0,
              velocityScore: metrics.velocity,
              velocityTrend: metrics.trend,
              lastCalculatedAt: new Date(),
            },
            update: {
              engagementLast24h: metrics.last24h,
              engagementLast7d: metrics.last7d || 0,
              engagementLast30d: metrics.last30d || 0,
              velocityScore: metrics.velocity,
              velocityTrend: metrics.trend,
              lastCalculatedAt: new Date(),
            },
          });

          this.logger.debug(`Updated metrics for post ${post.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to update metrics for post ${post.id}:`,
            error
          );
          // Continue with next post even if one fails
        }
      }

      this.logger.log(
        `Engagement metrics update completed for ${posts.length} posts`
      );
    } catch (error) {
      this.logger.error('Error in engagement metrics update:', error);
    }
  }

  @Cron(CronExpression.EVERY_6_HOURS) // Every 6 hours
  async updateUserSimilarities() {
    try {
      this.logger.log('Starting user similarity update...');

      // Get active users (users who have interacted recently)
      const users = await this.prisma.user.findMany({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Active in last 7 days
          },
        },
        take: 100,
        orderBy: { updatedAt: 'desc' },
      });

      this.logger.log(`Found ${users.length} users to update`);

      for (const user of users) {
        try {
          // Find similar users based on interaction patterns
          const similarUsers = await this.postsService.findSimilarUsers(
            user.id,
            10
          );

          // Store similarities in database
          for (const similarUserId of similarUsers) {
            // You could add similarity score calculation here
            await this.prisma.userSimilarity.upsert({
              where: {
                userId_similarUserId: {
                  userId: user.id,
                  similarUserId: similarUserId,
                },
              },
              create: {
                userId: user.id,
                similarUserId: similarUserId,
                similarity: 0.8, // Placeholder - calculate actual similarity
                lastCalculated: new Date(),
              },
              update: {
                similarity: 0.8, // Placeholder - calculate actual similarity
                lastCalculated: new Date(),
              },
            });
          }

          this.logger.debug(`Updated similarities for user ${user.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to update similarities for user ${user.id}:`,
            error
          );
          // Continue with next user even if one fails
        }
      }

      this.logger.log(
        `User similarity update completed for ${users.length} users`
      );
    } catch (error) {
      this.logger.error('Error in user similarity update:', error);
    }
  }

  // Optional: Clean up old metrics to prevent database bloat
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldMetrics() {
    try {
      this.logger.log('Starting cleanup of old metrics...');

      // Delete metrics for posts older than 90 days
      const result = await this.prisma.postEngagementMetrics.deleteMany({
        where: {
          post: {
            createdAt: {
              lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            },
          },
        },
      });

      this.logger.log(`Cleaned up ${result.count} old engagement metrics`);
    } catch (error) {
      this.logger.error('Error in metrics cleanup:', error);
    }
  }
}