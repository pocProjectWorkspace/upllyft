import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BookingService } from './booking.service';
import { AvailabilityService } from './availability.service';
import {
    CreateBookingDto,
    SetAvailabilityDto,
    AddAvailabilityExceptionDto,
    GetAvailableSlotsDto,
    CancelBookingDto,
    RejectBookingDto,
} from './dto/booking.dto';

@Controller('marketplace/bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
    constructor(
        private bookingService: BookingService,
        private availabilityService: AvailabilityService,
    ) { }

    /**
     * Patient: Create a new booking
     */
    @Post()
    async createBooking(@Body() dto: CreateBookingDto, @Req() req: any) {
        const patientId = req.user.id;

        return this.bookingService.createBooking(
            patientId,
            dto.therapistId,
            dto.sessionTypeId,
            new Date(dto.startDateTime),
            dto.timezone,
            dto.patientNotes,
            dto.patientFiles,
        );
    }

    /**
     * Get user's bookings (patient or therapist based on role)
     */
    @Get()
    async getMyBookings(@Req() req: any, @Query('status') status?: string) {
        const userId = req.user.id;

        // Check if user is a therapist
        const therapistProfile = await this.bookingService['prisma'].therapistProfile.findFirst({
            where: { userId },
        });

        if (therapistProfile) {
            return this.bookingService.getTherapistBookings(therapistProfile.id, status);
        } else {
            return this.bookingService.getPatientBookings(userId, status);
        }
    }

    /**
     * Get booking details
     */
    @Get(':id')
    async getBooking(@Param('id') bookingId: string, @Req() req: any) {
        const userId = req.user.id;
        return this.bookingService.getBooking(bookingId, userId);
    }

    /**
     * Therapist: Accept booking
     */
    @Post(':id/accept')
    async acceptBooking(@Param('id') bookingId: string, @Req() req: any) {
        const userId = req.user.id;

        // Get therapist profile
        const therapistProfile = await this.bookingService['prisma'].therapistProfile.findFirst({
            where: { userId },
        });

        if (!therapistProfile) {
            throw new Error('Only therapists can accept bookings');
        }

        return this.bookingService.acceptBooking(bookingId, therapistProfile.id);
    }

    /**
     * Therapist: Reject booking
     */
    @Post(':id/reject')
    async rejectBooking(
        @Param('id') bookingId: string,
        @Body() dto: RejectBookingDto,
        @Req() req: any,
    ) {
        const userId = req.user.id;

        const therapistProfile = await this.bookingService['prisma'].therapistProfile.findFirst({
            where: { userId },
        });

        if (!therapistProfile) {
            throw new Error('Only therapists can reject bookings');
        }

        return this.bookingService.rejectBooking(bookingId, therapistProfile.id, dto.reason);
    }

    /**
     * Cancel booking
     */
    @Post(':id/cancel')
    async cancelBooking(
        @Param('id') bookingId: string,
        @Body() dto: CancelBookingDto,
        @Req() req: any,
    ) {
        const userId = req.user.id;
        return this.bookingService.cancelBooking(bookingId, userId, dto.reason);
    }

    /**
     * Confirm session completion
     */
    @Post(':id/complete')
    async confirmCompletion(@Param('id') bookingId: string, @Req() req: any) {
        const userId = req.user.id;

        // Determine if user is patient or therapist
        const therapistProfile = await this.bookingService['prisma'].therapistProfile.findFirst({
            where: { userId },
        });

        const userType = therapistProfile ? 'THERAPIST' : 'PATIENT';

        return this.bookingService.confirmSessionCompletion(bookingId, userId, userType);
    }
}


