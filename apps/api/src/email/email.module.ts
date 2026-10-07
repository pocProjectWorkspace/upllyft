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
 * - smtp (any SMTP relay)
 * - brevo (Brevo HTTP API; works where outbound SMTP is blocked)
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Main service
import { EmailService } from './email.service';
import { EmailOutboxService } from './email-outbox.service';

// Factory
import { EmailProviderFactory } from './factory';

// Providers
import { SendGridProvider } from './providers/sendgrid.provider';
import { SESProvider } from './providers/ses.provider';
import { MailerSendProvider } from './providers/mailersend.provider';
import { SmtpProvider } from './providers/smtp.provider';
import { BrevoProvider } from './providers/brevo.provider';

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
    SmtpProvider,
    BrevoProvider,

    // Factory for provider resolution
    EmailProviderFactory,

    // Idempotency service for duplicate prevention
    EmailIdempotencyService,

    // Main service facade
    EmailService,

    // Daily-capped queue for bulk emails
    EmailOutboxService,
  ],
  exports: [
    EmailService,
    EmailOutboxService,
    EmailProviderFactory,
    EmailIdempotencyService,
  ],
})
export class EmailModule { }