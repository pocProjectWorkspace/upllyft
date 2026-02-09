// src/common/interceptors/exclude-fields.interceptor.ts

import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Fields to exclude from API responses
 * These are internal fields that should not be exposed to clients
 */
const EXCLUDED_FIELDS = ['embedding', 'originalContent'];

/**
 * Recursively removes excluded fields from objects and arrays
 * Preserves Date objects and other special types
 */
function removeExcludedFields(data: any): any {
    if (data === null || data === undefined) {
        return data;
    }

    // Preserve Date objects
    if (data instanceof Date) {
        return data;
    }

    // Preserve Buffer objects
    if (Buffer.isBuffer(data)) {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map(item => removeExcludedFields(item));
    }

    // Only process plain objects (not class instances like Date, etc.)
    if (typeof data === 'object' && data !== null && data.constructor === Object) {
        const result: any = {};
        for (const [key, value] of Object.entries(data)) {
            if (!EXCLUDED_FIELDS.includes(key)) {
                result[key] = removeExcludedFields(value);
            }
        }
        return result;
    }

    // For objects with a constructor (like Prisma results), process their fields
    if (typeof data === 'object' && data !== null) {
        // Check if it's a plain object-like structure from Prisma
        const proto = Object.getPrototypeOf(data);
        if (proto === Object.prototype || proto === null) {
            const result: any = {};
            for (const [key, value] of Object.entries(data)) {
                if (!EXCLUDED_FIELDS.includes(key)) {
                    result[key] = removeExcludedFields(value);
                }
            }
            return result;
        }
        // For other objects (Date, etc.), return as-is
        return data;
    }

    return data;
}

@Injectable()
export class ExcludeFieldsInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            map(data => removeExcludedFields(data))
        );
    }
}
