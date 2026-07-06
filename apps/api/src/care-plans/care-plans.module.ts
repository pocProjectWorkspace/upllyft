import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CasesModule } from '../cases/cases.module';
import { CarePlansController } from './care-plans.controller';
import { CarePlansService } from './care-plans.service';

@Module({
  imports: [PrismaModule, CasesModule],
  controllers: [CarePlansController],
  providers: [CarePlansService],
  exports: [CarePlansService],
})
export class CarePlansModule {}
