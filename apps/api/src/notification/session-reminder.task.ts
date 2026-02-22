import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService, NotificationType } from './notification.service';

@Injectable()
export class SessionReminderTask {
  private readonly logger = new Logger(SessionReminderTask.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Runs every hour on the hour.
   * Finds bookings starting in 23–25 hours that haven't had a reminder sent,
   * sends push notifications to both patient and therapist, then marks as sent.
   */
  @Cron('0 * * * *')
  async sendSessionReminders() {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const bookings = await this.prisma.booking.findMany({
      where: {
        startDateTime: { gte: windowStart, lte: windowEnd },
        status: 'CONFIRMED',
        reminderSent: false,
      },
      include: {
        patient: { select: { id: true, name: true } },
        therapist: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        sessionType: { select: { name: true } },
      },
    });

    if (bookings.length === 0) return;

    this.logger.log(`Sending 24h reminders for ${bookings.length} booking(s)`);

    for (const booking of bookings) {
      try {
        const start = new Date(booking.startDateTime);
        const formattedDate = start.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
        const formattedTime = start.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        });

        const body = `Reminder: Your session on ${formattedDate} at ${formattedTime} is tomorrow.`;

        // DB + WebSocket notifications
        const userIds = [booking.patientId, booking.therapist.user.id];
        for (const userId of userIds) {
          await this.notificationService.createNotification({
            userId,
            type: NotificationType.SESSION_REMINDER,
            title: 'Session reminder',
            message: body,
            actionUrl: `/bookings/${booking.id}`,
            relatedEntityId: booking.id,
            priority: 'high',
          });
        }

        // Push via FCM
        await this.notificationService.sendToUsers(userIds, {
          title: 'Session reminder',
          body,
          data: { type: 'booking', bookingId: booking.id },
        });

        // Mark as sent
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { reminderSent: true },
        });
      } catch (error) {
        this.logger.error(`Failed to send reminder for booking ${booking.id}`, error);
      }
    }

    this.logger.log(`Session reminders complete`);
  }
}
