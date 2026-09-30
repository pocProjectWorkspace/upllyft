import { Controller, Post, Get, UseGuards, Request, Param, Query, NotImplementedException } from '@nestjs/common';
import { BillingService, type RevenuePeriod } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClinicAdminGuard } from '../common/clinic-admin';
import { resolveClinicScope } from '../common/tenant-scope';

@Controller('billing')
export class BillingController {
    constructor(private readonly billingService: BillingService) { }

    // ── Revenue reporting (clinic admins; scoped to their clinic) ──
    //
    // Previously ADMIN-only and unscoped: any ADMIN saw every clinic's invoices.
    // Now a clinic's admin or owner sees their clinic; SUPERADMIN sees the platform.

    @UseGuards(JwtAuthGuard, ClinicAdminGuard)
    @Get('revenue')
    async getClinicRevenue(
        @Request() req,
        @Query('period') period?: RevenuePeriod,
    ) {
        return this.billingService.getClinicRevenue(period || 'this_month', this.revenueScope(req));
    }

    @UseGuards(JwtAuthGuard, ClinicAdminGuard)
    @Get('revenue/therapist/:id')
    async getTherapistRevenue(
        @Request() req,
        @Param('id') therapistId: string,
        @Query('period') period?: RevenuePeriod,
    ) {
        return this.billingService.getTherapistRevenue(therapistId, period || 'this_month', this.revenueScope(req));
    }

    /** SUPERADMIN → null (platform-wide); anyone else → their clinic, or reject. */
    private revenueScope(req: any): string | null {
        if (req.user.role === 'SUPERADMIN') return null;
        if (req.managedClinic) return req.managedClinic;
        return resolveClinicScope(req.user);
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
