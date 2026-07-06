import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CaseAccessGuard, CaseAccess } from '../cases/guards/case-access.guard';
import { CarePlansService } from './care-plans.service';
import {
  CreateCarePlanDto,
  UpdateCarePlanDto,
  PreviewScheduleDto,
} from './dto/care-plans.dto';

@Controller('cases/:caseId/care-plans')
@UseGuards(JwtAuthGuard, CaseAccessGuard)
export class CarePlansController {
  constructor(private carePlans: CarePlansService) {}

  /** Configurable pricing + day/count defaults per recommendation type. */
  @Get('pricing-defaults')
  @CaseAccess('view')
  async pricingDefaults() {
    return this.carePlans.getPricingDefaults();
  }

  /** Live dated-schedule preview (no persistence). */
  @Post('preview-schedule')
  @CaseAccess('view')
  async preview(@Body() dto: PreviewScheduleDto) {
    const dates = this.carePlans.generateSchedule(
      new Date(dto.startDate),
      dto.daysOfWeek,
      dto.timeOfDay,
      dto.sessionCount,
    );
    return { count: dates.length, dates };
  }

  @Get()
  @CaseAccess('view')
  async list(@Param('caseId') caseId: string) {
    return this.carePlans.listPlans(caseId);
  }

  @Get(':planId')
  @CaseAccess('view')
  async get(@Param('caseId') caseId: string, @Param('planId') planId: string) {
    return this.carePlans.getPlan(caseId, planId);
  }

  @Post()
  @CaseAccess('edit')
  async create(
    @Param('caseId') caseId: string,
    @Body() dto: CreateCarePlanDto,
    @Req() req: any,
  ) {
    return this.carePlans.createPlan(caseId, req.user.id, dto);
  }

  @Patch(':planId')
  @CaseAccess('edit')
  async update(
    @Param('caseId') caseId: string,
    @Param('planId') planId: string,
    @Body() dto: UpdateCarePlanDto,
  ) {
    return this.carePlans.updatePlan(caseId, planId, dto);
  }

  @Post(':planId/lock')
  @CaseAccess('edit')
  async lock(@Param('caseId') caseId: string, @Param('planId') planId: string) {
    return this.carePlans.lockPlan(caseId, planId);
  }

  /** Generate the whole session series and activate the plan in one action. */
  @Post(':planId/confirm')
  @CaseAccess('edit')
  async confirm(
    @Param('caseId') caseId: string,
    @Param('planId') planId: string,
    @Req() req: any,
  ) {
    return this.carePlans.confirmAndBook(caseId, req.user.id, planId);
  }
}
