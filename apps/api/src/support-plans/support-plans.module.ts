import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { SupportPlansService } from './support-plans.service';
import {
  SupportPlansController,
  GuardianSupportPlansController,
} from './support-plans.controller';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [SupportPlansController, GuardianSupportPlansController],
  providers: [SupportPlansService],
  exports: [SupportPlansService],
})
export class SupportPlansModule {}
