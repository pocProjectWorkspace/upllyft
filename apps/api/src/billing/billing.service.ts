import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceStatus, Prisma } from '@prisma/client';
import Stripe from 'stripe';

export type RevenuePeriod = 'this_month' | 'last_month' | 'this_year';

@Injectable()
export class BillingService {
    private stripe: Stripe;
    private readonly logger = new Logger(BillingService.name);

    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
    ) {
        const stripeSecret = this.configService.get<string>('STRIPE_SECRET_KEY');
        if (!stripeSecret) {
            this.logger.warn('STRIPE_SECRET_KEY is not defined. using placeholder to prevent startup crash.');
        }
        this.stripe = new Stripe(stripeSecret || 'sk_test_placeholder', {
            apiVersion: '2026-01-28.clover',
        });
    }

    async createCheckoutSession(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) throw new NotFoundException('User not found');

        let customerId = user.stripeCustomerId;

        if (!customerId) {
            const customer = await this.stripe.customers.create({
                email: user.email || undefined,
                name: user.name || undefined,
                metadata: {
                    userId: user.id,
                },
            });
            customerId = customer.id;
            await this.prisma.user.update({
                where: { id: userId },
                data: { stripeCustomerId: customerId },
            });
        }

        const priceId = this.configService.get<string>('STRIPE_PRICE_ID');
        if (!priceId) throw new BadRequestException('Price ID not configured');

        const session = await this.stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: `${this.configService.get('FRONTEND_URL')}/settings/billing?success=true`,
            cancel_url: `${this.configService.get('FRONTEND_URL')}/settings/billing?canceled=true`,
            metadata: {
                userId: user.id,
            },
        });

        return { url: session.url };
    }

    async createPortalSession(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || !user.stripeCustomerId) {
            throw new BadRequestException('No billing account found');
        }

        const session = await this.stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${this.configService.get('FRONTEND_URL')}/settings/billing`,
        });

        return { url: session.url };
    }

    async getInvoices(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || !user.stripeCustomerId) {
            return [];
        }

        const invoices = await this.stripe.invoices.list({
            customer: user.stripeCustomerId,
            limit: 10,
        });

        return invoices.data.map(invoice => ({
            id: invoice.id,
            number: invoice.number,
            amount: invoice.total / 100,
            currency: invoice.currency,
            status: invoice.status,
            date: new Date(invoice.created * 1000),
            pdfUrl: invoice.hosted_invoice_url, // Or invoice_pdf if we want direct download link
        }));
    }

    async handleWebhook(signature: string, payload: Buffer) {
        const endpointSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(payload, signature, endpointSecret || '');
        } catch (err) {
            this.logger.error(`Webhook signature verification failed: ${err.message}`);
            throw new BadRequestException('Webhook Error');
        }

        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                const subscription = event.data.object as Stripe.Subscription;
                await this.handleSubscriptionUpdate(subscription);
                break;
            case 'invoice.payment_succeeded':
                // Handle successful payment logic if needed (e.g. reset usage immediately or rely on subscription status)
                break;
        }

        return { received: true };
    }

    // ── Revenue reporting ──

    private getPeriodRange(period: RevenuePeriod): { start: Date; end: Date } {
        const now = new Date();
        switch (period) {
            case 'this_month': {
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                return { start, end };
            }
            case 'last_month': {
                const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                return { start, end };
            }
            case 'this_year': {
                const start = new Date(now.getFullYear(), 0, 1);
                const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                return { start, end };
            }
        }
    }

    async getClinicRevenue(period: RevenuePeriod = 'this_month') {
        const { start, end } = this.getPeriodRange(period);

        const where: Prisma.InvoiceWhereInput = {
            createdAt: { gte: start, lte: end },
        };

        // Aggregate totals
        const [totalAgg, sessionCount, outstanding, invoices] = await Promise.all([
            this.prisma.invoice.aggregate({
                where,
                _sum: { amount: true },
                _count: { id: true },
            }),
            this.prisma.caseSession.count({
                where: {
                    noteStatus: 'SIGNED',
                    signedAt: { gte: start, lte: end },
                },
            }),
            this.prisma.invoice.aggregate({
                where: { status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.ISSUED] } },
                _sum: { amount: true },
                _count: { id: true },
            }),
            this.prisma.invoice.findMany({
                where,
                include: {
                    therapist: { select: { id: true, name: true, image: true } },
                },
            }),
        ]);

        const totalInvoiced = Number(totalAgg._sum.amount ?? 0);
        const totalSessions = sessionCount;
        const avgRevenuePerSession = totalSessions > 0 ? totalInvoiced / totalSessions : 0;

        // Per-therapist breakdown
        const therapistMap = new Map<string, {
            therapist: { id: string; name: string | null; avatarUrl: string | null };
            invoiced: number;
            sessions: number;
        }>();

        for (const inv of invoices) {
            const tid = inv.therapistId;
            if (!therapistMap.has(tid)) {
                therapistMap.set(tid, {
                    therapist: {
                        id: inv.therapist.id,
                        name: inv.therapist.name,
                        avatarUrl: inv.therapist.image,
                    },
                    invoiced: 0,
                    sessions: 0,
                });
            }
            const entry = therapistMap.get(tid)!;
            entry.invoiced += Number(inv.amount);
            entry.sessions += 1;
        }

        const byTherapist = Array.from(therapistMap.values()).sort(
            (a, b) => b.invoiced - a.invoiced,
        );

        // Weekly/monthly breakdown
        const byWeek = this.buildTimeBuckets(invoices, period, start, end);

        return {
            period,
            totalInvoiced,
            totalSessions,
            avgRevenuePerSession: Math.round(avgRevenuePerSession * 100) / 100,
            outstanding: {
                count: outstanding._count.id,
                amount: Number(outstanding._sum.amount ?? 0),
            },
            byTherapist,
            byWeek,
        };
    }

    async getTherapistRevenue(therapistId: string, period: RevenuePeriod = 'this_month') {
        const { start, end } = this.getPeriodRange(period);

        const therapist = await this.prisma.user.findUnique({
            where: { id: therapistId },
            select: { id: true, name: true, image: true },
        });

        if (!therapist) throw new NotFoundException('Therapist not found');

        const where: Prisma.InvoiceWhereInput = {
            therapistId,
            createdAt: { gte: start, lte: end },
        };

        const [totalAgg, invoices] = await Promise.all([
            this.prisma.invoice.aggregate({
                where,
                _sum: { amount: true },
                _count: { id: true },
            }),
            this.prisma.invoice.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                include: {
                    session: {
                        select: {
                            scheduledAt: true,
                            sessionType: true,
                            actualDuration: true,
                        },
                    },
                    patient: { select: { id: true, name: true } },
                },
            }),
        ]);

        return {
            therapist: {
                id: therapist.id,
                name: therapist.name,
                avatarUrl: therapist.image,
            },
            period,
            totalInvoiced: Number(totalAgg._sum.amount ?? 0),
            totalSessions: totalAgg._count.id,
            invoices,
        };
    }

    private buildTimeBuckets(
        invoices: any[],
        period: RevenuePeriod,
        start: Date,
        end: Date,
    ) {
        if (period === 'this_year') {
            // Monthly buckets
            const buckets: Record<string, number> = {};
            for (let m = 0; m < 12; m++) {
                const label = new Date(start.getFullYear(), m, 1).toLocaleDateString('en-US', {
                    month: 'short',
                });
                buckets[label] = 0;
            }
            for (const inv of invoices) {
                const d = new Date(inv.createdAt);
                const label = d.toLocaleDateString('en-US', { month: 'short' });
                buckets[label] = (buckets[label] ?? 0) + Number(inv.amount);
            }
            return Object.entries(buckets).map(([week, amount]) => ({ week, amount }));
        }

        // Weekly buckets (for this_month / last_month — up to 5 weeks)
        const buckets: { week: string; start: Date; amount: number }[] = [];
        const cursor = new Date(start);
        let weekNum = 1;
        while (cursor <= end) {
            const weekStart = new Date(cursor);
            const weekEnd = new Date(cursor);
            weekEnd.setDate(weekEnd.getDate() + 6);
            if (weekEnd > end) weekEnd.setTime(end.getTime());
            buckets.push({
                week: `Week ${weekNum}`,
                start: weekStart,
                amount: 0,
            });
            cursor.setDate(cursor.getDate() + 7);
            weekNum++;
        }

        for (const inv of invoices) {
            const d = new Date(inv.createdAt);
            for (let i = buckets.length - 1; i >= 0; i--) {
                if (d >= buckets[i].start) {
                    buckets[i].amount += Number(inv.amount);
                    break;
                }
            }
        }

        return buckets.map(({ week, amount }) => ({ week, amount }));
    }

    private async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
        const customerId = subscription.customer as string;
        const user = await this.prisma.user.findUnique({
            where: { stripeCustomerId: customerId },
        });

        if (!user) return;

        // Map Stripe status to our simple status
        // active, past_due, unpaid, canceled, incomplete, incomplete_expired, trialing
        const status = subscription.status;
        const sub = subscription as any;

        await this.prisma.aiSubscription.upsert({
            where: { userId: user.id },
            create: {
                userId: user.id,
                stripeSubscriptionId: subscription.id,
                status: status,
                currentPeriodEnd: new Date(sub.current_period_end * 1000),
                planId: sub.items.data[0].price.id,
            },
            update: {
                status: status,
                currentPeriodEnd: new Date(sub.current_period_end * 1000),
                planId: sub.items.data[0].price.id,
            },
        });

        // If active, increase limit to 20
        if (status === 'active') {
            await this.prisma.aiUsage.upsert({
                where: { userId: user.id },
                create: { userId: user.id, limit: 20 },
                update: { limit: 20 },
            });
        } else {
            // Revert to free tier if canceled/unpaid
            await this.prisma.aiUsage.upsert({
                where: { userId: user.id },
                create: { userId: user.id, limit: 3 },
                update: { limit: 3 },
            });
        }
    }
}
