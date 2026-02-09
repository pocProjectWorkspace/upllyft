import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SendEmailDto } from './dto/notification.dto';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private transporter: nodemailer.Transporter;

    constructor(private configService: ConfigService) {
        this.initializeTransporter();
    }

    private initializeTransporter() {
        const emailProvider = this.configService.get('EMAIL_PROVIDER', 'smtp');

        if (emailProvider === 'sendgrid') {
            // SendGrid configuration
            this.transporter = nodemailer.createTransport({
                host: 'smtp.sendgrid.net',
                port: 587,
                secure: false,
                auth: {
                    user: 'apikey',
                    pass: this.configService.get('SENDGRID_API_KEY'),
                },
            });
        } else {
            // SMTP configuration
            this.transporter = nodemailer.createTransport({
                host: this.configService.get('SMTP_HOST', 'smtp.gmail.com'),
                port: parseInt(this.configService.get('SMTP_PORT', '587')),
                secure: this.configService.get('SMTP_SECURE', 'false') === 'true',
                auth: {
                    user: this.configService.get('SMTP_USER'),
                    pass: this.configService.get('SMTP_PASS'),
                },
            });
        }

        this.logger.log(`Email service initialized with provider: ${emailProvider}`);
    }

    /**
     * Send email
     */
    async sendEmail(dto: SendEmailDto): Promise<boolean> {
        try {
            const fromEmail =
                this.configService.get('SENDGRID_FROM_EMAIL') ||
                this.configService.get('SMTP_USER');
            const fromName = this.configService.get('SENDGRID_FROM_NAME', 'Upllyft');

            const mailOptions = {
                from: `${fromName} <${fromEmail}>`,
                to: dto.to,
                subject: dto.subject,
                html: dto.html,
                text: dto.text,
            };

            const result = await this.transporter.sendMail(mailOptions);
            this.logger.log(`Email sent to ${dto.to}: ${dto.subject}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to send email to ${dto.to}:`, error);
            return false;
        }
    }

    /**
     * Send booking request email to therapist
     */
    async sendBookingRequestEmail(data: {
        therapistEmail: string;
        therapistName: string;
        patientName: string;
        sessionType: string;
        sessionDateTime: string;
        duration: number;
        price: number;
        currency: string;
    }): Promise<boolean> {
        const html = this.generateBookingRequestTemplate(data);

        return this.sendEmail({
            to: data.therapistEmail,
            subject: `New Booking Request from ${data.patientName}`,
            html,
        });
    }

    /**
     * Send booking confirmation email to patient
     */
    async sendBookingConfirmationEmail(data: {
        patientEmail: string;
        patientName: string;
        therapistName: string;
        sessionType: string;
        sessionDateTime: string;
        duration: number;
        googleMeetLink: string;
        timezone: string;
    }): Promise<boolean> {
        const html = this.generateBookingConfirmationTemplate(data);

        return this.sendEmail({
            to: data.patientEmail,
            subject: `Your Session with ${data.therapistName} is Confirmed`,
            html,
        });
    }

    /**
     * Send booking rejection email to patient
     */
    async sendBookingRejectionEmail(data: {
        patientEmail: string;
        patientName: string;
        therapistName: string;
        sessionType: string;
        sessionDateTime: string;
        reason?: string;
    }): Promise<boolean> {
        const html = this.generateBookingRejectionTemplate(data);

        return this.sendEmail({
            to: data.patientEmail,
            subject: `Update on Your Booking Request`,
            html,
        });
    }

    /**
     * Send payment confirmation email
     */
    async sendPaymentConfirmationEmail(data: {
        patientEmail: string;
        patientName: string;
        amount: number;
        currency: string;
        sessionType: string;
        sessionDateTime: string;
    }): Promise<boolean> {
        const html = this.generatePaymentConfirmationTemplate(data);

        return this.sendEmail({
            to: data.patientEmail,
            subject: `Payment Confirmation - ${data.currency} ${data.amount}`,
            html,
        });
    }

    /**
     * Send session reminder email
     */
    async sendSessionReminderEmail(data: {
        recipientEmail: string;
        recipientName: string;
        otherPersonName: string;
        sessionType: string;
        sessionDateTime: string;
        googleMeetLink: string;
        timeUntilSession: string;
    }): Promise<boolean> {
        const html = this.generateSessionReminderTemplate(data);

        return this.sendEmail({
            to: data.recipientEmail,
            subject: `Reminder: Your session is in ${data.timeUntilSession}`,
            html,
        });
    }

    /**
     * Send cancellation email
     */
    async sendCancellationEmail(data: {
        recipientEmail: string;
        recipientName: string;
        sessionType: string;
        sessionDateTime: string;
        canceledBy: string;
        reason?: string;
    }): Promise<boolean> {
        const html = this.generateCancellationTemplate(data);

        return this.sendEmail({
            to: data.recipientEmail,
            subject: `Session Canceled - ${data.sessionType}`,
            html,
        });
    }

    /**
     * Send refund confirmation email
     */
    async sendRefundEmail(data: {
        patientEmail: string;
        patientName: string;
        amount: number;
        currency: string;
        sessionType: string;
    }): Promise<boolean> {
        const html = this.generateRefundTemplate(data);

        return this.sendEmail({
            to: data.patientEmail,
            subject: `Refund Processed - ${data.currency} ${data.amount}`,
            html,
        });
    }

    // ==================== Email Templates ====================

    private generateBookingRequestTemplate(data: any): string {
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 30px; }
          .details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .button { background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Booking Request</h1>
          </div>
          <div class="content">
            <p>Hi ${data.therapistName},</p>
            <p>You have a new booking request from <strong>${data.patientName}</strong>.</p>
            
            <div class="details">
              <h3>Session Details</h3>
              <p><strong>Session Type:</strong> ${data.sessionType}</p>
              <p><strong>Date & Time:</strong> ${data.sessionDateTime}</p>
              <p><strong>Duration:</strong> ${data.duration} minutes</p>
              <p><strong>Price:</strong> ${data.currency} ${data.amount}</p>
            </div>
            
            <p>Please review and respond to this request within 4 hours.</p>
            
            <a href="${this.configService.get('FRONTEND_URL')}/therapist/bookings" class="button">View Booking</a>
          </div>
          <div class="footer">
            <p>© 2026 Upllyft. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }

    private generateBookingConfirmationTemplate(data: any): string {
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 30px; }
          .details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .button { background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 5px; }
          .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Session Confirmed</h1>
          </div>
          <div class="content">
            <p>Hi ${data.patientName},</p>
            <p>Great news! Your session with <strong>${data.therapistName}</strong> has been confirmed.</p>
            
            <div class="details">
              <h3>Session Details</h3>
              <p><strong>Session Type:</strong> ${data.sessionType}</p>
              <p><strong>Date & Time:</strong> ${data.sessionDateTime} (${data.timezone})</p>
              <p><strong>Duration:</strong> ${data.duration} minutes</p>
              <p><strong>Google Meet Link:</strong> <a href="${data.googleMeetLink}">${data.googleMeetLink}</a></p>
            </div>
            
            <p>You'll receive reminder notifications before your session.</p>
            
            <a href="${data.googleMeetLink}" class="button">Join Session</a>
            <a href="${this.configService.get('FRONTEND_URL')}/patient/bookings" class="button">View Details</a>
          </div>
          <div class="footer">
            <p>© 2026 Upllyft. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }

    private generateBookingRejectionTemplate(data: any): string {
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #EF4444; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 30px; }
          .details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .button { background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Update</h1>
          </div>
          <div class="content">
            <p>Hi ${data.patientName},</p>
            <p>Unfortunately, ${data.therapistName} is unable to accept your booking request.</p>
            
            <div class="details">
              <p><strong>Session Type:</strong> ${data.sessionType}</p>
              <p><strong>Requested Time:</strong> ${data.sessionDateTime}</p>
              ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
            </div>
            
            <p>Your payment has been refunded and should appear in your account within 5-7 business days.</p>
            <p>We encourage you to browse other available therapists or try a different time slot.</p>
            
            <a href="${this.configService.get('FRONTEND_URL')}/therapists" class="button">Find Another Therapist</a>
          </div>
          <div class="footer">
            <p>© 2026 Upllyft. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }

    private generatePaymentConfirmationTemplate(data: any): string {
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 30px; }
          .details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Confirmed</h1>
          </div>
          <div class="content">
            <p>Hi ${data.patientName},</p>
            <p>Your payment has been successfully processed.</p>
            
            <div class="details">
              <h3>Payment Details</h3>
              <p><strong>Amount:</strong> ${data.currency} ${data.amount}</p>
              <p><strong>Session Type:</strong> ${data.sessionType}</p>
              <p><strong>Scheduled For:</strong> ${data.sessionDateTime}</p>
            </div>
            
            <p>Your therapist will review and confirm your booking shortly.</p>
          </div>
          <div class="footer">
            <p>© 2026 Upllyft. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }

    private generateSessionReminderTemplate(data: any): string {
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #F59E0B; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 30px; }
          .details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .button { background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Session Reminder</h1>
          </div>
          <div class="content">
            <p>Hi ${data.recipientName},</p>
            <p>This is a reminder that your session with <strong>${data.otherPersonName}</strong> is in <strong>${data.timeUntilSession}</strong>.</p>
            
            <div class="details">
              <p><strong>Session Type:</strong> ${data.sessionType}</p>
              <p><strong>Time:</strong> ${data.sessionDateTime}</p>
              <p><strong>Google Meet Link:</strong> <a href="${data.googleMeetLink}">${data.googleMeetLink}</a></p>
            </div>
            
            <p>Make sure you're in a quiet space with a stable internet connection.</p>
            
            <a href="${data.googleMeetLink}" class="button">Join Session</a>
          </div>
          <div class="footer">
            <p>© 2026 Upllyft. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }

    private generateCancellationTemplate(data: any): string {
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #6B7280; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 30px; }
          .details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Session Canceled</h1>
          </div>
          <div class="content">
            <p>Hi ${data.recipientName},</p>
            <p>Your session has been canceled by ${data.canceledBy}.</p>
            
            <div class="details">
              <p><strong>Session Type:</strong> ${data.sessionType}</p>
              <p><strong>Scheduled Time:</strong> ${data.sessionDateTime}</p>
              ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
            </div>
            
            <p>If you're a patient, any applicable refund will be processed according to our cancellation policy.</p>
          </div>
          <div class="footer">
            <p>© 2026 Upllyft. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }

    private generateRefundTemplate(data: any): string {
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 30px; }
          .details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Refund Processed</h1>
          </div>
          <div class="content">
            <p>Hi ${data.patientName},</p>
            <p>Your refund has been successfully processed.</p>
            
            <div class="details">
              <h3>Refund Details</h3>
              <p><strong>Amount:</strong> ${data.currency} ${data.amount}</p>
              <p><strong>Session Type:</strong> ${data.sessionType}</p>
            </div>
            
            <p>The refund should appear in your original payment method within 5-7 business days.</p>
          </div>
          <div class="footer">
            <p>© 2026 Upllyft. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }
}
