import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { Role } from '@prisma/client';
import { ClinicTherapistsService } from './clinic-therapists.service';
import {
  ListTherapistsQueryDto,
  TherapistScheduleQueryDto,
  UpdateCredentialsDto,
} from './dto/clinic-therapists.dto';

@Controller('admin/therapists')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.THERAPIST)
export class ClinicTherapistsController {
  constructor(
    private readonly clinicTherapistsService: ClinicTherapistsService,
  ) {}

  @Get()
  async listTherapists(@Query() query: ListTherapistsQueryDto) {
    return this.clinicTherapistsService.listTherapists(query);
  }

  @Get('schedule')
  async getConsolidatedSchedule(@Query() query: TherapistScheduleQueryDto) {
    return this.clinicTherapistsService.getConsolidatedSchedule(query);
  }

  @Get(':id')
  async getTherapistDetail(@Param('id') id: string) {
    return this.clinicTherapistsService.getTherapistDetail(id);
  }

  @Get(':id/schedule')
  async getTherapistSchedule(
    @Param('id') id: string,
    @Query() query: TherapistScheduleQueryDto,
  ) {
    return this.clinicTherapistsService.getTherapistSchedule(id, query);
  }

  @Patch(':id/credentials')
  @Roles(Role.ADMIN)
  async updateCredentials(
    @Param('id') id: string,
    @Body() dto: UpdateCredentialsDto,
  ) {
    return this.clinicTherapistsService.updateCredentials(id, dto);
  }
}
