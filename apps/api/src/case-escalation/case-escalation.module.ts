import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CasesModule } from '../cases/cases.module';
import { CaseEscalationController } from './case-escalation.controller';
import { CaseEscalationService } from './case-escalation.service';

@Module({
  imports: [PrismaModule, CasesModule],
  controllers: [CaseEscalationController],
  providers: [CaseEscalationService],
  exports: [CaseEscalationService],
})
export class CaseEscalationModule {}
