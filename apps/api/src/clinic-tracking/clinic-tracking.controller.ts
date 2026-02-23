import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { Role } from '@prisma/client';
import { ClinicTrackingService } from './clinic-tracking.service';
import {
  TrackingQueryDto,
  UpdateTrackingStatusDto,
  CreateWalkinBookingDto,
} from './dto/clinic-tracking.dto';

@Controller('admin/tracking')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.THERAPIST)
export class ClinicTrackingController {
  constructor(private readonly clinicTrackingService: ClinicTrackingService) { }

  @Get('today')
  async getTodayAppointments(@Query() query: TrackingQueryDto, @Req() req: any) {
    return this.clinicTrackingService.getTodayAppointments(query.date, req.user.clinicId);
  }

  @Post('book')
  @Roles(Role.ADMIN)
  async createWalkinBooking(@Body() dto: CreateWalkinBookingDto, @Req() req: any) {
    return this.clinicTrackingService.createWalkinBooking(dto, req.user.clinicId);
  }

  @Patch(':bookingId')
  async updateTrackingStatus(
    @Param('bookingId') bookingId: string,
    @Body() dto: UpdateTrackingStatusDto,
    @Req() req: any,
  ) {
    return this.clinicTrackingService.updateTrackingStatus(bookingId, dto, req.user.clinicId);
  }
}
