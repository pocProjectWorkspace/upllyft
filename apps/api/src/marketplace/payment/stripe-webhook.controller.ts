import { Controller, Post, Headers, Req, BadRequestException, Logger } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { StripeConnectService } from './stripe-connect.service';
import { PaymentService } from './payment.service';

@Controller('webhooks/stripe')
export class StripeWebhookController {
    private readonly logger = new Logger(StripeWebhookController.name);

    constructor(
        private stripeConnect: StripeConnectService,
        private paymentService: PaymentService,
    ) { }

    @Post()
    async handleWebhook(
        @Headers('stripe-signature') signature: string,
        @Req() request: RawBodyRequest<Request>,
    ) {
        if (!signature) {
            throw new BadRequestException('Missing stripe-signature header');
        }

        const payload = request.rawBody;

        if (!payload) {
            throw new BadRequestException('Missing request body');
        }

        let event;

        try {
            event = this.stripeConnect.constructWebhookEvent(payload, signature);
        } catch (err) {
            this.logger.error(`Webhook signature verification failed: ${err.message}`);
            throw new BadRequestException(`Webhook Error: ${err.message}`);
        }

        this.logger.log(`Received Stripe webhook: ${event.type}`);

        // Handle different event types
        switch (event.type) {
            case 'payment_intent.succeeded':
                await this.handlePaymentIntentSucceeded(event.data.object);
                break;

            case 'payment_intent.payment_failed':
                await this.handlePaymentIntentFailed(event.data.object);
                break;

            case 'account.updated':
                await this.handleAccountUpdated(event.data.object);
                break;

            case 'charge.refunded':
                this.logger.log(`Refund processed for charge ${event.data.object.id}`);
                break;

            default:
                this.logger.log(`Unhandled event type: ${event.type}`);
        }

        return { received: true };
    }

    private async handlePaymentIntentSucceeded(paymentIntent: any) {
        try {
            await this.paymentService.handlePaymentSuccess(paymentIntent.id);
            this.logger.log(`Processed payment success for ${paymentIntent.id}`);
        } catch (error) {
            this.logger.error(`Error handling payment success: ${error.message}`);
        }
    }

    private async handlePaymentIntentFailed(paymentIntent: any) {
        try {
            // TODO: Update booking status to PAYMENT_FAILED
            this.logger.log(`Payment failed for ${paymentIntent.id}`);
        } catch (error) {
            this.logger.error(`Error handling payment failure: ${error.message}`);
        }
    }

    private async handleAccountUpdated(account: any) {
        try {
            const metadata = account.metadata;

            if (metadata.accountType === 'therapist') {
                await this.paymentService.updateTherapistOnboardingStatus(
                    metadata.therapistId,
                );
                this.logger.log(`Updated onboarding status for therapist ${metadata.therapistId}`);
            }
        } catch (error) {
            this.logger.error(`Error handling account update: ${error.message}`);
        }
    }
}
