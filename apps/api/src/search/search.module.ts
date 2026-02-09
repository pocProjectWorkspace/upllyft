// apps/api/src/search/search.module.ts
import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { EmbeddingService } from './embedding.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    HttpModule,
    AiModule
  ],
  controllers: [SearchController],
  providers: [SearchService, EmbeddingService],
  exports: [SearchService, EmbeddingService],
})
export class SearchModule { }