import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentModule } from '../payment/payment.module';
import { BookingService } from './booking.service';
import { AvailabilityService } from './availability.service';
import { BookingController } from './booking.controller';
import { GoogleMeetService } from '../common/google-meet.service';

@Module({
    imports: [PrismaModule, PaymentModule, ConfigModule],
    controllers: [BookingController],
    providers: [BookingService, AvailabilityService, GoogleMeetService],
    exports: [BookingService, AvailabilityService],
})
export class BookingModule { }
