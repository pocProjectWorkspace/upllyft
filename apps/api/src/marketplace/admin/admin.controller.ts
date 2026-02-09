import { Controller, Get, Patch, Body, Query, Param, UseGuards } from '@nestjs/common';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/guards/roles.decorator';
import {
    UpdatePlatformSettingsDto,
    PlatformSettingsResponseDto,
    AnalyticsQueryDto,
    PlatformAnalyticsResponseDto,
    RevenueBreakdownDto,
} from './dto/admin.dto';

@Controller('marketplace/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
    constructor(private adminService: AdminService) { }

    /**
     * Get platform settings (admin only)
     */
    @Get('settings')
    async getPlatformSettings(): Promise<PlatformSettingsResponseDto> {
        return this.adminService.getPlatformSettings();
    }

    /**
     * Update platform settings (admin only)
     */
    @Patch('settings')
    async updatePlatformSettings(
        @Body() dto: UpdatePlatformSettingsDto,
    ): Promise<PlatformSettingsResponseDto> {
        return this.adminService.updatePlatformSettings(dto);
    }

    /**
     * Get platform analytics (admin only)
     */
    @Get('analytics')
    async getPlatformAnalytics(@Query() query: AnalyticsQueryDto): Promise<PlatformAnalyticsResponseDto> {
        return this.adminService.getPlatformAnalytics(query);
    }

    /**
     * Get revenue breakdown (admin only)
     */
    @Get('revenue')
    async getRevenueBreakdown(@Query() query: AnalyticsQueryDto): Promise<RevenueBreakdownDto> {
        return this.adminService.getRevenueBreakdown(query);
    }

    /**
     * Get all therapists with commission data
     */
    @Get('therapists')
    async getTherapistsWithCommission(@Query() query: any) {
        return this.adminService.getTherapistsWithCommission(query);
    }

    /**
     * Update therapist commission percentage
     */
    @Patch('therapists/:therapistId/commission')
    async updateTherapistCommission(
        @Param('therapistId') therapistId: string,
        @Body() body: { commissionPercentage: number | null },
    ) {
        return this.adminService.updateTherapistCommission(therapistId, body.commissionPercentage);
    }

    /**
     * Get all bookings (admin view with filters)
     */
    @Get('bookings')
    async getAllBookings(@Query() query: any) {
        return this.adminService.getAllBookings(query);
    }

    /**
     * Get all organizations with commission data
     */
    @Get('organizations')
    async getOrganizationsWithCommission(@Query() query: any) {
        return this.adminService.getOrganizationsWithCommission(query);
    }

    /**
     * Update organization commission percentage
     */
    @Patch('organizations/:organizationId/commission')
    async updateOrganizationCommission(
        @Param('organizationId') organizationId: string,
        @Body() body: { commissionPercentage: number | null },
    ) {
        return this.adminService.updateOrganizationCommission(organizationId, body.commissionPercentage);
    }
}
