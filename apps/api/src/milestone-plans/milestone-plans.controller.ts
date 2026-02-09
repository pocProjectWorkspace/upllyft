import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CaseAccessGuard, CaseAccess } from '../cases/guards/case-access.guard';
import { MilestonePlansService } from './milestone-plans.service';
import { MilestoneAiService } from './milestone-ai.service';
import {
  CreateMilestonePlanDto,
  CreateMilestoneDto,
  BulkCreateMilestonesDto,
  UpdateMilestoneDto,
  UpdateMilestonePlanDto,
  GenerateMilestonePlanDto,
} from './dto/milestone-plans.dto';

@Controller('cases/:caseId/milestone-plans')
@UseGuards(JwtAuthGuard, CaseAccessGuard)
export class MilestonePlansController {
  constructor(
    private plansService: MilestonePlansService,
    private milestoneAiService: MilestoneAiService,
  ) {}

  @Post()
  @CaseAccess('edit')
  async createPlan(
    @Param('caseId') caseId: string,
    @Body() dto: CreateMilestonePlanDto,
    @Req() req: any,
  ) {
    return this.plansService.createPlan(caseId, req.user.id, dto);
  }

  @Get()
  @CaseAccess('view')
  async listPlans(@Param('caseId') caseId: string) {
    return this.plansService.listPlans(caseId);
  }

  @Get(':planId')
  @CaseAccess('view')
  async getPlan(
    @Param('caseId') caseId: string,
    @Param('planId') planId: string,
  ) {
    return this.plansService.getPlan(caseId, planId);
  }

  @Patch(':planId')
  @CaseAccess('edit')
  async updatePlan(
    @Param('caseId') caseId: string,
    @Param('planId') planId: string,
    @Body() dto: UpdateMilestonePlanDto,
    @Req() req: any,
  ) {
    return this.plansService.updatePlan(caseId, planId, req.user.id, dto);
  }

  @Post(':planId/new-version')
  @CaseAccess('edit')
  async createNewVersion(
    @Param('caseId') caseId: string,
    @Param('planId') planId: string,
    @Req() req: any,
  ) {
    return this.plansService.createNewVersion(caseId, planId, req.user.id);
  }

  // ─── MILESTONES ────────────────────────────────────────

  @Post(':planId/milestones')
  @CaseAccess('edit')
  async addMilestone(
    @Param('caseId') caseId: string,
    @Param('planId') planId: string,
    @Body() dto: CreateMilestoneDto,
    @Req() req: any,
  ) {
    return this.plansService.addMilestone(caseId, planId, req.user.id, dto);
  }

  @Post(':planId/milestones/bulk')
  @CaseAccess('edit')
  async bulkAddMilestones(
    @Param('caseId') caseId: string,
    @Param('planId') planId: string,
    @Body() dto: BulkCreateMilestonesDto,
    @Req() req: any,
  ) {
    return this.plansService.bulkAddMilestones(caseId, planId, req.user.id, dto);
  }

  @Patch(':planId/milestones/:milestoneId')
  @CaseAccess('edit')
  async updateMilestone(
    @Param('caseId') caseId: string,
    @Param('planId') planId: string,
    @Param('milestoneId') milestoneId: string,
    @Body() dto: UpdateMilestoneDto,
    @Req() req: any,
  ) {
    return this.plansService.updateMilestone(caseId, planId, milestoneId, req.user.id, dto);
  }

  @Delete(':planId/milestones/:milestoneId')
  @CaseAccess('edit')
  async deleteMilestone(
    @Param('caseId') caseId: string,
    @Param('planId') planId: string,
    @Param('milestoneId') milestoneId: string,
    @Req() req: any,
  ) {
    return this.plansService.deleteMilestone(caseId, planId, milestoneId, req.user.id);
  }

  // ─── AI GENERATION ─────────────────────────────────────

  @Post('generate')
  @CaseAccess('edit')
  async generatePlan(
    @Param('caseId') caseId: string,
    @Body() dto: GenerateMilestonePlanDto,
    @Req() req: any,
  ) {
    const milestones = await this.milestoneAiService.generateMilestonesFromScreening(
      dto.assessmentId,
      dto.additionalContext,
    );

    const plan = await this.plansService.createPlan(caseId, req.user.id, {});

    if (milestones.length > 0) {
      await this.plansService.bulkAddMilestones(caseId, plan.id, req.user.id, {
        milestones: milestones.map((m, i) => ({
          domain: m.domain,
          description: m.description,
          expectedAge: m.expectedAge,
          targetDate: m.targetDate,
          order: i + 1,
        })),
      });
    }

    return this.plansService.getPlan(caseId, plan.id);
  }
}
