import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from './email.service';
import { PushNotificationService } from './push.service';
import { NotificationType } from './dto/notification.dto';
import { BookingStatus } from '@prisma/client';
import { addHours, addMinutes, isBefore, isAfter, subHours, subMinutes, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

@Injectable()
export class ReminderScheduler {
    private readonly logger = new Logger(ReminderScheduler.name);

    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
        private pushService: PushNotificationService,
    ) { }

    /**
     * Send 24-hour reminders
     * Runs every hour
     */
    @Cron(CronExpression.EVERY_HOUR)
    async send24HourReminders() {
        this.logger.log('Running 24-hour reminder check...');

        const now = new Date();
        const reminderWindow = {
            start: addHours(now, 23),
            end: addHours(now, 25),
        };

        await this.sendReminders(
            reminderWindow,
            NotificationType.REMINDER_24H,
            '24 hours',
        );
    }

    /**
     * Send 1-hour reminders
     * Runs every hour
     */
    @Cron(CronExpression.EVERY_HOUR)
    async send1HourReminders() {
        this.logger.log('Running 1-hour reminder check...');

        const now = new Date();
        const reminderWindow = {
            start: addMinutes(now, 55),
            end: addMinutes(now, 65),
        };

        await this.sendReminders(
            reminderWindow,
            NotificationType.REMINDER_1H,
            '1 hour',
        );
    }

    /**
     * Send 30-minute reminders
     * Runs every 15 minutes
     */
    @Cron('*/15 * * * *')
    async send30MinuteReminders() {
        this.logger.log('Running 30-minute reminder check...');

        const now = new Date();
        const reminderWindow = {
            start: addMinutes(now, 25),
            end: addMinutes(now, 35),
        };

        await this.sendReminders(
            reminderWindow,
            NotificationType.REMINDER_30M,
            '30 minutes',
            false, // Push only, no email
        );
    }

    /**
     * Send 15-minute reminders
     * Runs every 5 minutes
     */
    @Cron('*/5 * * * *')
    async send15MinuteReminders() {
        this.logger.log('Running 15-minute reminder check...');

        const now = new Date();
        const reminderWindow = {
            start: addMinutes(now, 10),
            end: addMinutes(now, 20),
        };

        await this.sendReminders(
            reminderWindow,
            NotificationType.REMINDER_15M,
            '15 minutes',
            false, // Push only, no email
        );
    }

    /**
     * Core reminder sending logic
     */
    private async sendReminders(
        window: { start: Date; end: Date },
        reminderType: NotificationType,
        timeDescription: string,
        sendEmail: boolean = true,
    ) {
        try {
            // Find confirmed bookings in the reminder window
            const bookings = await this.prisma.booking.findMany({
                where: {
                    status: BookingStatus.CONFIRMED,
                    startDateTime: {
                        gte: window.start,
                        lte: window.end,
                    },
                },
                include: {
                    patient: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                        },
                    },
                    therapist: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    name: true,
                                },
                            },
                        },
                    },
                    sessionType: true,
                },
            });

            this.logger.log(
                `Found ${bookings.length} bookings for ${timeDescription} reminder`,
            );

            for (const booking of bookings) {
                // Check if reminder already sent
                const alreadySent = await this.wasReminderSent(booking.id, reminderType);
                if (alreadySent) {
                    continue;
                }

                const sessionDateTime = format(
                    toZonedTime(booking.startDateTime, booking.timezone),
                    'PPpp',
                );

                // Send to patient
                if (sendEmail) {
                    await this.emailService.sendSessionReminderEmail({
                        recipientEmail: booking.patient.email,
                        recipientName: booking.patient.name || 'there',
                        otherPersonName: booking.therapist.user.name || 'your therapist',
                        sessionType: booking.sessionType.name,
                        sessionDateTime,
                        googleMeetLink: booking.googleMeetLink || '',
                        timeUntilSession: timeDescription,
                    });
                }

                await this.pushService.sendSessionReminderNotification(
                    booking.patientId,
                    booking.therapist.user.name || 'your therapist',
                    timeDescription,
                    booking.id,
                    reminderType,
                );

                // Send to therapist
                if (sendEmail) {
                    await this.emailService.sendSessionReminderEmail({
                        recipientEmail: booking.therapist.user.email,
                        recipientName: booking.therapist.user.name || 'there',
                        otherPersonName: booking.patient.name || 'your patient',
                        sessionType: booking.sessionType.name,
                        sessionDateTime,
                        googleMeetLink: booking.googleMeetLink || '',
                        timeUntilSession: timeDescription,
                    });
                }

                await this.pushService.sendSessionReminderNotification(
                    booking.therapistId,
                    booking.patient.name || 'your patient',
                    timeDescription,
                    booking.id,
                    reminderType,
                );

                // Log reminder sent
                await this.logReminderSent(booking.id, reminderType);

                this.logger.log(
                    `Sent ${timeDescription} reminder for booking ${booking.id}`,
                );
            }
        } catch (error) {
            this.logger.error(`Error sending ${timeDescription} reminders:`, error);
        }
    }

    /**
     * Check if reminder was already sent
     */
    private async wasReminderSent(
        bookingId: string,
        reminderType: NotificationType,
    ): Promise<boolean> {
        // This would check a notification log table
        // For now,we'll implement a simple approach
        // In production, you'd want to add a NotificationLog model
        return false;
    }

    /**
     * Log that reminder was sent
     */
    private async logReminderSent(
        bookingId: string,
        reminderType: NotificationType,
    ): Promise<void> {
        // This would log to a notification log table
        // Implement when NotificationLog model is added to schema
        this.logger.debug(`Logged ${reminderType} reminder for booking ${bookingId}`);
    }
}
