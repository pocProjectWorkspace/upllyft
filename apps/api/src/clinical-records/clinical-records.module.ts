import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CasesModule } from '../cases/cases.module';
import { ClinicalRecordsController } from './clinical-records.controller';
import { ClinicalRecordsService } from './clinical-records.service';
import { ClinicalRecordReportService } from './clinical-record-report.service';
import { ClinicalInsightsService } from './clinical-insights.service';

@Module({
  imports: [PrismaModule, CasesModule],
  controllers: [ClinicalRecordsController],
  providers: [ClinicalRecordsService, ClinicalRecordReportService, ClinicalInsightsService],
  exports: [ClinicalRecordsService],
})
export class ClinicalRecordsModule {}
