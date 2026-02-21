import { Module } from '@nestjs/common';
import { ClinicPatientsController } from './clinic-patients.controller';
import { ClinicPatientsService } from './clinic-patients.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [ClinicPatientsController],
  providers: [ClinicPatientsService],
  exports: [ClinicPatientsService],
})
export class ClinicPatientsModule {}
