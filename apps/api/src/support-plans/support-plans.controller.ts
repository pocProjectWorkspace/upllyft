import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SupportPlansService } from './support-plans.service';
import {
  CreateSupportPlanDto,
  UpdateSupportPlanDto,
  OutcomeInputDto,
  UpdateOutcomeDto,
  AddInterventionDto,
  AddReviewDto,
  AcknowledgeSupportPlanDto,
} from './dto/support-plans.dto';

/**
 * Staff-facing support plans (F7 + F8). Includes the staff-private notes. Every method
 * re-checks the plan gate (inclusion role + capability + consent) in the service.
 */
@ApiTags('support-plans')
@Controller('facilities/:facilityId/children/:childId/support-plans')
@UseGuards(JwtAuthGuard)
export class SupportPlansController {
  constructor(private readonly plans: SupportPlansService) {}

  @Get()
  @ApiOperation({ summary: 'Support plans for this child at this nursery (staff view)' })
  list(@Req() req: any, @Param('facilityId') facilityId: string, @Param('childId') childId: string) {
    return this.plans.listForFacility(req.user, facilityId, childId);
  }

  @Post()
  @ApiOperation({ summary: 'Open a support plan (draft), optionally with initial outcomes' })
  create(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Param('childId') childId: string,
    @Body() dto: CreateSupportPlanDto,
  ) {
    return this.plans.create(req.user, facilityId, childId, dto);
  }

  @Patch(':planId')
  @ApiOperation({ summary: 'Edit a support plan' })
  update(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Param('planId') planId: string,
    @Body() dto: UpdateSupportPlanDto,
  ) {
    return this.plans.update(req.user, facilityId, planId, dto);
  }

  @Post(':planId/outcomes')
  @ApiOperation({ summary: 'Add a targeted outcome to a plan' })
  addOutcome(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Param('planId') planId: string,
    @Body() dto: OutcomeInputDto,
  ) {
    return this.plans.addOutcome(req.user, facilityId, planId, dto);
  }

  @Patch(':planId/outcomes/:outcomeId')
  @ApiOperation({ summary: 'Update an outcome (progress, status, text)' })
  updateOutcome(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Param('planId') planId: string,
    @Param('outcomeId') outcomeId: string,
    @Body() dto: UpdateOutcomeDto,
  ) {
    return this.plans.updateOutcome(req.user, facilityId, planId, outcomeId, dto);
  }

  @Post(':planId/outcomes/:outcomeId/interventions')
  @ApiOperation({ summary: 'Record an intervention (in-setting or home) for an outcome' })
  addIntervention(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Param('planId') planId: string,
    @Param('outcomeId') outcomeId: string,
    @Body() dto: AddInterventionDto,
  ) {
    return this.plans.addIntervention(req.user, facilityId, planId, outcomeId, dto);
  }

  @Post(':planId/reviews')
  @ApiOperation({ summary: 'Run a review cycle (Assess-Plan-Do-Review)' })
  addReview(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Param('planId') planId: string,
    @Body() dto: AddReviewDto,
  ) {
    return this.plans.addReview(req.user, facilityId, planId, dto);
  }

  @Post(':planId/share')
  @ApiOperation({ summary: 'Share the plan with the guardian' })
  share(
    @Req() req: any,
    @Param('facilityId') facilityId: string,
    @Param('planId') planId: string,
  ) {
    return this.plans.share(req.user, facilityId, planId);
  }
}

/**
 * GUARDIAN-facing. Only SHARED plans; never the staff notes, and only HOME strategies.
 */
@ApiTags('support-plans')
@Controller('children/:childId/support-plans')
@UseGuards(JwtAuthGuard)
export class GuardianSupportPlansController {
  constructor(private readonly plans: SupportPlansService) {}

  @Get()
  @ApiOperation({ summary: 'Support plans a nursery has shared about your child' })
  list(@Req() req: any, @Param('childId') childId: string) {
    return this.plans.listForGuardian(req.user, childId);
  }

  @Post(':planId/acknowledge')
  @ApiOperation({ summary: 'Acknowledge a shared support plan (optionally with a response)' })
  acknowledge(
    @Req() req: any,
    @Param('childId') childId: string,
    @Param('planId') planId: string,
    @Body() dto: AcknowledgeSupportPlanDto,
  ) {
    return this.plans.acknowledge(req.user, childId, planId, dto);
  }
}
