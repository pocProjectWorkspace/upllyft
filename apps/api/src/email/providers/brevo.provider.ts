/**
 * Brevo Email Provider
 * Brevo's transactional email HTTP API (POST /v3/smtp/email) over HTTPS port 443 — for
 * hosts that block outbound SMTP (Railway's non-Pro plans block 25/465/587/2525).
 *
 * The idempotency key goes to Brevo as Idempotency-Key, so an outbox retry after a lost
 * response is answered `duplicate_request` instead of sending the email twice.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
    BaseEmailProvider,
    EmailOptions,
    EmailProviderConfig,
    EmailSendResult,
} from '../interfaces';

const API = 'https://api.brevo.com/v3';
const TIMEOUT_MS = 15_000;

interface BrevoAddress {
    email: string;
    name?: string;
}

@Injectable()
export class BrevoProvider extends BaseEmailProvider {
    readonly name = 'brevo';
    private readonly logger = new Logger(BrevoProvider.name);

    async initialize(config: EmailProviderConfig): Promise<void> {
        if (!config.apiKey) {
            throw new Error('Brevo API key is required (BREVO_API_KEY)');
        }
        this.config = config;
        this.initialized = true;
        this.logger.log('Brevo provider initialized (HTTP API)');
    }

    async send(options: EmailOptions): Promise<EmailSendResult> {
        if (!this.isConfigured()) {
            return {
                success: false,
                error: 'Brevo provider is not configured',
                provider: this.name,
                timestamp: new Date(),
            };
        }

        try {
            this.validateOptions(options);

            const headers: Record<string, string> = {
                'api-key': this.config!.apiKey!,
                'content-type': 'application/json',
                accept: 'application/json',
            };
            if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

            const res = await fetch(`${API}/smtp/email`, {
                method: 'POST',
                headers,
                body: JSON.stringify(this.buildBody(options)),
                signal: AbortSignal.timeout(TIMEOUT_MS),
            });
            const body = (await res.json().catch(() => ({}))) as { messageId?: string; code?: string; message?: string };

            if (res.ok) {
                this.logger.log(`Email sent via Brevo to ${this.getRecipientString(options.to)}`);
                return { success: true, messageId: body.messageId, provider: this.name, timestamp: new Date() };
            }

            // Brevo already accepted this key: the earlier attempt went out.
            if (body.code === 'duplicate_request') {
                this.logger.warn(`Brevo: duplicate request for ${this.getRecipientString(options.to)} — already sent`);
                return { success: true, duplicate: true, provider: this.name, timestamp: new Date() };
            }

            const error = `Brevo ${res.status}${body.code ? ` ${body.code}` : ''}: ${body.message ?? res.statusText}`;
            this.logger.error(`Failed to send email via Brevo: ${error}`);
            return { success: false, error, errorCode: body.code ?? String(res.status), provider: this.name, timestamp: new Date() };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown Brevo error';
            this.logger.error(`Failed to send email via Brevo: ${message}`);
            return { success: false, error: message, provider: this.name, timestamp: new Date() };
        }
    }

    async getHealthStatus(): Promise<{ healthy: boolean; details?: Record<string, unknown> }> {
        if (!this.isConfigured()) {
            return { healthy: false, details: { provider: this.name, configured: false, mode: 'api' } };
        }
        try {
            const res = await fetch(`${API}/account`, {
                headers: { 'api-key': this.config!.apiKey!, accept: 'application/json' },
                signal: AbortSignal.timeout(TIMEOUT_MS),
            });
            return {
                healthy: res.ok,
                details: {
                    provider: this.name,
                    configured: true,
                    mode: 'api',
                    fromEmail: this.config!.fromEmail,
                    ...(res.ok ? {} : { error: `Brevo account check returned ${res.status}` }),
                },
            };
        } catch (error) {
            return {
                healthy: false,
                details: {
                    provider: this.name,
                    configured: true,
                    mode: 'api',
                    error: error instanceof Error ? error.message : 'Connection failed',
                },
            };
        }
    }

    /** The JSON body for POST /v3/smtp/email. */
    buildBody(options: EmailOptions): Record<string, unknown> {
        const address = (r: { email: string; name?: string }): BrevoAddress =>
            r.name ? { email: r.email, name: r.name.slice(0, 70) } : { email: r.email };

        const body: Record<string, unknown> = {
            sender: address({ email: this.config!.fromEmail, name: this.config!.fromName }),
            to: this.normalizeRecipients(options.to).map(address),
            subject: options.subject,
            // Brevo requires HTML; a text-only email gets an escaped copy.
            htmlContent: options.html ?? textToHtml(options.text ?? ''),
        };
        if (options.text) body.textContent = options.text;
        if (options.cc) body.cc = this.normalizeRecipients(options.cc).map(address);
        if (options.bcc) body.bcc = this.normalizeRecipients(options.bcc).map(address);
        if (options.replyTo) {
            body.replyTo = address(typeof options.replyTo === 'string' ? { email: options.replyTo } : options.replyTo);
        }
        if (options.attachments?.length) {
            body.attachment = options.attachments.map((a) => ({
                name: a.filename,
                content: Buffer.isBuffer(a.content)
                    ? a.content.toString('base64')
                    : a.encoding === 'base64'
                        ? a.content
                        : Buffer.from(a.content, 'utf8').toString('base64'),
            }));
        }
        if (options.headers && Object.keys(options.headers).length) body.headers = options.headers;
        if (options.tags?.length) body.tags = options.tags;
        return body;
    }

    private getRecipientString(to: EmailOptions['to']): string {
        return this.normalizeRecipients(to).map((r) => r.email).join(', ');
    }
}

function textToHtml(text: string): string {
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<div style="white-space:pre-wrap;font-family:sans-serif">${escaped}</div>`;
}
