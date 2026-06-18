import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CaseConsentsModule } from '../case-consents/case-consents.module';
import { LeadService } from './lead.service';
import { TriageService } from './triage.service';
import { MdtService } from './mdt.service';
import { TelehealthService } from './telehealth.service';
import { CareReviewService } from './care-review.service';
import { EhrExportService } from './ehr-export.service';
import {
  LeadController,
  PathwayController,
  TriageController,
  MdtController,
  TelehealthController,
  CaseReviewController,
  TreatmentPlanActivationController,
  SessionExtrasController,
  EhrExportController,
} from './clinic-orchestration.controller';

/**
 * UAE Clinic Phase 3 — clinical orchestration: lead funnel, triage/pathway,
 * telehealth metadata, MDT, care-plan/review engine, clinical flags/addenda,
 * and EHR export (workflow/engagement layer).
 */
@Module({
  imports: [PrismaModule, CaseConsentsModule],
  controllers: [
    LeadController,
    PathwayController,
    TriageController,
    MdtController,
    TelehealthController,
    CaseReviewController,
    TreatmentPlanActivationController,
    SessionExtrasController,
    EhrExportController,
  ],
  providers: [
    LeadService,
    TriageService,
    MdtService,
    TelehealthService,
    CareReviewService,
    EhrExportService,
  ],
  exports: [LeadService, TriageService, MdtService, CareReviewService, EhrExportService],
})
export class ClinicOrchestrationModule {}
