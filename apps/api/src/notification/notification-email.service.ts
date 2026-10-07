import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService, escapeHtml } from '../email/email.service';
import {
  EmailFrequency,
  absoluteLink,
  digestDue,
  digestWindowStart,
  emailDecision,
  emailPrefsFrom,
} from './email-rules';

/** Addresses that must never receive mail: test fixtures and claim placeholders. */
export function isDeliverable(email: string | null | undefined): email is string {
  if (!email || !email.includes('@')) return false;
  const e = email.toLowerCase();
  return !e.startsWith('placeholder.') && !e.endsWith('.internal') && !e.endsWith('@example.com');
}

const MAX_DIGEST_ITEMS = 15;

/**
 * Notification emails: instant ones as they are created, and the daily / weekly digest.
 *
 * Claiming: a notification is emailed by whoever sets its `emailedAt` first (a single
 * UPDATE … WHERE "emailedAt" IS NULL), so two API replicas running the same cron never
 * send the same notification twice. A failed send releases the claim for the next run.
 */
@Injectable()
export class NotificationEmailService {
  private readonly logger = new Logger(NotificationEmailService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    config: ConfigService,
  ) {
    this.frontendUrl = config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  private async prefsFor(userId: string) {
    const row = await this.prisma.userPreferences.findUnique({
      where: { userId },
      select: { emailNotifications: true, emailEnabled: true, notificationFrequency: true, notificationPrefs: true },
    });
    return emailPrefsFrom(row);
  }

  /** Claim notification ids for emailing; returns the ids this caller won. */
  private async claim(ids: string[]): Promise<string[]> {
    if (!ids.length) return [];
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      UPDATE "Notification" SET "emailedAt" = now()
       WHERE "id" IN (${Prisma.join(ids)}) AND "emailedAt" IS NULL
       RETURNING "id"`;
    return rows.map((r) => r.id);
  }

  private async release(ids: string[]) {
    if (ids.length) await this.prisma.notification.updateMany({ where: { id: { in: ids } }, data: { emailedAt: null } });
  }

  /**
   * Called right after a notification is created. Emails it now when the rules say so;
   * otherwise it waits for the digest. Never throws — email must not break notifications.
   */
  async onCreated(n: { id: string; userId: string; type: string; title: string; message: string; actionUrl?: string | null; priority?: string | null }) {
    try {
      const prefs = await this.prefsFor(n.userId);
      if (emailDecision(n, prefs) !== 'now') return;
      const user = await this.prisma.user.findUnique({ where: { id: n.userId }, select: { email: true, name: true } });
      if (!isDeliverable(user?.email)) return;
      const [won] = await this.claim([n.id]);
      if (!won) return;
      const link = absoluteLink(this.frontendUrl, n.actionUrl);
      const result = await this.email.sendEmail({
        to: user!.email,
        subject: n.title,
        html: this.email.brandedHtml({
          heading: n.title,
          bodyHtml: `<p class="greeting">Hi ${escapeHtml(firstName(user!.name))},</p><p class="message">${escapeHtml(n.message)}</p>`,
          cta: { label: 'Open in Upllyft', url: link },
          footnote: `You can change which emails you get in <a href="${absoluteLink(this.frontendUrl, '/settings')}">Settings → Notifications</a>.`,
        }),
        text: `${n.title}\n\n${n.message}\n\nOpen in Upllyft: ${link}`,
        idempotencyKey: `notification-${n.id}`,
        tags: ['notification', n.type.toLowerCase()],
      });
      if (!result.success) {
        await this.release([n.id]);
        this.logger.warn(`Notification email ${n.id} not sent: ${result.error}`);
      }
    } catch (e: any) {
      this.logger.error(`Notification email ${n.id} failed: ${e?.message ?? e}`);
    }
  }

  /** 03:30 UTC = 07:30 UAE / 09:00 India. */
  @Cron('30 3 * * *', { name: 'notification-digest' })
  async scheduledDigest() {
    await this.sendDigests();
  }

  /** One digest per user whose frequency is due. Returns counts (used by tests and the admin trigger). */
  async sendDigests(now = new Date()): Promise<{ users: number; emailed: number; notifications: number }> {
    const oldest = digestWindowStart('weekly', now);
    const userIds = (
      await this.prisma.notification.findMany({
        where: { emailedAt: null, read: false, createdAt: { gte: oldest } },
        select: { userId: true },
        distinct: ['userId'],
        take: 5000,
      })
    ).map((r) => r.userId);

    let emailed = 0;
    let notifications = 0;
    for (const userId of userIds) {
      try {
        const sent = await this.digestFor(userId, now);
        if (sent) {
          emailed++;
          notifications += sent;
        }
      } catch (e: any) {
        this.logger.error(`Digest for ${userId} failed: ${e?.message ?? e}`);
      }
    }
    if (userIds.length) this.logger.log(`Digest: ${emailed}/${userIds.length} users emailed (${notifications} notifications)`);
    return { users: userIds.length, emailed, notifications };
  }

  private async digestFor(userId: string, now: Date): Promise<number> {
    const prefs = await this.prefsFor(userId);
    if (!digestDue(prefs.frequency as EmailFrequency, now)) return 0;
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (!isDeliverable(user?.email)) return 0;

    const pending = await this.prisma.notification.findMany({
      where: { userId, emailedAt: null, read: false, createdAt: { gte: digestWindowStart(prefs.frequency, now) } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const wanted = pending.filter((n) => emailDecision(n, prefs) !== 'skip');
    const claimed = new Set(await this.claim(wanted.map((n) => n.id)));
    const items = wanted.filter((n) => claimed.has(n.id));
    if (!items.length) return 0;

    const shown = items.slice(0, MAX_DIGEST_ITEMS);
    const more = items.length - shown.length;
    const period = prefs.frequency === 'weekly' ? 'this week' : 'today';
    const list = shown
      .map(
        (n) =>
          `<li style="margin:0 0 12px"><a href="${absoluteLink(this.frontendUrl, n.actionUrl)}" style="color:#0f766e;font-weight:600;text-decoration:none">${escapeHtml(n.title)}</a><br><span style="color:#4b5563">${escapeHtml(n.message)}</span></li>`,
      )
      .join('');
    const subject = `${items.length} update${items.length === 1 ? '' : 's'} on Upllyft ${period}`;
    const result = await this.email.sendEmail({
      to: user!.email,
      subject,
      html: this.email.brandedHtml({
        heading: `Your Upllyft updates`,
        bodyHtml: `<p class="greeting">Hi ${escapeHtml(firstName(user!.name))},</p><p class="message">Here's what happened ${period}:</p><ul style="padding-left:18px">${list}</ul>${
          more > 0 ? `<p class="message">…and ${more} more.</p>` : ''
        }`,
        cta: { label: 'See all notifications', url: absoluteLink(this.frontendUrl, '/notifications') },
        footnote: `You get this ${prefs.frequency === 'weekly' ? 'weekly' : 'daily'} summary because of your settings. Change it in <a href="${absoluteLink(this.frontendUrl, '/settings')}">Settings → Notifications</a>.`,
      }),
      text: `${subject}\n\n${shown.map((n) => `- ${n.title}: ${n.message}`).join('\n')}\n\nSee all: ${absoluteLink(this.frontendUrl, '/notifications')}`,
      idempotencyKey: `digest-${userId}-${now.toISOString().slice(0, 10)}`,
      tags: ['notification', 'digest'],
    });
    if (!result.success) {
      await this.release(items.map((n) => n.id));
      this.logger.warn(`Digest for ${userId} not sent: ${result.error}`);
      return 0;
    }
    return items.length;
  }

  /** Admin: send a test email to an address, to check delivery end to end. */
  async sendTest(to: string, requestedBy: string) {
    const result = await this.email.sendEmail({
      to,
      subject: 'Upllyft test email',
      html: this.email.brandedHtml({
        heading: 'Email is working',
        bodyHtml: `<p class="message">This is a test email from Upllyft, requested by ${escapeHtml(requestedBy)}. If you can read it, notification emails are being delivered.</p>`,
        cta: { label: 'Open Upllyft', url: this.frontendUrl },
      }),
      text: `This is a test email from Upllyft, requested by ${requestedBy}.`,
      idempotencyKey: `test-${to}-${Date.now()}`,
      tags: ['test'],
    });
    return { success: result.success, error: result.error ?? null };
  }
}

function firstName(name: string | null | undefined) {
  return (name ?? '').trim().split(/\s+/)[0] || 'there';
}
