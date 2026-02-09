import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CasesModule } from '../cases/cases.module';
import { MilestonePlansController } from './milestone-plans.controller';
import { MilestonePlansService } from './milestone-plans.service';
import { MilestoneAiService } from './milestone-ai.service';

@Module({
  imports: [PrismaModule, CasesModule],
  controllers: [MilestonePlansController],
  providers: [MilestonePlansService, MilestoneAiService],
  exports: [MilestonePlansService],
})
export class MilestonePlansModule {}
