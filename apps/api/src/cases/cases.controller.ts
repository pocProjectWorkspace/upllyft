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
import { CaseAccessGuard, CaseAccess } from './guards/case-access.guard';
import { CasesService } from './cases.service';
import {
  CreateCaseDto,
  UpdateCaseStatusDto,
  AddCaseTherapistDto,
  UpdateCaseTherapistDto,
  TransferCaseDto,
  CreateInternalNoteDto,
  ListCasesQueryDto,
} from './dto/cases.dto';

@Controller('cases')
@UseGuards(JwtAuthGuard)
export class CasesController {
  constructor(private casesService: CasesService) {}

  // ─── CASE CRUD ───────────────────────────────────────────

  @Post()
  async createCase(@Body() dto: CreateCaseDto, @Req() req: any) {
    return this.casesService.createCase(req.user.id, dto);
  }

  @Get()
  async listCases(@Req() req: any, @Query() query: ListCasesQueryDto) {
    return this.casesService.listCases(req.user.id, query);
  }

  @Get(':caseId')
  @UseGuards(CaseAccessGuard)
  @CaseAccess('view')
  async getCaseDetail(@Param('caseId') caseId: string) {
    return this.casesService.getCaseDetail(caseId);
  }

  @Patch(':caseId/status')
  @UseGuards(CaseAccessGuard)
  @CaseAccess('manage')
  async updateCaseStatus(
    @Param('caseId') caseId: string,
    @Body() dto: UpdateCaseStatusDto,
    @Req() req: any,
  ) {
    return this.casesService.updateCaseStatus(caseId, req.user.id, dto);
  }

  // ─── THERAPIST MANAGEMENT ────────────────────────────────

  @Post(':caseId/therapists')
  @UseGuards(CaseAccessGuard)
  @CaseAccess('manage')
  async addTherapist(
    @Param('caseId') caseId: string,
    @Body() dto: AddCaseTherapistDto,
    @Req() req: any,
  ) {
    return this.casesService.addTherapist(caseId, req.user.id, dto);
  }

  @Patch(':caseId/therapists/:therapistId')
  @UseGuards(CaseAccessGuard)
  @CaseAccess('manage')
  async updateTherapist(
    @Param('caseId') caseId: string,
    @Param('therapistId') therapistId: string,
    @Body() dto: UpdateCaseTherapistDto,
    @Req() req: any,
  ) {
    return this.casesService.updateTherapist(caseId, therapistId, req.user.id, dto);
  }

  @Delete(':caseId/therapists/:therapistId')
  @UseGuards(CaseAccessGuard)
  @CaseAccess('manage')
  async removeTherapist(
    @Param('caseId') caseId: string,
    @Param('therapistId') therapistId: string,
    @Req() req: any,
  ) {
    return this.casesService.removeTherapist(caseId, therapistId, req.user.id);
  }

  @Post(':caseId/transfer')
  @UseGuards(CaseAccessGuard)
  @CaseAccess('manage')
  async transferCase(
    @Param('caseId') caseId: string,
    @Body() dto: TransferCaseDto,
    @Req() req: any,
  ) {
    return this.casesService.transferCase(caseId, req.user.id, dto);
  }

  // ─── INTERNAL NOTES ──────────────────────────────────────

  @Get(':caseId/internal-notes')
  @UseGuards(CaseAccessGuard)
  @CaseAccess('view')
  async getInternalNotes(@Param('caseId') caseId: string) {
    return this.casesService.getInternalNotes(caseId);
  }

  @Post(':caseId/internal-notes')
  @UseGuards(CaseAccessGuard)
  @CaseAccess('edit')
  async addInternalNote(
    @Param('caseId') caseId: string,
    @Body() dto: CreateInternalNoteDto,
    @Req() req: any,
  ) {
    return this.casesService.addInternalNote(caseId, req.user.id, dto.content);
  }

  // ─── TIMELINE ────────────────────────────────────────────

  @Get(':caseId/timeline')
  @UseGuards(CaseAccessGuard)
  @CaseAccess('view')
  async getCaseTimeline(
    @Param('caseId') caseId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.casesService.getCaseTimeline(caseId, cursor, parseInt(limit || '20', 10));
  }
}
