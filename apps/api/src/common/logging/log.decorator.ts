// src/common/logging/log.decorator.ts

import { AppLoggerService } from './app-logger.service';
import { PiiMasker } from './pii-masker';

/**
 * Method decorator for automatic logging of method calls
 * Logs entry, exit, and errors with masked PII
 */
export function Log(operation?: string) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor,
    ) {
        const originalMethod = descriptor.value;
        const methodName = operation || propertyKey;

        descriptor.value = async function (...args: any[]) {
            const logger: AppLoggerService = (this as any).appLogger;
            const startTime = Date.now();

            // Extract userId from args if present
            const userId = extractUserId(args);

            if (logger) {
                logger.logTransaction(methodName, 'START', userId);
            }

            try {
                const result = await originalMethod.apply(this, args);
                const duration = Date.now() - startTime;

                if (logger) {
                    logger.logTransaction(methodName, 'SUCCESS', userId, { duration });
                }

                return result;
            } catch (error: any) {
                const duration = Date.now() - startTime;

                if (logger) {
                    logger.logTransaction(methodName, 'FAILED', userId, {
                        duration,
                        errorMessage: error.message,
                        errorName: error.name,
                    });
                }

                throw error;
            }
        };

        return descriptor;
    };
}

/**
 * Helper to extract userId from method arguments
 */
function extractUserId(args: any[]): string | undefined {
    for (const arg of args) {
        if (typeof arg === 'string' && arg.startsWith('cm')) {
            return arg; // CUID format user ID
        }
        if (typeof arg === 'object' && arg !== null) {
            if (arg.userId) return arg.userId;
            if (arg.id && typeof arg.id === 'string') return arg.id;
            if (arg.user?.id) return arg.user.id;
        }
    }
    return undefined;
}
