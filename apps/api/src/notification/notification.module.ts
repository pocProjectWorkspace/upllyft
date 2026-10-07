// apps/api/src/notification/notification.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationAdminController } from './notification-admin.controller';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { NotificationListeners } from './notification.listeners';
import { SessionReminderTask } from './session-reminder.task';
import { NotificationEmailService } from './notification-email.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    PrismaModule,
    EventEmitterModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [NotificationController, NotificationAdminController],
  providers: [
    NotificationService,
    NotificationGateway,
    NotificationListeners,
    SessionReminderTask,
    NotificationEmailService,
  ],
  exports: [NotificationService, NotificationEmailService],
})
export class NotificationModule {}

