import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService, escapeHtml } from '../email/email.service';
import { isDeliverable } from '../notification/notification-email.service';
import { MAX_IMPORT_ROWS, ParentInviteInput, RowResult, parseSheet, validateParentInvite, validateRows } from './import-rows';
import type { Actor, OnboardingScope } from './onboarding-scope';

const INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type InviteOutcome = 'invited' | 'would-invite' | 'already-invited' | 'registered' | 'error';

/**
 * Invitations for families to register on Upllyft — from a platform admin, or from an
 * organisation's admin (recorded on the invite and named in the email). An invitation is
 * accepted when that email registers (see acceptPlatformInvitations).
 */
@Injectable()
export class ParentInvitationService {
  private readonly logger = new Logger(ParentInvitationService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    config: ConfigService,
  ) {
    this.frontendUrl = (config.get<string>('FRONTEND_URL') || 'http://localhost:3000').replace(/\/+$/, '');
  }

  async inviteList(actor: Actor, body: { invites?: unknown }, scope: OnboardingScope) {
    const raw = Array.isArray(body?.invites) ? body.invites : [];
    if (!raw.length) throw new BadRequestException('Add at least one email.');
    if (raw.length > MAX_IMPORT_ROWS) throw new BadRequestException(`At most ${MAX_IMPORT_ROWS} invitations at once.`);
    return this.run(actor, validateRows(raw as Array<Record<string, unknown>>, validateParentInvite), scope, false);
  }

  async importFile(actor: Actor, file: { buffer: Buffer } | undefined, scope: OnboardingScope, dryRun: boolean) {
    if (!file?.buffer?.length) throw new BadRequestException('Choose a CSV or Excel file.');
    let rows: Array<Record<string, string>>;
    try {
      rows = parseSheet(file.buffer);
    } catch {
      throw new BadRequestException('Could not read that file. Use the CSV template or an Excel (.xlsx) file.');
    }
    if (!rows.length) throw new BadRequestException('The file has no rows under the header.');
    if (rows.length > MAX_IMPORT_ROWS) throw new BadRequestException(`At most ${MAX_IMPORT_ROWS} rows per file.`);
    return this.run(actor, validateRows(rows, validateParentInvite), scope, dryRun);
  }

  private async run(actor: Actor, rows: RowResult<ParentInviteInput>[], scope: OnboardingScope, dryRun: boolean) {
    const emails = rows.filter((r) => r.data).map((r) => r.data!.email);
    const insensitive = emails.map((e) => ({ email: { equals: e, mode: 'insensitive' as const } }));
    const [users, pending] = await Promise.all([
      emails.length ? this.prisma.user.findMany({ where: { OR: insensitive }, select: { email: true } }) : [],
      emails.length
        ? this.prisma.platformInvitation.findMany({
            where: { OR: insensitive, status: 'PENDING', expiresAt: { gt: new Date() }, organizationId: scope.organizationId },
            select: { email: true },
          })
        : [],
    ]);
    const registered = new Set(users.map((u) => u.email.toLowerCase()));
    const invited = new Set(pending.map((p) => p.email.toLowerCase()));

    const reports: Array<{ row: number; email: string | null; name: string | null; outcome: InviteOutcome; message: string }> = [];
    const toSend: Array<{ email: string; name: string | null; token: string }> = [];

    for (const r of rows) {
      if (!r.data) {
        reports.push({ row: r.row, email: null, name: null, outcome: 'error', message: r.errors.join(' ') });
        continue;
      }
      const { email, name } = r.data;
      const base = { row: r.row, email, name };
      if (registered.has(email)) {
        reports.push({ ...base, outcome: 'registered', message: 'Already has an Upllyft account.' });
        continue;
      }
      if (invited.has(email)) {
        reports.push({ ...base, outcome: 'already-invited', message: 'Already invited — use Resend from the list.' });
        continue;
      }
      if (dryRun) {
        reports.push({ ...base, outcome: 'would-invite', message: 'Will be invited.' });
        continue;
      }
      const token = randomBytes(24).toString('hex');
      await this.prisma.platformInvitation.create({
        data: {
          email,
          name,
          organizationId: scope.organizationId,
          token,
          invitedById: actor.id,
          expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        },
      });
      toSend.push({ email, name, token });
      reports.push({ ...base, outcome: 'invited', message: 'Invitation sent.' });
    }

    if (toSend.length) void this.sendAll(toSend, scope, actor);
    const count = (o: InviteOutcome[]) => reports.filter((r) => o.includes(r.outcome)).length;
    return {
      dryRun,
      total: reports.length,
      invited: count(['invited', 'would-invite']),
      skipped: count(['already-invited', 'registered']),
      errors: count(['error']),
      rows: reports,
    };
  }

  async list(scope: OnboardingScope, query: { status?: string; q?: string; page?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const where: Prisma.PlatformInvitationWhereInput = {
      ...(scope.organizationId ? { organizationId: scope.organizationId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? { email: { contains: query.q.trim(), mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.platformInvitation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * 50,
        take: 50,
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          expiresAt: true,
          acceptedAt: true,
          sentCount: true,
          lastSentAt: true,
          createdAt: true,
          organization: { select: { id: true, name: true } },
          invitedBy: { select: { name: true } },
        },
      }),
      this.prisma.platformInvitation.count({ where }),
    ]);
    const now = new Date();
    return {
      invitations: rows.map((r) => ({ ...r, status: r.status === 'PENDING' && r.expiresAt < now ? 'EXPIRED' : r.status })),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / 50)),
    };
  }

  private async inScope(id: string, scope: OnboardingScope) {
    const inv = await this.prisma.platformInvitation.findUnique({ where: { id } });
    if (!inv || (scope.organizationId && inv.organizationId !== scope.organizationId)) throw new NotFoundException('Invitation not found.');
    return inv;
  }

  async resend(actor: Actor, id: string, scope: OnboardingScope) {
    const inv = await this.inScope(id, scope);
    if (inv.status !== 'PENDING') throw new BadRequestException(`This invitation is ${inv.status.toLowerCase()}.`);
    if (inv.lastSentAt > new Date(Date.now() - 10 * 60 * 1000)) {
      throw new BadRequestException('Sent less than 10 minutes ago — give it a little time.');
    }
    const updated = await this.prisma.platformInvitation.update({
      where: { id },
      data: { expiresAt: new Date(Date.now() + INVITE_TTL_MS), sentCount: { increment: 1 }, lastSentAt: new Date() },
    });
    await this.sendAll([{ email: updated.email, name: updated.name, token: updated.token }], scope, actor, updated.sentCount);
    return { success: true };
  }

  async cancel(id: string, scope: OnboardingScope) {
    const inv = await this.inScope(id, scope);
    if (inv.status !== 'PENDING') return { success: true };
    await this.prisma.platformInvitation.update({ where: { id }, data: { status: 'CANCELLED' } });
    return { success: true };
  }

  /** Public: what the registration page shows for an invite link. */
  async verify(token: string) {
    const inv = await this.prisma.platformInvitation.findUnique({
      where: { token },
      select: { email: true, name: true, status: true, expiresAt: true, organization: { select: { name: true } }, invitedBy: { select: { name: true } } },
    });
    if (!inv) throw new NotFoundException('This invitation link is not valid.');
    return {
      email: inv.email,
      name: inv.name,
      organizationName: inv.organization?.name ?? null,
      invitedByName: inv.invitedBy?.name ?? null,
      status: inv.status === 'PENDING' && inv.expiresAt < new Date() ? 'EXPIRED' : inv.status,
    };
  }

  private async sendAll(list: Array<{ email: string; name: string | null; token: string }>, scope: OnboardingScope, actor: Actor, attempt = 1) {
    const who = scope.organizationName ?? 'The Upllyft team';
    for (const inv of list) {
      if (!isDeliverable(inv.email)) continue;
      const link = `${this.frontendUrl}/register?invite=${inv.token}&email=${encodeURIComponent(inv.email)}`;
      try {
        await this.email.sendEmail({
          to: inv.email,
          subject: scope.organizationName ? `${scope.organizationName} invites you to Upllyft` : 'You’re invited to Upllyft',
          html: this.email.brandedHtml({
            heading: 'You’re invited to Upllyft',
            bodyHtml: `<p class="greeting">Hi ${escapeHtml((inv.name ?? '').split(' ')[0] || 'there')},</p><p class="message"><strong>${escapeHtml(who)}</strong> has invited you to join Upllyft — a free space for families of neurodivergent children: developmental check-ins, activities to try at home, a supportive parent community and Mira, your guide.</p>`,
            cta: { label: 'Create your account', url: link },
            footnote: 'This invitation is valid for 30 days.',
          }),
          text: `${who} has invited you to join Upllyft.\n\nCreate your account: ${link}\n\nThis invitation is valid for 30 days.`,
          idempotencyKey: `parent-invite-${inv.token.slice(0, 16)}-${attempt}`,
          tags: ['parent-invite', 'onboarding'],
        });
      } catch (e: any) {
        this.logger.error(`Parent invite to ${inv.email} failed: ${e?.message ?? e}`);
      }
    }
    this.logger.log(`Parent invites sent by ${actor.id}: ${list.length}`);
  }
}

/**
 * Marks every pending invitation for this email as accepted. Called on registration
 * (password or Google). Plain function so the auth module needs no new dependency.
 */
export async function acceptPlatformInvitations(prisma: PrismaClient | PrismaService, user: { id: string; email: string }) {
  try {
    await prisma.platformInvitation.updateMany({
      where: { email: { equals: user.email, mode: 'insensitive' }, status: 'PENDING' },
      data: { status: 'ACCEPTED', acceptedAt: new Date(), acceptedUserId: user.id },
    });
  } catch {
    /* never block registration on invitation bookkeeping */
  }
}
