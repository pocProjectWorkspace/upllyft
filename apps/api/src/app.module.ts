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
import { CredentialExpiryTask } from './tasks/credential-expiry.task';
import { PreAuthExpiryTask } from './tasks/preauth-expiry.task';
import { ReviewSchedulerTask } from './tasks/review-scheduler.task';

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
import { CarePlansModule } from './care-plans/care-plans.module';
import { CaseTriageModule } from './case-triage/case-triage.module';
import { AssessmentReviewsModule } from './assessment-reviews/assessment-reviews.module';
import { CaseEscalationModule } from './case-escalation/case-escalation.module';
import { IEPsModule } from './ieps/ieps.module';
import { MilestonePlansModule } from './milestone-plans/milestone-plans.module';
import { CaseDocumentsModule } from './case-documents/case-documents.module';
import { ClinicalTemplatesModule } from './clinical-templates/clinical-templates.module';
import { ClinicalRecordsModule } from './clinical-records/clinical-records.module';
import { CaseBillingModule } from './case-billing/case-billing.module';
import { CaseAuditModule } from './case-audit/case-audit.module';
import { CaseConsentsModule } from './case-consents/case-consents.module';
import { ClinicIntakeModule } from './clinic-intake/clinic-intake.module';
import { PublicIntakeModule } from './public-intake/public-intake.module';
import { PayerModule } from './payer/payer.module';
import { ClinicOrchestrationModule } from './clinic-orchestration/clinic-orchestration.module';
import { ClinicSafetyModule } from './clinic-safety/clinic-safety.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { WorksheetsModule } from './worksheets/worksheets.module';
import { MiraModule } from './mira/mira.module';
import { ClinicPatientsModule } from './clinic-patients/clinic-patients.module';
import { ClinicTherapistsModule } from './clinic-therapists/clinic-therapists.module';
import { ClinicTrackingModule } from './clinic-tracking/clinic-tracking.module';
import { ClinicOutcomesModule } from './clinic-outcomes/clinic-outcomes.module';
import { ConsentModule } from './consent/consent.module';
import { FacilitiesModule } from './facilities/facilities.module';
import { NurseryModule } from './nursery/nursery.module';
import { ChildClaimsModule } from './child-claims/child-claims.module';
import { ObservationsModule } from './observations/observations.module';
import { ConcernsModule } from './concerns/concerns.module';
import { SupportPlansModule } from './support-plans/support-plans.module';
import { DevelopmentalReviewsModule } from './developmental-reviews/developmental-reviews.module';
import { HandoverModule } from './handover/handover.module';
import { InsightsModule } from './insights/insights.module';
import { InvoiceModule } from './invoice/invoice.module';
import { MessagingModule } from './messaging/messaging.module';
import { AuditModule } from './audit/audit.module';
import { RetentionModule } from './retention/retention.module';
import { ClinicModule } from './clinic/clinic.module';
import { ClinicMarketplaceModule } from './marketplace/clinic/clinic-marketplace.module';


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
    ClinicMarketplaceModule,
    BannerAdsModule,

    // Case management
    CasesModule,
    CaseSessionsModule,
    CarePlansModule,
    CaseTriageModule,
    AssessmentReviewsModule,
    CaseEscalationModule,
    IEPsModule,
    MilestonePlansModule,
    CaseDocumentsModule,
    ClinicalTemplatesModule,
    ClinicalRecordsModule,
    CaseBillingModule,
    CaseAuditModule,
    CaseConsentsModule,
    ClinicIntakeModule,
    PublicIntakeModule,
    PayerModule,
    ClinicOrchestrationModule,
    ClinicSafetyModule,

    // Notifications (controller + gateway)
    NotificationModule,

    // Onboarding
    OnboardingModule,

    // Learning Resources
    WorksheetsModule,

    // Mira conversational AI
    MiraModule,

    // Clinic admin
    ClinicModule,
    ClinicPatientsModule,
    ClinicTherapistsModule,
    ClinicTrackingModule,
    ClinicOutcomesModule,

    // Consent forms
    ConsentModule,
    FacilitiesModule,
    NurseryModule,
    ChildClaimsModule,
    ObservationsModule,
    ConcernsModule,
    SupportPlansModule,
    DevelopmentalReviewsModule,
    HandoverModule,
    InsightsModule,

    // Invoices
    InvoiceModule,

    // Messaging
    MessagingModule,

    // PDPL compliance
    AuditModule,
    RetentionModule,
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
    CredentialExpiryTask, // Phase 0 (UAE): daily licence-expiry derivation
    PreAuthExpiryTask, // Phase 2 (UAE): daily pre-authorisation expiry/exhaustion
    ReviewSchedulerTask, // Phase 3 (UAE): daily review-trigger engine
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