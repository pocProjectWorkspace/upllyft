# CloudWatch Logging Setup

This document explains how to configure and use the logging system for AWS CloudWatch monitoring.

## Overview

The logging system provides:
- **PII Masking**: All personal information (emails, phones, passwords, tokens) is automatically masked
- **User Tracking**: User IDs and roles are tracked for each request
- **Configurable Categories**: Enable/disable specific log categories via environment variables  
- **Sampling**: Reduce log volume by sampling a percentage of requests
- **Slow Request Detection**: Automatically flag slow API calls
- **HTTP Request/Response Logging**: All API calls are automatically logged with timing
- **Specialized Logging**: Auth, Email, Security, and Transaction events have dedicated log methods
- **CloudWatch Integration**: Logs are sent to AWS CloudWatch in production

## Quick Start Configuration

Add these to your `.env` file:

```env
# Enable logging (default: true)
LOG_ENABLED=true

# Log level
LOG_LEVEL=info

# Enable CloudWatch in production
ENABLE_CLOUDWATCH_LOGS=true
CLOUDWATCH_LOG_GROUP=/safehaven/api
AWS_REGION=ap-south-1
```

## 🎛️ Category Toggles (Full Control)

You can enable/disable specific log categories:

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_ENABLE_HTTP` | `true` | HTTP request/response logs |
| `LOG_ENABLE_AUTH` | `true` | Login, logout, register events |
| `LOG_ENABLE_EMAIL` | `true` | Email sending success/failure |
| `LOG_ENABLE_SECURITY` | `true` | Password changes, suspicious activity |
| `LOG_ENABLE_TRANSACTIONS` | `true` | General business operations |
| `LOG_ENABLE_ORGANIZATIONS` | `true` | Organization CRUD |
| `LOG_ENABLE_POSTS` | `true` | Post CRUD |
| `LOG_ENABLE_COMMENTS` | `true` | Comment CRUD |
| `LOG_ENABLE_COMMUNITIES` | `true` | Community CRUD |
| `LOG_ENABLE_EVENTS` | `true` | Calendar event CRUD |
| `LOG_ENABLE_QUESTIONS` | `true` | Q&A CRUD |
| `LOG_ENABLE_ERRORS` | `true` | Error logs (always keep enabled) |

### Example: Production (Essential Only)

```env
LOG_LEVEL=info
LOG_ENABLE_HTTP=false           # Disable to reduce volume
LOG_ENABLE_AUTH=true            # Keep auth for security
LOG_ENABLE_EMAIL=true           # Keep email for debugging
LOG_ENABLE_POSTS=false          # Disable high-volume logs
LOG_SAMPLE_RATE=10              # Only log 10% of requests
```

### Example: Debugging Auth Issues

```env
LOG_LEVEL=debug
LOG_ENABLE_HTTP=true
LOG_ENABLE_AUTH=true
LOG_ENABLE_SECURITY=true
LOG_SAMPLE_RATE=100
```

## 🔧 Advanced Options

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_SLOW_REQUESTS` | `true` | Log requests slower than threshold |
| `LOG_SLOW_REQUEST_THRESHOLD` | `1000` | Threshold in milliseconds |
| `LOG_SAMPLE_RATE` | `100` | 0-100, percentage of requests to log |
| `LOG_INCLUDE_REQUEST_BODY` | `false` | Include request body (⚠️ PII risk) |
| `LOG_INCLUDE_RESPONSE_BODY` | `false` | Include response body (⚠️ PII risk) |

## Log Format

All logs are JSON formatted and include:

```json
{
  "timestamp": "2026-01-08T16:43:15.123Z",
  "level": "info",
  "message": "AUTH: LOGIN_SUCCESS",
  "context": "AuthService",
  "action": "AUTH",
  "event": "LOGIN_SUCCESS",
  "userId": "cmjzj1hop0000rwrwu2h7xebp",
  "role": "ADMIN"
}
```

## PII Masking

The following data is automatically masked:

| Field | Original | Masked |
|-------|----------|--------|
| Email | user@example.com | us***@example.com |
| Phone | +919876543210 | ******3210 |
| Password | mypassword | [REDACTED] |
| JWT Token | eyJhbGci... | [JWT_TOKEN] |

User IDs are **NOT** masked (needed for tracking).

## Using in Services

### Inject the Logger

```typescript
import { AppLoggerService } from '../common/logging';

@Injectable()
export class MyService {
  constructor(private readonly appLogger: AppLoggerService) {
    this.appLogger.setContext('MyService');
  }
}
```

### Available Logging Methods

```typescript
// Generic logging
this.appLogger.info('Operation started', { userId });
this.appLogger.warn('Something unusual', { userId });  
this.appLogger.error('Operation failed', stackTrace, { userId });

// Authentication
this.appLogger.logAuth('LOGIN_SUCCESS', userId, { role: 'USER' });
this.appLogger.logAuth('LOGIN_FAILED', undefined, { reason: 'Invalid credentials' });

// Email
this.appLogger.logEmail('SENT', 'password-reset', userId, { messageId: 'abc' });
this.appLogger.logEmail('FAILED', 'welcome', userId, { error: 'SMTP error' });

// Security
this.appLogger.logSecurity('PASSWORD_CHANGED', userId);
this.appLogger.logSecurity('SUSPICIOUS_LOGIN', userId, { ip: '192.168.1.1' });

// Business transactions
this.appLogger.logTransaction('CREATE_POST', 'START', userId);
this.appLogger.logTransaction('CREATE_POST', 'SUCCESS', userId, { postId });
this.appLogger.logTransaction('CREATE_POST', 'FAILED', userId, { error });

// Organizations
this.appLogger.logOrganization('CREATE', orgId, userId, { slug });

// Posts
this.appLogger.logPost('CREATE', postId, userId, { communityId });
this.appLogger.logPost('DELETE', postId, userId);

// Comments
this.appLogger.logComment('CREATE', commentId, userId, { postId });

// Communities
this.appLogger.logCommunity('CREATE', communityId, userId, { slug });
this.appLogger.logCommunity('JOIN', communityId, userId);
this.appLogger.logCommunity('LEAVE', communityId, userId);

// Events
this.appLogger.logEvent('CREATE', eventId, userId, { eventType });
this.appLogger.logEvent('CANCEL', eventId, userId);

// Questions
this.appLogger.logQuestion('CREATE_QUESTION', questionId, userId);
this.appLogger.logQuestion('CREATE_ANSWER', answerId, userId, { questionId });
this.appLogger.logQuestion('ACCEPT_ANSWER', answerId, userId, { questionId });
```

## AWS CloudWatch Setup

### 1. Create Log Group

```bash
aws logs create-log-group --log-group-name /safehaven/api --region ap-south-1
```

### 2. IAM Permissions

Add these permissions to your EC2/ECS role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/safehaven/*"
    }
  ]
}
```

### 3. Enable in Production

```env
ENABLE_CLOUDWATCH_LOGS=true
```

## CloudWatch Insights Queries

### Find Failed Logins

```sql
fields @timestamp, @message
| filter action = "AUTH" and event = "LOGIN_FAILED"
| sort @timestamp desc
| limit 50
```

### Find Email Failures

```sql
fields @timestamp, userId, emailType, error
| filter action = "EMAIL" and event = "FAILED"
| sort @timestamp desc
```

### Find Slow Requests

```sql
fields @timestamp, method, path, duration
| filter action = "HTTP_RESPONSE" and isSlow = true
| sort duration desc
| limit 20
```

### Track User Activity

```sql
fields @timestamp, action, event, userId
| filter userId = "cmjzj1hop0000rwrwu2h7xebp"
| sort @timestamp desc
| limit 100
```

## Services with Logging Enabled

| Service | Status | Log Category |
|---------|--------|--------------|
| AuthService | ✅ | `auth`, `security` |
| EmailService | ✅ | `email` |
| PostsService | ✅ | `posts` |
| CommentsService | ✅ | `comments` |
| OrganizationsService | ✅ | `organizations` |
| CommunityService | ✅ | `communities` |
| EventsService | ✅ | `events` |
| QuestionsService | ✅ | `questions` |
| HTTP Interceptor | ✅ | `http` |
