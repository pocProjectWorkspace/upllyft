import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CaseAccessGuard, CaseAccess } from '../cases/guards/case-access.guard';
import { ClinicalWriteGuard } from './guards/clinical-write.guard';
import { ClinicalRecordsService } from './clinical-records.service';
import { ClinicalRecordReportService } from './clinical-record-report.service';
import { ClinicalInsightsService } from './clinical-insights.service';
import {
  CreateClinicalRecordDto,
  UpdateClinicalRecordDto,
  ListClinicalRecordsQueryDto,
  GenerateRecordReportDto,
} from './dto/clinical-records.dto';

@Controller('cases/:caseId/clinical-records')
@UseGuards(JwtAuthGuard, CaseAccessGuard)
export class ClinicalRecordsController {
  constructor(
    private recordsService: ClinicalRecordsService,
    private reportService: ClinicalRecordReportService,
    private insightsService: ClinicalInsightsService,
  ) {}

  /** Header values pre-populated from the child profile + intake + author. */
  @Get('prefill')
  @CaseAccess('view')
  async getPrefill(@Param('caseId') caseId: string, @Req() req: any) {
    return this.recordsService.getPrefill(caseId, req.user.id);
  }

  @Post()
  @CaseAccess('edit')
  @UseGuards(ClinicalWriteGuard)
  async create(
    @Param('caseId') caseId: string,
    @Body() dto: CreateClinicalRecordDto,
    @Req() req: any,
  ) {
    return this.recordsService.create(caseId, req.user.id, dto);
  }

  @Get()
  @CaseAccess('view')
  async list(
    @Param('caseId') caseId: string,
    @Query() query: ListClinicalRecordsQueryDto,
  ) {
    return this.recordsService.list(caseId, query);
  }

  @Get(':recordId')
  @CaseAccess('view')
  async get(
    @Param('caseId') caseId: string,
    @Param('recordId') recordId: string,
    @Req() req: any,
  ) {
    return this.recordsService.get(caseId, recordId, req.user?.id);
  }

  @Patch(':recordId')
  @CaseAccess('edit')
  @UseGuards(ClinicalWriteGuard)
  async update(
    @Param('caseId') caseId: string,
    @Param('recordId') recordId: string,
    @Body() dto: UpdateClinicalRecordDto,
    @Req() req: any,
  ) {
    return this.recordsService.update(caseId, recordId, req.user.id, dto);
  }

  @Post(':recordId/sign')
  @CaseAccess('edit')
  @UseGuards(ClinicalWriteGuard)
  async sign(
    @Param('caseId') caseId: string,
    @Param('recordId') recordId: string,
    @Body() body: { signatureName?: string },
    @Req() req: any,
  ) {
    return this.recordsService.sign(caseId, recordId, req.user.id, body?.signatureName);
  }

  @Post(':recordId/generate-report')
  @CaseAccess('edit')
  @UseGuards(ClinicalWriteGuard)
  async generateReport(
    @Param('caseId') caseId: string,
    @Param('recordId') recordId: string,
    @Body() dto: GenerateRecordReportDto,
    @Req() req: any,
  ) {
    return this.reportService.generate(
      caseId,
      recordId,
      req.user.id,
      dto?.audience ?? 'PROFESSIONAL',
      dto?.additionalContext,
    );
  }

  @Post(':recordId/insights')
  @CaseAccess('edit')
  @UseGuards(ClinicalWriteGuard)
  async generateInsights(
    @Param('caseId') caseId: string,
    @Param('recordId') recordId: string,
    @Req() req: any,
  ) {
    return this.insightsService.generate(caseId, recordId, req.user.id);
  }

  @Delete(':recordId')
  @CaseAccess('edit')
  @UseGuards(ClinicalWriteGuard)
  async remove(
    @Param('caseId') caseId: string,
    @Param('recordId') recordId: string,
    @Req() req: any,
  ) {
    return this.recordsService.remove(caseId, recordId, req.user.id);
  }
}
