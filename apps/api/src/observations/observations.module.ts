import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ObservationsService } from './observations.service';
import { ObservationsController, GuardianObservationsController } from './observations.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ObservationsController, GuardianObservationsController],
  providers: [ObservationsService],
  exports: [ObservationsService],
})
export class ObservationsModule {}
