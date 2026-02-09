/**
 * MailerSend Email Provider
 * Production-ready implementation using SMTP transport
 * 
 * Uses nodemailer with SMTP credentials for reliable delivery
 */

import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import {
    BaseEmailProvider,
    EmailOptions,
    EmailProviderConfig,
    EmailSendResult,
} from '../interfaces';

export interface MailerSendConfig extends EmailProviderConfig {
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
}

@Injectable()
export class MailerSendProvider extends BaseEmailProvider {
    readonly name = 'mailersend';
    private readonly logger = new Logger(MailerSendProvider.name);
    private transporter: Transporter | null = null;
    private mailerSendConfig: MailerSendConfig | null = null;

    async initialize(config: EmailProviderConfig): Promise<void> {
        const msConfig = config as MailerSendConfig;

        if (!msConfig.smtpUser || !msConfig.smtpPass) {
            throw new Error('MailerSend SMTP credentials (username and password) are required');
        }

        // Create nodemailer transporter with MailerSend SMTP
        this.transporter = nodemailer.createTransport({
            host: msConfig.smtpHost || 'smtp.mailersend.net',
            port: msConfig.smtpPort || 587,
            secure: false, // Use STARTTLS
            auth: {
                user: msConfig.smtpUser,
                pass: msConfig.smtpPass,
            },
            tls: {
                // Allow self-signed certificates in development/interception scenarios
                rejectUnauthorized: false,
            },
        });

        // Verify connection
        try {
            await this.transporter.verify();
            this.logger.log('MailerSend SMTP connection verified successfully');
        } catch (error) {
            this.logger.warn(`MailerSend SMTP verification failed: ${error instanceof Error ? error.message : error}`);
            // Don't throw - allow initialization to continue
        }

        this.mailerSendConfig = msConfig;
        this.config = config;
        this.initialized = true;
        this.logger.log('MailerSend provider initialized successfully (SMTP mode)');
    }

    async send(options: EmailOptions): Promise<EmailSendResult> {
        if (!this.isConfigured() || !this.transporter || !this.mailerSendConfig) {
            return {
                success: false,
                error: 'MailerSend provider is not configured',
                provider: this.name,
                timestamp: new Date(),
            };
        }

        try {
            this.validateOptions(options);

            const recipients = this.normalizeRecipients(options.to);

            // Build email message
            const mailOptions: nodemailer.SendMailOptions = {
                from: {
                    name: this.mailerSendConfig.fromName,
                    address: this.mailerSendConfig.fromEmail,
                },
                to: recipients.map(r => r.name ? `"${r.name}" <${r.email}>` : r.email),
                subject: options.subject,
            };

            // Add CC
            if (options.cc) {
                const ccRecipients = this.normalizeRecipients(options.cc);
                mailOptions.cc = ccRecipients.map(r => r.name ? `"${r.name}" <${r.email}>` : r.email);
            }

            // Add BCC
            if (options.bcc) {
                const bccRecipients = this.normalizeRecipients(options.bcc);
                mailOptions.bcc = bccRecipients.map(r => r.name ? `"${r.name}" <${r.email}>` : r.email);
            }

            // Add reply-to
            if (options.replyTo) {
                const replyTo = typeof options.replyTo === 'string'
                    ? options.replyTo
                    : options.replyTo.email;
                mailOptions.replyTo = replyTo;
            }

            // Add content
            if (options.html) {
                mailOptions.html = options.html;
            }
            if (options.text) {
                mailOptions.text = options.text;
            }

            // Add attachments
            if (options.attachments && options.attachments.length > 0) {
                mailOptions.attachments = options.attachments.map(att => ({
                    filename: att.filename,
                    content: att.content,
                    contentType: att.contentType,
                }));
            }

            // Add custom headers
            if (options.headers) {
                mailOptions.headers = options.headers;
            }

            // Send email
            const result = await this.transporter.sendMail(mailOptions);

            this.logger.log(
                `Email sent successfully via MailerSend SMTP to ${this.getRecipientString(options.to)}`,
            );

            return {
                success: true,
                messageId: result.messageId,
                provider: this.name,
                timestamp: new Date(),
            };
        } catch (error) {
            const errorMessage = this.extractErrorMessage(error);

            this.logger.error(
                `Failed to send email via MailerSend: ${errorMessage}`,
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
        if (!this.isConfigured() || !this.transporter) {
            return {
                healthy: false,
                details: {
                    provider: this.name,
                    configured: false,
                    mode: 'smtp',
                },
            };
        }

        try {
            await this.transporter.verify();
            return {
                healthy: true,
                details: {
                    provider: this.name,
                    configured: true,
                    mode: 'smtp',
                    host: 'smtp.mailersend.net',
                },
            };
        } catch (error) {
            return {
                healthy: false,
                details: {
                    provider: this.name,
                    configured: true,
                    mode: 'smtp',
                    error: error instanceof Error ? error.message : 'Connection failed',
                },
            };
        }
    }

    private getRecipientString(to: EmailOptions['to']): string {
        const recipients = this.normalizeRecipients(to);
        return recipients.map(r => r.email).join(', ');
    }

    private extractErrorMessage(error: unknown): string {
        if (error && typeof error === 'object') {
            if ('message' in error && typeof error.message === 'string') {
                return error.message;
            }
            if ('response' in error && typeof error.response === 'string') {
                return error.response;
            }
        }
        return 'Unknown MailerSend error';
    }

    private extractErrorCode(error: unknown): string | undefined {
        if (error && typeof error === 'object') {
            if ('code' in error) {
                return String(error.code);
            }
            if ('responseCode' in error) {
                return String(error.responseCode);
            }
        }
        return undefined;
    }
}
