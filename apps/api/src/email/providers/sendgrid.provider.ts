/**
 * SendGrid Email Provider
 * Production-ready implementation for SendGrid transactional emails
 */

import { Injectable, Logger } from '@nestjs/common';
import sgMail, { MailDataRequired } from '@sendgrid/mail';
import {
    BaseEmailProvider,
    EmailOptions,
    EmailProviderConfig,
    EmailSendResult,
} from '../interfaces';

@Injectable()
export class SendGridProvider extends BaseEmailProvider {
    readonly name = 'sendgrid';
    private readonly logger = new Logger(SendGridProvider.name);

    async initialize(config: EmailProviderConfig): Promise<void> {
        if (!config.apiKey) {
            throw new Error('SendGrid API key is required');
        }

        sgMail.setApiKey(config.apiKey);
        this.config = config;
        this.initialized = true;
        this.logger.log('SendGrid provider initialized successfully');
    }

    async send(options: EmailOptions): Promise<EmailSendResult> {
        if (!this.isConfigured()) {
            return {
                success: false,
                error: 'SendGrid provider is not configured',
                provider: this.name,
                timestamp: new Date(),
            };
        }

        try {
            this.validateOptions(options);

            const msg = this.buildMessage(options);
            const [response] = await sgMail.send(msg);

            this.logger.log(
                `Email sent successfully via SendGrid to ${this.getRecipientString(options.to)}`,
            );

            return {
                success: true,
                messageId: response.headers['x-message-id'] as string,
                provider: this.name,
                timestamp: new Date(),
            };
        } catch (error) {
            const errorMessage = this.extractErrorMessage(error);

            this.logger.error(
                `Failed to send email via SendGrid: ${errorMessage}`,
                error instanceof Error ? error.stack : undefined,
            );

            return {
                success: false,
                error: errorMessage,
                errorCode: this.extractErrorCode(error),
                provider: this.name,
                timestamp: new Date(),
            };
        }
    }

    async getHealthStatus(): Promise<{ healthy: boolean; details?: Record<string, unknown> }> {
        return {
            healthy: this.isConfigured(),
            details: {
                provider: this.name,
                configured: this.isConfigured(),
                fromEmail: this.config?.fromEmail,
            },
        };
    }

    private buildMessage(options: EmailOptions): MailDataRequired {
        const recipients = this.normalizeRecipients(options.to);

        // Build base message
        const msg: Partial<MailDataRequired> = {
            to: recipients.map(r => (r.name ? { email: r.email, name: r.name } : r.email)),
            from: {
                email: this.config!.fromEmail,
                name: this.config!.fromName,
            },
        };

        // Add CC/BCC if provided
        if (options.cc) {
            const ccRecipients = this.normalizeRecipients(options.cc);
            msg.cc = ccRecipients.map(r => (r.name ? { email: r.email, name: r.name } : r.email));
        }

        if (options.bcc) {
            const bccRecipients = this.normalizeRecipients(options.bcc);
            msg.bcc = bccRecipients.map(r => (r.name ? { email: r.email, name: r.name } : r.email));
        }

        // Add reply-to if provided
        if (options.replyTo) {
            const replyTo = typeof options.replyTo === 'string'
                ? { email: options.replyTo }
                : options.replyTo;
            msg.replyTo = replyTo.name
                ? { email: replyTo.email, name: replyTo.name }
                : replyTo.email;
        }

        // Template-based email
        if (options.templateId) {
            return {
                ...msg,
                templateId: options.templateId,
                dynamicTemplateData: options.dynamicTemplateData || {},
            } as MailDataRequired;
        }

        // Content-based email
        msg.subject = options.subject;

        if (options.html) {
            msg.html = options.html;
        }

        if (options.text) {
            msg.text = options.text;
        }

        // Add attachments if provided
        if (options.attachments && options.attachments.length > 0) {
            msg.attachments = options.attachments.map(att => ({
                content: Buffer.isBuffer(att.content)
                    ? att.content.toString('base64')
                    : att.content,
                filename: att.filename,
                type: att.contentType,
                disposition: 'attachment',
            }));
        }

        // Add custom headers
        if (options.headers) {
            msg.headers = options.headers;
        }

        // Add categories/tags
        if (options.tags && options.tags.length > 0) {
            msg.categories = options.tags;
        }

        return msg as MailDataRequired;
    }

    private getRecipientString(to: EmailOptions['to']): string {
        const recipients = this.normalizeRecipients(to);
        return recipients.map(r => r.email).join(', ');
    }

    private extractErrorMessage(error: unknown): string {
        if (error && typeof error === 'object') {
            // SendGrid API error format
            if ('response' in error && error.response && typeof error.response === 'object') {
                const response = error.response as Record<string, unknown>;
                if ('body' in response && response.body && typeof response.body === 'object') {
                    const body = response.body as Record<string, unknown>;
                    if ('errors' in body && Array.isArray(body.errors)) {
                        return body.errors
                            .map((e: { message?: string }) => e.message || 'Unknown error')
                            .join('; ');
                    }
                }
            }

            if ('message' in error && typeof error.message === 'string') {
                return error.message;
            }
        }

        return 'Unknown SendGrid error';
    }

    private extractErrorCode(error: unknown): string | undefined {
        if (error && typeof error === 'object' && 'code' in error) {
            return String(error.code);
        }
        return undefined;
    }
}
