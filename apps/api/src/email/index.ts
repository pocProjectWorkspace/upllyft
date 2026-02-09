/**
 * Email Module - Public API
 * 
 * Export only what's needed by application code.
 * Provider implementations are internal.
 */

// Module
export { EmailModule } from './email.module';

// Main service (this is what application code should use)
export { EmailService } from './email.service';

// Interfaces (for typing in application code)
export type {
    EmailOptions,
    EmailSendResult,
    EmailRecipient,
    EmailAttachment,
    EmailProviderType,
} from './interfaces';

// Factory (for advanced use cases like health checks)
export { EmailProviderFactory } from './factory';

// Idempotency service (for advanced retry logic)
export { EmailIdempotencyService } from './utils';
