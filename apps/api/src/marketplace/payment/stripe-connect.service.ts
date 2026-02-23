import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StripeConnectService {
    private stripe: Stripe;
    private readonly logger = new Logger(StripeConnectService.name);

    constructor(
        private config: ConfigService,
        private prisma: PrismaService,
    ) {
        this.stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY') || 'sk_test_placeholder', {
            apiVersion: '2026-01-28.clover' as any,
        });
    }

    /**
     * Create Stripe Connect Express account for therapist
     */
    async createTherapistAccount(therapistId: string, email: string) {
        try {
            const account = await this.stripe.accounts.create({
                type: 'express',
                country: 'US', // TODO: Make this dynamic based on therapist location
                email,
                capabilities: {
                    transfers: { requested: true },
                },
                business_type: 'individual',
                metadata: {
                    therapistId,
                    accountType: 'therapist',
                },
            });

            // Update therapist profile with Stripe account ID
            await this.prisma.therapistProfile.update({
                where: { id: therapistId },
                data: { stripeAccountId: account.id },
            });

            this.logger.log(`Created Stripe account ${account.id} for therapist ${therapistId}`);

            return account;
        } catch (error) {
            this.logger.error(`Error creating therapist Stripe account: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create Stripe Connect Express account for organization
     */
    async createOrganizationAccount(organizationId: string, email: string, businessName: string) {
        try {
            const account = await this.stripe.accounts.create({
                type: 'express',
                country: 'US',
                email,
                capabilities: {
                    transfers: { requested: true },
                },
                business_type: 'company',
                company: {
                    name: businessName,
                },
                metadata: {
                    organizationId,
                    accountType: 'organization',
                },
            });

            // TODO: Update Organization model with stripeAccountId field
            // await this.prisma.organization.update({
            //   where: { id: organizationId },
            //   data: { stripeAccountId: account.id },
            // });

            this.logger.log(`Created Stripe account ${account.id} for organization ${organizationId}`);

            return account;
        } catch (error) {
            this.logger.error(`Error creating organization Stripe account: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generate Stripe Connect onboarding link
     */
    async createAccountLink(accountId: string, refreshUrl: string, returnUrl: string) {
        try {
            const accountLink = await this.stripe.accountLinks.create({
                account: accountId,
                refresh_url: refreshUrl,
                return_url: returnUrl,
                type: 'account_onboarding',
            });

            return accountLink.url;
        } catch (error) {
            this.logger.error(`Error creating account link: ${error.message}`);
            throw error;
        }
    }

    /**
     * Check if account onboarding is complete
     */
    async isAccountOnboardingComplete(accountId: string): Promise<boolean> {
        try {
            const account = await this.stripe.accounts.retrieve(accountId);

            return account.details_submitted && account.charges_enabled;
        } catch (error) {
            this.logger.error(`Error checking account status: ${error.message}`);
            return false;
        }
    }

    /**
     * Create payment intent with platform fee for booking
     */
    async createPaymentIntent(
        amount: number, // in cents
        currency: string,
        therapistStripeAccountId: string,
        platformFeeAmount: number, // in cents
        metadata: {
            bookingId: string;
            therapistId: string;
            organizationId?: string;
        },
    ) {
        try {
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount,
                currency: currency.toLowerCase(),
                application_fee_amount: platformFeeAmount,
                transfer_data: {
                    destination: therapistStripeAccountId,
                },
                metadata,
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            this.logger.log(`Created payment intent ${paymentIntent.id} for booking ${metadata.bookingId}`);

            return paymentIntent;
        } catch (error) {
            this.logger.error(`Error creating payment intent: ${error.message}`);
            throw error;
        }
    }

    /**
     * Process full refund
     */
    async refundPayment(paymentIntentId: string, reason?: string) {
        try {
            const refund = await this.stripe.refunds.create({
                payment_intent: paymentIntentId,
                reason: reason === 'requested_by_customer' ? 'requested_by_customer' : undefined,
            });

            this.logger.log(`Created full refund ${refund.id} for payment ${paymentIntentId}`);

            return refund;
        } catch (error) {
            this.logger.error(`Error processing refund: ${error.message}`);
            throw error;
        }
    }

    /**
     * Process partial refund
     */
    async refundPartialPayment(
        paymentIntentId: string,
        amountToRefund: number, // in cents
        reason?: string
    ) {
        try {
            const refund = await this.stripe.refunds.create({
                payment_intent: paymentIntentId,
                amount: amountToRefund,
                reason: reason === 'requested_by_customer' ? 'requested_by_customer' : undefined,
            });

            this.logger.log(`Created partial refund ${refund.id} of ${amountToRefund} cents for payment ${paymentIntentId}`);

            return refund;
        } catch (error) {
            this.logger.error(`Error processing partial refund: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create transfer from platform to organization (for revenue split)
     */
    async createTransfer(
        amount: number, // in cents
        destinationAccountId: string,
        metadata: {
            bookingId: string;
            organizationId: string;
        },
    ) {
        try {
            const transfer = await this.stripe.transfers.create({
                amount,
                currency: 'usd',
                destination: destinationAccountId,
                metadata,
            });

            this.logger.log(`Created transfer ${transfer.id} for booking ${metadata.bookingId}`);

            return transfer;
        } catch (error) {
            this.logger.error(`Error creating transfer: ${error.message}`);
            throw error;
        }
    }

    /**
     * Retrieve payment intent details
     */
    async getPaymentIntent(paymentIntentId: string) {
        try {
            return await this.stripe.paymentIntents.retrieve(paymentIntentId);
        } catch (error) {
            this.logger.error(`Error retrieving payment intent: ${error.message}`);
            throw error;
        }
    }

    /**
     * Construct webhook event from request
     */
    constructWebhookEvent(payload: Buffer, signature: string) {
        const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') || '';

        try {
            return this.stripe.webhooks.constructEvent(
                payload,
                signature,
                webhookSecret,
            );
        } catch (error) {
            this.logger.error(`Webhook signature verification failed: ${error.message}`);
            throw error;
        }
    }
}
