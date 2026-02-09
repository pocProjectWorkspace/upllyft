/**
 * Email Service
 * Main facade for sending transactional emails
 * 
 * This is the ONLY class that should be used by application code.
 * It abstracts away provider-specific details and handles:
 * - Provider resolution
 * - Idempotency (retry-safe duplicate prevention)
 * - Logging
 * - Error handling
 * 
 * Usage:
 *   constructor(private readonly emailService: EmailService) {}
 *   
 *   await this.emailService.sendEmail({
 *     to: 'user@example.com',
 *     subject: 'Welcome',
 *     html: '<h1>Hello!</h1>',
 *     idempotencyKey: `welcome-${userId}`,
 *   });
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailOptions, EmailSendResult } from './interfaces';
import { EmailProviderFactory } from './factory';
import { EmailIdempotencyService } from './utils';
import { AppLoggerService } from '../common/logging';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly providerFactory: EmailProviderFactory,
    private readonly idempotencyService: EmailIdempotencyService,
    private readonly appLogger: AppLoggerService,
  ) {
    this.frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    this.appLogger.setContext('EmailService');
  }

  /**
   * Send an email using the configured provider
   * 
   * @param options Email options
   * @returns Result of the send operation
   */
  async sendEmail(options: EmailOptions): Promise<EmailSendResult> {
    // Check provider availability
    if (!this.providerFactory.isConfigured()) {
      this.logger.warn(
        `Email not sent to ${this.getRecipientString(options.to)} - no provider configured`,
      );
      return {
        success: false,
        error: 'Email provider not configured',
        timestamp: new Date(),
      };
    }

    // Handle idempotency
    const idempotencyKey = options.idempotencyKey ||
      this.idempotencyService.generateKey(
        this.getRecipientString(options.to),
        options.subject,
      );

    const { duplicate, existingMessageId } = await this.idempotencyService.isDuplicate(
      idempotencyKey,
    );

    if (duplicate) {
      this.logger.debug(
        `Skipping duplicate email to ${this.getRecipientString(options.to)}`,
      );
      return {
        success: true,
        duplicate: true,
        messageId: existingMessageId,
        timestamp: new Date(),
      };
    }

    // Send via provider
    const provider = this.providerFactory.getProvider();
    const result = await provider.send(options);

    // Record successful send for idempotency
    if (result.success) {
      await this.idempotencyService.recordSend(
        idempotencyKey,
        provider.name,
        result.messageId,
      );
    }

    return result;
  }

  /**
   * Check if email service is operational
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    provider: string;
    details?: Record<string, unknown>;
  }> {
    if (!this.providerFactory.isConfigured()) {
      return {
        healthy: false,
        provider: 'none',
        details: { error: 'No provider configured' },
      };
    }

    const provider = this.providerFactory.getProvider();
    const health = await provider.getHealthStatus();

    return {
      healthy: health.healthy,
      provider: provider.name,
      details: health.details,
    };
  }

  /**
   * Get the current provider name
   */
  getCurrentProvider(): string {
    try {
      return this.providerFactory.getProvider().name;
    } catch {
      return 'none';
    }
  }

  // ============================================
  // TRANSACTIONAL EMAIL TEMPLATES
  // ============================================

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    userName?: string,
  ): Promise<boolean> {
    const resetLink = `${this.frontendUrl}/reset-password?token=${resetToken}`;

    const html = this.buildPasswordResetHtml(resetLink, userName);
    const text = this.buildPasswordResetText(resetLink, userName);

    const result = await this.sendEmail({
      to: email,
      subject: 'Reset Your Password - Upllyft',
      html,
      text,
      idempotencyKey: `password-reset-${email}-${resetToken.substring(0, 8)}`,
      tags: ['password-reset', 'transactional'],
    });

    return result.success;
  }

  /**
   * Send password changed notification
   */
  async sendPasswordChangedNotification(
    email: string,
    userName?: string,
  ): Promise<boolean> {
    const supportEmail = this.configService.get<string>(
      'SUPPORT_EMAIL',
      'support@upllyft.com',
    );
    const changeDate = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const html = this.buildPasswordChangedHtml(supportEmail, changeDate, userName);
    const text = this.buildPasswordChangedText(supportEmail, changeDate, userName);

    const result = await this.sendEmail({
      to: email,
      subject: 'Your Password Has Been Changed - Upllyft',
      html,
      text,
      idempotencyKey: `password-changed-${email}-${Date.now()}`,
      tags: ['password-changed', 'security', 'transactional'],
    });

    return result.success;
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, userName: string): Promise<boolean> {
    const html = this.buildWelcomeHtml(userName);
    const text = `Welcome to Upllyft, ${userName}! Start exploring our healthcare professional community at ${this.frontendUrl}`;

    const result = await this.sendEmail({
      to: email,
      subject: 'Welcome to Upllyft!',
      html,
      text,
      idempotencyKey: `welcome-${email}`,
      tags: ['welcome', 'onboarding', 'transactional'],
    });

    return result.success;
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(
    email: string,
    verificationToken: string,
    userName?: string,
  ): Promise<boolean> {
    const verifyLink = `${this.frontendUrl}/verify-email?token=${verificationToken}`;

    const html = this.buildVerificationHtml(verifyLink, userName);
    const text = `
Verify Your Email - Upllyft

Hi ${userName || 'there'},

Please verify your email address by clicking the link below:
${verifyLink}

This link will expire in 24 hours.

If you didn't create an Upllyft account, please ignore this email.

Best regards,
The Upllyft Team
    `.trim();

    const result = await this.sendEmail({
      to: email,
      subject: 'Verify Your Email - Upllyft',
      html,
      text,
      idempotencyKey: `verify-${email}-${verificationToken.substring(0, 8)}`,
      tags: ['verification', 'onboarding', 'transactional'],
    });

    return result.success;
  }

  /**
   * Send account invitation email
   */
  async sendInvitationEmail(
    email: string,
    inviteToken: string,
    inviterName: string,
    organizationName?: string,
  ): Promise<boolean> {
    const inviteLink = `${this.frontendUrl}/accept-invitation?token=${inviteToken}`;

    const html = this.buildInvitationHtml(inviteLink, inviterName, organizationName);
    const text = `
You're Invited to Upllyft

Hi there,

${inviterName}${organizationName ? ` from ${organizationName}` : ''} has invited you to join Upllyft.

Accept your invitation by clicking the link below:
${inviteLink}

This invitation will expire in 7 days.

Best regards,
The Upllyft Team
    `.trim();

    const result = await this.sendEmail({
      to: email,
      subject: `You're invited to join Upllyft`,
      html,
      text,
      idempotencyKey: `invitation-${email}-${inviteToken.substring(0, 8)}`,
      tags: ['invitation', 'onboarding', 'transactional'],
    });

    return result.success;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private getRecipientString(to: EmailOptions['to']): string {
    if (typeof to === 'string') {
      return to;
    }
    if (Array.isArray(to)) {
      return to.map(r => (typeof r === 'string' ? r : r.email)).join(', ');
    }
    return to.email;
  }

  // ============================================
  // HTML TEMPLATES
  // ============================================

  private buildPasswordResetHtml(resetLink: string, userName?: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password - Upllyft</title>
          ${this.getEmailStyles()}
        </head>
        <body>
          <div class="email-wrapper">
            <div class="header">
              <h1>Upllyft</h1>
            </div>
            
            <div class="content">
              <p class="greeting">Hi ${userName || 'there'},</p>
              
              <p class="message">
                We received a request to reset your password for your Upllyft account.
                Click the button below to create a new password:
              </p>
              
              <div class="button-container">
                <a href="${resetLink}" class="primary-button">Reset Password</a>
              </div>
              
              <div class="link-section">
                <p>Or copy and paste this link into your browser:</p>
                <a href="${resetLink}" class="reset-link">${resetLink}</a>
              </div>
              
              <div class="warning-box">
                <p>
                  <strong>⚠️ Important:</strong>
                  This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you have concerns.
                </p>
              </div>
            </div>
            
            ${this.getEmailFooter()}
          </div>
        </body>
      </html>
    `;
  }

  private buildPasswordResetText(resetLink: string, userName?: string): string {
    return `
Reset Your Password - Upllyft

Hi ${userName || 'there'},

We received a request to reset your password for your Upllyft account.

To reset your password, click this link:
${resetLink}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email or contact support if you have concerns.

Best regards,
The Upllyft Team

© ${new Date().getFullYear()} Upllyft. All rights reserved.
    `.trim();
  }

  private buildPasswordChangedHtml(
    supportEmail: string,
    changeDate: string,
    userName?: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Password Has Been Changed - Upllyft</title>
          ${this.getEmailStyles()}
        </head>
        <body>
          <div class="email-wrapper">
            <div class="header">
              <h1>🔒 Password Changed</h1>
            </div>
            
            <div class="content">
              <p class="greeting">Hi ${userName || 'there'},</p>
              
              <p class="message">
                This is a confirmation that your password has been successfully changed.
              </p>
              
              <div class="info-box">
                <p>
                  <strong>ℹ️ Security tip:</strong>
                  If you didn't make this change, please contact our support team immediately at 
                  <a href="mailto:${supportEmail}">${supportEmail}</a>
                </p>
              </div>
              
              <div class="timestamp">
                <strong>Changed:</strong> ${changeDate}
              </div>
            </div>
            
            ${this.getEmailFooter('The Upllyft Security Team')}
          </div>
        </body>
      </html>
    `;
  }

  private buildPasswordChangedText(
    supportEmail: string,
    changeDate: string,
    userName?: string,
  ): string {
    return `
Your Password Has Been Changed - Upllyft

Hi ${userName || 'there'},

This is a confirmation that your password has been successfully changed.

Security tip: If you didn't make this change, please contact our support team immediately at ${supportEmail}

Changed: ${changeDate}

Best regards,
The Upllyft Security Team

© ${new Date().getFullYear()} Upllyft. All rights reserved.
    `.trim();
  }

  private buildWelcomeHtml(userName: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Upllyft</title>
          ${this.getEmailStyles()}
        </head>
        <body>
          <div class="email-wrapper">
            <div class="header">
              <h1>Welcome to Upllyft! 🎉</h1>
              <p class="header-subtitle">Healthcare Professional Community Platform</p>
            </div>
            
            <div class="content">
              <p class="greeting">Hi ${userName},</p>
              
              <p class="message">
                Thank you for joining Upllyft! We're excited to have you as part of our healthcare professional community.
              </p>
              
              <div class="button-container">
                <a href="${this.frontendUrl}" class="primary-button">Get Started</a>
              </div>
            </div>
            
            ${this.getEmailFooter()}
          </div>
        </body>
      </html>
    `;
  }

  private buildVerificationHtml(verifyLink: string, userName?: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email - Upllyft</title>
          ${this.getEmailStyles()}
        </head>
        <body>
          <div class="email-wrapper">
            <div class="header">
              <h1>Verify Your Email</h1>
            </div>
            
            <div class="content">
              <p class="greeting">Hi ${userName || 'there'},</p>
              
              <p class="message">
                Thank you for signing up for Upllyft! Please verify your email address by clicking the button below:
              </p>
              
              <div class="button-container">
                <a href="${verifyLink}" class="primary-button">Verify Email</a>
              </div>
              
              <div class="link-section">
                <p>Or copy and paste this link into your browser:</p>
                <a href="${verifyLink}" class="reset-link">${verifyLink}</a>
              </div>
              
              <div class="info-box">
                <p>This verification link will expire in 24 hours.</p>
              </div>
            </div>
            
            ${this.getEmailFooter()}
          </div>
        </body>
      </html>
    `;
  }

  private buildInvitationHtml(
    inviteLink: string,
    inviterName: string,
    organizationName?: string,
  ): string {
    const inviteContext = organizationName
      ? `<strong>${inviterName}</strong> from <strong>${organizationName}</strong>`
      : `<strong>${inviterName}</strong>`;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You're Invited to Upllyft</title>
          ${this.getEmailStyles()}
        </head>
        <body>
          <div class="email-wrapper">
            <div class="header">
              <h1>You're Invited! 🎉</h1>
            </div>
            
            <div class="content">
              <p class="greeting">Hi there,</p>
              
              <p class="message">
                ${inviteContext} has invited you to join Upllyft, the healthcare professional community platform.
              </p>
              
              <div class="button-container">
                <a href="${inviteLink}" class="primary-button">Accept Invitation</a>
              </div>
              
              <div class="link-section">
                <p>Or copy and paste this link into your browser:</p>
                <a href="${inviteLink}" class="reset-link">${inviteLink}</a>
              </div>
              
              <div class="info-box">
                <p>This invitation will expire in 7 days.</p>
              </div>
            </div>
            
            ${this.getEmailFooter()}
          </div>
        </body>
      </html>
    `;
  }

  private getEmailStyles(): string {
    return `
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background-color: #f5f5f5;
        }
        .email-wrapper {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
        }
        .header {
          background: linear-gradient(135deg, #4FD1C5 0%, #38B2AC 100%);
          padding: 40px 20px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          font-size: 28px;
          font-weight: 600;
          margin: 0;
        }
        .header-subtitle {
          color: rgba(255, 255, 255, 0.9);
          font-size: 16px;
          margin: 10px 0 0 0;
        }
        .content {
          padding: 40px;
          color: #2D3748;
        }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          color: #1A202C;
          margin: 0 0 20px 0;
        }
        .message {
          font-size: 15px;
          line-height: 1.6;
          color: #4A5568;
          margin: 0 0 15px 0;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .primary-button {
          display: inline-block;
          padding: 14px 40px;
          background: linear-gradient(135deg, #4FD1C5 0%, #38B2AC 100%);
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 4px 6px rgba(79, 209, 197, 0.3);
        }
        .link-section {
          margin: 25px 0;
          padding: 15px;
          background-color: #F7FAFC;
          border-radius: 6px;
        }
        .link-section p {
          font-size: 13px;
          color: #718096;
          margin: 0 0 10px 0;
        }
        .reset-link {
          display: block;
          padding: 12px;
          background-color: #ffffff;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          color: #4299E1;
          word-break: break-all;
          font-size: 13px;
          text-decoration: none;
        }
        .info-box {
          margin: 25px 0;
          padding: 16px;
          background-color: #EBF8FF;
          border-left: 4px solid #4299E1;
          border-radius: 6px;
        }
        .info-box p {
          margin: 0;
          font-size: 14px;
          color: #2C5282;
          line-height: 1.5;
        }
        .warning-box {
          margin: 25px 0;
          padding: 16px;
          background-color: #FFFBEB;
          border-left: 4px solid #F6AD55;
          border-radius: 6px;
        }
        .warning-box p {
          margin: 0;
          font-size: 14px;
          color: #744210;
          line-height: 1.5;
        }
        .timestamp {
          margin: 20px 0;
          padding: 12px;
          background-color: #F7FAFC;
          border-radius: 6px;
          font-size: 14px;
          color: #4A5568;
        }
        .footer {
          padding: 30px 40px;
          color: #718096;
          font-size: 14px;
          line-height: 1.6;
          text-align: center;
        }
        .team-name {
          color: #38B2AC;
          font-weight: 600;
        }
        .copyright {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #E2E8F0;
          font-size: 12px;
          color: #A0AEC0;
        }
      </style>
    `;
  }

  private getEmailFooter(teamName = 'The Upllyft Team'): string {
    return `
      <div class="footer">
        <p>
          Best regards,<br>
          <span class="team-name">${teamName}</span>
        </p>
        
        <div class="copyright">
          © ${new Date().getFullYear()} Upllyft. All rights reserved.
        </div>
      </div>
    `;
  }
}