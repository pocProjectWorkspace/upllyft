// src/common/logging/logging.interceptor.ts

import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { AppLoggerService } from './app-logger.service';
import { isLogCategoryEnabled } from './logging.config';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    constructor(private readonly logger: AppLoggerService) {
        this.logger.setContext('HTTP');
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        // Skip if HTTP logging is disabled
        if (!isLogCategoryEnabled('http')) {
            return next.handle();
        }

        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();

        // Generate correlation ID for request tracking
        const correlationId = request.headers['x-correlation-id'] || uuidv4();
        request.correlationId = correlationId;
        response.setHeader('x-correlation-id', correlationId);

        const { method, url, path } = request;
        const startTime = Date.now();

        // Extract user info safely (after auth middleware)
        const userId = request.user?.id || request.user?.sub;
        const userRole = request.user?.role;
        const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
        const userAgent = request.headers['user-agent'];

        // Log incoming request
        this.logger.logRequest({
            method,
            path: url || path,
            userId,
            ip,
            userAgent,
            correlationId,
        });

        return next.handle().pipe(
            tap(() => {
                const duration = Date.now() - startTime;
                const statusCode = response.statusCode;

                this.logger.logResponse({
                    method,
                    path: url || path,
                    statusCode,
                    duration,
                    userId,
                    correlationId,
                });
            }),
            catchError((error) => {
                const duration = Date.now() - startTime;
                const statusCode = error.status || 500;

                // Log error response
                this.logger.logResponse({
                    method,
                    path: url || path,
                    statusCode,
                    duration,
                    userId,
                    correlationId,
                });

                // Log error details
                if (isLogCategoryEnabled('errors')) {
                    this.logger.error(`Request failed: ${error.message}`, error.stack, {
                        method,
                        path: url || path,
                        statusCode,
                        userId,
                        correlationId,
                        errorName: error.name,
                    });
                }

                throw error;
            }),
        );
    }
}
