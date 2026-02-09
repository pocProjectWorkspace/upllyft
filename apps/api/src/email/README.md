# Email Module

A production-ready, multi-provider email service with hot-swappable providers.

## Features

- **Multi-Provider Support**: SendGrid, Amazon SES, MailerSend
- **Environment-Based Switching**: Change `EMAIL_PROVIDER` to switch providers
- **Zero Code Changes**: No provider-specific logic outside this module
- **Idempotency**: Built-in duplicate detection prevents retry-caused double sends
- **HTML + Text**: All emails support both formats
- **Attachments**: Full attachment support across all providers
- **Templates**: Provider-native template support (SendGrid Dynamic Templates, MailerSend Templates)

## Quick Start

### 1. Set Environment Variables

```bash
# Choose one: sendgrid | ses | mailersend
EMAIL_PROVIDER=sendgrid

# For SendGrid
SENDGRID_API_KEY=SG.xxx

# For Amazon SES
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx

# For MailerSend
MAILERSEND_API_KEY=mlsn.xxx

# Common
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME=Your App
```

### 2. Use in Your Service

```typescript
import { Injectable } from '@nestjs/common';
import { EmailService } from '../email';

@Injectable()
export class UserService {
  constructor(private readonly emailService: EmailService) {}

  async registerUser(email: string, name: string) {
    // ... create user
    
    await this.emailService.sendWelcomeEmail(email, name);
  }

  async requestPasswordReset(email: string) {
    const token = await this.generateResetToken(email);
    await this.emailService.sendPasswordResetEmail(email, token);
  }
}
```

### 3. Custom Emails

```typescript
// Send custom email with idempotency
const result = await this.emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Your Report is Ready',
  html: '<h1>Hello!</h1><p>Your report is attached.</p>',
  text: 'Hello! Your report is attached.',
  attachments: [{
    filename: 'report.pdf',
    content: pdfBuffer,
    contentType: 'application/pdf',
  }],
  idempotencyKey: `report-${reportId}-${userId}`,
  tags: ['report', 'transactional'],
});

if (result.success) {
  console.log('Email sent:', result.messageId);
} else {
  console.error('Failed:', result.error);
}
```

## Architecture

```
email/
├── index.ts                          # Public exports
├── email.module.ts                   # Module registration
├── email.service.ts                  # Main facade (use this!)
├── interfaces/
│   ├── email-options.interface.ts    # Email options types
│   └── email-provider.interface.ts   # Provider contract
├── providers/
│   ├── sendgrid.provider.ts          # SendGrid implementation
│   ├── ses.provider.ts               # Amazon SES implementation
│   └── mailersend.provider.ts        # MailerSend implementation
├── factory/
│   └── email-provider.factory.ts     # Provider resolution
└── utils/
    └── email-idempotency.service.ts  # Duplicate prevention
```

## Provider Setup Guides

### SendGrid

1. **Create API Key**
   - Go to Settings → API Keys in SendGrid Console
   - Create a key with "Mail Send" permission
   - Copy and set as `SENDGRID_API_KEY`

2. **Sender Verification**
   - Verify your sending domain OR
   - Verify individual sender email addresses
   - Domain verification recommended for production

3. **DNS Records (Domain Authentication)**
   - Add CNAME records provided by SendGrid
   - Add SPF record: `v=spf1 include:sendgrid.net ~all`

### Amazon SES

1. **Request Production Access**
   - New accounts are in "sandbox mode"
   - Can only send to verified emails in sandbox
   - Request production access via SES Console → Account Dashboard

2. **Verify Sending Identity**
   - Verify your domain in SES Console
   - Add DKIM records (CNAME records provided by AWS)
   - Add SPF record: `v=spf1 include:amazonses.com ~all`

3. **IAM Permissions**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": [
         "ses:SendEmail",
         "ses:SendRawEmail",
         "ses:GetSendQuota"
       ],
       "Resource": "*"
     }]
   }
   ```

4. **Authentication Options**
   - **IAM Role** (recommended for AWS deployments): Leave `AWS_ACCESS_KEY_ID` empty
   - **Explicit Credentials**: Set both `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

### MailerSend

1. **Create API Token**
   - Go to Domains → Manage → API Tokens
   - Create a new token with appropriate permissions
   - Copy and set as `MAILERSEND_API_KEY`

2. **Domain Verification**
   - Add your domain in MailerSend
   - Add provided DNS records (SPF, DKIM, DMARC)
   - Wait for verification (usually 24-48 hours)

## Production Best Practices

### 1. DNS Configuration

For all providers, ensure proper DNS configuration:

```dns
# SPF Record (TXT)
@ IN TXT "v=spf1 include:sendgrid.net include:amazonses.com include:mailersend.net ~all"

# DMARC Record (TXT)
_dmarc IN TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com"

# DKIM (provider-specific CNAME records)
```

### 2. Rate Limiting

- All providers have rate limits
- Implement queue-based sending for bulk operations
- Consider using BullMQ or similar for email queues

### 3. Monitoring

- Monitor bounce rates (>2% triggers warnings)
- Track complaint rates (>0.1% is critical)
- Set up webhooks for delivery tracking

### 4. Idempotency Keys

Always use idempotency keys for critical emails:

```typescript
await this.emailService.sendEmail({
  to: user.email,
  subject: 'Order Confirmation',
  html: orderHtml,
  idempotencyKey: `order-confirmation-${orderId}`,
});
```

This prevents duplicate sends if your code retries due to timeouts.

### 5. Redis-Backed Idempotency (Production)

For production deployments with multiple instances, replace the in-memory store with Redis:

```typescript
// In email-idempotency.service.ts
// Replace Map with Redis client
import { Redis } from 'ioredis';

private readonly redis = new Redis(process.env.REDIS_URL);

async isDuplicate(key: string): Promise<{ duplicate: boolean }> {
  const exists = await this.redis.exists(`email:idempotency:${key}`);
  return { duplicate: exists === 1 };
}

async recordSend(key: string, provider: string, messageId?: string): Promise<void> {
  await this.redis.setex(
    `email:idempotency:${key}`,
    86400, // 24 hours TTL
    JSON.stringify({ provider, messageId }),
  );
}
```

## Health Checks

The module exposes health check functionality:

```typescript
@Controller('health')
export class HealthController {
  constructor(private readonly emailService: EmailService) {}

  @Get('email')
  async emailHealth() {
    const health = await this.emailService.healthCheck();
    return {
      status: health.healthy ? 'ok' : 'error',
      provider: health.provider,
      ...health.details,
    };
  }
}
```

## Testing

For testing, you can mock the EmailService:

```typescript
const mockEmailService = {
  sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'test-123' }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
};

// In your test module
providers: [
  { provide: EmailService, useValue: mockEmailService },
],
```
