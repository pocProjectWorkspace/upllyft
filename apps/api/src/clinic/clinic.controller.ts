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
import { ClinicAdminGuard } from '../common/clinic-admin';
import {
    CreateClinicTherapistDto,
    UpdateTherapistScheduleDto,
    UpdateClinicDto,
    CreateSessionTypeDto,
    UpdateSessionTypeDto,
    UpsertSessionPricingDto,
    SetupPracticeDto,
} from './dto/clinic.dto';

/**
 * A therapist's own practice: see whether they run one, and set one up. Setting up
 * makes them its owner — the admin of that one clinic (see ClinicService.setupPractice).
 */
@Controller('clinic/practice')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PracticeController {
    constructor(private readonly clinicService: ClinicService) { }

    /** Also answers "may this user administer a clinic?" for the /clinic section. */
    @Get()
    @Roles(Role.ADMIN, Role.THERAPIST)
    async getStatus(@Req() req: any) {
        return this.clinicService.getPracticeStatus(req.user);
    }

    @Post()
    @Roles(Role.THERAPIST)
    async setup(@Body() dto: SetupPracticeDto, @Req() req: any) {
        return this.clinicService.setupPractice(req.user.id, dto);
    }
}

/**
 * Clinic administration: platform/clinic ADMINs and anyone who owns or administers
 * a clinic facility (e.g. a therapist running their own practice). Every handler
 * acts on req.managedClinic, set by ClinicAdminGuard.
 */
@Controller('admin/clinic')
@UseGuards(JwtAuthGuard, ClinicAdminGuard)
export class ClinicController {
    constructor(private readonly clinicService: ClinicService) { }

    @Get()
    async getClinic(@Req() req: any) {
        return this.clinicService.getClinic(req.managedClinic);
    }

    @Patch()
    async updateClinic(@Body() dto: UpdateClinicDto, @Req() req: any) {
        return this.clinicService.updateClinic(req.managedClinic, dto);
    }

    @Get('therapists')
    async getTherapists(@Req() req: any) {
        return this.clinicService.getClinicTherapists(req.managedClinic);
    }

    @Post('therapists')
    async createTherapist(@Body() dto: CreateClinicTherapistDto, @Req() req: any) {
        return this.clinicService.createClinicTherapist(req.managedClinic, dto);
    }

    @Patch('therapists/:therapistId/schedule')
    async updateSchedule(
        @Param('therapistId') therapistId: string,
        @Body() dto: UpdateTherapistScheduleDto,
        @Req() req: any,
    ) {
        return this.clinicService.updateTherapistSchedule(therapistId, dto, req.managedClinic);
    }

    // --- Session Types ---

    @Get('therapists/:therapistId/session-types')
    async getSessionTypes(
        @Param('therapistId') therapistId: string,
        @Req() req: any,
    ) {
        return this.clinicService.getTherapistSessionTypes(req.managedClinic, therapistId);
    }

    @Post('therapists/:therapistId/session-types')
    async createSessionType(
        @Param('therapistId') therapistId: string,
        @Body() dto: CreateSessionTypeDto,
        @Req() req: any,
    ) {
        return this.clinicService.createSessionType(req.managedClinic, therapistId, dto);
    }

    @Patch('therapists/:therapistId/session-types/:sessionTypeId')
    async updateSessionType(
        @Param('therapistId') therapistId: string,
        @Param('sessionTypeId') sessionTypeId: string,
        @Body() dto: UpdateSessionTypeDto,
        @Req() req: any,
    ) {
        return this.clinicService.updateSessionType(req.managedClinic, therapistId, sessionTypeId, dto);
    }

    @Delete('therapists/:therapistId/session-types/:sessionTypeId')
    async deleteSessionType(
        @Param('therapistId') therapistId: string,
        @Param('sessionTypeId') sessionTypeId: string,
        @Req() req: any,
    ) {
        return this.clinicService.deleteSessionType(req.managedClinic, therapistId, sessionTypeId);
    }

    // --- Pricing ---

    @Get('therapists/:therapistId/pricing')
    async getPricing(
        @Param('therapistId') therapistId: string,
        @Req() req: any,
    ) {
        return this.clinicService.getTherapistPricing(req.managedClinic, therapistId);
    }

    @Post('therapists/:therapistId/pricing')
    async upsertPricing(
        @Param('therapistId') therapistId: string,
        @Body() dto: UpsertSessionPricingDto,
        @Req() req: any,
    ) {
        return this.clinicService.upsertSessionPricing(req.managedClinic, therapistId, dto);
    }
}
