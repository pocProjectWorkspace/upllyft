import { Module } from '@nestjs/common';
import { ClinicTrackingController } from './clinic-tracking.controller';
import { ClinicTrackingService } from './clinic-tracking.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClinicTrackingController],
  providers: [ClinicTrackingService],
  exports: [ClinicTrackingService],
})
export class ClinicTrackingModule {}
