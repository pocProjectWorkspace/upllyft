// apps/api/src/ai/ai.module.ts
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { PrismaModule } from '../prisma/prisma.module'; // ADD THIS IMPORT

@Module({
  imports: [
    PrismaModule, // ADD THIS - CRITICAL!
    CacheModule.register({
      ttl: 300, // 5 minutes
      max: 100,
    }),
  ],
  providers: [AiService],
  controllers: [AiController],
  exports: [AiService],
})
export class AiModule {}