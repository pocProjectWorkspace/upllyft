import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from '../booking/availability.service';
import {
    SetAvailabilityDto,
    AddAvailabilityExceptionDto,
    GetAvailableSlotsDto
} from '../booking/dto/booking.dto';
import { inferDepartment } from '../matching/matching.util';
import { TherapistSearchService, type TherapistSearchQuery } from './therapist-search.service';
import {
    BOOKABLE_THERAPIST_WHERE,
    PUBLIC_THERAPIST_SELECT,
    normalizeCountry,
    toPublicTherapist,
} from '../common/therapist-discovery';

@Controller('marketplace/therapists')
@UseGuards(JwtAuthGuard)
export class TherapistProfileController {
    constructor(
        private prisma: PrismaService,
        private availabilityService: AvailabilityService,
        private therapistSearch: TherapistSearchService,
    ) { }

    /**
     * Parent-facing search: bookable therapists only, in the parent's country, with
     * optional city / discipline / source / price filters. See TherapistSearchService.
     */
    @Get()
    async searchTherapists(@Req() req: any, @Query() query: TherapistSearchQuery) {
        return this.therapistSearch.search(req.user, query);
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

        // Location defaults to the account's own; the profile page lets them change it.
        const account = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { country: true, preferredRegion: true, city: true },
        });

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
                department: dto.department || inferDepartment(dto.title, dto.specializations),
                country: normalizeCountry(dto.country)
                    ?? normalizeCountry(account?.country)
                    ?? normalizeCountry(account?.preferredRegion),
                city: dto.city?.trim() || account?.city?.trim() || null,
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
                // A therapist without a department gets one from what they just saved,
                // so discipline search finds them.
                ...(dto.department
                    ? { department: dto.department }
                    : !profile.department && (dto.title || dto.specializations)
                        ? { department: inferDepartment(dto.title ?? profile.title, dto.specializations ?? profile.specializations) }
                        : {}),
                ...(dto.country !== undefined ? { country: normalizeCountry(dto.country) } : {}),
                ...(dto.city !== undefined ? { city: dto.city?.trim() || null } : {}),
                ...(typeof dto.acceptingBookings === 'boolean' ? { acceptingBookings: dto.acceptingBookings } : {}),
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
    async getTherapistProfile(@Param('id') therapistId: string, @Req() req: any) {
        // A family that already booked this therapist can still open the profile after
        // they stop being bookable; everyone else sees only bookable therapists.
        const therapist = await this.prisma.therapistProfile.findFirst({
            where: {
                id: therapistId,
                OR: [BOOKABLE_THERAPIST_WHERE, { bookings: { some: { patientId: req.user.id } } }],
            },
            select: PUBLIC_THERAPIST_SELECT,
        });

        if (!therapist) {
            throw new NotFoundException('Therapist not found');
        }

        const bookable = await this.prisma.therapistProfile.count({
            where: { id: therapistId, ...BOOKABLE_THERAPIST_WHERE },
        });

        return { ...toPublicTherapist(therapist), bookable: bookable > 0 };
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
        const sessionType = await this.prisma.sessionType.findUnique({
            where: { id: query.sessionTypeId },
        });

        if (!sessionType) {
            throw new Error('Session type not found');
        }

        const parsedDate = new Date(query.date);

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
