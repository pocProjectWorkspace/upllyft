import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CasesModule } from '../cases/cases.module';
import { CaseBillingController } from './case-billing.controller';
import { CaseBillingService } from './case-billing.service';

@Module({
  imports: [PrismaModule, CasesModule],
  controllers: [CaseBillingController],
  providers: [CaseBillingService],
  exports: [CaseBillingService],
})
export class CaseBillingModule {}
