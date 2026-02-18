// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Services
import { ClinicalInsightsService } from './agents/clinical-insights.service';
import { PrismaService } from './prisma/prisma.service';
import { AppService } from './app.service';

// Controllers
import { ClinicalInsightsController } from './agents/clinical-insights.controller';
import { AppController } from './app.controller';

// Core modules
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

// Logging module
import { LoggingModule, LoggingInterceptor } from './common/logging';

// Response interceptors
import { ExcludeFieldsInterceptor } from './common/interceptors';

// Feature modules
import { PostsModule } from './posts/posts.module';
import { CommentsModule } from './comments/comments.module';
import { VotesModule } from './votes/votes.module';
import { BookmarksModule } from './bookmarks/bookmarks.module';
import { FeedsModule } from './feeds/feeds.module';
import { AiModule } from './ai/ai.module';
import { CommunityModule } from './community/community.module';
import { CrisisModule } from './crisis/crisis.module';
import { EventsModule } from './events/events.module';
import { ProfileModule } from './profile/profile.module';
import { OrganizationsModule } from './organizations/organizations.module';

// Additional modules
import { SearchModule } from './search/search.module';
import { VerificationModule } from './verification/verification.module';
import { BillingModule } from './billing/billing.module';


// Tasks
import { EngagementMetricsTask } from './tasks/engagement-metrics.task';

import { ProvidersModule } from './providers/providers.module';
import { QuestionsModule } from './questions/questions.module';
import { AnswersModule } from './answers/answers.module';
import { FcmTokenModule } from './fcm-token/fcm-token.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { PaymentModule } from './marketplace/payment/payment.module';
import { BookingModule } from './marketplace/booking/booking.module';
import { OrganizationModule } from './marketplace/organization/organization.module';
import { NotificationModule as MarketplaceNotificationModule } from './marketplace/notifications/notification.module';
import { NotificationModule } from './notification/notification.module';
import { RatingModule } from './marketplace/rating/rating.module';
import { AdminModule as MarketplaceAdminModule } from './marketplace/admin/admin.module';
import { AdminModule } from './admin/admin.module';
import { PackageModule } from './marketplace/packages/package.module';
import { DisputeModule } from './marketplace/disputes/dispute.module';
import { TherapistModule } from './marketplace/therapist/therapist.module';
import { BannerAdsModule } from './banner-ads/banner-ads.module';
import { CasesModule } from './cases/cases.module';
import { CaseSessionsModule } from './case-sessions/case-sessions.module';
import { IEPsModule } from './ieps/ieps.module';
import { MilestonePlansModule } from './milestone-plans/milestone-plans.module';
import { CaseDocumentsModule } from './case-documents/case-documents.module';
import { CaseBillingModule } from './case-billing/case-billing.module';
import { CaseAuditModule } from './case-audit/case-audit.module';
import { CaseConsentsModule } from './case-consents/case-consents.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { WorksheetsModule } from './worksheets/worksheets.module';


@Module({
  imports: [
    // Schedule module for cron jobs
    ScheduleModule.forRoot(),

    // Event Emitter for async events
    EventEmitterModule.forRoot(),

    // Logging module (global)
    LoggingModule,

    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),

    // Core modules
    PrismaModule,
    AuthModule,
    UsersModule,

    // Feature modules
    PostsModule,
    CommentsModule,
    VotesModule,
    BookmarksModule,
    FeedsModule,
    CommunityModule,
    AiModule,
    EventsModule,
    CrisisModule,

    // Additional modules
    AdminModule,
    SearchModule,
    VerificationModule,
    BillingModule,
    ProvidersModule,
    QuestionsModule,
    AnswersModule,
    ProfileModule,
    OrganizationsModule,
    FcmTokenModule,
    AssessmentsModule,

    // Marketplace modules
    PaymentModule,
    BookingModule,
    TherapistModule,
    OrganizationModule,
    MarketplaceNotificationModule,
    RatingModule,
    MarketplaceAdminModule,
    PackageModule,
    DisputeModule,
    BannerAdsModule,

    // Case management
    CasesModule,
    CaseSessionsModule,
    IEPsModule,
    MilestonePlansModule,
    CaseDocumentsModule,
    CaseBillingModule,
    CaseAuditModule,
    CaseConsentsModule,

    // Notifications (controller + gateway)
    NotificationModule,

    // Onboarding
    OnboardingModule,

    // Learning Resources
    WorksheetsModule,
  ],
  controllers: [
    AppController,
    ClinicalInsightsController,
  ],
  providers: [
    AppService,
    ClinicalInsightsService,
    ConfigService,
    PrismaService,
    EngagementMetricsTask, // Task needs access to PrismaService and PostsService
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global logging interceptor for CloudWatch
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // Exclude sensitive fields (embedding, etc.) from responses
    {
      provide: APP_INTERCEPTOR,
      useClass: ExcludeFieldsInterceptor,
    },
  ],
})
export class AppModule { }