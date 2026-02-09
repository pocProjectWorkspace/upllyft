import {
    Controller,
    Get,
    Post,
    UseGuards,
    Req,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { StripeConnectService } from './stripe-connect.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Controller('marketplace/therapists/me/stripe')
@UseGuards(JwtAuthGuard)
export class TherapistStripeController {
    constructor(
        private stripeConnectService: StripeConnectService,
        private prisma: PrismaService,
        private config: ConfigService,
    ) { }

    /**
     * Get therapist's Stripe account status
     */
    @Get('status')
    async getStripeStatus(@Req() req: any) {
        const userId = req.user.id;

        const therapistProfile = await this.prisma.therapistProfile.findFirst({
            where: { userId },
        });

        if (!therapistProfile) {
            throw new HttpException(
                'Therapist profile not found',
                HttpStatus.NOT_FOUND,
            );
        }

        if (!therapistProfile.stripeAccountId) {
            return {
                connected: false,
                onboardingComplete: false,
            };
        }

        const onboardingComplete = await this.stripeConnectService.isAccountOnboardingComplete(
            therapistProfile.stripeAccountId,
        );

        return {
            connected: true,
            onboardingComplete,
            stripeAccountId: therapistProfile.stripeAccountId,
        };
    }

    /**
     * Create Stripe onboarding link for therapist
     */
    @Post('onboard')
    async createOnboardingLink(@Req() req: any) {
        const userId = req.user.id;
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }

        const therapistProfile = await this.prisma.therapistProfile.findFirst({
            where: { userId },
        });

        if (!therapistProfile) {
            throw new HttpException(
                'Therapist profile not found',
                HttpStatus.NOT_FOUND,
            );
        }

        let stripeAccountId = therapistProfile.stripeAccountId;

        // Create Stripe account if doesn't exist
        if (!stripeAccountId) {
            const account = await this.stripeConnectService.createTherapistAccount(
                therapistProfile.id,
                user.email,
            );
            stripeAccountId = account.id;
        }

        // Get base URL from config or request
        const baseUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
        const refreshUrl = `${baseUrl}/marketplace/therapist/settings?refresh=true`;
        const returnUrl = `${baseUrl}/marketplace/therapist/settings?success=true`;

        const onboardingUrl = await this.stripeConnectService.createAccountLink(
            stripeAccountId,
            refreshUrl,
            returnUrl,
        );

        return {
            url: onboardingUrl,
            stripeAccountId,
        };
    }

    /**
     * Get Stripe Express Dashboard link
     */
    @Get('dashboard')
    async getDashboardLink(@Req() req: any) {
        const userId = req.user.id;

        const therapistProfile = await this.prisma.therapistProfile.findFirst({
            where: { userId },
        });

        if (!therapistProfile || !therapistProfile.stripeAccountId) {
            throw new HttpException(
                'Stripe account not connected',
                HttpStatus.BAD_REQUEST,
            );
        }

        // Create login link for Stripe Express Dashboard
        const stripe = require('stripe')(this.config.get<string>('STRIPE_SECRET_KEY'));
        const loginLink = await stripe.accounts.createLoginLink(
            therapistProfile.stripeAccountId,
        );

        return {
            url: loginLink.url,
        };
    }
}
