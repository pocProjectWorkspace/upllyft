// src/common/logging/pii-masker.ts

/**
 * PII Masker - Masks personal identifiable information in logs
 * Keeps user IDs and usernames but masks sensitive data
 */
export class PiiMasker {
    private static readonly EMAIL_REGEX = /([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    private static readonly PHONE_REGEX = /(\+91|91)?[6-9]\d{9}/g;
    private static readonly PASSWORD_REGEX = /"password"\s*:\s*"[^"]*"/gi;
    private static readonly TOKEN_REGEX = /(eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*)/g;
    private static readonly CREDIT_CARD_REGEX = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;

    /**
     * Mask email addresses (show first 2 chars and domain)
     */
    static maskEmail(email: string): string {
        if (!email) return email;
        const [localPart, domain] = email.split('@');
        if (!localPart || !domain) return '***@***.***';
        const masked = localPart.substring(0, 2) + '***';
        return `${masked}@${domain}`;
    }

    /**
     * Mask phone numbers (show last 4 digits)
     */
    static maskPhone(phone: string): string {
        if (!phone) return phone;
        return '******' + phone.slice(-4);
    }

    /**
     * Mask any string value with partial visibility
     */
    static maskValue(value: string, visibleChars: number = 3): string {
        if (!value || value.length <= visibleChars) return '***';
        return value.substring(0, visibleChars) + '***';
    }

    /**
     * Recursively mask PII in an object
     */
    static maskObject(obj: any): any {
        if (obj === null || obj === undefined) return obj;
        if (typeof obj === 'string') return this.maskString(obj);
        if (typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(item => this.maskObject(item));

        const masked: any = {};
        for (const [key, value] of Object.entries(obj)) {
            const lowerKey = key.toLowerCase();

            // Completely redact these fields
            if (['password', 'token', 'accesstoken', 'refreshtoken', 'secret', 'apikey', 'key'].includes(lowerKey)) {
                masked[key] = '[REDACTED]';
                continue;
            }

            // Mask email fields
            if (['email', 'useremail', 'toemail', 'fromemail'].includes(lowerKey) && typeof value === 'string') {
                masked[key] = this.maskEmail(value);
                continue;
            }

            // Mask phone fields
            if (['phone', 'phonenumber', 'mobile', 'contact'].includes(lowerKey) && typeof value === 'string') {
                masked[key] = this.maskPhone(value);
                continue;
            }

            // Recursively process nested objects
            masked[key] = this.maskObject(value);
        }
        return masked;
    }

    /**
     * Mask PII patterns in a string
     */
    static maskString(str: string): string {
        if (!str) return str;

        return str
            // Mask emails
            .replace(this.EMAIL_REGEX, (match) => this.maskEmail(match))
            // Mask phone numbers
            .replace(this.PHONE_REGEX, (match) => this.maskPhone(match))
            // Mask passwords in JSON
            .replace(this.PASSWORD_REGEX, '"password":"[REDACTED]"')
            // Mask JWT tokens
            .replace(this.TOKEN_REGEX, '[JWT_TOKEN]')
            // Mask credit card numbers
            .replace(this.CREDIT_CARD_REGEX, '****-****-****-****');
    }

    /**
     * Extract safe user context from request/user object
     * Only returns non-PII identifiers
     */
    static getSafeUserContext(user: any): { userId?: string; username?: string; role?: string } {
        if (!user) return {};
        return {
            userId: user.id || user.userId || user.sub,
            username: user.name ? this.maskValue(user.name, 4) : undefined,
            role: user.role,
        };
    }
}
