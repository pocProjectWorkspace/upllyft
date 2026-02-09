import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CasesModule } from '../cases/cases.module';
import { CaseAuditController } from './case-audit.controller';
import { CaseAuditService } from './case-audit.service';

@Module({
  imports: [PrismaModule, CasesModule],
  controllers: [CaseAuditController],
  providers: [CaseAuditService],
  exports: [CaseAuditService],
})
export class CaseAuditModule {}
