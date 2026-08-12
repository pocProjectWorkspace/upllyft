import { Controller, Post, Get, UseGuards, Request, Param, Query, NotImplementedException } from '@nestjs/common';
import { BillingService, type RevenuePeriod } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { Role } from '@prisma/client';

@Controller('billing')
export class BillingController {
    constructor(private readonly billingService: BillingService) { }

    // ── Revenue reporting (ADMIN only) ──

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @Get('revenue')
    async getClinicRevenue(
        @Query('period') period?: RevenuePeriod,
    ) {
        return this.billingService.getClinicRevenue(period || 'this_month');
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @Get('revenue/therapist/:id')
    async getTherapistRevenue(
        @Param('id') therapistId: string,
        @Query('period') period?: RevenuePeriod,
    ) {
        return this.billingService.getTherapistRevenue(therapistId, period || 'this_month');
    }

    // ── Stripe billing ──

    @UseGuards(JwtAuthGuard)
    @Post('subscribe')
    async createCheckoutSession(@Request() req) {
        return this.billingService.createCheckoutSession(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('portal')
    async createPortalSession(@Request() req) {
        return this.billingService.createPortalSession(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('invoices')
    async getInvoices(@Request() req) {
        return this.billingService.getInvoices(req.user.id);
    }

    @Post('webhook')
    handleWebhook(): never {
        // Billing/escrow is not enabled for launch (pending a business Stripe account).
        // Intentionally not implemented: this must NOT silently return 200, which would make
        // Stripe treat dropped events as successfully processed. When billing goes live,
        // capture the raw request body, verify it with stripe.webhooks.constructEvent, and
        // call billingService.handleWebhook.
        throw new NotImplementedException('Billing webhook is not enabled');
    }
}
