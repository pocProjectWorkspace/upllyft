// src/common/logging/app-logger.service.ts

import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import WinstonCloudWatch from 'winston-cloudwatch';
import { PiiMasker } from './pii-masker';
import {
    LoggingConfig,
    LogCategory,
    getLoggingConfig,
    isLogCategoryEnabled
} from './logging.config';

export interface LogContext {
    userId?: string;
    username?: string;
    role?: string;
    action?: string;
    resource?: string;
    method?: string;
    path?: string;
    statusCode?: number;
    duration?: number;
    ip?: string;
    userAgent?: string;
    correlationId?: string;
    [key: string]: any;
}

@Injectable()
export class AppLoggerService implements LoggerService {
    private logger: winston.Logger;
    private context?: string;
    private config: LoggingConfig;

    constructor() {
        this.config = getLoggingConfig();
        this.logger = this.createLogger();
    }

    private createLogger(): winston.Logger {
        const transports: winston.transport[] = [];

        // Console transport (always enabled)
        transports.push(
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.colorize(),
                    winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
                        const ctx = context ? `[${context}]` : '';
                        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                        return `${timestamp} ${level} ${ctx} ${message}${metaStr}`;
                    })
                ),
            })
        );

        // CloudWatch transport (if enabled)
        if (this.config.cloudwatch.enabled) {
            const cloudWatchConfig = {
                logGroupName: this.config.cloudwatch.logGroup,
                logStreamName: this.config.cloudwatch.logStream || `api-${new Date().toISOString().split('T')[0]}`,
                awsRegion: this.config.cloudwatch.region,
                jsonMessage: true,
                messageFormatter: (logObject: any) => {
                    return JSON.stringify({
                        timestamp: new Date().toISOString(),
                        level: logObject.level,
                        message: logObject.message,
                        context: logObject.context,
                        ...logObject,
                    });
                },
            };

            transports.push(new WinstonCloudWatch(cloudWatchConfig));
        }

        return winston.createLogger({
            level: this.config.level,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            transports,
            exitOnError: false,
        });
    }

    /**
     * Check if logging is enabled for a category
     */
    private isCategoryEnabled(category: LogCategory): boolean {
        return this.config.enabled && isLogCategoryEnabled(category);
    }

    /**
     * Check if request should be logged based on sample rate
     */
    private shouldSample(): boolean {
        if (this.config.options.sampleRate >= 100) return true;
        if (this.config.options.sampleRate <= 0) return false;
        return Math.random() * 100 < this.config.options.sampleRate;
    }

    setContext(context: string) {
        this.context = context;
        return this;
    }

    private formatMessage(message: any, context?: LogContext): object {
        const maskedContext = context ? PiiMasker.maskObject(context) : {};
        const maskedMessage = typeof message === 'string'
            ? PiiMasker.maskString(message)
            : PiiMasker.maskObject(message);

        return {
            message: maskedMessage,
            context: this.context,
            ...maskedContext,
            timestamp: new Date().toISOString(),
        };
    }

    // === STANDARD LOGGER METHODS ===

    log(message: any, context?: LogContext | string) {
        const logContext = typeof context === 'string' ? { context } : context;
        this.logger.info(this.formatMessage(message, logContext as LogContext));
    }

    info(message: any, context?: LogContext) {
        this.logger.info(this.formatMessage(message, context));
    }

    error(message: any, trace?: string, context?: LogContext) {
        if (!this.isCategoryEnabled('errors')) return;

        this.logger.error({
            ...this.formatMessage(message, context),
            trace: trace ? PiiMasker.maskString(trace) : undefined,
        });
    }

    warn(message: any, context?: LogContext) {
        this.logger.warn(this.formatMessage(message, context));
    }

    debug(message: any, context?: LogContext) {
        this.logger.debug(this.formatMessage(message, context));
    }

    verbose(message: any, context?: LogContext) {
        this.logger.verbose(this.formatMessage(message, context));
    }

    // === SPECIALIZED LOGGING METHODS WITH CATEGORY CHECKS ===

    /**
     * Log an authentication event
     */
    logAuth(event: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'TOKEN_REFRESH' | 'REGISTER',
        userId?: string, metadata?: Record<string, any>) {
        if (!this.isCategoryEnabled('auth')) return;

        this.info(`AUTH: ${event}`, {
            action: 'AUTH',
            event,
            userId,
            ...metadata,
        });
    }

    /**
     * Log an email event
     */
    logEmail(event: 'SENT' | 'FAILED' | 'QUEUED',
        type: string,
        userId?: string,
        metadata?: Record<string, any>) {
        if (!this.isCategoryEnabled('email')) return;

        const level = event === 'FAILED' ? 'error' : 'info';
        const logData = {
            action: 'EMAIL',
            event,
            emailType: type,
            userId,
            ...metadata,
        };

        if (level === 'error') {
            this.error(`EMAIL: ${event} - ${type}`, undefined, logData);
        } else {
            this.info(`EMAIL: ${event} - ${type}`, logData);
        }
    }

    /**
     * Log an HTTP request (with sampling)
     */
    logRequest(request: {
        method: string;
        path: string;
        userId?: string;
        ip?: string;
        userAgent?: string;
        correlationId?: string;
    }) {
        if (!this.isCategoryEnabled('http')) return;
        if (!this.shouldSample()) return;

        this.debug(`REQUEST: ${request.method} ${request.path}`, {
            action: 'HTTP_REQUEST',
            ...request,
        });
    }

    /**
     * Log an HTTP response (with slow request detection)
     */
    logResponse(response: {
        method: string;
        path: string;
        statusCode: number;
        duration: number;
        userId?: string;
        correlationId?: string;
    }) {
        if (!this.isCategoryEnabled('http')) return;
        if (!this.shouldSample()) return;

        const isError = response.statusCode >= 400;
        const isSlow = this.config.options.logSlowRequests &&
            response.duration >= this.config.options.slowRequestThreshold;

        const logData = {
            action: 'HTTP_RESPONSE',
            isSlow,
            ...response,
        };

        if (isError) {
            this.warn(`RESPONSE: ${response.method} ${response.path} ${response.statusCode} (${response.duration}ms)`, logData);
        } else if (isSlow) {
            this.warn(`SLOW_REQUEST: ${response.method} ${response.path} took ${response.duration}ms`, logData);
        } else {
            this.info(`RESPONSE: ${response.method} ${response.path} ${response.statusCode} (${response.duration}ms)`, logData);
        }
    }

    /**
     * Log a security event
     */
    logSecurity(event: string, userId?: string, metadata?: Record<string, any>) {
        if (!this.isCategoryEnabled('security')) return;

        this.warn(`SECURITY: ${event}`, {
            action: 'SECURITY',
            event,
            userId,
            ...metadata,
        });
    }

    /**
     * Log a business transaction
     */
    logTransaction(operation: string, status: 'START' | 'SUCCESS' | 'FAILED',
        userId?: string, metadata?: Record<string, any>) {
        if (!this.isCategoryEnabled('transactions')) return;

        const level = status === 'FAILED' ? 'error' : 'info';
        const logData = {
            action: 'TRANSACTION',
            operation,
            status,
            userId,
            ...metadata,
        };

        if (level === 'error') {
            this.error(`TRANSACTION: ${operation} - ${status}`, undefined, logData);
        } else {
            this.info(`TRANSACTION: ${operation} - ${status}`, logData);
        }
    }

    /**
     * Log organization operations
     */
    logOrganization(event: string, organizationId?: string, userId?: string,
        metadata?: Record<string, any>) {
        if (!this.isCategoryEnabled('organizations')) return;

        this.info(`ORGANIZATION: ${event}`, {
            action: 'ORGANIZATION',
            event,
            organizationId,
            userId,
            ...metadata,
        });
    }

    /**
     * Log post operations
     */
    logPost(event: 'CREATE' | 'UPDATE' | 'DELETE' | 'PUBLISH' | 'APPROVE' | 'REJECT',
        postId: string, userId?: string, metadata?: Record<string, any>) {
        if (!this.isCategoryEnabled('posts')) return;

        this.info(`POST: ${event}`, {
            action: 'POST',
            event,
            postId,
            userId,
            ...metadata,
        });
    }

    /**
     * Log comment operations
     */
    logComment(event: 'CREATE' | 'UPDATE' | 'DELETE' | 'REPORT',
        commentId: string, userId?: string, metadata?: Record<string, any>) {
        if (!this.isCategoryEnabled('comments')) return;

        this.info(`COMMENT: ${event}`, {
            action: 'COMMENT',
            event,
            commentId,
            userId,
            ...metadata,
        });
    }

    /**
     * Log community operations
     */
    logCommunity(event: 'CREATE' | 'UPDATE' | 'DELETE' | 'JOIN' | 'LEAVE' | 'MEMBER_UPDATE',
        communityId: string, userId?: string, metadata?: Record<string, any>) {
        if (!this.isCategoryEnabled('communities')) return;

        this.info(`COMMUNITY: ${event}`, {
            action: 'COMMUNITY',
            event,
            communityId,
            userId,
            ...metadata,
        });
    }

    /**
     * Log event operations
     */
    logEvent(event: 'CREATE' | 'UPDATE' | 'DELETE' | 'REGISTER' | 'CANCEL',
        eventId: string, userId?: string, metadata?: Record<string, any>) {
        if (!this.isCategoryEnabled('events')) return;

        this.info(`EVENT: ${event}`, {
            action: 'EVENT',
            event,
            eventId,
            userId,
            ...metadata,
        });
    }

    /**
     * Log question/answer operations
     */
    logQuestion(event: 'CREATE_QUESTION' | 'UPDATE_QUESTION' | 'DELETE_QUESTION' |
        'CREATE_ANSWER' | 'UPDATE_ANSWER' | 'DELETE_ANSWER' | 'ACCEPT_ANSWER',
        resourceId: string, userId?: string, metadata?: Record<string, any>) {
        if (!this.isCategoryEnabled('questions')) return;

        this.info(`QUESTION: ${event}`, {
            action: 'QUESTION',
            event,
            resourceId,
            userId,
            ...metadata,
        });
    }

    /**
     * Get current logging configuration (for debugging)
     */
    getConfig(): LoggingConfig {
        return this.config;
    }
}
