import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CasesModule } from '../cases/cases.module';
import {
  CaseIEPsController,
  IEPTemplatesController,
  GoalBankController,
} from './ieps.controller';
import { IEPsService } from './ieps.service';
import { IEPAiService } from './iep-ai.service';

@Module({
  imports: [PrismaModule, CasesModule],
  controllers: [CaseIEPsController, IEPTemplatesController, GoalBankController],
  providers: [IEPsService, IEPAiService],
  exports: [IEPsService, IEPAiService],
})
export class IEPsModule {}
