import { IsString, IsEmail, IsOptional, IsObject, IsEnum } from 'class-validator';

export enum NotificationType {
    BOOKING_CREATED = 'BOOKING_CREATED',
    PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
    BOOKING_ACCEPTED = 'BOOKING_ACCEPTED',
    BOOKING_REJECTED = 'BOOKING_REJECTED',
    REMINDER_24H = 'REMINDER_24H',
    REMINDER_1H = 'REMINDER_1H',
    REMINDER_30M = 'REMINDER_30M',
    REMINDER_15M = 'REMINDER_15M',
    BOOKING_CANCELED = 'BOOKING_CANCELED',
    REFUND_PROCESSED = 'REFUND_PROCESSED',
    SESSION_COMPLETED = 'SESSION_COMPLETED',
}

export enum NotificationChannel {
    EMAIL = 'EMAIL',
    PUSH = 'PUSH',
    CALENDAR = 'CALENDAR',
}

export class SendEmailDto {
    @IsEmail()
    to: string;

    @IsString()
    subject: string;

    @IsString()
    @IsOptional()
    html?: string;

    @IsString()
    @IsOptional()
    text?: string;

    @IsObject()
    @IsOptional()
    templateData?: Record<string, any>;

    @IsString()
    @IsOptional()
    templateName?: string;
}

export class SendPushNotificationDto {
    @IsString()
    userId: string;

    @IsString()
    title: string;

    @IsString()
    body: string;

    @IsObject()
    @IsOptional()
    data?: Record<string, any>;

    @IsEnum(NotificationType)
    @IsOptional()
    type?: NotificationType;
}

export class BookingNotificationData {
    bookingId: string;
    patientName: string;
    patientEmail: string;
    therapistName: string;
    therapistEmail: string;
    sessionTypeName: string;
    sessionDateTime: string;
    duration: number;
    timezone: string;
    price: number;
    currency: string;
    googleMeetLink?: string;
    cancellationReason?: string;
    rejectionReason?: string;
}
