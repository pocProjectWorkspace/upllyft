import { Module, forwardRef } from '@nestjs/common';
import { TherapistProfileController } from './therapist.controller';
import { TherapistManagementController } from './therapist-management.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { BookingModule } from '../booking/booking.module';
import { MatchingService } from '../matching/matching.service';

@Module({
    imports: [
        PrismaModule,
        forwardRef(() => BookingModule),
    ],
    controllers: [TherapistManagementController, TherapistProfileController],
    providers: [MatchingService],
})
export class TherapistModule { }
