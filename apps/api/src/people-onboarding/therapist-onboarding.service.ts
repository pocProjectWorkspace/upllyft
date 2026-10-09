import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService, escapeHtml } from '../email/email.service';
import { EmailOutboxService, QueuedEmail } from '../email/email-outbox.service';
import { isDeliverable } from '../notification/notification-email.service';
import {
  MAX_IMPORT_ROWS,
  RowResult,
  TherapistInput,
  parseSheet,
  validateRows,
  validateTherapist,
} from './import-rows';
import type { Actor, OnboardingScope } from './onboarding-scope';

/** A "set your password" link stays valid this long. */
const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export type TherapistOutcome = 'created' | 'linked' | 'exists' | 'would-create' | 'would-link' | 'error';

export interface TherapistRowReport {
  row: number;
  email: string | null;
  name: string | null;
  outcome: TherapistOutcome;
  message: string;
}

/**
 * Adds therapists for the platform or an organisation, one at a time (form) or in bulk
 * (CSV / Excel). New people get a THERAPIST account and a therapist profile (credential
 * PENDING).
 *
 *   - Platform uploads (no organisation) are a directory: the profile is `directoryOnly`,
 *     never bookable, and no email goes out. Parents contact the therapist directly.
 *   - In an organisation they get a "set your password" email and become an ACTIVE
 *     member with an APPROVED link; they are bookable once verified and set up.
 */
@Injectable()
export class TherapistOnboardingService {
  private readonly logger = new Logger(TherapistOnboardingService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly outbox: EmailOutboxService,
    config: ConfigService,
  ) {
    this.frontendUrl = (config.get<string>('FRONTEND_URL') || 'http://localhost:3000').replace(/\/+$/, '');
  }

  async createOne(actor: Actor, body: Record<string, unknown>, scope: OnboardingScope) {
    const { data, errors } = validateTherapist(body);
    if (!data) throw new BadRequestException(errors.join(' '));
    const { reports, invites } = await this.apply(actor, [{ row: 1, ok: true, data, errors: [], label: { name: data.name, email: data.email } }], scope, false);
    const [report] = reports;
    if (report.outcome === 'error') throw new BadRequestException(report.message);
    await this.queueInvites(invites, scope, actor);
    return report;
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

    const validated = validateRows(rows, validateTherapist);
    const { reports, invites } = await this.apply(actor, validated, scope, dryRun);
    const count = (o: TherapistOutcome[]) => reports.filter((r) => o.includes(r.outcome)).length;
    // Forecast before queueing, so the new emails are not counted twice.
    const emails = await this.outbox.forecast(dryRun ? (scope.organizationId ? count(['would-create']) : 0) : invites.length);
    await this.queueInvites(invites, scope, actor);
    return {
      dryRun,
      emails,
      total: reports.length,
      created: count(['created', 'would-create']),
      linked: count(['linked', 'would-link']),
      skipped: count(['exists']),
      errors: count(['error']),
      rows: reports,
    };
  }

  private async apply(
    actor: Actor,
    rows: RowResult<TherapistInput>[],
    scope: OnboardingScope,
    dryRun: boolean,
  ): Promise<{ reports: TherapistRowReport[]; invites: Array<{ email: string; name: string; token: string }> }> {
    const emails = rows.filter((r) => r.data).map((r) => r.data!.email);
    const existing = await this.prisma.user.findMany({
      where: { OR: emails.map((e) => ({ email: { equals: e, mode: 'insensitive' as const } })) },
      select: {
        id: true,
        email: true,
        role: true,
        therapistProfile: { select: { id: true, organizationLinks: { select: { organizationId: true } } } },
      },
    });
    const byEmail = new Map(existing.map((u) => [u.email.toLowerCase(), u]));

    const reports: TherapistRowReport[] = [];
    const invites: Array<{ email: string; name: string; token: string }> = [];

    for (const r of rows) {
      if (!r.data) {
        reports.push({ row: r.row, email: r.label.email, name: r.label.name, outcome: 'error', message: r.errors.join(' ') });
        continue;
      }
      const t = r.data;
      const base = { row: r.row, email: t.email, name: t.name };
      const directory = !scope.organizationId;
      const user = byEmail.get(t.email);
      try {
        if (user) {
          if (user.role !== 'THERAPIST') {
            reports.push({ ...base, outcome: 'error', message: 'An account with this email exists and is not a therapist account.' });
            continue;
          }
          const inOrg = !!scope.organizationId && user.therapistProfile?.organizationLinks.some((l) => l.organizationId === scope.organizationId);
          if (!scope.organizationId || inOrg) {
            reports.push({ ...base, outcome: 'exists', message: inOrg ? 'Already in this organization.' : 'Already on Upllyft — nothing to do.' });
            continue;
          }
          if (dryRun) {
            reports.push({ ...base, outcome: 'would-link', message: `Existing therapist — will be added to ${scope.organizationName}.` });
            continue;
          }
          await this.linkToOrganization(actor, user.id, t, scope);
          reports.push({ ...base, outcome: 'linked', message: `Existing therapist added to ${scope.organizationName}.` });
          continue;
        }

        if (dryRun) {
          reports.push({
            ...base,
            outcome: 'would-create',
            message: directory
              ? 'New therapist — will be listed in the directory (no email sent).'
              : 'New therapist — will be created and emailed a sign-in link.',
          });
          continue;
        }
        const token = directory ? null : randomBytes(32).toString('hex');
        await this.prisma.user.create({
          data: {
            email: t.email,
            name: t.name,
            role: 'THERAPIST',
            phone: t.phone,
            country: t.country,
            specialization: t.specializations,
            isEmailVerified: false,
            ...(token ? { resetPasswordToken: token, resetPasswordExpiry: new Date(Date.now() + INVITE_TTL_MS) } : {}),
            therapistProfile: {
              create: {
                ...this.profileData(t),
                credentialStatus: 'PENDING',
                isActive: true,
                acceptingBookings: !directory,
                directoryOnly: directory,
                ...(scope.organizationId
                  ? {
                      organizationLinks: {
                        create: { organizationId: scope.organizationId, status: 'APPROVED', approvedAt: new Date(), approvedBy: actor.id },
                      },
                    }
                  : {}),
              },
            },
            ...(scope.organizationId
              ? {
                  organizationMemberships: {
                    create: { organizationId: scope.organizationId, role: 'MEMBER', status: 'ACTIVE', memberType: 'Therapist', joinedAt: new Date() },
                  },
                }
              : {}),
          },
        });
        if (token) {
          invites.push({ email: t.email, name: t.name, token });
          reports.push({ ...base, outcome: 'created', message: 'Created — a sign-in link is on its way.' });
        } else {
          reports.push({ ...base, outcome: 'created', message: 'Listed in the directory.' });
        }
      } catch (e: any) {
        this.logger.error(`Therapist row ${r.row} (${t.email}) failed: ${e?.message ?? e}`);
        reports.push({ ...base, outcome: 'error', message: e?.code === 'P2002' ? 'This email was just added by someone else.' : 'Could not create this therapist.' });
      }
    }

    return { reports, invites };
  }

  private profileData(t: TherapistInput) {
    return {
      title: t.title,
      department: t.department,
      specializations: t.specializations,
      languages: t.languages,
      yearsExperience: t.yearsExperience,
      country: t.country,
      city: t.city,
      licenceNumber: t.licenceNumber,
      bio: t.bio,
      phone: t.phone,
    };
  }

  private async linkToOrganization(actor: Actor, userId: string, t: TherapistInput, scope: OnboardingScope) {
    const orgId = scope.organizationId!;
    const profile =
      (await this.prisma.therapistProfile.findUnique({ where: { userId }, select: { id: true } })) ??
      (await this.prisma.therapistProfile.create({ data: { userId, ...this.profileData(t) }, select: { id: true } }));
    await this.prisma.$transaction([
      this.prisma.therapistOrganizationLink.upsert({
        where: { therapistId_organizationId: { therapistId: profile.id, organizationId: orgId } },
        create: { therapistId: profile.id, organizationId: orgId, status: 'APPROVED', approvedAt: new Date(), approvedBy: actor.id },
        update: { status: 'APPROVED', approvedAt: new Date(), approvedBy: actor.id },
      }),
      this.prisma.organizationMember.upsert({
        where: { userId_organizationId: { userId, organizationId: orgId } },
        create: { userId, organizationId: orgId, role: 'MEMBER', status: 'ACTIVE', memberType: 'Therapist', joinedAt: new Date() },
        update: { status: 'ACTIVE' },
      }),
    ]);
  }

  /**
   * "Set your password" emails go through the outbox: a 500-row file neither waits on
   * 500 SMTP calls nor runs past the provider's daily allowance.
   */
  private async queueInvites(invites: Array<{ email: string; name: string; token: string }>, scope: OnboardingScope, actor: Actor) {
    if (!invites.length) return;
    const who = scope.organizationName ?? 'Upllyft';
    const emails: QueuedEmail[] = [];
    for (const inv of invites) {
      if (!isDeliverable(inv.email)) continue;
      const link = `${this.frontendUrl}/reset-password?token=${inv.token}`;
      emails.push({
        to: { email: inv.email, name: inv.name },
        subject: `${who} added you on Upllyft`,
        html: this.email.brandedHtml({
          heading: 'Welcome to Upllyft',
          bodyHtml: `<p class="greeting">Hi ${escapeHtml(inv.name.split(' ')[0])},</p><p class="message"><strong>${escapeHtml(who)}</strong> has added you to Upllyft as a therapist. Set your password to sign in, complete your profile and set your availability.</p>`,
          cta: { label: 'Set your password', url: link },
          footnote: 'This link is valid for 14 days. If it expires, use “Forgot password” on the sign-in page.',
        }),
        text: `${who} has added you to Upllyft as a therapist.\n\nSet your password: ${link}\n\nThis link is valid for 14 days.`,
        idempotencyKey: `therapist-invite-${inv.token.slice(0, 16)}`,
        tags: ['therapist-invite', 'onboarding'],
      });
    }
    const queued = await this.outbox.enqueue(emails);
    this.logger.log(`Therapist invites queued by ${actor.id}: ${queued}`);
  }
}
