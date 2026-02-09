import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';
import { CaseAccessGuard } from './guards/case-access.guard';

@Module({
  imports: [PrismaModule],
  controllers: [CasesController],
  providers: [CasesService, CaseAccessGuard],
  exports: [CasesService, CaseAccessGuard],
})
export class CasesModule {}
