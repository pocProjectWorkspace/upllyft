// src/common/logging/logging.config.ts

/**
 * Logging Configuration
 * Control which log categories are enabled/disabled
 * 
 * Environment Variables:
 * - LOG_ENABLE_HTTP: Enable HTTP request/response logs (default: true)
 * - LOG_ENABLE_AUTH: Enable authentication logs (default: true)
 * - LOG_ENABLE_EMAIL: Enable email logs (default: true)
 * - LOG_ENABLE_SECURITY: Enable security logs (default: true)
 * - LOG_ENABLE_TRANSACTIONS: Enable business transaction logs (default: true)
 * - LOG_ENABLE_ORGANIZATIONS: Enable organization logs (default: true)
 * - LOG_ENABLE_POSTS: Enable post logs (default: true)
 * - LOG_ENABLE_COMMENTS: Enable comment logs (default: true)
 * - LOG_ENABLE_COMMUNITIES: Enable community logs (default: true)
 * - LOG_ENABLE_EVENTS: Enable event logs (default: true)
 * - LOG_ENABLE_QUESTIONS: Enable question/answer logs (default: true)
 * - LOG_ENABLE_ERRORS: Enable error logs (default: true - always recommended)
 */

export interface LoggingConfig {
    // Global settings
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';

    // CloudWatch settings
    cloudwatch: {
        enabled: boolean;
        logGroup: string;
        logStream?: string;
        region: string;
    };

    // Category toggles - granular control over what's logged
    categories: {
        http: boolean;          // HTTP request/response logs
        auth: boolean;          // Authentication (login, logout, register)
        email: boolean;         // Email sending logs
        security: boolean;      // Security events (password changes, suspicious activity)
        transactions: boolean;  // General business transactions
        organizations: boolean; // Organization CRUD
        posts: boolean;         // Post CRUD
        comments: boolean;      // Comment CRUD
        communities: boolean;   // Community CRUD
        events: boolean;        // Event CRUD
        questions: boolean;     // Q&A CRUD
        errors: boolean;        // Error logs (always keep enabled)
    };

    // Additional options
    options: {
        includeRequestBody: boolean;     // Include request body in logs (careful with PII)
        includeResponseBody: boolean;    // Include response body in logs
        logSlowRequests: boolean;        // Log requests slower than threshold
        slowRequestThreshold: number;    // Threshold in ms (default: 1000)
        sampleRate: number;              // 0-100, percentage of requests to log (100 = all)
    };
}

/**
 * Parse boolean from environment variable
 */
function envBool(key: string, defaultValue: boolean = true): boolean {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Parse number from environment variable
 */
function envNumber(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Load logging configuration from environment
 */
export function loadLoggingConfig(): LoggingConfig {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
        enabled: envBool('LOG_ENABLED', true),
        level: (process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug')) as LoggingConfig['level'],

        cloudwatch: {
            enabled: envBool('ENABLE_CLOUDWATCH_LOGS', isProduction),
            logGroup: process.env.CLOUDWATCH_LOG_GROUP || '/upllyft/api',
            logStream: process.env.CLOUDWATCH_LOG_STREAM,
            region: process.env.AWS_REGION || 'ap-south-1',
        },

        categories: {
            http: envBool('LOG_ENABLE_HTTP', true),
            auth: envBool('LOG_ENABLE_AUTH', true),
            email: envBool('LOG_ENABLE_EMAIL', true),
            security: envBool('LOG_ENABLE_SECURITY', true),
            transactions: envBool('LOG_ENABLE_TRANSACTIONS', true),
            organizations: envBool('LOG_ENABLE_ORGANIZATIONS', true),
            posts: envBool('LOG_ENABLE_POSTS', true),
            comments: envBool('LOG_ENABLE_COMMENTS', true),
            communities: envBool('LOG_ENABLE_COMMUNITIES', true),
            events: envBool('LOG_ENABLE_EVENTS', true),
            questions: envBool('LOG_ENABLE_QUESTIONS', true),
            errors: envBool('LOG_ENABLE_ERRORS', true), // Always true by default
        },

        options: {
            includeRequestBody: envBool('LOG_INCLUDE_REQUEST_BODY', false),
            includeResponseBody: envBool('LOG_INCLUDE_RESPONSE_BODY', false),
            logSlowRequests: envBool('LOG_SLOW_REQUESTS', true),
            slowRequestThreshold: envNumber('LOG_SLOW_REQUEST_THRESHOLD', 1000),
            sampleRate: envNumber('LOG_SAMPLE_RATE', 100),
        },
    };
}

/**
 * Log category type for type-safe category checks
 */
export type LogCategory = keyof LoggingConfig['categories'];

/**
 * Global config instance (lazy loaded)
 */
let configInstance: LoggingConfig | null = null;

export function getLoggingConfig(): LoggingConfig {
    if (!configInstance) {
        configInstance = loadLoggingConfig();
    }
    return configInstance;
}

/**
 * Check if a specific log category is enabled
 */
export function isLogCategoryEnabled(category: LogCategory): boolean {
    const config = getLoggingConfig();
    if (!config.enabled) return false;
    return config.categories[category] ?? true;
}

/**
 * Refresh config (useful for testing or dynamic config updates)
 */
export function refreshLoggingConfig(): void {
    configInstance = loadLoggingConfig();
}
