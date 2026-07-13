import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { Role } from '@prisma/client';
import { ClinicOutcomesService } from './clinic-outcomes.service';
import { resolveClinicScope } from '../common/tenant-scope';

@Controller('admin/outcomes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.THERAPIST)
export class ClinicOutcomesController {
  constructor(private readonly outcomesService: ClinicOutcomesService) {}

  @Get('summary')
  async getClinicSummary(@Req() req: any) {
    return this.outcomesService.getClinicSummary(resolveClinicScope(req.user));
  }

  @Get('goals')
  async getGoalProgress(@Req() req: any) {
    return this.outcomesService.getGoalProgress(resolveClinicScope(req.user));
  }

  @Get('screening-trends')
  async getScreeningTrends(@Req() req: any) {
    return this.outcomesService.getScreeningTrends(resolveClinicScope(req.user));
  }

  @Get('patients')
  async getPatientOutcomes(
    @Req() req: any,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('therapistId') therapistId?: string,
  ) {
    return this.outcomesService.getPatientOutcomes({
      sortBy,
      sortOrder,
      therapistId,
      facilityId: resolveClinicScope(req.user),
    });
  }

  @Get('patient/:childId')
  async getPatientOutcomeDetail(@Param('childId') childId: string, @Req() req: any) {
    return this.outcomesService.getPatientOutcomeDetail(
      childId,
      resolveClinicScope(req.user),
    );
  }
}
