/**
 * Email Options Interface
 * Defines the contract for email parameters across all providers
 */

export interface EmailRecipient {
    email: string;
    name?: string;
}

export interface EmailAttachment {
    filename: string;
    content: string | Buffer;
    contentType?: string;
    encoding?: 'base64' | 'utf-8';
}

export interface EmailOptions {
    /** Recipient email address or object */
    to: string | EmailRecipient | EmailRecipient[];

    /** Email subject line */
    subject: string;

    /** Plain text content */
    text?: string;

    /** HTML content */
    html?: string;

    /** CC recipients */
    cc?: string | EmailRecipient | EmailRecipient[];

    /** BCC recipients */
    bcc?: string | EmailRecipient | EmailRecipient[];

    /** Reply-to address */
    replyTo?: string | EmailRecipient;

    /** Email attachments */
    attachments?: EmailAttachment[];

    /** Provider-specific template ID (SendGrid, MailerSend) */
    templateId?: string;

    /** Dynamic template data for template-based emails */
    dynamicTemplateData?: Record<string, unknown>;

    /** Custom headers */
    headers?: Record<string, string>;

    /** Unique idempotency key to prevent duplicate sends */
    idempotencyKey?: string;

    /** Custom tags for tracking/analytics */
    tags?: string[];

    /** Priority: 'high' | 'normal' | 'low' */
    priority?: 'high' | 'normal' | 'low';
}

export interface EmailSendResult {
    /** Whether the email was sent successfully */
    success: boolean;

    /** Provider-specific message ID */
    messageId?: string;

    /** Error message if failed */
    error?: string;

    /** Error code if applicable */
    errorCode?: string;

    /** Whether this was a duplicate send attempt (idempotency) */
    duplicate?: boolean;

    /** Provider that handled the send */
    provider?: string;

    /** Timestamp of the send attempt */
    timestamp: Date;
}

export interface EmailProviderConfig {
    /** Sender email address */
    fromEmail: string;

    /** Sender display name */
    fromName: string;

    /** Provider-specific API key */
    apiKey?: string;

    /** AWS region (for SES) */
    region?: string;

    /** AWS access key ID (for SES) */
    accessKeyId?: string;

    /** AWS secret access key (for SES) */
    secretAccessKey?: string;

    /** SMTP host (for MailerSend) */
    smtpHost?: string;

    /** SMTP port (for MailerSend) */
    smtpPort?: number;

    /** SMTP username (for MailerSend) */
    smtpUser?: string;

    /** SMTP password (for MailerSend) */
    smtpPass?: string;
}

export type EmailProviderType = 'sendgrid' | 'ses' | 'mailersend';
