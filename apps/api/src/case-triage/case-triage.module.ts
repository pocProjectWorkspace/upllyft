import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CasesModule } from '../cases/cases.module';
import { CaseTriageController } from './case-triage.controller';
import { CaseTriageService } from './case-triage.service';

@Module({
  imports: [PrismaModule, CasesModule],
  controllers: [CaseTriageController],
  providers: [CaseTriageService],
  exports: [CaseTriageService],
})
export class CaseTriageModule {}
