// apps/api/src/feeds/feeds.module.ts
import { Module } from '@nestjs/common';
import { FeedsController } from './feeds.controller';
import { FeedsService } from './feeds.service';
import { PersonalizationService } from './personalization.service';
import { FeedAlgorithmService } from './feed-algorithm.service';
import { UserPreferencesService } from './user-preferences.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    PrismaModule,
    CacheModule.register({
      ttl: 300_000, // 5 minutes (cache-manager v5 uses milliseconds)
      max: 100, // maximum number of items in cache
    }),
  ],
  controllers: [FeedsController],
  providers: [
    FeedsService,
    PersonalizationService,
    FeedAlgorithmService,
    UserPreferencesService,
  ],
  exports: [FeedsService],
})
export class FeedsModule {}