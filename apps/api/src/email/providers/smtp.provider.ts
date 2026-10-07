/**
 * SMTP Email Provider
 * Any SMTP relay via nodemailer: Brevo (smtp-relay.brevo.com), MailerSend, or others.
 * Port 465 uses implicit TLS; anything else (587) upgrades with STARTTLS.
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

export interface SmtpConfig extends EmailProviderConfig {
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
}

@Injectable()
export class SmtpProvider extends BaseEmailProvider {
    readonly name: string = 'smtp';
    /** Used when no host is configured. */
    protected readonly defaultHost: string | null = null;
    protected readonly logger = new Logger(SmtpProvider.name);
    private transporter: Transporter | null = null;
    private smtpConfig: SmtpConfig | null = null;

    async initialize(config: EmailProviderConfig): Promise<void> {
        const msConfig = config as SmtpConfig;
        const host = msConfig.smtpHost || this.defaultHost;
        const port = Number(msConfig.smtpPort) || 587;

        if (!host) {
            throw new Error(`${this.name} SMTP host is required`);
        }
        if (!msConfig.smtpUser || !msConfig.smtpPass) {
            throw new Error(`${this.name} SMTP credentials (username and password) are required`);
        }

        this.transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            // Refuse to send credentials or mail in clear text if the server skips STARTTLS.
            requireTLS: port !== 465,
            auth: {
                user: msConfig.smtpUser,
                pass: msConfig.smtpPass,
            },
            tls: {
                minVersion: 'TLSv1.2',
                // Certificates are verified. SMTP_TLS_INSECURE=true skips that for local
                // machines behind TLS-intercepting antivirus; never honoured in production.
                rejectUnauthorized: !(process.env.SMTP_TLS_INSECURE === 'true' && process.env.NODE_ENV !== 'production'),
            },
        });

        // Verify connection
        try {
            await this.transporter.verify();
            this.logger.log(`${this.name} SMTP connection verified (${host}:${port})`);
        } catch (error) {
            this.logger.warn(`${this.name} SMTP verification failed: ${error instanceof Error ? error.message : error}`);
            // Don't throw - allow initialization to continue
        }

        this.smtpConfig = { ...msConfig, smtpHost: host, smtpPort: port };
        this.config = config;
        this.initialized = true;
        this.logger.log(`${this.name} provider initialized (SMTP)`);
    }

    async send(options: EmailOptions): Promise<EmailSendResult> {
        if (!this.isConfigured() || !this.transporter || !this.smtpConfig) {
            return {
                success: false,
                error: `${this.name} provider is not configured`,
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
                    name: this.smtpConfig.fromName,
                    address: this.smtpConfig.fromEmail,
                },
                to: recipients.map((r) => this.toAddress(r)),
                subject: options.subject,
            };

            // Add CC
            if (options.cc) {
                const ccRecipients = this.normalizeRecipients(options.cc);
                mailOptions.cc = ccRecipients.map((r) => this.toAddress(r));
            }

            // Add BCC
            if (options.bcc) {
                const bccRecipients = this.normalizeRecipients(options.bcc);
                mailOptions.bcc = bccRecipients.map((r) => this.toAddress(r));
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
                `Email sent via ${this.name} SMTP to ${this.getRecipientString(options.to)}`,
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
                `Failed to send email via ${this.name}: ${errorMessage}`,
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
                    host: this.smtpConfig?.smtpHost,
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

    /** nodemailer quotes and encodes an address object itself; never build "name <email>" by hand. */
    private toAddress(r: { email: string; name?: string }): string | { name: string; address: string } {
        return r.name ? { name: r.name, address: r.email } : r.email;
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
        return `Unknown ${this.name} error`;
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
