import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { CareWaitlistController } from './care-waitlist.controller';
import { CareWaitlistService } from './care-waitlist.service';

@Module({
  imports: [NotificationModule],
  controllers: [CareWaitlistController],
  providers: [CareWaitlistService],
  exports: [CareWaitlistService],
})
export class CareWaitlistModule {}
