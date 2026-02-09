import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PostsVelocityService } from '../posts/posts-velocity.service';
@Injectable()
export class VelocityPrecalcTask {
    private readonly logger = new Logger(VelocityPrecalcTask.name);
    constructor(
        private prisma: PrismaService,
        private velocityService: PostsVelocityService,
    ) { }
    @Cron(CronExpression.EVERY_5_MINUTES)
    async precalculateVelocities() {
        this.logger.log('Pre-calculating velocities for active posts...');
        // Get recently active posts
        const posts = await this.prisma.post.findMany({
            where: {
                isPublished: true,
                createdAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
                },
            },
            select: { id: true },
            take: 100,
            orderBy: { createdAt: 'desc' },
        });
        const postIds = posts.map(p => p.id);
        await this.velocityService.getPostsVelocityBatch(postIds);
        this.logger.log(`Pre-calculated velocities for ${postIds.length} posts`);
    }
}