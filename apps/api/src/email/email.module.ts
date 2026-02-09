/**
 * Email Module
 * 
 * Provides email functionality with configurable providers.
 * Provider is selected via EMAIL_PROVIDER environment variable.
 * 
 * Supported providers:
 * - sendgrid (default)
 * - ses (Amazon SES)
 * - mailersend
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Main service
import { EmailService } from './email.service';

// Factory
import { EmailProviderFactory } from './factory';

// Providers
import { SendGridProvider } from './providers/sendgrid.provider';
import { SESProvider } from './providers/ses.provider';
import { MailerSendProvider } from './providers/mailersend.provider';

// Utils
import { EmailIdempotencyService } from './utils';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    // Email providers (all are registered, factory selects the active one)
    SendGridProvider,
    SESProvider,
    MailerSendProvider,

    // Factory for provider resolution
    EmailProviderFactory,

    // Idempotency service for duplicate prevention
    EmailIdempotencyService,

    // Main service facade
    EmailService,
  ],
  exports: [
    EmailService,
    EmailProviderFactory,
    EmailIdempotencyService,
  ],
})
export class EmailModule { }