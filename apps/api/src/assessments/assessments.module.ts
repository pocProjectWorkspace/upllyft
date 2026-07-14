import { Module } from '@nestjs/common';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';
import { ConcordanceService } from './concordance.service';
import { ScoringService } from './scoring.service';
import { ReportGeneratorService } from './report-generator.service';
import { ReportGeneratorV2Service } from './report-generator-v2.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
    imports: [PrismaModule, NotificationModule],
    controllers: [AssessmentsController],
    providers: [ConcordanceService, AssessmentsService, ScoringService, ReportGeneratorService, ReportGeneratorV2Service],
    exports: [AssessmentsService],
})
export class AssessmentsModule { }
