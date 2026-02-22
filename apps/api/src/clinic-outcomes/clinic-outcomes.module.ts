import { Module } from '@nestjs/common';
import { ClinicOutcomesController } from './clinic-outcomes.controller';
import { ClinicOutcomesService } from './clinic-outcomes.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClinicOutcomesController],
  providers: [ClinicOutcomesService],
  exports: [ClinicOutcomesService],
})
export class ClinicOutcomesModule {}
