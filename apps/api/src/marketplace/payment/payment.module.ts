import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { StripeConnectService } from './stripe-connect.service';
import { PaymentService } from './payment.service';
import { EscrowScheduler } from './escrow.scheduler';
import { StripeWebhookController } from './stripe-webhook.controller';
import { TherapistStripeController } from './therapist-stripe.controller';

@Module({
    imports: [ConfigModule, PrismaModule],
    providers: [StripeConnectService, PaymentService, EscrowScheduler],
    controllers: [StripeWebhookController, TherapistStripeController],
    exports: [StripeConnectService, PaymentService],
})
export class PaymentModule { }
