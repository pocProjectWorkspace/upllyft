import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LeadStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LeadService } from './lead.service';
import { TriageService } from './triage.service';
import { MdtService } from './mdt.service';
import { TelehealthService } from './telehealth.service';
import { CareReviewService } from './care-review.service';
import { EhrExportService } from './ehr-export.service';
import {
  CreateLeadDto,
  UpdateLeadStatusDto,
  ConvertLeadDto,
  CreatePathwayTemplateDto,
  CreateTriageReviewDto,
  DecideTriageDto,
  CreateMdtReviewDto,
  CompleteMdtReviewDto,
  RecordTelehealthDto,
  CreateCaseReviewDto,
  CompleteCaseReviewDto,
  ActivateTreatmentPlanDto,
  FlagSessionDto,
  AddSessionAddendumDto,
  CreateEhrExportDto,
  ReconcileEhrExportDto,
} from './dto/orchestration.dto';

@Controller('leads')
@UseGuards(JwtAuthGuard)
export class LeadController {
  constructor(private leads: LeadService) {}
  @Get() list(@Query('clinicId') clinicId: string, @Query('status') status?: LeadStatus) {
    return this.leads.list(clinicId, status);
  }
  @Post() create(@Body() dto: CreateLeadDto) {
    return this.leads.create(dto);
  }
  @Patch(':leadId/status') updateStatus(@Param('leadId') leadId: string, @Body() dto: UpdateLeadStatusDto) {
    return this.leads.updateStatus(leadId, dto);
  }
  @Post(':leadId/convert') convert(@Param('leadId') leadId: string, @Body() dto: ConvertLeadDto) {
    return this.leads.convert(leadId, dto);
  }
}

@Controller('pathway-templates')
@UseGuards(JwtAuthGuard)
export class PathwayController {
  constructor(private triage: TriageService) {}
  @Get() list(@Query('clinicId') clinicId?: string) {
    return this.triage.listPathways(clinicId);
  }
  @Post() create(@Body() dto: CreatePathwayTemplateDto) {
    return this.triage.createPathway(dto);
  }
}

@Controller('triage')
@UseGuards(JwtAuthGuard)
export class TriageController {
  constructor(private triage: TriageService) {}
  @Get() list(@Query('caseId') caseId: string) {
    return this.triage.listTriage(caseId);
  }
  @Post() create(@Body() dto: CreateTriageReviewDto, @Req() req: any) {
    return this.triage.create(req.user.id, dto);
  }
  @Patch(':id/decision') decide(@Param('id') id: string, @Body() dto: DecideTriageDto) {
    return this.triage.decide(id, dto);
  }
  @Post(':id/acknowledge') acknowledge(@Param('id') id: string) {
    return this.triage.acknowledge(id);
  }
}

@Controller('mdt-reviews')
@UseGuards(JwtAuthGuard)
export class MdtController {
  constructor(private mdt: MdtService) {}
  @Get() list(@Query('caseId') caseId: string) {
    return this.mdt.list(caseId);
  }
  @Post() create(@Body() dto: CreateMdtReviewDto) {
    return this.mdt.create(dto);
  }
  @Patch(':id/attendance') attendance(
    @Param('id') id: string,
    @Body() body: { userId: string; attended?: boolean; approved?: boolean },
  ) {
    return this.mdt.recordAttendance(id, body.userId, !!body.attended, !!body.approved);
  }
  @Patch(':id/complete') complete(@Param('id') id: string, @Body() dto: CompleteMdtReviewDto, @Req() req: any) {
    return this.mdt.complete(id, req.user.id, dto);
  }
}

@Controller('case-sessions/:sessionId/telehealth')
@UseGuards(JwtAuthGuard)
export class TelehealthController {
  constructor(private telehealth: TelehealthService) {}
  @Put() record(@Param('sessionId') sessionId: string, @Body() dto: RecordTelehealthDto) {
    return this.telehealth.record(sessionId, dto);
  }
  @Post('end') end(@Param('sessionId') sessionId: string) {
    return this.telehealth.end(sessionId);
  }
}

@Controller('case-reviews')
@UseGuards(JwtAuthGuard)
export class CaseReviewController {
  constructor(private review: CareReviewService) {}
  @Get() list(@Query('caseId') caseId: string) {
    return this.review.listReviews(caseId);
  }
  @Post() create(@Body() dto: CreateCaseReviewDto) {
    return this.review.createReview(dto);
  }
  @Patch(':id/complete') complete(@Param('id') id: string, @Body() dto: CompleteCaseReviewDto, @Req() req: any) {
    return this.review.completeReview(id, req.user.id, dto);
  }
}

@Controller('treatment-plans')
@UseGuards(JwtAuthGuard)
export class TreatmentPlanActivationController {
  constructor(private review: CareReviewService) {}
  @Post(':id/activate') activate(@Param('id') id: string, @Body() dto: ActivateTreatmentPlanDto) {
    return this.review.activatePlan(id, dto);
  }
}

@Controller('case-sessions/:sessionId')
@UseGuards(JwtAuthGuard)
export class SessionExtrasController {
  constructor(private review: CareReviewService) {}
  @Post('flag') flag(@Param('sessionId') sessionId: string, @Body() dto: FlagSessionDto) {
    return this.review.flagSession(sessionId, dto);
  }
  @Get('addenda') listAddenda(@Param('sessionId') sessionId: string) {
    return this.review.listAddenda(sessionId);
  }
  @Post('addenda') addAddendum(@Param('sessionId') sessionId: string, @Body() dto: AddSessionAddendumDto, @Req() req: any) {
    return this.review.addAddendum(sessionId, req.user.id, dto);
  }
}

@Controller('ehr-exports')
@UseGuards(JwtAuthGuard)
export class EhrExportController {
  constructor(private ehr: EhrExportService) {}
  @Get() list(@Query('clinicId') clinicId: string) {
    return this.ehr.list(clinicId);
  }
  @Post() create(@Body() dto: CreateEhrExportDto, @Req() req: any) {
    return this.ehr.create(req.user.id, dto);
  }
  @Patch(':id/reconcile') reconcile(@Param('id') id: string, @Body() dto: ReconcileEhrExportDto) {
    return this.ehr.reconcile(id, dto);
  }
}
