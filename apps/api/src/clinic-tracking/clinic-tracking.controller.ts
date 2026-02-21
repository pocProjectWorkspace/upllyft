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
import { ClinicTrackingService } from './clinic-tracking.service';
import {
  TrackingQueryDto,
  UpdateTrackingStatusDto,
} from './dto/clinic-tracking.dto';

@Controller('admin/tracking')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.THERAPIST)
export class ClinicTrackingController {
  constructor(private readonly clinicTrackingService: ClinicTrackingService) {}

  @Get('today')
  async getTodayAppointments(@Query() query: TrackingQueryDto) {
    return this.clinicTrackingService.getTodayAppointments(query.date);
  }

  @Patch(':bookingId')
  async updateTrackingStatus(
    @Param('bookingId') bookingId: string,
    @Body() dto: UpdateTrackingStatusDto,
  ) {
    return this.clinicTrackingService.updateTrackingStatus(bookingId, dto);
  }
}
