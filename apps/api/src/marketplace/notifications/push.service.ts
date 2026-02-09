import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SendPushNotificationDto, NotificationType } from './dto/notification.dto';
import * as admin from 'firebase-admin';

@Injectable()
export class PushNotificationService {
    private readonly logger = new Logger(PushNotificationService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Send push notification to a user
     */
    async sendPushNotification(dto: SendPushNotificationDto): Promise<boolean> {
        try {
            // Get user's FCM tokens
            const fcmTokens = await this.prisma.fcmToken.findMany({
                where: {
                    userId: dto.userId,
                    isActive: true,
                },
            });

            if (fcmTokens.length === 0) {
                this.logger.warn(`No FCM tokens found for user ${dto.userId}`);
                return false;
            }

            const tokens = fcmTokens.map((t) => t.fcmToken);

            // Prepare notification payload
            const message = {
                notification: {
                    title: dto.title,
                    body: dto.body,
                },
                data: {
                    ...dto.data,
                    type: dto.type || NotificationType.BOOKING_CREATED,
                    clickAction: 'FLUTTER_NOTIFICATION_CLICK',
                },
                tokens,
            };

            // Send via Firebase
            const response = await admin.messaging().sendEachForMulticast(message);

            this.logger.log(
                `Push notification sent to user ${dto.userId}: ${response.successCount}/${tokens.length} delivered`,
            );

            // Remove invalid tokens
            if (response.failureCount > 0) {
                await this.removeInvalidTokens(response.responses, fcmTokens);
            }

            return response.successCount > 0;
        } catch (error) {
            this.logger.error(`Failed to send push notification:`, error);
            return false;
        }
    }

    /**
     * Send booking request notification to therapist
     */
    async sendBookingRequestNotification(
        therapistId: string,
        patientName: string,
        bookingId: string,
    ): Promise<boolean> {
        return this.sendPushNotification({
            userId: therapistId,
            title: 'New Booking Request',
            body: `${patientName} has requested a session with you`,
            data: {
                bookingId,
                screen: 'BookingDetails',
            },
            type: NotificationType.BOOKING_CREATED,
        });
    }

    /**
     * Send booking confirmation notification to patient
     */
    async sendBookingConfirmationNotification(
        patientId: string,
        therapistName: string,
        bookingId: string,
    ): Promise<boolean> {
        return this.sendPushNotification({
            userId: patientId,
            title: 'Session Confirmed! 🎉',
            body: `Your session with ${therapistName} has been confirmed`,
            data: {
                bookingId,
                screen: 'BookingDetails',
            },
            type: NotificationType.BOOKING_ACCEPTED,
        });
    }

    /**
     * Send booking rejection notification to patient
     */
    async sendBookingRejectionNotification(
        patientId: string,
        therapistName: string,
        bookingId: string,
    ): Promise<boolean> {
        return this.sendPushNotification({
            userId: patientId,
            title: 'Booking Update',
            body: `${therapistName} is unable to accept your booking request`,
            data: {
                bookingId,
                screen: 'BookingDetails',
            },
            type: NotificationType.BOOKING_REJECTED,
        });
    }

    /**
     * Send payment confirmation notification
     */
    async sendPaymentConfirmationNotification(
        patientId: string,
        amount: number,
        currency: string,
        bookingId: string,
    ): Promise<boolean> {
        return this.sendPushNotification({
            userId: patientId,
            title: 'Payment Confirmed',
            body: `Your payment of ${currency} ${amount} has been processed`,
            data: {
                bookingId,
                screen: 'BookingDetails',
            },
            type: NotificationType.PAYMENT_CONFIRMED,
        });
    }

    /**
     * Send session reminder notification
     */
    async sendSessionReminderNotification(
        userId: string,
        otherPersonName: string,
        timeUntilSession: string,
        bookingId: string,
        reminderType: NotificationType,
    ): Promise<boolean> {
        return this.sendPushNotification({
            userId,
            title: `Session in ${timeUntilSession} ⏰`,
            body: `Your session with ${otherPersonName} is coming up soon`,
            data: {
                bookingId,
                screen: 'BookingDetails',
            },
            type: reminderType,
        });
    }

    /**
     * Send cancellation notification
     */
    async sendCancellationNotification(
        userId: string,
        sessionType: string,
        canceledBy: string,
        bookingId: string,
    ): Promise<boolean> {
        return this.sendPushNotification({
            userId,
            title: 'Session Canceled',
            body: `Your ${sessionType} session has been canceled by ${canceledBy}`,
            data: {
                bookingId,
                screen: 'BookingDetails',
            },
            type: NotificationType.BOOKING_CANCELED,
        });
    }

    /**
     * Send refund notification
     */
    async sendRefundNotification(
        patientId: string,
        amount: number,
        currency: string,
        bookingId: string,
    ): Promise<boolean> {
        return this.sendPushNotification({
            userId: patientId,
            title: 'Refund Processed',
            body: `Your refund of ${currency} ${amount} has been initiated`,
            data: {
                bookingId,
                screen: 'BookingDetails',
            },
            type: NotificationType.REFUND_PROCESSED,
        });
    }

    /**
     * Remove invalid FCM tokens
     */
    private async removeInvalidTokens(
        responses: admin.messaging.SendResponse[],
        fcmTokens: any[],
    ): Promise<void> {
        const invalidTokenIds: string[] = [];

        responses.forEach((response, index) => {
            if (!response.success) {
                const error = response.error;
                if (
                    error?.code === 'messaging/invalid-registration-token' ||
                    error?.code === 'messaging/registration-token-not-registered'
                ) {
                    invalidTokenIds.push(fcmTokens[index].id);
                }
            }
        });

        if (invalidTokenIds.length > 0) {
            await this.prisma.fcmToken.updateMany({
                where: { id: { in: invalidTokenIds } },
                data: { isActive: false },
            });

            this.logger.log(`Deactivated ${invalidTokenIds.length} invalid FCM tokens`);
        }
    }
}
