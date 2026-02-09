import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from '../booking/availability.service';
import {
    SetAvailabilityDto,
    AddAvailabilityExceptionDto,
    GetAvailableSlotsDto
} from '../booking/dto/booking.dto';

@Controller('marketplace/therapists')
@UseGuards(JwtAuthGuard)
export class TherapistProfileController {
    constructor(
        private prisma: PrismaService,
        private availabilityService: AvailabilityService,
    ) { }

    /**
     * Search/List all therapists
     */
    @Get()
    async searchTherapists(
        @Query('specialization') specialization?: string,
        @Query('language') language?: string,
        @Query('minRating') minRating?: string,
        @Query('page') page = '1',
        @Query('limit') limit = '20',
    ) {
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const where: any = {
            isActive: true,
            acceptingBookings: true,
        };

        if (specialization) {
            where.specializations = {
                has: specialization,
            };
        }

        if (language) {
            where.languages = {
                has: language,
            };
        }

        if (minRating) {
            where.overallRating = {
                gte: parseFloat(minRating),
            };
        }

        const [therapists, total] = await Promise.all([
            this.prisma.therapistProfile.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true,
                        },
                    },
                    sessionTypes: {
                        where: { isActive: true },
                    },
                },
                skip,
                take: limitNum,
                orderBy: {
                    overallRating: 'desc',
                },
            }),
            this.prisma.therapistProfile.count({ where }),
        ]);

        return {
            therapists,
            total,
            page: pageNum,
            limit: limitNum,
        };
    }

    /**
     * Get specific therapist profile - REORDERED: Must be after specific routes like 'me/profile', 'me/availability'
     * BUT 'me/*' routes are defined after this one? NO.
     * Express/NestJS routes scan order matters.
     * We should define specific paths BEFORE parameter paths.
     * Ideally 'me/profile' and 'me/availability' should be first if :id conflicts.
     * However, in this file, 'me/profile' is defined later.
     * Let's move 'me/*' routes to the TOP to be safe.
     */

    /**
     * Get current user's therapist profile
     */
    @Get('me/profile')
    async getMyProfile(@Req() req: any) {
        const userId = req.user.id;

        const therapist = await this.prisma.therapistProfile.findFirst({
            where: { userId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
                sessionTypes: {
                    where: { isActive: true },
                },
            },
        });

        if (!therapist) {
            throw new NotFoundException('Therapist profile not found');
        }

        return therapist;
    }

    /**
     * Get current user's availability
     */
    @Get('me/availability')
    async getMyAvailability(@Req() req: any) {
        const userId = req.user.id;

        const therapistProfile = await this.prisma.therapistProfile.findFirst({
            where: { userId },
        });

        if (!therapistProfile) {
            throw new Error('Only therapists can view availability');
        }

        return this.availabilityService.getTherapistAvailability(therapistProfile.id);
    }

    /**
     * Create therapist profile
     */
    @Post('me/profile')
    async createProfile(@Body() dto: any, @Req() req: any) {
        const userId = req.user.id;

        // Check if profile already exists
        const existing = await this.prisma.therapistProfile.findFirst({
            where: { userId },
        });

        if (existing) {
            throw new Error('Therapist profile already exists');
        }

        return this.prisma.therapistProfile.create({
            data: {
                userId,
                bio: dto.bio,
                credentials: dto.credentials || [],
                specializations: dto.specializations || [],
                yearsExperience: dto.yearsExperience,
                title: dto.title,
                profileImage: dto.profileImage,
                languages: dto.languages || [],
                defaultTimezone: dto.defaultTimezone || 'Asia/Kolkata',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
            },
        });
    }

    /**
     * Update therapist profile
     */
    @Patch('me/profile')
    async updateProfile(@Body() dto: any, @Req() req: any) {
        const userId = req.user.id;

        const profile = await this.prisma.therapistProfile.findFirst({
            where: { userId },
        });

        if (!profile) {
            throw new NotFoundException('Therapist profile not found');
        }

        return this.prisma.therapistProfile.update({
            where: { id: profile.id },
            data: {
                bio: dto.bio,
                credentials: dto.credentials,
                specializations: dto.specializations,
                yearsExperience: dto.yearsExperience,
                title: dto.title,
                profileImage: dto.profileImage,
                languages: dto.languages,
                defaultTimezone: dto.defaultTimezone,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
            },
        });
    }

    /**
     * Therapist: Set recurring availability
     */
    @Post('me/availability')
    async setAvailability(@Body() dto: SetAvailabilityDto, @Req() req: any) {
        const userId = req.user.id;

        const therapistProfile = await this.prisma.therapistProfile.findFirst({
            where: { userId },
        });

        if (!therapistProfile) {
            throw new Error('Only therapists can set availability');
        }

        return this.availabilityService.setRecurringAvailability(
            therapistProfile.id,
            dto.dayOfWeek,
            dto.startTime,
            dto.endTime,
            dto.timezone,
        );
    }

    /**
     * Therapist: Add availability exception
     */
    @Post('me/availability/exceptions')
    async addException(@Body() dto: AddAvailabilityExceptionDto, @Req() req: any) {
        const userId = req.user.id;

        const therapistProfile = await this.prisma.therapistProfile.findFirst({
            where: { userId },
        });

        if (!therapistProfile) {
            throw new Error('Only therapists can add exceptions');
        }

        return this.availabilityService.addAvailabilityException(
            therapistProfile.id,
            new Date(dto.date),
            dto.type,
            dto.startTime,
            dto.endTime,
            dto.reason,
        );
    }

    /**
     * Therapist: Delete availability
     */
    @Delete('me/availability/:id')
    async deleteAvailability(@Param('id') availabilityId: string, @Req() req: any) {
        const userId = req.user.id;

        const therapistProfile = await this.prisma.therapistProfile.findFirst({
            where: { userId },
        });

        if (!therapistProfile) {
            throw new Error('Only therapists can delete availability');
        }

        return this.availabilityService.deleteAvailability(availabilityId, therapistProfile.id);
    }

    /**
     * Get specific therapist profile
     * (Moved down to avoid conflict with 'me' routes if validation is strict, though unlikely for 'me' vs UUID)
     */
    @Get(':id')
    async getTherapistProfile(@Param('id') therapistId: string) {
        console.log('DEBUG: getTherapistProfile called with id:', therapistId);
        const therapist = await this.prisma.therapistProfile.findUnique({
            where: { id: therapistId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
                sessionTypes: {
                    where: { isActive: true },
                },
            },
        });

        if (!therapist) {
            throw new NotFoundException('Therapist not found');
        }

        return therapist;
    }

    /**
     * Get session types for a therapist
     */
    @Get(':id/session-types')
    async getTherapistSessionTypes(@Param('id') therapistId: string) {
        return this.prisma.sessionType.findMany({
            where: {
                therapistId,
                isActive: true,
            },
        });
    }

    /**
     * Get pricing for a therapist
     */
    @Get(':id/pricing')
    async getSessionPricing(@Param('id') therapistId: string) {
        return this.prisma.sessionPricing.findMany({
            where: { therapistId },
            include: {
                sessionType: true,
            },
        });
    }

    /**
     * Get therapist's available slots for a date
     */
    @Get(':id/slots')
    async getAvailableSlots(
        @Param('id') therapistId: string,
        @Query() query: GetAvailableSlotsDto,
    ) {
        console.log('DEBUG: getAvailableSlots called with:', {
            therapistId,
            date: query.date,
            sessionTypeId: query.sessionTypeId,
            timezone: query.timezone
        });

        const sessionType = await this.prisma.sessionType.findUnique({
            where: { id: query.sessionTypeId },
        });

        if (!sessionType) {
            throw new Error('Session type not found');
        }

        const parsedDate = new Date(query.date);
        console.log('DEBUG: Parsed date:', parsedDate, 'Day of week:', parsedDate.getDay());

        return this.availabilityService.getAvailableSlots(
            therapistId,
            parsedDate,
            sessionType.duration,
            query.timezone,
        );
    }

    /**
     * Get all availability for a therapist (Public/Admin view)
     */
    @Get(':id/availability')
    async getTherapistAvailability(@Param('id') therapistId: string) {
        return this.availabilityService.getTherapistAvailability(therapistId);
    }
}
