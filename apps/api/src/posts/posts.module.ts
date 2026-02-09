// apps/api/src/posts/posts.module.ts
import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { PostsVelocityService } from './posts-velocity.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CommentsModule } from '../comments/comments.module';
import { VotesModule } from '../votes/votes.module';
import { AiModule } from '../ai/ai.module';
import { FeedsModule } from '../feeds/feeds.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    PrismaModule,
    CommentsModule,
    VotesModule,
    AiModule,
    FeedsModule,
    CacheModule.register({
      ttl: 300, // 5 minutes
      max: 1000,
    }),
  ],
  controllers: [PostsController],
  providers: [PostsService, PostsVelocityService],
  exports: [PostsService, PostsVelocityService],
})
export class PostsModule { }