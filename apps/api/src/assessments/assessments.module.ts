import { Module } from '@nestjs/common';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';
import { ScoringService } from './scoring.service';
import { ReportGeneratorService } from './report-generator.service';
import { ReportGeneratorV2Service } from './report-generator-v2.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [AssessmentsController],
    providers: [AssessmentsService, ScoringService, ReportGeneratorService, ReportGeneratorV2Service],
    exports: [AssessmentsService],
})
export class AssessmentsModule { }
