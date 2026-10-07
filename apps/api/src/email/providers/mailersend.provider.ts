/**
 * MailerSend Email Provider
 * MailerSend's SMTP relay; the transport lives in SmtpProvider.
 */

import { Injectable, Logger } from '@nestjs/common';
import { SmtpProvider } from './smtp.provider';

@Injectable()
export class MailerSendProvider extends SmtpProvider {
    readonly name: string = 'mailersend';
    protected readonly defaultHost = 'smtp.mailersend.net';
    protected readonly logger = new Logger(MailerSendProvider.name);
}
