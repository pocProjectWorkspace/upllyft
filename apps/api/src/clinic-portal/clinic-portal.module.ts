import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { BookingModule } from '../marketplace/booking/booking.module';
import { PaymentModule } from '../marketplace/payment/payment.module';
import { ResourceJourneyModule } from '../resource-journey/resource-journey.module';
import { ClinicPortalController } from './clinic-portal.controller';
import { ClinicPortalService } from './clinic-portal.service';
import { ClinicPortalListener } from './clinic-portal.listener';

@Module({
  imports: [NotificationModule, BookingModule, PaymentModule, ResourceJourneyModule],
  controllers: [ClinicPortalController],
  providers: [ClinicPortalService, ClinicPortalListener],
})
export class ClinicPortalModule {}
