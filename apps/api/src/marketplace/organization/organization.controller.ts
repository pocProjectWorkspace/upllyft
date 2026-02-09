import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
    LinkTherapistDto,
    UpdateTherapistLinkDto,
    CreateSessionTypeDto,
    UpdateSessionTypeDto,
    CreateAvailabilityTemplateDto,
    ApplyTemplateDto,
    UpdateRevenueSplitDto,
    AnalyticsQueryDto,
} from './dto/organization.dto';

@Controller('api/marketplace/organization')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
    constructor(private readonly organizationService: OrganizationService) { }

    // ==================== Therapist Management ====================

    /**
     * Link a therapist to an organization
     * POST /api/marketplace/organization/:id/therapists
     */
    @Post(':organizationId/therapists')
    async linkTherapist(
        @Param('organizationId') organizationId: string,
        @Body() dto: LinkTherapistDto,
    ) {
        return this.organizationService.linkTherapist(organizationId, dto);
    }

    /**
     * Get all therapists in an organization
     * GET /api/marketplace/organization/:id/therapists
     */
    @Get(':organizationId/therapists')
    async getTherapists(@Param('organizationId') organizationId: string) {
        return this.organizationService.getOrganizationTherapists(organizationId);
    }

    /**
     * Update therapist link (approval, revenue split, etc.)
     * PATCH /api/marketplace/organization/:id/therapists/:therapistId
     */
    @Patch(':organizationId/therapists/:therapistId')
    async updateTherapistLink(
        @Param('organizationId') organizationId: string,
        @Param('therapistId') therapistId: string,
        @Body() dto: UpdateTherapistLinkDto,
    ) {
        return this.organizationService.updateTherapistLink(
            organizationId,
            therapistId,
            dto,
        );
    }

    /**
     * Remove therapist from organization
     * DELETE /api/marketplace/organization/:id/therapists/:therapistId
     */
    @Delete(':organizationId/therapists/:therapistId')
    @HttpCode(HttpStatus.OK)
    async removeTherapist(
        @Param('organizationId') organizationId: string,
        @Param('therapistId') therapistId: string,
    ) {
        return this.organizationService.removeTherapist(organizationId, therapistId);
    }

    // ==================== Session Type Management ====================

    /**
     * Create a new session type
     * POST /api/marketplace/organization/:id/session-types
     */
    @Post(':organizationId/session-types')
    async createSessionType(
        @Param('organizationId') organizationId: string,
        @Body() dto: CreateSessionTypeDto,
    ) {
        return this.organizationService.createSessionType(organizationId, dto);
    }

    /**
     * Get all session types for an organization
     * GET /api/marketplace/organization/:id/session-types
     */
    @Get(':organizationId/session-types')
    async getSessionTypes(
        @Param('organizationId') organizationId: string,
        @Query('includeInactive') includeInactive?: string,
    ) {
        return this.organizationService.getOrganizationSessionTypes(
            organizationId,
            includeInactive === 'true',
        );
    }

    /**
     * Update a session type
     * PATCH /api/marketplace/organization/:id/session-types/:sessionTypeId
     */
    @Patch(':organizationId/session-types/:sessionTypeId')
    async updateSessionType(
        @Param('organizationId') organizationId: string,
        @Param('sessionTypeId') sessionTypeId: string,
        @Body() dto: UpdateSessionTypeDto,
    ) {
        return this.organizationService.updateSessionType(
            organizationId,
            sessionTypeId,
            dto,
        );
    }

    /**
     * Delete a session type
     * DELETE /api/marketplace/organization/:id/session-types/:sessionTypeId
     */
    @Delete(':organizationId/session-types/:sessionTypeId')
    @HttpCode(HttpStatus.OK)
    async deleteSessionType(
        @Param('organizationId') organizationId: string,
        @Param('sessionTypeId') sessionTypeId: string,
    ) {
        return this.organizationService.deleteSessionType(
            organizationId,
            sessionTypeId,
        );
    }

    // ==================== Availability Templates ====================

    /**
     * Create an availability template
     * POST /api/marketplace/organization/:id/templates
     */
    @Post(':organizationId/templates')
    async createTemplate(
        @Param('organizationId') organizationId: string,
        @Body() dto: CreateAvailabilityTemplateDto,
    ) {
        return this.organizationService.createAvailabilityTemplate(
            organizationId,
            dto,
        );
    }

    /**
     * Apply a template to a therapist
     * POST /api/marketplace/organization/:id/templates/:templateId/apply
     */
    @Post(':organizationId/templates/:templateId/apply')
    async applyTemplate(
        @Param('organizationId') organizationId: string,
        @Param('templateId') templateId: string,
        @Body() dto: ApplyTemplateDto,
    ) {
        return this.organizationService.applyTemplate(
            organizationId,
            templateId,
            dto,
        );
    }

    // ==================== Revenue Configuration ====================

    /**
     * Update default revenue split
     * PATCH /api/marketplace/organization/:id/revenue-split
     */
    @Patch(':organizationId/revenue-split')
    async updateRevenueSplit(
        @Param('organizationId') organizationId: string,
        @Body() dto: UpdateRevenueSplitDto,
    ) {
        return this.organizationService.updateRevenueSplit(organizationId, dto);
    }

    /**
     * Get current revenue split configuration
     * GET /api/marketplace/organization/:id/revenue-split
     */
    @Get(':organizationId/revenue-split')
    async getRevenueSplit(@Param('organizationId') organizationId: string) {
        return this.organizationService.getRevenueSplit(organizationId);
    }

    // ==================== Analytics ====================

    /**
     * Get revenue analytics
     * GET /api/marketplace/organization/:id/analytics/revenue
     */
    @Get(':organizationId/analytics/revenue')
    async getRevenueAnalytics(
        @Param('organizationId') organizationId: string,
        @Query() query: AnalyticsQueryDto,
    ) {
        return this.organizationService.getRevenueAnalytics(organizationId, query);
    }

    /**
     * Get booking statistics
     * GET /api/marketplace/organization/:id/analytics/bookings
     */
    @Get(':organizationId/analytics/bookings')
    async getBookingStatistics(
        @Param('organizationId') organizationId: string,
        @Query() query: AnalyticsQueryDto,
    ) {
        return this.organizationService.getBookingStatistics(organizationId, query);
    }

    /**
     * Get therapist performance metrics
     * GET /api/marketplace/organization/:id/analytics/therapists
     */
    @Get(':organizationId/analytics/therapists')
    async getTherapistPerformance(
        @Param('organizationId') organizationId: string,
        @Query() query: AnalyticsQueryDto,
    ) {
        return this.organizationService.getTherapistPerformance(
            organizationId,
            query,
        );
    }
}
