/**
 * Amazon SES Email Provider
 * Production-ready implementation for AWS Simple Email Service
 * 
 * IMPORTANT: Production Setup Requirements
 * ========================================
 * 1. SES Sandbox Mode: By default, new AWS accounts are in sandbox mode.
 *    - Can only send to verified email addresses
 *    - Request production access via AWS Console -> SES -> Account Dashboard
 * 
 * 2. Domain Verification:
 *    - Verify your sending domain in SES Console
 *    - Add DKIM records (provided by AWS) to your DNS
 *    - Add SPF record: "v=spf1 include:amazonses.com ~all"
 * 
 * 3. IAM Permissions Required:
 *    - ses:SendEmail
 *    - ses:SendRawEmail (for attachments)
 *    - ses:GetSendQuota (for health checks)
 */

import { Injectable, Logger } from '@nestjs/common';
import {
    SESClient,
    SendEmailCommand,
    SendEmailCommandInput,
    SendRawEmailCommand,
    GetSendQuotaCommand,
} from '@aws-sdk/client-ses';
import {
    BaseEmailProvider,
    EmailOptions,
    EmailProviderConfig,
    EmailSendResult,
} from '../interfaces';

@Injectable()
export class SESProvider extends BaseEmailProvider {
    readonly name = 'ses';
    private readonly logger = new Logger(SESProvider.name);
    private client: SESClient | null = null;

    async initialize(config: EmailProviderConfig): Promise<void> {
        if (!config.region) {
            throw new Error('AWS region is required for SES');
        }

        // Support both explicit credentials and IAM role-based authentication
        const clientConfig: Record<string, unknown> = {
            region: config.region,
        };

        // Only add credentials if explicitly provided (otherwise use IAM role)
        if (config.accessKeyId && config.secretAccessKey) {
            clientConfig.credentials = {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            };
        }

        this.client = new SESClient(clientConfig);
        this.config = config;
        this.initialized = true;
        this.logger.log(`SES provider initialized successfully for region: ${config.region}`);
    }

    async send(options: EmailOptions): Promise<EmailSendResult> {
        if (!this.isConfigured() || !this.client) {
            return {
                success: false,
                error: 'SES provider is not configured',
                provider: this.name,
                timestamp: new Date(),
            };
        }

        try {
            this.validateOptions(options);

            // Use raw email for attachments, otherwise use standard SendEmail
            const hasAttachments = options.attachments && options.attachments.length > 0;

            let messageId: string | undefined;

            if (hasAttachments) {
                messageId = await this.sendRawEmail(options);
            } else {
                messageId = await this.sendStandardEmail(options);
            }

            this.logger.log(
                `Email sent successfully via SES to ${this.getRecipientString(options.to)}`,
            );

            return {
                success: true,
                messageId,
                provider: this.name,
                timestamp: new Date(),
            };
        } catch (error) {
            const errorMessage = this.extractErrorMessage(error);

            this.logger.error(
                `Failed to send email via SES: ${errorMessage}`,
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
        if (!this.isConfigured() || !this.client) {
            return {
                healthy: false,
                details: {
                    provider: this.name,
                    configured: false,
                },
            };
        }

        try {
            const command = new GetSendQuotaCommand({});
            const response = await this.client.send(command);

            return {
                healthy: true,
                details: {
                    provider: this.name,
                    configured: true,
                    max24HourSend: response.Max24HourSend,
                    sentLast24Hours: response.SentLast24Hours,
                    maxSendRate: response.MaxSendRate,
                    remainingQuota: (response.Max24HourSend || 0) - (response.SentLast24Hours || 0),
                },
            };
        } catch (error) {
            return {
                healthy: false,
                details: {
                    provider: this.name,
                    configured: true,
                    error: this.extractErrorMessage(error),
                },
            };
        }
    }

    private async sendStandardEmail(options: EmailOptions): Promise<string | undefined> {
        const recipients = this.normalizeRecipients(options.to);

        const input: SendEmailCommandInput = {
            Source: this.config!.fromName
                ? `${this.config!.fromName} <${this.config!.fromEmail}>`
                : this.config!.fromEmail,
            Destination: {
                ToAddresses: recipients.map(r =>
                    r.name ? `${r.name} <${r.email}>` : r.email
                ),
                CcAddresses: options.cc
                    ? this.normalizeRecipients(options.cc).map(r =>
                        r.name ? `${r.name} <${r.email}>` : r.email
                    )
                    : undefined,
                BccAddresses: options.bcc
                    ? this.normalizeRecipients(options.bcc).map(r =>
                        r.name ? `${r.name} <${r.email}>` : r.email
                    )
                    : undefined,
            },
            Message: {
                Subject: {
                    Data: options.subject,
                    Charset: 'UTF-8',
                },
                Body: {},
            },
        };

        // Add HTML and/or text body
        if (options.html) {
            input.Message!.Body!.Html = {
                Data: options.html,
                Charset: 'UTF-8',
            };
        }

        if (options.text) {
            input.Message!.Body!.Text = {
                Data: options.text,
                Charset: 'UTF-8',
            };
        }

        // Add reply-to if provided
        if (options.replyTo) {
            const replyTo = typeof options.replyTo === 'string'
                ? options.replyTo
                : options.replyTo.email;
            input.ReplyToAddresses = [replyTo];
        }

        // Add tags for tracking (each tag must have a unique Name in SES)
        if (options.tags && options.tags.length > 0) {
            input.Tags = options.tags.map((tag, index) => ({
                Name: `tag_${index}`,
                Value: tag,
            }));
        }

        const command = new SendEmailCommand(input);
        const response = await this.client!.send(command);
        return response.MessageId;
    }

    private async sendRawEmail(options: EmailOptions): Promise<string | undefined> {
        // Build MIME message for attachments
        const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        const recipients = this.normalizeRecipients(options.to);

        let rawMessage = '';

        // Headers
        rawMessage += `From: ${this.config!.fromName} <${this.config!.fromEmail}>\r\n`;
        rawMessage += `To: ${recipients.map(r => r.name ? `${r.name} <${r.email}>` : r.email).join(', ')}\r\n`;
        rawMessage += `Subject: ${options.subject}\r\n`;
        rawMessage += `MIME-Version: 1.0\r\n`;
        rawMessage += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;

        // Text body
        if (options.text) {
            rawMessage += `--${boundary}\r\n`;
            rawMessage += `Content-Type: text/plain; charset=UTF-8\r\n\r\n`;
            rawMessage += `${options.text}\r\n\r\n`;
        }

        // HTML body
        if (options.html) {
            rawMessage += `--${boundary}\r\n`;
            rawMessage += `Content-Type: text/html; charset=UTF-8\r\n\r\n`;
            rawMessage += `${options.html}\r\n\r\n`;
        }

        // Attachments
        if (options.attachments) {
            for (const attachment of options.attachments) {
                rawMessage += `--${boundary}\r\n`;
                rawMessage += `Content-Type: ${attachment.contentType || 'application/octet-stream'}\r\n`;
                rawMessage += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`;
                rawMessage += `Content-Transfer-Encoding: base64\r\n\r\n`;

                const content = Buffer.isBuffer(attachment.content)
                    ? attachment.content.toString('base64')
                    : Buffer.from(attachment.content).toString('base64');

                rawMessage += `${content}\r\n\r\n`;
            }
        }

        rawMessage += `--${boundary}--`;

        const command = new SendRawEmailCommand({
            RawMessage: {
                Data: Buffer.from(rawMessage),
            },
        });

        const response = await this.client!.send(command);
        return response.MessageId;
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
            if ('Message' in error && typeof error.Message === 'string') {
                return error.Message;
            }
        }
        return 'Unknown SES error';
    }

    private extractErrorCode(error: unknown): string | undefined {
        if (error && typeof error === 'object') {
            if ('name' in error && typeof error.name === 'string') {
                return error.name;
            }
            if ('Code' in error && typeof error.Code === 'string') {
                return error.Code;
            }
        }
        return undefined;
    }
}
