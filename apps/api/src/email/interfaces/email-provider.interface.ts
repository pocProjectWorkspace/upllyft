/**
 * Email Provider Interface
 * All email providers must implement this contract
 */

import { EmailOptions, EmailSendResult, EmailProviderConfig } from './email-options.interface';

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');

export interface IEmailProvider {
    /**
     * Provider name for identification and logging
     */
    readonly name: string;

    /**
     * Check if the provider is properly configured and ready
     */
    isConfigured(): boolean;

    /**
     * Initialize the provider with configuration
     */
    initialize(config: EmailProviderConfig): Promise<void>;

    /**
     * Send an email using this provider
     * @param options Email options
     * @returns Result of the send operation
     */
    send(options: EmailOptions): Promise<EmailSendResult>;

    /**
     * Validate email options before sending
     * @param options Email options to validate
     * @throws Error if validation fails
     */
    validateOptions(options: EmailOptions): void;

    /**
     * Get provider-specific health/status information
     */
    getHealthStatus(): Promise<{ healthy: boolean; details?: Record<string, unknown> }>;
}

/**
 * Base abstract class for email providers
 * Provides common functionality
 */
export abstract class BaseEmailProvider implements IEmailProvider {
    abstract readonly name: string;
    protected config: EmailProviderConfig | null = null;
    protected initialized = false;

    isConfigured(): boolean {
        return this.initialized && this.config !== null;
    }

    async initialize(config: EmailProviderConfig): Promise<void> {
        this.config = config;
        this.initialized = true;
    }

    validateOptions(options: EmailOptions): void {
        if (!options.to) {
            throw new Error('Recipient (to) is required');
        }

        if (!options.subject && !options.templateId) {
            throw new Error('Subject is required when not using a template');
        }

        if (!options.html && !options.text && !options.templateId) {
            throw new Error('Email body (html or text) or templateId is required');
        }
    }

    /**
     * Normalize recipient to array format
     */
    protected normalizeRecipients(
        recipients: string | { email: string; name?: string } | { email: string; name?: string }[],
    ): { email: string; name?: string }[] {
        if (typeof recipients === 'string') {
            return [{ email: recipients }];
        }

        if (Array.isArray(recipients)) {
            return recipients;
        }

        return [recipients];
    }

    abstract send(options: EmailOptions): Promise<EmailSendResult>;

    abstract getHealthStatus(): Promise<{ healthy: boolean; details?: Record<string, unknown> }>;
}
