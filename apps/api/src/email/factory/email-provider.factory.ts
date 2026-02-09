/**
 * Email Provider Factory
 * Resolves and initializes the correct email provider based on environment configuration
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    IEmailProvider,
    EmailProviderConfig,
    EmailProviderType,
} from '../interfaces';
import { SendGridProvider } from '../providers/sendgrid.provider';
import { SESProvider } from '../providers/ses.provider';
import { MailerSendProvider } from '../providers/mailersend.provider';

@Injectable()
export class EmailProviderFactory implements OnModuleInit {
    private readonly logger = new Logger(EmailProviderFactory.name);
    private provider: IEmailProvider | null = null;
    private initialized = false;

    constructor(
        private readonly configService: ConfigService,
        private readonly sendGridProvider: SendGridProvider,
        private readonly sesProvider: SESProvider,
        private readonly mailerSendProvider: MailerSendProvider,
    ) { }

    async onModuleInit(): Promise<void> {
        await this.initializeProvider();
    }

    /**
     * Initialize the email provider based on EMAIL_PROVIDER environment variable
     */
    async initializeProvider(): Promise<void> {
        if (this.initialized) {
            return;
        }

        const providerType = this.getProviderType();
        const config = this.buildProviderConfig(providerType);

        try {
            switch (providerType) {
                case 'sendgrid':
                    this.provider = this.sendGridProvider;
                    break;
                case 'ses':
                    this.provider = this.sesProvider;
                    break;
                case 'mailersend':
                    this.provider = this.mailerSendProvider;
                    break;
                default:
                    throw new Error(`Unknown email provider: ${providerType}`);
            }

            await this.provider.initialize(config);
            this.initialized = true;
            this.logger.log(`Email provider initialized: ${providerType.toUpperCase()}`);
        } catch (error) {
            this.logger.error(
                `Failed to initialize email provider (${providerType}):`,
                error instanceof Error ? error.message : error,
            );
            // Don't throw - allow app to start even if email is misconfigured
            // Individual send attempts will fail gracefully
        }
    }

    /**
     * Get the currently configured provider type
     */
    getProviderType(): EmailProviderType {
        const provider = this.configService
            .get<string>('EMAIL_PROVIDER', 'sendgrid')
            .toLowerCase() as EmailProviderType;

        const validProviders: EmailProviderType[] = ['sendgrid', 'ses', 'mailersend'];

        if (!validProviders.includes(provider)) {
            this.logger.warn(
                `Invalid EMAIL_PROVIDER "${provider}", falling back to sendgrid`,
            );
            return 'sendgrid';
        }

        return provider;
    }

    /**
     * Get the initialized email provider
     */
    getProvider(): IEmailProvider {
        if (!this.provider) {
            throw new Error('Email provider not initialized. Check EMAIL_PROVIDER configuration.');
        }
        return this.provider;
    }

    /**
     * Check if any provider is configured and ready
     */
    isConfigured(): boolean {
        return this.initialized && this.provider !== null && this.provider.isConfigured();
    }

    /**
     * Get all available providers for health checks
     */
    getAllProviders(): IEmailProvider[] {
        return [
            this.sendGridProvider,
            this.sesProvider,
            this.mailerSendProvider,
        ];
    }

    /**
     * Build provider configuration from environment variables
     */
    private buildProviderConfig(providerType: EmailProviderType): EmailProviderConfig {
        const baseConfig: EmailProviderConfig = {
            fromEmail: this.getFromEmail(),
            fromName: this.getFromName(),
        };

        switch (providerType) {
            case 'sendgrid':
                return {
                    ...baseConfig,
                    apiKey: this.configService.get<string>('SENDGRID_API_KEY'),
                };

            case 'ses':
                return {
                    ...baseConfig,
                    region: this.configService.get<string>('AWS_SES_REGION', 'us-east-1'),
                    accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
                    secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
                };

            case 'mailersend':
                return {
                    ...baseConfig,
                    smtpHost: this.configService.get<string>('MAILERSEND_SMTP_HOST', 'smtp.mailersend.net'),
                    smtpPort: this.configService.get<number>('MAILERSEND_SMTP_PORT', 587),
                    smtpUser: this.configService.get<string>('MAILERSEND_SMTP_USER'),
                    smtpPass: this.configService.get<string>('MAILERSEND_SMTP_PASS'),
                };

            default:
                return baseConfig;
        }
    }

    /**
     * Get sender email from provider-specific or generic config
     */
    private getFromEmail(): string {
        const providerType = this.getProviderType();

        // Check provider-specific first, then fall back to generic
        const providerSpecific = {
            sendgrid: 'SENDGRID_FROM_EMAIL',
            ses: 'AWS_SES_FROM_EMAIL',
            mailersend: 'MAILERSEND_FROM_EMAIL',
        };

        return (
            this.configService.get<string>(providerSpecific[providerType]) ||
            this.configService.get<string>('EMAIL_FROM_ADDRESS') ||
            this.configService.get<string>('SENDGRID_FROM_EMAIL', 'noreply@example.com')
        );
    }

    /**
     * Get sender name from provider-specific or generic config
     */
    private getFromName(): string {
        const providerType = this.getProviderType();

        const providerSpecific = {
            sendgrid: 'SENDGRID_FROM_NAME',
            ses: 'AWS_SES_FROM_NAME',
            mailersend: 'MAILERSEND_FROM_NAME',
        };

        return (
            this.configService.get<string>(providerSpecific[providerType]) ||
            this.configService.get<string>('EMAIL_FROM_NAME') ||
            this.configService.get<string>('SENDGRID_FROM_NAME', 'Upllyft')
        );
    }
}
