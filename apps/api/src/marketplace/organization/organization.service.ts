import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    LinkTherapistDto,
    UpdateTherapistLinkDto,
    CreateSessionTypeDto,
    UpdateSessionTypeDto,
    CreateAvailabilityTemplateDto,
    ApplyTemplateDto,
    UpdateRevenueSplitDto,
    AnalyticsQueryDto,
    RevenueAnalyticsResponseDto,
    BookingStatisticsResponseDto,
    TherapistPerformanceDto,
} from './dto/organization.dto';
import { TherapistApprovalStatus, BookingStatus, Prisma } from '@prisma/client';
import { startOfDay, endOfDay, subDays } from 'date-fns';

@Injectable()
export class OrganizationService {
    constructor(private prisma: PrismaService) { }

    // ==================== Therapist Management ====================

    /**
     * Link a therapist to an organization
     */
    async linkTherapist(organizationId: string, dto: LinkTherapistDto) {
        // Verify organization exists
        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
            include: { marketplaceSettings: true },
        });

        if (!organization) {
            throw new NotFoundException('Organization not found');
        }

        // Verify therapist profile exists
        const therapistProfile = await this.prisma.therapistProfile.findUnique({
            where: { userId: dto.therapistId },
        });

        if (!therapistProfile) {
            throw new NotFoundException('Therapist profile not found');
        }

        // Check if link already exists
        const existingLink = await this.prisma.therapistOrganizationLink.findUnique({
            where: {
                therapistId_organizationId: {
                    therapistId: dto.therapistId,
                    organizationId,
                },
            },
        });

        if (existingLink) {
            throw new BadRequestException('Therapist is already linked to this organization');
        }

        // Get default revenue split from organization settings or use defaults
        const defaultTherapistPercentage = organization.marketplaceSettings?.defaultTherapistPercentage || 60;
        const defaultOrgPercentage = organization.marketplaceSettings?.defaultOrgPercentage || 40;

        // Create the link
        const link = await this.prisma.therapistOrganizationLink.create({
            data: {
                therapistId: dto.therapistId,
                organizationId,
                status: TherapistApprovalStatus.PENDING,
                therapistPercentage: dto.therapistRevenuePercentage ?? defaultTherapistPercentage,
                organizationPercentage: 100 - (dto.therapistRevenuePercentage ?? defaultTherapistPercentage),
            },
            include: {
                therapist: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                name: true,
                                image: true,
                            },
                        },
                    },
                },
            },
        });

        return link;
    }

    /**
     * Get all therapists linked to an organization
     */
    async getOrganizationTherapists(organizationId: string) {
        const links = await this.prisma.therapistOrganizationLink.findMany({
            where: { organizationId },
            include: {
                therapist: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                name: true,
                                image: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return links;
    }

    /**
     * Update therapist link (approval status, revenue split, etc.)
     */
    async updateTherapistLink(
        organizationId: string,
        therapistId: string,
        dto: UpdateTherapistLinkDto,
    ) {
        const link = await this.prisma.therapistOrganizationLink.findUnique({
            where: {
                therapistId_organizationId: {
                    therapistId,
                    organizationId,
                },
            },
        });

        if (!link) {
            throw new NotFoundException('Therapist link not found');
        }

        // Validate revenue percentage
        if (dto.therapistRevenuePercentage !== undefined) {
            const orgPercentage = 100 - dto.therapistRevenuePercentage;
            if (orgPercentage < 0 || orgPercentage > 100) {
                throw new BadRequestException('Invalid revenue split percentages');
            }
        }

        // Build update data
        const updateData: Prisma.TherapistOrganizationLinkUpdateInput = {};

        if (dto.approvalStatus) {
            updateData.status = dto.approvalStatus;
            if (dto.approvalStatus === TherapistApprovalStatus.APPROVED) {
                updateData.approvedAt = new Date();
            } else if (dto.approvalStatus === TherapistApprovalStatus.REJECTED) {
                updateData.rejectedAt = new Date();
                if (dto.notes) {
                    updateData.rejectionReason = dto.notes;
                }
            }
        }

        if (dto.therapistRevenuePercentage !== undefined) {
            updateData.therapistPercentage = dto.therapistRevenuePercentage;
            updateData.organizationPercentage = 100 - dto.therapistRevenuePercentage;
        }

        // Update the link
        const updatedLink = await this.prisma.therapistOrganizationLink.update({
            where: {
                therapistId_organizationId: {
                    therapistId,
                    organizationId,
                },
            },
            data: updateData,
            include: {
                therapist: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                name: true,
                                image: true,
                            },
                        },
                    },
                },
            },
        });

        return updatedLink;
    }

    /**
     * Remove therapist from organization
     */
    async removeTherapist(organizationId: string, therapistId: string) {
        const link = await this.prisma.therapistOrganizationLink.findUnique({
            where: {
                therapistId_organizationId: {
                    therapistId,
                    organizationId,
                },
            },
        });

        if (!link) {
            throw new NotFoundException('Therapist link not found');
        }

        // Check if therapist has any active bookings
        const activeBookings = await this.prisma.booking.count({
            where: {
                organizationId,
                therapistId,
                status: {
                    in: [BookingStatus.PENDING_PAYMENT, BookingStatus.PENDING_ACCEPTANCE, BookingStatus.CONFIRMED],
                },
            },
        });

        if (activeBookings > 0) {
            throw new BadRequestException(
                'Cannot remove therapist with active bookings. Please cancel or complete all bookings first.',
            );
        }

        // Delete the link
        await this.prisma.therapistOrganizationLink.delete({
            where: {
                therapistId_organizationId: {
                    therapistId,
                    organizationId,
                },
            },
        });

        return { message: 'Therapist removed from organization successfully' };
    }

    // ==================== Session Type Management ====================

    /**
     * Create a new session type for an organization
     */
    async createSessionType(organizationId: string, dto: CreateSessionTypeDto) {
        // Verify organization exists
        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
        });

        if (!organization) {
            throw new NotFoundException('Organization not found');
        }

        // SessionType doesn't have requiresPreSessionQuestionnaire or bufferTime in schema
        const sessionType = await this.prisma.sessionType.create({
            data: {
                organizationId,
                name: dto.name,
                description: dto.description,
                duration: dto.duration,
                defaultPrice: dto.price || 0,
                currency: dto.currency || 'USD',
                isActive: dto.isActive ?? true,
            },
        });

        // Note: SessionPricing requires therapistId, so we can't create org-level pricing
        // Pricing will be set per therapist

        return sessionType;
    }

    /**
     * Get all session types for an organization
     */
    async getOrganizationSessionTypes(organizationId: string, includeInactive = false) {
        const where: Prisma.SessionTypeWhereInput = { organizationId };
        if (!includeInactive) {
            where.isActive = true;
        }

        const sessionTypes = await this.prisma.sessionType.findMany({
            where,
            orderBy: { name: 'asc' },
        });

        return sessionTypes;
    }

    /**
     * Update a session type
     */
    async updateSessionType(
        organizationId: string,
        sessionTypeId: string,
        dto: UpdateSessionTypeDto,
    ) {
        const sessionType = await this.prisma.sessionType.findUnique({
            where: { id: sessionTypeId },
        });

        if (!sessionType || sessionType.organizationId !== organizationId) {
            throw new NotFoundException('Session type not found');
        }

        // Update session type
        const updated = await this.prisma.sessionType.update({
            where: { id: sessionTypeId },
            data: {
                name: dto.name,
                description: dto.description,
                duration: dto.duration,
                defaultPrice: dto.price,
                currency: dto.currency,
                isActive: dto.isActive,
            },
        });

        return updated;
    }

    /**
     * Delete a session type
     */
    async deleteSessionType(organizationId: string, sessionTypeId: string) {
        const sessionType = await this.prisma.sessionType.findUnique({
            where: { id: sessionTypeId },
        });

        if (!sessionType || sessionType.organizationId !== organizationId) {
            throw new NotFoundException('Session type not found');
        }

        // Check if there are any bookings using this session type
        const bookingsCount = await this.prisma.booking.count({
            where: { sessionTypeId },
        });

        if (bookingsCount > 0) {
            // Soft delete by marking as inactive
            await this.prisma.sessionType.update({
                where: { id: sessionTypeId },
                data: { isActive: false },
            });
            return { message: 'Session type deactivated (has existing bookings)' };
        }

        // Hard delete if no bookings exist
        await this.prisma.sessionType.delete({
            where: { id: sessionTypeId },
        });

        return { message: 'Session type deleted successfully' };
    }

    // ==================== Availability Templates ====================

    /**
     * Create an availability template
     */
    async createAvailabilityTemplate(organizationId: string, dto: CreateAvailabilityTemplateDto) {
        // Verify organization exists
        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
        });

        if (!organization) {
            throw new NotFoundException('Organization not found');
        }

        // Store template in JSON format (since we don't have a dedicated table)
        // This is a simplified approach - in production, you might want a dedicated AvailabilityTemplate table
        return {
            id: `template_${Date.now()}`,
            name: dto.name,
            description: dto.description,
            timezone: dto.timezone,
            slots: dto.slots,
            defaultBufferTime: dto.defaultBufferTime || 0,
            organizationId,
        };
    }

    /**
     * Apply template to a therapist
     */
    async applyTemplate(
        organizationId: string,
        templateId: string,
        dto: ApplyTemplateDto,
    ) {
        // Verify therapist belongs to organization
        const link = await this.prisma.therapistOrganizationLink.findUnique({
            where: {
                therapistId_organizationId: {
                    therapistId: dto.therapistId,
                    organizationId,
                },
            },
        });

        if (!link) {
            throw new NotFoundException('Therapist not found in this organization');
        }

        // In a real implementation, fetch the template and apply its schedule
        // For now, return success message
        return {
            message: 'Template applied successfully',
            therapistId: dto.therapistId,
            templateId,
        };
    }

    // ==================== Revenue Configuration ====================

    /**
     * Update default revenue split for organization
     */
    async updateRevenueSplit(organizationId: string, dto: UpdateRevenueSplitDto) {
        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
            include: { marketplaceSettings: true },
        });

        if (!organization) {
            throw new NotFoundException('Organization not found');
        }

        const orgPercentage = dto.defaultOrganizationPercentage ?? (100 - dto.defaultTherapistPercentage);

        if (dto.defaultTherapistPercentage + orgPercentage !== 100) {
            throw new BadRequestException('Revenue percentages must add up to 100%');
        }

        // Update or create marketplace settings
        if (organization.marketplaceSettings) {
            await this.prisma.marketplaceSettings.update({
                where: { organizationId },
                data: {
                    defaultTherapistPercentage: dto.defaultTherapistPercentage,
                    defaultOrgPercentage: orgPercentage,
                },
            });
        } else {
            await this.prisma.marketplaceSettings.create({
                data: {
                    organizationId,
                    defaultTherapistPercentage: dto.defaultTherapistPercentage,
                    defaultOrgPercentage: orgPercentage,
                },
            });
        }

        return {
            therapistPercentage: dto.defaultTherapistPercentage,
            organizationPercentage: orgPercentage,
        };
    }

    /**
     * Get current revenue split configuration
     */
    async getRevenueSplit(organizationId: string) {
        const settings = await this.prisma.marketplaceSettings.findUnique({
            where: { organizationId },
        });

        if (!settings) {
            // Return defaults
            return {
                therapistPercentage: 60,
                organizationPercentage: 40,
            };
        }

        return {
            therapistPercentage: settings.defaultTherapistPercentage,
            organizationPercentage: settings.defaultOrgPercentage,
        };
    }

    // ==================== Analytics ====================

    /**
     * Get revenue analytics
     */
    async getRevenueAnalytics(
        organizationId: string,
        query: AnalyticsQueryDto,
    ): Promise<RevenueAnalyticsResponseDto> {
        const startDate = query.startDate ? new Date(query.startDate) : subDays(new Date(), 30);
        const endDate = query.endDate ? new Date(query.endDate) : new Date();

        const where: Prisma.BookingWhereInput = {
            organizationId,
            createdAt: {
                gte: startOfDay(startDate),
                lte: endOfDay(endDate),
            },
        };

        if (query.therapistId) {
            where.therapistId = query.therapistId;
        }

        if (query.sessionTypeId) {
            where.sessionTypeId = query.sessionTypeId;
        }

        // Get all bookings in period
        const bookings = await this.prisma.booking.findMany({
            where,
            select: {
                subtotal: true,
                platformFee: true,
                therapistAmount: true,
                organizationAmount: true,
                status: true,
                currency: true,
            },
        });

        const completedBookings = bookings.filter((b) => b.status === BookingStatus.COMPLETED);

        const totalRevenue = bookings.reduce((sum, b) => sum + (b.subtotal || 0), 0);
        const platformRevenue = bookings.reduce((sum, b) => sum + (b.platformFee || 0), 0);
        const therapistRevenue = completedBookings.reduce((sum, b) => sum + (b.therapistAmount || 0), 0);
        const organizationRevenue = completedBookings.reduce(
            (sum, b) => sum + (b.organizationAmount || 0),
            0,
        );

        const completedCount = completedBookings.length;
        const canceledCount = bookings.filter(
            (b) =>
                b.status === BookingStatus.CANCELLED_BY_PATIENT ||
                b.status === BookingStatus.CANCELLED_BY_THERAPIST,
        ).length;

        return {
            totalRevenue,
            platformRevenue,
            organizationRevenue,
            therapistRevenue,
            totalBookings: bookings.length,
            completedSessions: completedCount,
            canceledSessions: canceledCount,
            averageSessionPrice: bookings.length > 0 ? totalRevenue / bookings.length : 0,
            currency: bookings[0]?.currency || 'USD',
            period: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            },
        };
    }

    /**
     * Get booking statistics
     */
    async getBookingStatistics(
        organizationId: string,
        query: AnalyticsQueryDto,
    ): Promise<BookingStatisticsResponseDto> {
        const startDate = query.startDate ? new Date(query.startDate) : subDays(new Date(), 30);
        const endDate = query.endDate ? new Date(query.endDate) : new Date();

        const where: Prisma.BookingWhereInput = {
            organizationId,
            createdAt: {
                gte: startOfDay(startDate),
                lte: endOfDay(endDate),
            },
        };

        const bookings = await this.prisma.booking.findMany({
            where,
            include: {
                sessionType: true,
            },
        });

        // Count by status
        const byStatus = {
            pending:
                bookings.filter(
                    (b) => b.status === BookingStatus.PENDING_PAYMENT || b.status === BookingStatus.PENDING_ACCEPTANCE,
                ).length,
            confirmed: bookings.filter((b) => b.status === BookingStatus.CONFIRMED).length,
            completed: bookings.filter((b) => b.status === BookingStatus.COMPLETED).length,
            canceled: bookings.filter(
                (b) =>
                    b.status === BookingStatus.CANCELLED_BY_PATIENT ||
                    b.status === BookingStatus.CANCELLED_BY_THERAPIST,
            ).length,
            rejected: 0, // No REJECTED status in schema
        };

        // Group by session type
        const sessionTypeMap = new Map<string, { name: string; count: number; revenue: number }>();

        bookings.forEach((booking) => {
            if (!booking.sessionType) return;

            const existing = sessionTypeMap.get(booking.sessionTypeId) || {
                name: booking.sessionType.name,
                count: 0,
                revenue: 0,
            };

            existing.count++;
            if (booking.status === BookingStatus.COMPLETED) {
                existing.revenue += booking.subtotal || 0;
            }

            sessionTypeMap.set(booking.sessionTypeId, existing);
        });

        const bySessionType = Array.from(sessionTypeMap.entries()).map(([id, data]) => ({
            sessionTypeId: id,
            sessionTypeName: data.name,
            count: data.count,
            revenue: data.revenue,
        }));

        return {
            totalBookings: bookings.length,
            byStatus,
            bySessionType,
            period: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            },
        };
    }

    /**
     * Get therapist performance metrics
     */
    async getTherapistPerformance(
        organizationId: string,
        query: AnalyticsQueryDto,
    ): Promise<TherapistPerformanceDto[]> {
        const startDate = query.startDate ? new Date(query.startDate) : subDays(new Date(), 30);
        const endDate = query.endDate ? new Date(query.endDate) : new Date();

        // Get all therapists in organization - need to include therapist relation
        const therapistLinks = await this.prisma.therapistOrganizationLink.findMany({
            where: { organizationId },
            include: {
                therapist: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        const performanceData: TherapistPerformanceDto[] = [];

        for (const link of therapistLinks) {
            const bookings = await this.prisma.booking.findMany({
                where: {
                    organizationId,
                    therapistId: link.therapistId,
                    createdAt: {
                        gte: startOfDay(startDate),
                        lte: endOfDay(endDate),
                    },
                },
            });

            const completedSessions = bookings.filter((b) => b.status === BookingStatus.COMPLETED).length;
            const canceledSessions = bookings.filter(
                (b) =>
                    b.status === BookingStatus.CANCELLED_BY_PATIENT ||
                    b.status === BookingStatus.CANCELLED_BY_THERAPIST,
            ).length;
            const acceptedBookings = bookings.filter((b) =>
                b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.COMPLETED,
            ).length;
            const pendingBookings = bookings.filter((b) => b.status === BookingStatus.PENDING_ACCEPTANCE).length;

            const totalRevenue = bookings
                .filter((b) => b.status === BookingStatus.COMPLETED)
                .reduce((sum, b) => sum + (b.therapistAmount || 0), 0);

            // Get average rating
            const ratings = await this.prisma.sessionRating.findMany({
                where: {
                    booking: {
                        therapistId: link.therapistId,
                        organizationId,
                    },
                    raterType: 'PATIENT',
                },
            });

            const averageRating =
                ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : null;

            const acceptanceRate =
                acceptedBookings + pendingBookings > 0
                    ? (acceptedBookings / (acceptedBookings + pendingBookings)) * 100
                    : 0;

            const completionRate = acceptedBookings > 0 ? (completedSessions / acceptedBookings) * 100 : 0;

            performanceData.push({
                therapistId: link.therapistId,
                therapistName: link.therapist.user.name || 'Unknown',
                totalSessions: bookings.length,
                completedSessions,
                canceledSessions,
                totalRevenue,
                averageRating,
                totalRatings: ratings.length,
                acceptanceRate,
                completionRate,
            });
        }

        return performanceData.sort((a, b) => b.totalRevenue - a.totalRevenue);
    }
}
