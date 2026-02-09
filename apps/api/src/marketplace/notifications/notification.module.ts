import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { PushNotificationService } from './push.service';
import { ReminderScheduler } from './reminder.scheduler';
import { NotificationHandlers } from './notification.handlers';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [
        EmailService,
        PushNotificationService,
        ReminderScheduler,
        NotificationHandlers,
    ],
    exports: [
        EmailService,
        PushNotificationService,
        ReminderScheduler,
        NotificationHandlers,
    ],
})
export class NotificationModule { }
