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
import { IEPsService } from './ieps.service';
import { IEPAiService } from './iep-ai.service';
import {
  CreateIEPDto,
  UpdateIEPDto,
  ApproveIEPDto,
  CreateIEPGoalDto,
  UpdateIEPGoalDto,
  BulkCreateGoalsDto,
  CreateIEPTemplateDto,
  UpdateIEPTemplateDto,
  CreateGoalBankItemDto,
  SearchGoalBankDto,
  GenerateIEPDto,
  SuggestGoalsDto,
  ListIEPsQueryDto,
} from './dto/ieps.dto';

// ─── CASE-SCOPED IEP ENDPOINTS ──────────────────────────

@Controller('cases/:caseId/ieps')
@UseGuards(JwtAuthGuard, CaseAccessGuard)
export class CaseIEPsController {
  constructor(
    private iepsService: IEPsService,
    private iepAiService: IEPAiService,
  ) {}

  @Post()
  @CaseAccess('edit')
  async createIEP(
    @Param('caseId') caseId: string,
    @Body() dto: CreateIEPDto,
    @Req() req: any,
  ) {
    return this.iepsService.createIEP(caseId, req.user.id, dto);
  }

  @Get()
  @CaseAccess('view')
  async listIEPs(
    @Param('caseId') caseId: string,
    @Query() query: ListIEPsQueryDto,
  ) {
    return this.iepsService.listIEPs(caseId, query);
  }

  @Get(':iepId')
  @CaseAccess('view')
  async getIEP(
    @Param('caseId') caseId: string,
    @Param('iepId') iepId: string,
  ) {
    return this.iepsService.getIEP(caseId, iepId);
  }

  @Patch(':iepId')
  @CaseAccess('edit')
  async updateIEP(
    @Param('caseId') caseId: string,
    @Param('iepId') iepId: string,
    @Body() dto: UpdateIEPDto,
    @Req() req: any,
  ) {
    return this.iepsService.updateIEP(caseId, iepId, req.user.id, dto);
  }

  @Post(':iepId/approve')
  @CaseAccess('view') // Parents can also approve
  async approveIEP(
    @Param('caseId') caseId: string,
    @Param('iepId') iepId: string,
    @Body() dto: ApproveIEPDto,
    @Req() req: any,
  ) {
    return this.iepsService.approveIEP(caseId, iepId, req.user.id, dto.approverRole);
  }

  @Post(':iepId/new-version')
  @CaseAccess('edit')
  async createNewVersion(
    @Param('caseId') caseId: string,
    @Param('iepId') iepId: string,
    @Req() req: any,
  ) {
    return this.iepsService.createNewVersion(caseId, iepId, req.user.id);
  }

  // ─── GOALS ─────────────────────────────────────────────

  @Post(':iepId/goals')
  @CaseAccess('edit')
  async addGoal(
    @Param('caseId') caseId: string,
    @Param('iepId') iepId: string,
    @Body() dto: CreateIEPGoalDto,
    @Req() req: any,
  ) {
    return this.iepsService.addGoal(caseId, iepId, req.user.id, dto);
  }

  @Post(':iepId/goals/bulk')
  @CaseAccess('edit')
  async bulkAddGoals(
    @Param('caseId') caseId: string,
    @Param('iepId') iepId: string,
    @Body() dto: BulkCreateGoalsDto,
    @Req() req: any,
  ) {
    return this.iepsService.bulkAddGoals(caseId, iepId, req.user.id, dto);
  }

  @Patch(':iepId/goals/:goalId')
  @CaseAccess('edit')
  async updateGoal(
    @Param('caseId') caseId: string,
    @Param('iepId') iepId: string,
    @Param('goalId') goalId: string,
    @Body() dto: UpdateIEPGoalDto,
    @Req() req: any,
  ) {
    return this.iepsService.updateGoal(caseId, iepId, goalId, req.user.id, dto);
  }

  @Delete(':iepId/goals/:goalId')
  @CaseAccess('edit')
  async deleteGoal(
    @Param('caseId') caseId: string,
    @Param('iepId') iepId: string,
    @Param('goalId') goalId: string,
    @Req() req: any,
  ) {
    return this.iepsService.deleteGoal(caseId, iepId, goalId, req.user.id);
  }

  // ─── AI ENDPOINTS (CASE-SCOPED) ───────────────────────

  @Post('generate')
  @CaseAccess('edit')
  async generateIEP(
    @Param('caseId') caseId: string,
    @Body() dto: GenerateIEPDto,
    @Req() req: any,
  ) {
    // Generate AI draft
    const generated = await this.iepAiService.generateIEPFromScreening(
      caseId,
      dto.assessmentId,
      dto.additionalContext,
    );

    // Create the IEP with generated goals
    const iep = await this.iepsService.createIEP(caseId, req.user.id, {
      templateId: dto.templateId,
      accommodations: generated.accommodations,
      servicesTracking: generated.suggestedServices,
    });

    // Add goals
    if (generated.goals.length > 0) {
      await this.iepsService.bulkAddGoals(caseId, iep.id, req.user.id, {
        goals: generated.goals.map((g, i) => ({
          domain: g.domain,
          goalText: g.goalText,
          targetDate: g.targetDate,
          linkedScreeningIndicators: g.linkedIndicators,
          order: i + 1,
        })),
      });
    }

    // Return the full IEP
    return this.iepsService.getIEP(caseId, iep.id);
  }

  @Post('suggest-goals')
  @CaseAccess('view')
  async suggestGoals(@Body() dto: SuggestGoalsDto) {
    return this.iepAiService.suggestGoals(
      dto.domain,
      dto.childAge,
      dto.assessmentId,
      dto.count || 5,
    );
  }
}

// ─── STANDALONE ENDPOINTS (not case-scoped) ─────────────

@Controller('iep-templates')
@UseGuards(JwtAuthGuard)
export class IEPTemplatesController {
  constructor(private iepsService: IEPsService) {}

  @Get()
  async listTemplates(@Req() req: any, @Query('organizationId') orgId?: string) {
    return this.iepsService.listTemplates(req.user.id, orgId);
  }

  @Post()
  async createTemplate(@Body() dto: CreateIEPTemplateDto, @Req() req: any) {
    return this.iepsService.createTemplate(req.user.id, dto);
  }

  @Get(':templateId')
  async getTemplate(@Param('templateId') templateId: string) {
    return this.iepsService.getTemplate(templateId);
  }

  @Patch(':templateId')
  async updateTemplate(
    @Param('templateId') templateId: string,
    @Body() dto: UpdateIEPTemplateDto,
    @Req() req: any,
  ) {
    return this.iepsService.updateTemplate(templateId, req.user.id, dto);
  }

  @Delete(':templateId')
  async deleteTemplate(@Param('templateId') templateId: string, @Req() req: any) {
    return this.iepsService.deleteTemplate(templateId, req.user.id);
  }
}

@Controller('goal-bank')
@UseGuards(JwtAuthGuard)
export class GoalBankController {
  constructor(private iepsService: IEPsService) {}

  @Get()
  async searchGoalBank(@Query() query: SearchGoalBankDto) {
    return this.iepsService.searchGoalBank(query);
  }

  @Post()
  async createGoalBankItem(@Body() dto: CreateGoalBankItemDto, @Req() req: any) {
    return this.iepsService.createGoalBankItem(req.user.id, dto);
  }
}
