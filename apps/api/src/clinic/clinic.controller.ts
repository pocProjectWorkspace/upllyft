import {
    Controller,
    Get,
    Post,
    Patch,
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
import { CreateClinicTherapistDto, UpdateTherapistScheduleDto, UpdateClinicDto } from './dto/clinic.dto';

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
}
