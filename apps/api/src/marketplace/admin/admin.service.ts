import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    UpdatePlatformSettingsDto,
    PlatformSettingsResponseDto,
    AnalyticsQueryDto,
    PlatformAnalyticsResponseDto,
    RevenueBreakdownDto,
} from './dto/admin.dto';
import { BookingStatus, Prisma } from '@prisma/client';
import { startOfDay, endOfDay, subMonths, subDays } from 'date-fns';

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Get platform settings
     */
    async getPlatformSettings(): Promise<PlatformSettingsResponseDto> {
        let settings = await this.prisma.platformSettings.findFirst();

        // Create default settings if none exist
        if (!settings) {
            settings = await this.prisma.platformSettings.create({
                data: {
                    platformCommissionPercentage: 15,
                    escrowHoldHours: 2,
                    enableMarketplace: true,
                },
            });
        }

        return {
            platformCommissionPercentage: settings.platformCommissionPercentage,
            escrowHoldHours: settings.escrowHoldHours,
            enableMarketplace: settings.enableMarketplace,
            stripePlatformAccountId: settings.stripePlatformAccountId || undefined,
            createdAt: settings.createdAt.toISOString(),
            updatedAt: settings.updatedAt.toISOString(),
        };
    }

    /**
     * Update platform settings
     */
    async updatePlatformSettings(dto: UpdatePlatformSettingsDto): Promise<PlatformSettingsResponseDto> {
        let settings = await this.prisma.platformSettings.findFirst();

        if (!settings) {
            // Create if doesn't exist
            settings = await this.prisma.platformSettings.create({
                data: {
                    platformCommissionPercentage: dto.platformCommissionPercentage ?? 15,
                    escrowHoldHours: dto.escrowHoldHours ?? 2,
                    enableMarketplace: dto.enableMarketplace ?? true,
                },
            });
        } else {
            // Update existing
            settings = await this.prisma.platformSettings.update({
                where: { id: settings.id },
                data: {
                    platformCommissionPercentage: dto.platformCommissionPercentage,
                    escrowHoldHours: dto.escrowHoldHours,
                    enableMarketplace: dto.enableMarketplace,
                },
            });
        }

        this.logger.log(`Platform settings updated: Commission=${settings.platformCommissionPercentage}%, Escrow=${settings.escrowHoldHours}h`);

        return {
            platformCommissionPercentage: settings.platformCommissionPercentage,
            escrowHoldHours: settings.escrowHoldHours,
            enableMarketplace: settings.enableMarketplace,
            stripePlatformAccountId: settings.stripePlatformAccountId || undefined,
            createdAt: settings.createdAt.toISOString(),
            updatedAt: settings.updatedAt.toISOString(),
        };
    }

    /**
     * Get platform analytics
     */
    async getPlatformAnalytics(query: AnalyticsQueryDto): Promise<PlatformAnalyticsResponseDto> {
        const startDate = query.startDate ? new Date(query.startDate) : subMonths(new Date(), 1);
        const endDate = query.endDate ? new Date(query.endDate) : new Date();

        const where: Prisma.BookingWhereInput = {
            createdAt: {
                gte: startOfDay(startDate),
                lte: endOfDay(endDate),
            },
        };

        // Get all bookings in period
        const bookings = await this.prisma.booking.findMany({
            where,
            select: {
                id: true,
                status: true,
                subtotal: true,
                platformFee: true,
                therapistAmount: true,
                organizationAmount: true,
            },
        });

        // Calculate revenue metrics
        const totalGMV = bookings.reduce((sum, b) => sum + (b.subtotal || 0), 0);
        const platformFees = bookings.reduce((sum, b) => sum + (b.platformFee || 0), 0);
        const therapistPayouts = bookings
            .filter((b) => b.status === BookingStatus.COMPLETED)
            .reduce((sum, b) => sum + (b.therapistAmount || 0), 0);
        const organizationPayouts = bookings
            .filter((b) => b.status === BookingStatus.COMPLETED)
            .reduce((sum, b) => sum + (b.organizationAmount || 0), 0);

        // Calculate booking metrics
        const completed = bookings.filter((b) => b.status === BookingStatus.COMPLETED).length;
        const canceled = bookings.filter(
            (b) =>
                b.status === BookingStatus.CANCELLED_BY_PATIENT ||
                b.status === BookingStatus.CANCELLED_BY_THERAPIST,
        ).length;

        // Get disputes
        const disputes = await this.prisma.sessionDispute.count({
            where: {
                createdAt: {
                    gte: startOfDay(startDate),
                    lte: endOfDay(endDate),
                },
            },
        });

        // Calculate user metrics
        const activeTherapists = await this.prisma.therapistProfile.count({
            where: {
                isActive: true,
                acceptingBookings: true,
            },
        });

        const activePatients = await this.prisma.booking.groupBy({
            by: ['patientId'],
            where: {
                createdAt: {
                    gte: subDays(new Date(), 30),
                },
            },
        });

        const newTherapists = await this.prisma.therapistProfile.count({
            where: {
                createdAt: {
                    gte: startOfDay(startDate),
                    lte: endOfDay(endDate),
                },
            },
        });

        const newPatients = await this.prisma.user.count({
            where: {
                createdAt: {
                    gte: startOfDay(startDate),
                    lte: endOfDay(endDate),
                },
                patientBookings: {
                    some: {},
                },
            },
        });

        // Calculate growth (simplified - compare to previous period)
        const previousPeriodBookings = await this.prisma.booking.count({
            where: {
                createdAt: {
                    gte: subMonths(startOfDay(startDate), 1),
                    lte: subMonths(endOfDay(endDate), 1),
                },
            },
        });

        const momGrowth = previousPeriodBookings > 0
            ? (bookings.length - previousPeriodBookings) / previousPeriodBookings
            : 0;

        return {
            revenue: {
                totalGMV,
                platformFees,
                therapistPayouts,
                organizationPayouts,
            },
            bookings: {
                total: bookings.length,
                completed,
                canceled,
                disputed: disputes,
                completionRate: bookings.length > 0 ? completed / bookings.length : 0,
                cancellationRate: bookings.length > 0 ? canceled / bookings.length : 0,
            },
            users: {
                activeTherapists,
                activePatients: activePatients.length,
                newTherapists,
                newPatients,
            },
            growth: {
                momGrowth,
                retentionRate: 0.82, // Placeholder - would need cohort analysis
            },
        };
    }

    /**
     * Get revenue breakdown by organization and therapist
     */
    async getRevenueBreakdown(query: AnalyticsQueryDto): Promise<RevenueBreakdownDto> {
        const startDate = query.startDate ? new Date(query.startDate) : subMonths(new Date(), 1);
        const endDate = query.endDate ? new Date(query.endDate) : new Date();

        const where: Prisma.BookingWhereInput = {
            createdAt: {
                gte: startOfDay(startDate),
                lte: endOfDay(endDate),
            },
            status: BookingStatus.COMPLETED,
        };

        // Get all completed bookings
        const bookings = await this.prisma.booking.findMany({
            where,
            select: {
                subtotal: true,
                platformFee: true,
                therapistAmount: true,
                organizationAmount: true,
                organizationId: true,
                therapistId: true,
                organization: {
                    select: {
                        name: true,
                    },
                },
                therapist: {
                    select: {
                        user: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        const totalRevenue = bookings.reduce((sum, b) => sum + (b.subtotal || 0), 0);
        const platformRevenue = bookings.reduce((sum, b) => sum + (b.platformFee || 0), 0);
        const therapistRevenue = bookings.reduce((sum, b) => sum + (b.therapistAmount || 0), 0);
        const organizationRevenue = bookings.reduce((sum, b) => sum + (b.organizationAmount || 0), 0);

        // Group by organization
        const orgMap = new Map<string, { name: string; revenue: number; bookings: number }>();
        bookings.forEach((b) => {
            if (!b.organizationId) return;
            const existing = orgMap.get(b.organizationId) || {
                name: b.organization?.name || 'Unknown',
                revenue: 0,
                bookings: 0,
            };
            existing.revenue += b.organizationAmount || 0;
            existing.bookings += 1;
            orgMap.set(b.organizationId, existing);
        });

        // Group by therapist
        const therapistMap = new Map<string, { name: string; revenue: number; bookings: number }>();
        bookings.forEach((b) => {
            const existing = therapistMap.get(b.therapistId) || {
                name: b.therapist.user.name || 'Unknown',
                revenue: 0,
                bookings: 0,
            };
            existing.revenue += b.therapistAmount || 0;
            existing.bookings += 1;
            therapistMap.set(b.therapistId, existing);
        });

        return {
            period: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            },
            totalRevenue,
            platformRevenue,
            therapistRevenue,
            organizationRevenue,
            byOrganization: Array.from(orgMap.entries())
                .map(([id, data]) => ({
                    organizationId: id,
                    organizationName: data.name,
                    revenue: data.revenue,
                    bookings: data.bookings,
                }))
                .sort((a, b) => b.revenue - a.revenue),
            byTherapist: Array.from(therapistMap.entries())
                .map(([id, data]) => ({
                    therapistId: id,
                    therapistName: data.name,
                    revenue: data.revenue,
                    bookings: data.bookings,
                }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 20), // Top 20 therapists
        };
    }

    /**
     * Get all bookings (admin view)
     */
    async getAllBookings(query: any) {
        const { page = 1, limit = 20, status, search } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.BookingWhereInput = {};
        if (status) {
            where.status = status;
        }
        if (search) {
            where.OR = [
                { patient: { name: { contains: search, mode: 'insensitive' } } },
                { therapist: { user: { name: { contains: search, mode: 'insensitive' } } } },
                { id: { contains: search } },
            ];
        }

        const [bookings, total] = await Promise.all([
            this.prisma.booking.findMany({
                where,
                skip,
                take: Number(limit),
                include: {
                    patient: {
                        select: { id: true, name: true, email: true, image: true },
                    },
                    therapist: {
                        include: {
                            user: {
                                select: { id: true, name: true, email: true, image: true },
                            },
                        },
                    },
                    sessionType: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.booking.count({ where }),
        ]);

        return {
            bookings,
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
        };
    }

    /**
     * Get all therapists with commission data
     */
    async getTherapistsWithCommission(query: any) {
        const { page = 1, limit = 20, search } = query;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (search) {
            where.user = {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                ],
            };
        }

        const [therapists, total] = await Promise.all([
            this.prisma.therapistProfile.findMany({
                where,
                skip,
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    bookings: {
                        where: { status: 'COMPLETED' },
                        select: {
                            subtotal: true,
                        },
                    },
                },
            }),
            this.prisma.therapistProfile.count({ where }),
        ]);

        // Get global platform commission
        const platformSettings = await this.prisma.platformSettings.findFirst();
        const globalCommission = platformSettings?.platformCommissionPercentage || 15;

        const therapistsWithData = therapists.map((therapist) => ({
            id: therapist.id,
            name: therapist.user.name || therapist.user.email,
            email: therapist.user.email,
            commissionPercentage: therapist.commissionPercentage,
            effectiveCommission: therapist.commissionPercentage ?? globalCommission,
            totalBookings: therapist.bookings.length,
            totalRevenue: therapist.bookings.reduce((sum, b) => sum + (b.subtotal || 0), 0),
        }));

        return {
            therapists: therapistsWithData,
            total,
            page,
            limit,
            globalCommission,
        };
    }

    /**
     * Update therapist commission percentage
     */
    async updateTherapistCommission(therapistId: string, commissionPercentage: number | null) {
        // Validate percentage if not null
        if (commissionPercentage !== null && (commissionPercentage < 0 || commissionPercentage > 100)) {
            throw new Error('Commission percentage must be between 0 and 100');
        }

        const therapist = await this.prisma.therapistProfile.update({
            where: { id: therapistId },
            data: { commissionPercentage },
            select: {
                id: true,
                commissionPercentage: true,
                user: {
                    select: { name: true },
                },
            },
        });

        this.logger.log(
            `Updated commission for therapist ${therapist.user.name} to ${commissionPercentage ?? 'global default'}%`
        );

        return {
            id: therapist.id,
            commissionPercentage: therapist.commissionPercentage,
            message: commissionPercentage === null
                ? 'Commission reset to global default'
                : `Commission updated to ${commissionPercentage}%`,
        };
    }

    /**
     * Get all organizations with commission data
     */
    async getOrganizationsWithCommission(query: any) {
        const { page = 1, limit = 20, search } = query;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (search) {
            where.name = { contains: search, mode: 'insensitive' };
        }

        const [organizations, total] = await Promise.all([
            this.prisma.organization.findMany({
                where,
                skip,
                take: limit,
                include: {
                    therapistLinks: {
                        where: { status: 'APPROVED' },
                    },
                    bookings: {
                        where: { status: 'COMPLETED' },
                        select: {
                            subtotal: true,
                        },
                    },
                },
            }),
            this.prisma.organization.count({ where }),
        ]);

        // Get global platform commission
        const platformSettings = await this.prisma.platformSettings.findFirst();
        const globalCommission = platformSettings?.platformCommissionPercentage || 15;

        const organizationsWithData = organizations.map((org) => ({
            id: org.id,
            name: org.name,
            commissionPercentage: org.commissionPercentage,
            effectiveCommission: org.commissionPercentage ?? globalCommission,
            therapistCount: org.therapistLinks.length,
            totalBookings: org.bookings.length,
            totalRevenue: org.bookings.reduce((sum, b) => sum + (b.subtotal || 0), 0),
        }));

        return {
            organizations: organizationsWithData,
            total,
            page,
            limit,
            globalCommission,
        };
    }

    /**
     * Update organization commission percentage
     */
    async updateOrganizationCommission(organizationId: string, commissionPercentage: number | null) {
        // Validate percentage if not null
        if (commissionPercentage !== null && (commissionPercentage < 0 || commissionPercentage > 100)) {
            throw new Error('Commission percentage must be between 0 and 100');
        }

        const organization = await this.prisma.organization.update({
            where: { id: organizationId },
            data: { commissionPercentage },
            select: {
                id: true,
                name: true,
                commissionPercentage: true,
            },
        });

        this.logger.log(
            `Updated commission for organization ${organization.name} to ${commissionPercentage ?? 'global default'}%`
        );

        return {
            id: organization.id,
            commissionPercentage: organization.commissionPercentage,
            message: commissionPercentage === null
                ? 'Commission reset to global default'
                : `Commission updated to ${commissionPercentage}%`,
        };
    }
}
