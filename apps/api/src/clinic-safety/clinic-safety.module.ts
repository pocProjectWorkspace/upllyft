import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CaseConsentsModule } from '../case-consents/case-consents.module';
import { IncidentService } from './incident.service';
import { ExternalShareService } from './external-share.service';
import { DischargeService } from './discharge.service';
import {
  IncidentController,
  ExternalShareController,
  DischargeController,
} from './clinic-safety.controller';

/**
 * UAE Clinic Phase 4 — safety/incident/escalation, consent-gated external
 * sharing, and discharge/retention/reactivation (workflow/engagement layer).
 */
@Module({
  imports: [PrismaModule, CaseConsentsModule],
  controllers: [IncidentController, ExternalShareController, DischargeController],
  providers: [IncidentService, ExternalShareService, DischargeService],
  exports: [IncidentService, ExternalShareService, DischargeService],
})
export class ClinicSafetyModule {}
