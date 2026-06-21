import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PayerService } from './payer.service';
import {
  InsurancePolicyController,
  PreAuthorizationController,
  BookingClearanceController,
} from './payer.controller';

/**
 * UAE Clinic Phase 2 — payer / insurance / pre-authorisation + financial
 * clearance (workflow/engagement layer; clinic bookings only).
 */
@Module({
  imports: [PrismaModule],
  controllers: [
    InsurancePolicyController,
    PreAuthorizationController,
    BookingClearanceController,
  ],
  providers: [PayerService],
  exports: [PayerService],
})
export class PayerModule {}
