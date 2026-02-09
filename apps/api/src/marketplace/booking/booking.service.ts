import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';
import { GoogleMeetService } from '../common/google-meet.service';
import { addHours, addMinutes, differenceInHours, isPast } from 'date-fns';

@Injectable()
export class BookingService {
    private readonly logger = new Logger(BookingService.name);

    constructor(
        private prisma: PrismaService,
        private paymentService: PaymentService,
        private googleMeetService: GoogleMeetService,
    ) { }

    /**
     * Create a new booking
     */
    async createBooking(
        patientId: string,
        therapistId: string,
        sessionTypeId: string,
        startDateTime: Date,
        timezone: string,
        patientNotes?: string,
        patientFiles?: string[],
    ) {
        // Validate therapist exists and is active
        const therapist = await this.prisma.therapistProfile.findUnique({
            where: { id: therapistId },
            include: { user: true },
        });

        if (!therapist || !therapist.isActive || !therapist.acceptingBookings) {
            throw new BadRequestException('Therapist is not available for bookings');
        }

        // Validate session type
        const sessionType = await this.prisma.sessionType.findUnique({
            where: { id: sessionTypeId },
        });

        if (!sessionType || !sessionType.isActive) {
            throw new BadRequestException('Session type not found or inactive');
        }

        // Calculate end time
        const endDateTime = addMinutes(startDateTime, sessionType.duration);

        // Check minimum notice requirement (12 hours)
        const hoursUntilSession = differenceInHours(startDateTime, new Date());
        if (hoursUntilSession < 12) {
            throw new BadRequestException('Bookings must be made at least 12 hours in advance');
        }

        // Check if slot is available
        const conflictingBooking = await this.prisma.booking.findFirst({
            where: {
                therapistId,
                startDateTime: {
                    lte: endDateTime,
                },
                endDateTime: {
                    gte: startDateTime,
                },
                status: {
                    in: ['PENDING_ACCEPTANCE', 'CONFIRMED', 'IN_PROGRESS'],
                },
            },
        });

        if (conflictingBooking) {
            throw new BadRequestException('This time slot is no longer available');
        }

        // Get session price
        const pricing = await this.getSessionPrice(therapistId, sessionTypeId);

        // Determine organization ID
        const orgLink = await this.prisma.therapistOrganizationLink.findFirst({
            where: {
                therapistId,
                status: 'APPROVED',
            },
        });

        const organizationId = orgLink?.organizationId || null;

        // Get commission percentage (therapist-specific > org-specific > global platform)
        const platformFeePercent = await this.getCommissionPercentage(therapistId, organizationId);
        const platformFee = pricing.price * (platformFeePercent / 100);
        const therapistAmount = pricing.price - platformFee;

        // Create booking
        const booking = await this.prisma.booking.create({
            data: {
                patientId,
                therapistId,
                sessionTypeId,
                organizationId,
                startDateTime,
                endDateTime,
                timezone,
                duration: sessionType.duration,
                status: 'PENDING_PAYMENT',
                subtotal: pricing.price,
                platformFee,
                platformFeePercentage: platformFeePercent,
                therapistAmount,
                organizationAmount: 0,
                currency: pricing.currency,
                patientNotes,
                patientFiles: patientFiles || [],
                acceptanceDeadline: addHours(new Date(), 4), // 4 hours to accept after payment
            },
        });

        // Create payment intent
        const paymentIntent = await this.paymentService.createBookingPaymentIntent(
            booking.id,
            pricing.price,
            pricing.currency,
        );

        return {
            booking,
            clientSecret: paymentIntent.clientSecret,
            acceptanceDeadline: booking.acceptanceDeadline,
        };
    }

    /**
     * Get session pricing for therapist/session type
     */
    private async getSessionPrice(therapistId: string, sessionTypeId: string) {
        // Check if therapist has custom pricing
        const customPricing = await this.prisma.sessionPricing.findUnique({
            where: {
                therapistId_sessionTypeId: {
                    therapistId,
                    sessionTypeId,
                },
            },
        });

        if (customPricing) {
            return {
                price: customPricing.price,
                currency: customPricing.currency,
            };
        }

        // Use default session type pricing
        const sessionType = await this.prisma.sessionType.findUnique({
            where: { id: sessionTypeId },
        });

        if (!sessionType) {
            throw new BadRequestException('Session type not found');
        }

        return {
            price: sessionType.defaultPrice,
            currency: sessionType.currency,
        };
    }

    /**
     * Get commission percentage for a booking
     * Priority: Therapist-specific > Organization-specific > Global platform setting
     */
    private async getCommissionPercentage(therapistId: string, organizationId: string | null): Promise<number> {
        // 1. Check if therapist has a custom commission rate
        const therapist = await this.prisma.therapistProfile.findUnique({
            where: { id: therapistId },
            select: { commissionPercentage: true },
        });

        if (therapist?.commissionPercentage !== null && therapist?.commissionPercentage !== undefined) {
            return therapist.commissionPercentage;
        }

        // 2. Check if organization has a custom commission rate
        if (organizationId) {
            const organization = await this.prisma.organization.findUnique({
                where: { id: organizationId },
                select: { commissionPercentage: true },
            });

            if (organization?.commissionPercentage !== null && organization?.commissionPercentage !== undefined) {
                return organization.commissionPercentage;
            }
        }

        // 3. Fall back to global platform setting
        const platformSettings = await this.prisma.platformSettings.findFirst();
        return platformSettings?.platformCommissionPercentage || 15; // Default to 15% if no settings exist
    }

    /**
     * Therapist accepts booking
     */
    async acceptBooking(bookingId: string, therapistId: string) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                patient: true,
                therapist: { include: { user: true } },
                sessionType: true,
            },
        });

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        if (booking.therapistId !== therapistId) {
            throw new BadRequestException('Unauthorized to accept this booking');
        }

        if (booking.status !== 'PENDING_ACCEPTANCE') {
            throw new BadRequestException('Booking is not in pending acceptance state');
        }

        // Check if acceptance deadline has passed
        if (booking.acceptanceDeadline && isPast(booking.acceptanceDeadline)) {
            // Auto-cancel and refund
            await this.cancelBookingAutomatically(bookingId, 'Acceptance deadline expired');
            throw new BadRequestException('Acceptance deadline has passed');
        }

        // Generate Google Meet link and calendar event
        const { meetLink, calendarEventId } = await this.generateGoogleMeetLink(booking);

        // Update booking
        const updatedBooking = await this.prisma.booking.update({
            where: { id: bookingId },
            data: {
                status: 'CONFIRMED',
                therapistAcceptedAt: new Date(),
                googleMeetLink: meetLink,
                calendarEventId,
            },
        });

        this.logger.log(`Therapist ${therapistId} accepted booking ${bookingId}`);

        return updatedBooking;
    }

    /**
     * Therapist rejects booking
     */
    async rejectBooking(bookingId: string, therapistId: string, reason: string) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        if (booking.therapistId !== therapistId) {
            throw new BadRequestException('Unauthorized to reject this booking');
        }

        if (booking.status !== 'PENDING_ACCEPTANCE') {
            throw new BadRequestException('Booking is not in pending acceptance state');
        }

        // Process refund
        await this.paymentService.processCancellationRefund(bookingId, therapistId);

        // Update booking
        await this.prisma.booking.update({
            where: { id: bookingId },
            data: {
                therapistRejectedAt: new Date(),
                rejectionReason: reason,
            },
        });

        this.logger.log(`Therapist ${therapistId} rejected booking ${bookingId}`);

        // TODO: Send notification to patient

        return { message: 'Booking rejected and refunded' };
    }

    /**
     * Patient cancels booking
     */
    async cancelBooking(bookingId: string, userId: string, reason?: string) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        if (booking.patientId !== userId && booking.therapistId !== userId) {
            throw new BadRequestException('Unauthorized to cancel this booking');
        }

        if (!['PENDING_ACCEPTANCE', 'CONFIRMED'].includes(booking.status)) {
            throw new BadRequestException('Booking cannot be cancelled in current state');
        }

        // Process refund based on cancellation policy
        await this.paymentService.processCancellationRefund(bookingId, userId);

        this.logger.log(`Booking ${bookingId} cancelled by user ${userId}`);

        // TODO: Send notifications

        return { message: 'Booking cancelled successfully' };
    }

    /**
     * Auto-cancel booking (e.g., when acceptance deadline expires)
     */
    private async cancelBookingAutomatically(bookingId: string, reason: string) {
        await this.prisma.booking.update({
            where: { id: bookingId },
            data: {
                status: 'CANCELLED_BY_PATIENT',
                cancelledAt: new Date(),
                cancellationReason: reason,
            },
        });

        // Process full refund
        await this.paymentService.processCancellationRefund(bookingId, 'SYSTEM');
    }

    /**
     * Mark session as completed by patient or therapist
     */
    async confirmSessionCompletion(bookingId: string, userId: string, userType: 'PATIENT' | 'THERAPIST') {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        if (userType === 'PATIENT' && booking.patientId !== userId) {
            throw new BadRequestException('Unauthorized');
        }

        if (userType === 'THERAPIST' && booking.therapistId !== userId) {
            throw new BadRequestException('Unauthorized');
        }

        const updateData: any = {};

        if (userType === 'PATIENT') {
            updateData.patientConfirmedCompletion = true;
        } else {
            updateData.therapistConfirmedCompletion = true;
        }

        // Update booking
        const updatedBooking = await this.prisma.booking.update({
            where: { id: bookingId },
            data: updateData,
        });

        // If both confirmed, mark as completed
        if (updatedBooking.patientConfirmedCompletion && updatedBooking.therapistConfirmedCompletion) {
            await this.prisma.booking.update({
                where: { id: bookingId },
                data: {
                    status: 'COMPLETED',
                    sessionCompletedAt: new Date(),
                },
            });

            this.logger.log(`Booking ${bookingId} marked as completed`);

            // TODO: Trigger escrow release after 2 hours
        }

        return { message: 'Session completion confirmed' };
    }

    /**
     * Get booking details
     */
    async getBooking(bookingId: string, userId: string) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                patient: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
                therapist: {
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
                },
                sessionType: true,
            },
        });

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        // Verify user has access
        if (booking.patientId !== userId && booking.therapist.userId !== userId) {
            throw new BadRequestException('Unauthorized to view this booking');
        }

        return booking;
    }

    /**
     * Get patient's bookings
     */
    async getPatientBookings(patientId: string, status?: string) {
        const where: any = { patientId };

        if (status) {
            where.status = status;
        }

        return this.prisma.booking.findMany({
            where,
            include: {
                therapist: {
                    include: {
                        user: {
                            select: { id: true, name: true, image: true },
                        },
                    },
                },
                sessionType: true,
            },
            orderBy: {
                startDateTime: 'desc',
            },
        });
    }

    /**
     * Get therapist's bookings
     */
    async getTherapistBookings(therapistId: string, status?: string) {
        const where: any = { therapistId };

        if (status) {
            where.status = status;
        }

        return this.prisma.booking.findMany({
            where,
            include: {
                patient: {
                    select: { id: true, name: true, image: true },
                },
                sessionType: true,
            },
            orderBy: {
                startDateTime: 'desc',
            },
        });
    }

    /**
     * Generate Google Meet link via Google Calendar API
     */
    private async generateGoogleMeetLink(booking: any): Promise<{ meetLink: string; calendarEventId: string | null }> {
        const therapistName = booking.therapist?.user?.name || 'Therapist';
        const therapistEmail = booking.therapist?.user?.email;
        const patientName = booking.patient?.name || 'Patient';
        const patientEmail = booking.patient?.email;
        const sessionTitle = booking.sessionType?.name || 'Therapy Session';

        return this.googleMeetService.createMeetingEvent(
            therapistEmail,
            patientEmail,
            patientName,
            therapistName,
            sessionTitle,
            new Date(booking.startDateTime),
            new Date(booking.endDateTime),
            booking.timezone || 'UTC',
            booking.id,
        );
    }
}
