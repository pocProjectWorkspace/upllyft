import { Module } from '@nestjs/common';
import { ClinicTherapistsController } from './clinic-therapists.controller';
import { ClinicTherapistsService } from './clinic-therapists.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClinicTherapistsController],
  providers: [ClinicTherapistsService],
  exports: [ClinicTherapistsService],
})
export class ClinicTherapistsModule {}
