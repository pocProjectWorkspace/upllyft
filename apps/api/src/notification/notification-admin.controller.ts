import { BadRequestException, Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { EmailService } from '../email/email.service';
import { NotificationEmailService } from './notification-email.service';

/** Platform-admin tools to check that notification emails are going out. */
@ApiTags('notifications-admin')
@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class NotificationAdminController {
  constructor(
    private readonly notificationEmail: NotificationEmailService,
    private readonly email: EmailService,
  ) {}

  /** Provider status — never returns credentials. */
  @Get('email-health')
  async emailHealth() {
    const health = await this.email.healthCheck();
    return { ...health, sendingDisabled: process.env.EMAIL_SEND_DISABLED === 'true' };
  }

  @Post('test-email')
  async testEmail(@Request() req: any, @Body() body: { to?: string }) {
    const to = (body?.to ?? req.user.email ?? '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new BadRequestException('Enter a valid email address.');
    return this.notificationEmail.sendTest(to, req.user.email ?? 'an admin');
  }

  /** Run the digest now (it also runs every day at 03:30 UTC). */
  @Post('send-digests')
  sendDigests() {
    return this.notificationEmail.sendDigests();
  }
}
