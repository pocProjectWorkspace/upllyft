import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { Role } from '@prisma/client';
import { ClinicService } from './clinic.service';
import {
    CreateClinicTherapistDto,
    UpdateTherapistScheduleDto,
    UpdateClinicDto,
    CreateSessionTypeDto,
    UpdateSessionTypeDto,
    UpsertSessionPricingDto,
} from './dto/clinic.dto';

@Controller('admin/clinic')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ClinicController {
    constructor(private readonly clinicService: ClinicService) { }

    @Get()
    async getClinic(@Req() req: any) {
        return this.clinicService.getClinicByAdminId(req.user.id);
    }

    @Patch()
    async updateClinic(@Body() dto: UpdateClinicDto, @Req() req: any) {
        return this.clinicService.updateClinic(req.user.id, dto);
    }

    @Get('therapists')
    async getTherapists(@Req() req: any) {
        return this.clinicService.getClinicTherapists(req.user.id);
    }

    @Post('therapists')
    async createTherapist(@Body() dto: CreateClinicTherapistDto, @Req() req: any) {
        return this.clinicService.createClinicTherapist(req.user.id, dto);
    }

    @Patch('therapists/:therapistId/schedule')
    async updateSchedule(
        @Param('therapistId') therapistId: string,
        @Body() dto: UpdateTherapistScheduleDto,
        @Req() req: any,
    ) {
        return this.clinicService.updateTherapistSchedule(therapistId, dto, req.user.id);
    }

    // --- Session Types ---

    @Get('therapists/:therapistId/session-types')
    async getSessionTypes(
        @Param('therapistId') therapistId: string,
        @Req() req: any,
    ) {
        return this.clinicService.getTherapistSessionTypes(req.user.id, therapistId);
    }

    @Post('therapists/:therapistId/session-types')
    async createSessionType(
        @Param('therapistId') therapistId: string,
        @Body() dto: CreateSessionTypeDto,
        @Req() req: any,
    ) {
        return this.clinicService.createSessionType(req.user.id, therapistId, dto);
    }

    @Patch('therapists/:therapistId/session-types/:sessionTypeId')
    async updateSessionType(
        @Param('therapistId') therapistId: string,
        @Param('sessionTypeId') sessionTypeId: string,
        @Body() dto: UpdateSessionTypeDto,
        @Req() req: any,
    ) {
        return this.clinicService.updateSessionType(req.user.id, therapistId, sessionTypeId, dto);
    }

    @Delete('therapists/:therapistId/session-types/:sessionTypeId')
    async deleteSessionType(
        @Param('therapistId') therapistId: string,
        @Param('sessionTypeId') sessionTypeId: string,
        @Req() req: any,
    ) {
        return this.clinicService.deleteSessionType(req.user.id, therapistId, sessionTypeId);
    }

    // --- Pricing ---

    @Get('therapists/:therapistId/pricing')
    async getPricing(
        @Param('therapistId') therapistId: string,
        @Req() req: any,
    ) {
        return this.clinicService.getTherapistPricing(req.user.id, therapistId);
    }

    @Post('therapists/:therapistId/pricing')
    async upsertPricing(
        @Param('therapistId') therapistId: string,
        @Body() dto: UpsertSessionPricingDto,
        @Req() req: any,
    ) {
        return this.clinicService.upsertSessionPricing(req.user.id, therapistId, dto);
    }
}
