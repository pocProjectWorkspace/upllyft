/**
 * Email Outbox
 * Bulk emails (therapist imports) wait in `email_outbox` and go out as the provider's
 * daily allowance (EMAIL_DAILY_LIMIT) permits, so a 500-row import on a 300/day plan
 * finishes tomorrow instead of failing halfway. Rows are claimed with
 * FOR UPDATE SKIP LOCKED, so several API replicas never send the same email.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { EmailOptions } from './interfaces';
import {
  BudgetConfig,
  OUTBOX_MAX_ATTEMPTS,
  OUTBOX_STALE_MS,
  budgetConfig,
  daysToSend,
  queueAllowance,
  remainingForQueue,
  retryDelayMs,
  startOfUtcDay,
} from './email-budget';

export interface QueuedEmail {
  to: string | { email: string; name?: string };
  subject: string;
  html?: string;
  text?: string;
  tags?: string[];
  /** Required: a repeat enqueue with the same key is ignored. */
  idempotencyKey: string;
}

interface OutboxRow {
  id: string;
  toEmail: string;
  toName: string | null;
  subject: string;
  html: string | null;
  text: string | null;
  tags: string[];
  idempotencyKey: string | null;
  attempts: number;
}

@Injectable()
export class EmailOutboxService {
  private readonly logger = new Logger(EmailOutboxService.name);
  private readonly budget: BudgetConfig;
  private draining = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    config: ConfigService,
  ) {
    this.budget = budgetConfig(config.get('EMAIL_DAILY_LIMIT'), config.get('EMAIL_DAILY_RESERVE'));
  }

  /** Queue emails and start sending what today's allowance permits. Returns how many were new. */
  async enqueue(emails: QueuedEmail[]): Promise<number> {
    if (!emails.length) return 0;
    const { count } = await this.prisma.emailOutbox.createMany({
      data: emails.map((e) => {
        const to = typeof e.to === 'string' ? { email: e.to } : e.to;
        return {
          toEmail: to.email,
          toName: to.name ?? null,
          subject: e.subject,
          html: e.html ?? null,
          text: e.text ?? null,
          tags: e.tags ?? [],
          idempotencyKey: e.idempotencyKey,
        };
      }),
      skipDuplicates: true,
    });
    void this.drain().catch((err) => this.logger.error(`Outbox drain failed: ${err?.message ?? err}`));
    return count;
  }

  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'email-outbox' })
  async scheduledDrain() {
    await this.drain();
  }

  /** Send queued emails until the queue is empty or today's allowance is used. */
  async drain(): Promise<{ sent: number; failed: number }> {
    if (this.draining) return { sent: 0, failed: 0 };
    this.draining = true;
    let sent = 0;
    let failed = 0;
    try {
      await this.prisma.emailOutbox.updateMany({
        where: { status: 'SENDING', claimedAt: { lt: new Date(Date.now() - OUTBOX_STALE_MS) } },
        data: { status: 'QUEUED' },
      });
      for (;;) {
        const allowance = queueAllowance(this.budget, await this.sentToday());
        if (allowance <= 0) break;
        const rows = await this.claim(allowance);
        if (!rows.length) break;
        for (const row of rows) {
          if (await this.deliver(row)) sent++;
          else failed++;
        }
      }
    } finally {
      this.draining = false;
    }
    if (sent || failed) this.logger.log(`Outbox: ${sent} sent, ${failed} not sent`);
    return { sent, failed };
  }

  /** Sends counted against today's allowance (UTC day), across all replicas. */
  async sentToday(): Promise<number> {
    if (this.budget.limit === null) return 0;
    return this.prisma.emailOutbox.count({ where: { status: 'SENT', sentAt: { gte: startOfUtcDay() } } });
  }

  /** Admin view of the outbox and today's allowance. */
  async stats() {
    const [sentToday, queued, failed] = await Promise.all([
      this.sentToday(),
      this.prisma.emailOutbox.count({ where: { status: { in: ['QUEUED', 'SENDING'] } } }),
      this.prisma.emailOutbox.count({ where: { status: 'FAILED' } }),
    ]);
    return {
      dailyLimit: this.budget.limit,
      dailyReserve: this.budget.reserve,
      sentToday,
      remainingForQueueToday: remainingForQueue(this.budget, sentToday),
      queued,
      failed,
    };
  }

  /** What sending `count` more queued emails looks like today (for import previews). */
  async forecast(count: number) {
    const [sentToday, queued] = await Promise.all([
      this.sentToday(),
      this.prisma.emailOutbox.count({ where: { status: { in: ['QUEUED', 'SENDING'] } } }),
    ]);
    return {
      emails: count,
      dailyLimit: this.budget.limit,
      alreadyQueued: queued,
      days: daysToSend(this.budget, sentToday, queued, count),
    };
  }

  private claim(limit: number): Promise<OutboxRow[]> {
    return this.prisma.$queryRaw<OutboxRow[]>`
      UPDATE "email_outbox" SET "status" = 'SENDING', "claimedAt" = now(), "attempts" = "attempts" + 1
      WHERE "id" IN (
        SELECT "id" FROM "email_outbox"
        WHERE "status" = 'QUEUED' AND "sendAfter" <= now()
        ORDER BY "createdAt"
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING "id", "toEmail", "toName", "subject", "html", "text", "tags", "idempotencyKey", "attempts"`;
  }

  private async deliver(row: OutboxRow): Promise<boolean> {
    const options: EmailOptions = {
      to: row.toName ? { email: row.toEmail, name: row.toName } : row.toEmail,
      subject: row.subject,
      html: row.html ?? undefined,
      text: row.text ?? undefined,
      tags: row.tags,
      idempotencyKey: row.idempotencyKey ?? undefined,
    };
    let error: string | undefined;
    try {
      const result = await this.email.sendEmail(options, { outboxId: row.id });
      if (result.success) {
        await this.prisma.emailOutbox.update({
          where: { id: row.id },
          data: { status: 'SENT', sentAt: new Date(), lastError: null },
        });
        return true;
      }
      error = result.error;
    } catch (e: any) {
      error = e?.message ?? String(e);
    }
    const giveUp = row.attempts >= OUTBOX_MAX_ATTEMPTS;
    await this.prisma.emailOutbox.update({
      where: { id: row.id },
      data: {
        status: giveUp ? 'FAILED' : 'QUEUED',
        lastError: (error ?? 'Unknown error').slice(0, 500),
        sendAfter: new Date(Date.now() + retryDelayMs(row.attempts)),
      },
    });
    this.logger.warn(`Outbox email ${row.id} to ${row.toEmail} not sent (attempt ${row.attempts}${giveUp ? ', giving up' : ''}): ${error}`);
    return false;
  }
}
