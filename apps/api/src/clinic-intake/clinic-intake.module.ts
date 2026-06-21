import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EncryptionService } from '../common/encryption/encryption.service';
import { GuardianService } from './guardian.service';
import { IdentityService } from './identity.service';
import { PreVisitTaskService } from './pre-visit-task.service';
import { ConsentTemplateService } from './consent-template.service';
import { PatientIntakeController } from './patient-intake.controller';
import { ConsentTemplateController } from './consent-template.controller';

/**
 * UAE Clinic Phase 1 — identity, guardian authority, versioned consent
 * templates, and pre-visit task tracking (workflow/engagement layer).
 */
@Module({
  imports: [PrismaModule],
  controllers: [PatientIntakeController, ConsentTemplateController],
  providers: [
    GuardianService,
    IdentityService,
    PreVisitTaskService,
    ConsentTemplateService,
    EncryptionService,
  ],
  exports: [GuardianService, IdentityService, PreVisitTaskService, ConsentTemplateService],
})
export class ClinicIntakeModule {}
