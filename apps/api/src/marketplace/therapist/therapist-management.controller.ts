import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('marketplace/therapists/me')
@UseGuards(JwtAuthGuard)
export class TherapistManagementController {
    constructor(private prisma: PrismaService) { }

    // ==================== Session Types Management ====================

    /**
     * Create a new session type
     */
    @Post('session-types')
    async createSessionType(@Body() dto: any, @Req() req: any) {
        const userId = req.user.id;
        const therapistProfile = await this.prisma.therapistProfile.findFirst({
            where: { userId },
        });

        if (!therapistProfile) {
            throw new NotFoundException('Therapist profile not found');
        }

        return this.prisma.sessionType.create({
            data: {
                name: dto.name,
                description: dto.description,
                duration: dto.duration,
                defaultPrice: dto.defaultPrice,
                currency: dto.currency || 'INR',
                therapistId: therapistProfile.id,
                isActive: true,
            },
        });
    }

    /**
     * Get my session types
     */
    @Get('session-types')
    async getMySessionTypes(@Req() req: any) {
        const userId = req.user.id;
        const therapistProfile = await this.prisma.therapistProfile.findFirst({
            where: { userId },
        });

        if (!therapistProfile) {
            throw new NotFoundException('Therapist profile not found');
        }

        return this.prisma.sessionType.findMany({
            where: { therapistId: therapistProfile.id },
            include: {
                sessionPricing: true,
            },
        });
    }

    /**
     * Update session type
     */
    @Patch('session-types/:id')
    async updateSessionType(
        @Param('id') sessionTypeId: string,
        @Body() dto: any,
        @Req() req: any
    ) {
        const userId = req.user.id;
        const therapistProfile = await this.prisma.therapistProfile.findFirst({
            where: { userId },
        });

        if (!therapistProfile) {
            throw new NotFoundException('Therapist profile not found');
        }

        // Verify ownership
        const sessionType = await this.prisma.sessionType.findFirst({
            where: {
                id: sessionTypeId,
                therapistId: therapistProfile.id,
            },
        });

        if (!sessionType) {
            throw new NotFoundException('Session type not found');
        }

        return this.prisma.sessionType.update({
            where: { id: sessionTypeId },
            data: {
                name: dto.name,
                description: dto.description,
                duration: dto.duration,
                defaultPrice: dto.defaultPrice,
                isActive: dto.isActive,
            },
        });
    }

    /**
     * Delete session type
     */
    @Delete('session-types/:id')
    async deleteSessionType(@Param('id') sessionTypeId: string, @Req() req: any) {
        const userId = req.user.id;
        const therapistProfile = await this.prisma.therapistProfile.findFirst({
            where: { userId },
        });

        if (!therapistProfile) {
            throw new NotFoundException('Therapist profile not found');
        }

        // Verify ownership
        const sessionType = await this.prisma.sessionType.findFirst({
            where: {
                id: sessionTypeId,
                therapistId: therapistProfile.id,
            },
        });

        if (!sessionType) {
            throw new NotFoundException('Session type not found');
        }

        // Soft delete by marking as inactive
        return this.prisma.sessionType.update({
            where: { id: sessionTypeId },
            data: { isActive: false },
        });
    }

    // ==================== Pricing Management ====================

    /**
     * Update pricing for a session type
     */
    @Post('pricing')
    async updatePricing(@Body() dto: any, @Req() req: any) {
        const userId = req.user.id;
        const therapistProfile = await this.prisma.therapistProfile.findFirst({
            where: { userId },
        });

        if (!therapistProfile) {
            throw new NotFoundException('Therapist profile not found');
        }

        // Verify session type ownership
        const sessionType = await this.prisma.sessionType.findFirst({
            where: {
                id: dto.sessionTypeId,
                therapistId: therapistProfile.id,
            },
        });

        if (!sessionType) {
            throw new NotFoundException('Session type not found');
        }

        // Upsert pricing
        return this.prisma.sessionPricing.upsert({
            where: {
                therapistId_sessionTypeId: {
                    therapistId: therapistProfile.id,
                    sessionTypeId: dto.sessionTypeId,
                },
            },
            create: {
                therapistId: therapistProfile.id,
                sessionTypeId: dto.sessionTypeId,
                price: dto.basePrice,
                currency: dto.currency || 'INR',
                isActive: true,
            },
            update: {
                price: dto.basePrice,
                currency: dto.currency || 'INR',
            },
        });
    }

    /**
     * Get my pricing
     */
    @Get('pricing')
    async getMyPricing(@Req() req: any) {
        const userId = req.user.id;
        const therapistProfile = await this.prisma.therapistProfile.findFirst({
            where: { userId },
        });

        if (!therapistProfile) {
            throw new NotFoundException('Therapist profile not found');
        }

        return this.prisma.sessionPricing.findMany({
            where: { therapistId: therapistProfile.id },
            include: {
                sessionType: true,
            },
        });
    }

    // ==================== Analytics ====================

    /**
     * Get therapist analytics
     */
    @Get('analytics')
    async getAnalytics(@Req() req: any) {
        const userId = req.user.id;
        const therapistProfile = await this.prisma.therapistProfile.findFirst({
            where: { userId },
        });

        if (!therapistProfile) {
            throw new NotFoundException('Therapist profile not found');
        }

        const [bookings, completedBookings] = await Promise.all([
            this.prisma.booking.findMany({
                where: { therapistId: therapistProfile.id },
            }),
            this.prisma.booking.findMany({
                where: {
                    therapistId: therapistProfile.id,
                    status: 'COMPLETED',
                },
            }),
        ]);

        const totalRevenue = completedBookings.reduce(
            (sum, b) => sum + b.therapistAmount,
            0
        );

        const upcomingSessions = await this.prisma.booking.count({
            where: {
                therapistId: therapistProfile.id,
                status: 'CONFIRMED',
                startDateTime: {
                    gte: new Date(),
                },
            },
        });

        const pendingRequests = await this.prisma.booking.count({
            where: {
                therapistId: therapistProfile.id,
                status: 'PENDING_ACCEPTANCE',
            },
        });

        return {
            totalBookings: bookings.length,
            totalRevenue,
            averageRating: therapistProfile.overallRating,
            completionRate:
                bookings.length > 0
                    ? (completedBookings.length / bookings.length) * 100
                    : 0,
            upcomingSessions,
            pendingRequests,
        };
    }
}
