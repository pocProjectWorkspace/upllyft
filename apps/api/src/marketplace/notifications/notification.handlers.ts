import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailService } from './email.service';
import { PushNotificationService } from './push.service';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

// Event payload interfaces
interface BookingCreatedEvent {
    bookingId: string;
    patientId: string;
    patientName: string;
    patientEmail: string;
    therapistId: string;
    therapistName: string;
    therapistEmail: string;
    sessionTypeName: string;
    sessionDateTime: Date;
    duration: number;
    timezone: string;
    price: number;
    currency: string;
}

interface BookingAcceptedEvent extends BookingCreatedEvent {
    googleMeetLink: string;
}

interface BookingRejectedEvent {
    bookingId: string;
    patientId: string;
    patientName: string;
    patientEmail: string;
    therapistName: string;
    sessionTypeName: string;
    sessionDateTime: Date;
    reason?: string;
}

interface BookingCanceledEvent {
    bookingId: string;
    patientId: string;
    patientEmail: string;
    patientName: string;
    therapistId: string;
    therapistEmail: string;
    therapistName: string;
    sessionTypeName: string;
    sessionDateTime: Date;
    canceledBy: 'patient' | 'therapist';
    reason?: string;
}

interface PaymentSuccessEvent {
    bookingId: string;
    patientId: string;
    patientEmail: string;
    patientName: string;
    amount: number;
    currency: string;
    sessionTypeName: string;
    sessionDateTime: Date;
}

interface RefundProcessedEvent {
    bookingId: string;
    patientId: string;
    patientEmail: string;
    patientName: string;
    amount: number;
    currency: string;
    sessionTypeName: string;
}

@Injectable()
export class NotificationHandlers {
    private readonly logger = new Logger(NotificationHandlers.name);

    constructor(
        private emailService: EmailService,
        private pushService: PushNotificationService,
    ) { }

    /**
     * Handle booking created event
     */
    @OnEvent('booking.created')
    async handleBookingCreated(event: BookingCreatedEvent) {
        this.logger.log(`Handling booking created event for booking ${event.bookingId}`);

        try {
            // Send email to therapist
            await this.emailService.sendBookingRequestEmail({
                therapistEmail: event.therapistEmail,
                therapistName: event.therapistName,
                patientName: event.patientName,
                sessionType: event.sessionTypeName,
                sessionDateTime: this.formatDateTime(event.sessionDateTime, event.timezone),
                duration: event.duration,
                price: event.price,
                currency: event.currency,
            });

            // Send push notification to therapist
            await this.pushService.sendBookingRequestNotification(
                event.therapistId,
                event.patientName,
                event.bookingId,
            );
        } catch (error) {
            this.logger.error('Error handling booking created event:', error);
        }
    }

    /**
     * Handle payment success event
     */
    @OnEvent('payment.success')
    async handlePaymentSuccess(event: PaymentSuccessEvent) {
        this.logger.log(`Handling payment success event for booking ${event.bookingId}`);

        try {
            // Send email confirmation
            await this.emailService.sendPaymentConfirmationEmail({
                patientEmail: event.patientEmail,
                patientName: event.patientName,
                amount: event.amount,
                currency: event.currency,
                sessionType: event.sessionTypeName,
                sessionDateTime: this.formatDateTime(event.sessionDateTime, 'UTC'),
            });

            // Send push notification
            await this.pushService.sendPaymentConfirmationNotification(
                event.patientId,
                event.amount,
                event.currency,
                event.bookingId,
            );
        } catch (error) {
            this.logger.error('Error handling payment success event:', error);
        }
    }

    /**
     * Handle booking accepted event
     */
    @OnEvent('booking.accepted')
    async handleBookingAccepted(event: BookingAcceptedEvent) {
        this.logger.log(`Handling booking accepted event for booking ${event.bookingId}`);

        try {
            // Send email to patient
            await this.emailService.sendBookingConfirmationEmail({
                patientEmail: event.patientEmail,
                patientName: event.patientName,
                therapistName: event.therapistName,
                sessionType: event.sessionTypeName,
                sessionDateTime: this.formatDateTime(event.sessionDateTime, event.timezone),
                duration: event.duration,
                googleMeetLink: event.googleMeetLink,
                timezone: event.timezone,
            });

            // Send push notification
            await this.pushService.sendBookingConfirmationNotification(
                event.patientId,
                event.therapistName,
                event.bookingId,
            );
        } catch (error) {
            this.logger.error('Error handling booking accepted event:', error);
        }
    }

    /**
     * Handle booking rejected event
     */
    @OnEvent('booking.rejected')
    async handleBookingRejected(event: BookingRejectedEvent) {
        this.logger.log(`Handling booking rejected event for booking ${event.bookingId}`);

        try {
            // Send email to patient
            await this.emailService.sendBookingRejectionEmail({
                patientEmail: event.patientEmail,
                patientName: event.patientName,
                therapistName: event.therapistName,
                sessionType: event.sessionTypeName,
                sessionDateTime: this.formatDateTime(event.sessionDateTime, 'UTC'),
                reason: event.reason,
            });

            // Send push notification
            await this.pushService.sendBookingRejectionNotification(
                event.patientId,
                event.therapistName,
                event.bookingId,
            );
        } catch (error) {
            this.logger.error('Error handling booking rejected event:', error);
        }
    }

    /**
     * Handle booking canceled event
     */
    @OnEvent('booking.canceled')
    async handleBookingCanceled(event: BookingCanceledEvent) {
        this.logger.log(`Handling booking canceled event for booking ${event.bookingId}`);

        try {
            const canceledByName =
                event.canceledBy === 'patient' ? event.patientName : event.therapistName;

            // Send email to patient
            await this.emailService.sendCancellationEmail({
                recipientEmail: event.patientEmail,
                recipientName: event.patientName,
                sessionType: event.sessionTypeName,
                sessionDateTime: this.formatDateTime(event.sessionDateTime, 'UTC'),
                canceledBy: canceledByName,
                reason: event.reason,
            });

            // Send email to therapist
            await this.emailService.sendCancellationEmail({
                recipientEmail: event.therapistEmail,
                recipientName: event.therapistName,
                sessionType: event.sessionTypeName,
                sessionDateTime: this.formatDateTime(event.sessionDateTime, 'UTC'),
                canceledBy: canceledByName,
                reason: event.reason,
            });

            // Send push notifications
            await this.pushService.sendCancellationNotification(
                event.patientId,
                event.sessionTypeName,
                canceledByName,
                event.bookingId,
            );

            await this.pushService.sendCancellationNotification(
                event.therapistId,
                event.sessionTypeName,
                canceledByName,
                event.bookingId,
            );
        } catch (error) {
            this.logger.error('Error handling booking canceled event:', error);
        }
    }

    /**
     * Handle refund processed event
     */
    @OnEvent('refund.processed')
    async handleRefundProcessed(event: RefundProcessedEvent) {
        this.logger.log(`Handling refund processed event for booking ${event.bookingId}`);

        try {
            // Send email
            await this.emailService.sendRefundEmail({
                patientEmail: event.patientEmail,
                patientName: event.patientName,
                amount: event.amount,
                currency: event.currency,
                sessionType: event.sessionTypeName,
            });

            // Send push notification
            await this.pushService.sendRefundNotification(
                event.patientId,
                event.amount,
                event.currency,
                event.bookingId,
            );
        } catch (error) {
            this.logger.error('Error handling refund processed event:', error);
        }
    }

    /**
     * Format date time for display
     */
    private formatDateTime(date: Date, timezone: string): string {
        try {
            const zonedDate = toZonedTime(date, timezone);
            return format(zonedDate, 'EEEE, MMMM d, yyyy \'at\' h:mm a');
        } catch (error) {
            return date.toISOString();
        }
    }
}
