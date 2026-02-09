import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StripeConnectService } from './stripe-connect.service';
import { differenceInHours, addHours, addMinutes, isPast } from 'date-fns';

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);

    constructor(
        private prisma: PrismaService,
        private stripeConnect: StripeConnectService,
    ) { }

    /**
     * Calculate booking pricing breakdown
     */
    private calculatePricing(
        sessionPrice: number,
        platformFeePercentage: number,
        organizationPercentage?: number,
        therapistPercentage?: number,
    ) {
        const platformFee = sessionPrice * (platformFeePercentage / 100);
        const netAmount = sessionPrice - platformFee;

        let organizationAmount = 0;
        let therapistAmount = netAmount;

        if (organizationPercentage && therapistPercentage) {
            organizationAmount = netAmount * (organizationPercentage / 100);
            therapistAmount = netAmount * (therapistPercentage / 100);
        }

        return {
            subtotal: sessionPrice,
            platformFee,
            platformFeePercentage,
            therapistAmount,
            organizationAmount,
        };
    }

    /**
     * Create payment intent for booking
     */
    async createBookingPaymentIntent(
        bookingId: string,
        sessionPrice: number,
        currency: string,
    ) {
        // Get booking details
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                therapist: true,
                sessionType: true,
            },
        });

        if (!booking) {
            throw new BadRequestException('Booking not found');
        }

        // Check if therapist has Stripe account
        if (!booking.therapist.stripeAccountId) {
            throw new BadRequestException('Therapist has not completed payment setup');
        }

        if (!booking.therapist.stripeOnboardingComplete) {
            throw new BadRequestException('Therapist payment setup is incomplete');
        }

        // Get platform settings
        const platformSettings = await this.prisma.platformSettings.findFirst();
        const platformFeePercentage = platformSettings?.platformCommissionPercentage || 15;

        // Calculate pricing
        let organizationPercentage: number | undefined;
        let therapistPercentage: number | undefined;

        if (booking.organizationId) {
            // Get organization link for revenue split
            const orgLink = await this.prisma.therapistOrganizationLink.findFirst({
                where: {
                    therapistId: booking.therapistId,
                    organizationId: booking.organizationId,
                    status: 'APPROVED',
                },
            });

            if (orgLink) {
                organizationPercentage = orgLink.organizationPercentage;
                therapistPercentage = orgLink.therapistPercentage;
            }
        }

        const pricing = this.calculatePricing(
            sessionPrice,
            platformFeePercentage,
            organizationPercentage,
            therapistPercentage,
        );

        // Create payment intent
        const paymentIntent = await this.stripeConnect.createPaymentIntent(
            Math.round(sessionPrice * 100), // Convert to cents
            currency,
            booking.therapist.stripeAccountId,
            Math.round(pricing.platformFee * 100), // Platform fee in cents
            {
                bookingId: booking.id,
                therapistId: booking.therapistId,
                organizationId: booking.organizationId || undefined,
            },
        );

        // Update booking with payment details
        await this.prisma.booking.update({
            where: { id: bookingId },
            data: {
                stripePaymentIntentId: paymentIntent.id,
                ...pricing,
                currency,
            },
        });

        return {
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            pricing,
        };
    }

    /**
     * Handle  successful payment (called from webhook)
     */
    async handlePaymentSuccess(paymentIntentId: string) {
        const booking = await this.prisma.booking.findFirst({
            where: { stripePaymentIntentId: paymentIntentId },
        });

        if (!booking) {
            this.logger.warn(`Booking not found for payment intent ${paymentIntentId}`);
            return;
        }

        // Update booking status
        await this.prisma.booking.update({
            where: { id: booking.id },
            data: {
                status: 'PENDING_ACCEPTANCE',
                paymentStatus: 'COMPLETED',
                paidAt: new Date(),
                acceptanceDeadline: addHours(new Date(), 4), // 4 hours to accept
            },
        });

        this.logger.log(`Payment successful for booking ${booking.id}`);

        // TODO: Send notification to therapist
        return booking;
    }

    /**
     * Process cancellation refund
     */
    async processCancellationRefund(bookingId: string, cancelledBy: string) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            throw new BadRequestException('Booking not found');
        }

        if (!booking.stripePaymentIntentId) {
            throw new BadRequestException('No payment to refund');
        }

        if (booking.paymentStatus !== 'COMPLETED') {
            throw new BadRequestException('Payment not completed');
        }

        const hoursUntilSession = differenceInHours(
            booking.startDateTime,
            new Date(),
        );

        let refundAmount = booking.subtotal;
        let status: string;

        // Determine refund amount based on time until session
        if (hoursUntilSession > 24) {
            // Full refund
            refundAmount = booking.subtotal;
            status = booking.cancelledBy === booking.patientId
                ? 'CANCELLED_BY_PATIENT'
                : 'CANCELLED_BY_THERAPIST';

            await this.stripeConnect.refundPayment(
                booking.stripePaymentIntentId,
                'requested_by_customer',
            );
        } else if (hoursUntilSession > 0) {
            // Partial refund (50%)
            refundAmount = booking.subtotal * 0.5;
            status = 'CANCELLED_BY_PATIENT';

            await this.stripeConnect.refundPartialPayment(
                booking.stripePaymentIntentId,
                Math.round(refundAmount * 100), // Convert to cents
                'requested_by_customer',
            );
        } else {
            throw new BadRequestException('Cannot cancel session that has already started');
        }

        // Update booking
        await this.prisma.booking.update({
            where: { id: bookingId },
            data: {
                status: status as any,
                cancelledBy,
                cancelledAt: new Date(),
                refundAmount,
                refundedAt: new Date(),
                paymentStatus: refundAmount === booking.subtotal ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
            },
        });

        this.logger.log(`Processed refund of $${refundAmount} for booking ${bookingId}`);

        return { refundAmount, status };
    }

    /**
     * Process refund for disputes or manual refunds
     */
    async processRefund(
        bookingId: string,
        refundAmount: number,
        reason: string,
    ) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            throw new BadRequestException('Booking not found');
        }

        if (!booking.stripePaymentIntentId) {
            throw new BadRequestException('No payment to refund');
        }

        if (booking.paymentStatus !== 'COMPLETED' && booking.paymentStatus !== 'PARTIALLY_REFUNDED') {
            throw new BadRequestException('Payment not available for refund');
        }

        // Process partial refund
        await this.stripeConnect.refundPartialPayment(
            booking.stripePaymentIntentId,
            Math.round(refundAmount * 100), // Convert to cents
            reason,
        );

        // Calculate total refunded amount
        const totalRefunded = (booking.refundAmount || 0) + refundAmount;
        const isFullRefund = totalRefunded >= booking.subtotal;

        // Update booking
        await this.prisma.booking.update({
            where: { id: bookingId },
            data: {
                refundAmount: totalRefunded,
                refundedAt: new Date(),
                paymentStatus: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
            },
        });

        this.logger.log(`Processed refund of $${refundAmount} for booking ${bookingId} (${reason})`);

        return { refundAmount, totalRefunded };
    }

    /**
     * Release escrow after session completion
     * This is called by a cron job 2 hours after session ends
     */
    async releaseEscrow(bookingId: string) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                therapist: true,
            },
        });

        if (!booking) {
            this.logger.warn(`Booking ${bookingId} not found for escrow release`);
            return;
        }

        if (booking.escrowReleasedAt) {
            this.logger.warn(`Escrow already released for booking ${bookingId}`);
            return;
        }

        // Check if session ended + 2 hours ago
        const sessionEnd = booking.endDateTime;
        const twoHoursAfterSession = addHours(sessionEnd, 2);

        if (!isPast(twoHoursAfterSession)) {
            this.logger.warn(`Too early to release escrow for booking ${bookingId}`);
            return;
        }

        // If there's an organization, create transfer for their share
        if (booking.organizationId && booking.organizationAmount > 0) {
            // TODO: Get organization stripe account
            // const organization = await this.prisma.organization.findUnique({
            //   where: { id: booking.organizationId },
            // });

            // if (organization?.stripeAccountId) {
            //   await this.stripeConnect.createTransfer(
            //     Math.round(booking.organizationAmount * 100),
            //     organization.stripeAccountId,
            //     {
            //       bookingId: booking.id,
            //       organizationId: booking.organizationId,
            //     },
            //   );
            // }
        }

        // Mark escrow as released
        await this.prisma.booking.update({
            where: { id: bookingId },
            data: {
                escrowReleasedAt: new Date(),
            },
        });

        this.logger.log(`Released escrow for booking ${bookingId}`);
    }

    /**
     * Get therapist Stripe onboarding URL
     */
    async getTherapistOnboardingUrl(therapistId: string, baseUrl: string) {
        const therapist = await this.prisma.therapistProfile.findUnique({
            where: { id: therapistId },
            include: { user: true },
        });

        if (!therapist) {
            throw new BadRequestException('Therapist not found');
        }

        let stripeAccountId = therapist.stripeAccountId;

        // Create Stripe account if doesn't exist
        if (!stripeAccountId) {
            const account = await this.stripeConnect.createTherapistAccount(
                therapistId,
                therapist.user.email,
            );
            stripeAccountId = account.id;
        }

        // Generate onboarding link
        const onboardingUrl = await this.stripeConnect.createAccountLink(
            stripeAccountId,
            `${baseUrl}/marketplace/therapist/settings/payment/refresh`,
            `${baseUrl}/marketplace/therapist/settings/payment/success`,
        );

        return { onboardingUrl, stripeAccountId };
    }

    /**
     * Update therapist onboarding status
     */
    async updateTherapistOnboardingStatus(therapistId: string) {
        const therapist = await this.prisma.therapistProfile.findUnique({
            where: { id: therapistId },
        });

        if (!therapist?.stripeAccountId) {
            return { onboardingComplete: false };
        }

        const isComplete = await this.stripeConnect.isAccountOnboardingComplete(
            therapist.stripeAccountId,
        );

        await this.prisma.therapistProfile.update({
            where: { id: therapistId },
            data: { stripeOnboardingComplete: isComplete },
        });

        return { onboardingComplete: isComplete };
    }
}
