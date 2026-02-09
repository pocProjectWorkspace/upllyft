import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CasesModule } from '../cases/cases.module';
import { CaseConsentsController } from './case-consents.controller';
import { CaseConsentsService } from './case-consents.service';

@Module({
  imports: [PrismaModule, CasesModule],
  controllers: [CaseConsentsController],
  providers: [CaseConsentsService],
  exports: [CaseConsentsService],
})
export class CaseConsentsModule {}
