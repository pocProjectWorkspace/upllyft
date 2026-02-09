/**
 * Email Idempotency Service
 * Prevents duplicate email sends using idempotency keys
 * 
 * In production, this should be backed by Redis or a database
 * for distributed systems and persistence across restarts.
 */

import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

interface IdempotencyRecord {
    key: string;
    messageId?: string;
    provider: string;
    timestamp: Date;
    expiresAt: Date;
}

@Injectable()
export class EmailIdempotencyService {
    private readonly logger = new Logger(EmailIdempotencyService.name);

    /**
     * In-memory store for development/single-instance deployments
     * Replace with Redis/Database in production for distributed systems
     */
    private readonly store = new Map<string, IdempotencyRecord>();

    /** Default TTL for idempotency records: 24 hours */
    private readonly DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

    /**
     * Generate an idempotency key from email parameters
     * Used when no explicit key is provided
     */
    generateKey(to: string, subject: string, timestamp?: Date): string {
        const date = timestamp || new Date();
        // Include date (not time) to allow same email on different days
        const dateStr = date.toISOString().split('T')[0];
        const data = `${to}:${subject}:${dateStr}`;
        return createHash('sha256').update(data).digest('hex').substring(0, 32);
    }

    /**
     * Check if an email with this key has already been sent
     */
    async isDuplicate(key: string): Promise<{ duplicate: boolean; existingMessageId?: string }> {
        this.cleanup(); // Clean expired records

        const record = this.store.get(key);

        if (record) {
            this.logger.warn(`Duplicate email detected for key: ${key.substring(0, 8)}...`);
            return { duplicate: true, existingMessageId: record.messageId };
        }

        return { duplicate: false };
    }

    /**
     * Record a successful email send
     */
    async recordSend(
        key: string,
        provider: string,
        messageId?: string,
        ttlMs?: number,
    ): Promise<void> {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + (ttlMs || this.DEFAULT_TTL_MS));

        this.store.set(key, {
            key,
            messageId,
            provider,
            timestamp: now,
            expiresAt,
        });

        this.logger.debug(`Recorded email send with key: ${key.substring(0, 8)}...`);
    }

    /**
     * Remove expired records from the store
     */
    private cleanup(): void {
        const now = new Date();
        let cleanedCount = 0;

        for (const [key, record] of this.store.entries()) {
            if (record.expiresAt < now) {
                this.store.delete(key);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            this.logger.debug(`Cleaned up ${cleanedCount} expired idempotency records`);
        }
    }

    /**
     * Get stats about the idempotency store
     */
    getStats(): { totalRecords: number; oldestRecord?: Date } {
        this.cleanup();

        let oldest: Date | undefined;
        for (const record of this.store.values()) {
            if (!oldest || record.timestamp < oldest) {
                oldest = record.timestamp;
            }
        }

        return {
            totalRecords: this.store.size,
            oldestRecord: oldest,
        };
    }

    /**
     * Clear all records (useful for testing)
     */
    clear(): void {
        this.store.clear();
    }
}
