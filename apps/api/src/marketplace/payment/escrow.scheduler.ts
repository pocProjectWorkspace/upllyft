import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentService } from './payment.service';
import { BookingStatus } from '@prisma/client';
import { subHours } from 'date-fns';

@Injectable()
export class EscrowScheduler {
    private readonly logger = new Logger(EscrowScheduler.name);

    constructor(
        private prisma: PrismaService,
        private paymentService: PaymentService,
    ) { }

    /**
     * Release escrow for completed sessions where 2+ hours have passed since session end.
     * Runs every 15 minutes.
     */
    @Cron('*/15 * * * *')
    async processEscrowReleases() {
        this.logger.log('Running escrow release check...');

        try {
            // Find completed bookings where escrow hasn't been released
            // and session ended more than 2 hours ago
            const twoHoursAgo = subHours(new Date(), 2);

            const bookings = await this.prisma.booking.findMany({
                where: {
                    status: BookingStatus.COMPLETED,
                    escrowReleasedAt: null,
                    endDateTime: {
                        lte: twoHoursAgo,
                    },
                },
                select: { id: true },
            });

            if (bookings.length === 0) {
                return;
            }

            this.logger.log(`Found ${bookings.length} bookings ready for escrow release`);

            for (const booking of bookings) {
                try {
                    await this.paymentService.releaseEscrow(booking.id);
                } catch (error) {
                    this.logger.error(`Failed to release escrow for booking ${booking.id}: ${error.message}`);
                }
            }
        } catch (error) {
            this.logger.error(`Error in escrow release cron: ${error.message}`);
        }
    }

    /**
     * Auto-cancel bookings where therapist didn't respond within acceptance deadline.
     * Runs every 10 minutes.
     */
    @Cron('*/10 * * * *')
    async processExpiredAcceptanceDeadlines() {
        this.logger.log('Running acceptance deadline check...');

        try {
            const expiredBookings = await this.prisma.booking.findMany({
                where: {
                    status: BookingStatus.PENDING_ACCEPTANCE,
                    acceptanceDeadline: {
                        lte: new Date(),
                    },
                },
                select: { id: true },
            });

            if (expiredBookings.length === 0) {
                return;
            }

            this.logger.log(`Found ${expiredBookings.length} bookings past acceptance deadline`);

            for (const booking of expiredBookings) {
                try {
                    await this.prisma.booking.update({
                        where: { id: booking.id },
                        data: {
                            status: BookingStatus.CANCELLED_BY_THERAPIST,
                            cancelledAt: new Date(),
                            cancellationReason: 'Therapist did not respond within acceptance deadline',
                        },
                    });
                    // TODO: Trigger refund via paymentService
                    this.logger.log(`Auto-cancelled expired booking ${booking.id}`);
                } catch (error) {
                    this.logger.error(`Failed to cancel expired booking ${booking.id}: ${error.message}`);
                }
            }
        } catch (error) {
            this.logger.error(`Error in acceptance deadline cron: ${error.message}`);
        }
    }
}
