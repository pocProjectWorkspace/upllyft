import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CasesModule } from '../cases/cases.module';
import { CaseSessionsController } from './case-sessions.controller';
import { CaseSessionsService } from './case-sessions.service';
import { CaseAiService } from './case-ai.service';

@Module({
  imports: [PrismaModule, CasesModule],
  controllers: [CaseSessionsController],
  providers: [CaseSessionsService, CaseAiService],
  exports: [CaseSessionsService, CaseAiService],
})
export class CaseSessionsModule {}
