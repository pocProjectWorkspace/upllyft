import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { HandoverService } from './handover.service';
import { HandoverController, GuardianHandoverController } from './handover.controller';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [HandoverController, GuardianHandoverController],
  providers: [HandoverService],
  exports: [HandoverService],
})
export class HandoverModule {}
