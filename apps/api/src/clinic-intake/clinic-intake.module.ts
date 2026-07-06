import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CasesModule } from '../cases/cases.module';
import { EncryptionService } from '../common/encryption/encryption.service';
import { GuardianService } from './guardian.service';
import { IdentityService } from './identity.service';
import { PreVisitTaskService } from './pre-visit-task.service';
import { ConsentTemplateService } from './consent-template.service';
import { CaseIntakeService } from './case-intake.service';
import { PatientIntakeController } from './patient-intake.controller';
import { ConsentTemplateController } from './consent-template.controller';
import { CaseIntakeController } from './case-intake.controller';

/**
 * UAE Clinic Phase 1 — identity, guardian authority, versioned consent
 * templates, and pre-visit task tracking (workflow/engagement layer).
 */
@Module({
  imports: [PrismaModule, CasesModule],
  controllers: [PatientIntakeController, ConsentTemplateController, CaseIntakeController],
  providers: [
    GuardianService,
    IdentityService,
    PreVisitTaskService,
    ConsentTemplateService,
    CaseIntakeService,
    EncryptionService,
  ],
  exports: [
    GuardianService,
    IdentityService,
    PreVisitTaskService,
    ConsentTemplateService,
    CaseIntakeService,
  ],
})
export class ClinicIntakeModule {}
