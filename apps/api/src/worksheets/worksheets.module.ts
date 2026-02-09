import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { WorksheetsController } from './worksheets.controller';
import { WorksheetsService } from './worksheets.service';
import { WorksheetAiService } from './worksheet-ai.service';
import { WorksheetImageService } from './worksheet-image.service';
import { WorksheetPdfService } from './worksheet-pdf.service';
import { WorksheetDataSourcesService } from './worksheet-data-sources.service';
import { WorksheetAssignmentService } from './worksheet-assignment.service';
import { WorksheetCommunityService } from './worksheet-community.service';
import { WorksheetReviewService } from './worksheet-review.service';
import { WorksheetModerationService } from './worksheet-moderation.service';
import { WorksheetCompletionService } from './worksheet-completion.service';
import { WorksheetAnalyticsService } from './worksheet-analytics.service';
import { WorksheetRecommendationService } from './worksheet-recommendation.service';
import { WorksheetVersionService } from './worksheet-version.service';
import { WorksheetContributorService } from './worksheet-contributor.service';
import { WorksheetAccessGuard } from './guards/worksheet-access.guard';

@Module({
  imports: [PrismaModule, ConfigModule, AiModule, EventEmitterModule],
  controllers: [WorksheetsController],
  providers: [
    WorksheetsService,
    WorksheetAiService,
    WorksheetImageService,
    WorksheetPdfService,
    WorksheetDataSourcesService,
    WorksheetAssignmentService,
    WorksheetCommunityService,
    WorksheetReviewService,
    WorksheetModerationService,
    WorksheetCompletionService,
    WorksheetAnalyticsService,
    WorksheetRecommendationService,
    WorksheetVersionService,
    WorksheetContributorService,
    WorksheetAccessGuard,
  ],
  exports: [
    WorksheetsService,
    WorksheetAssignmentService,
    WorksheetCommunityService,
    WorksheetReviewService,
    WorksheetModerationService,
    WorksheetCompletionService,
    WorksheetAnalyticsService,
    WorksheetRecommendationService,
    WorksheetVersionService,
    WorksheetContributorService,
  ],
})
export class WorksheetsModule {}
