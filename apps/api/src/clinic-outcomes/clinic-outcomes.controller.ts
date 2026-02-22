import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { Role } from '@prisma/client';
import { ClinicOutcomesService } from './clinic-outcomes.service';

@Controller('admin/outcomes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.THERAPIST)
export class ClinicOutcomesController {
  constructor(private readonly outcomesService: ClinicOutcomesService) {}

  @Get('summary')
  async getClinicSummary() {
    return this.outcomesService.getClinicSummary();
  }

  @Get('goals')
  async getGoalProgress() {
    return this.outcomesService.getGoalProgress();
  }

  @Get('screening-trends')
  async getScreeningTrends() {
    return this.outcomesService.getScreeningTrends();
  }

  @Get('patients')
  async getPatientOutcomes(
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('therapistId') therapistId?: string,
  ) {
    return this.outcomesService.getPatientOutcomes({ sortBy, sortOrder, therapistId });
  }

  @Get('patient/:childId')
  async getPatientOutcomeDetail(@Param('childId') childId: string) {
    return this.outcomesService.getPatientOutcomeDetail(childId);
  }
}
