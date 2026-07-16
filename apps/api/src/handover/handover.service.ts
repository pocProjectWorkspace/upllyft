import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FacilityRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService, NotificationType } from '../notification/notification.service';
import { assertChildAccess } from '../common/consent';
import { assertFacilityMember } from '../common/facility-scope';
import { GenerateHandoverDto, UpdateHandoverDto } from './dto/handover.dto';

interface Actor {
  id: string;
  role: string;
}

/**
 * The onward handover record (F11) — the child's identification + support story, assembled
 * for whoever comes next (a school, or a clinician), so the early-identification work is not
 * lost at the hand-off.
 *
 * The nursery already holds all of it; this packages a SNAPSHOT (counts + summaries, not raw
 * PHI dumps) and a plain-language narrative. Assembling it is a staff action — but it only
 * LEAVES the setting after the guardian has authorised that specific onward disclosure. That
 * consent-to-disclose is the whole point: the family decides where their child's story goes.
 */
@Injectable()
export class HandoverService {
  private readonly logger = new Logger(HandoverService.name);
  private static readonly HANDOVER_ROLES: FacilityRole[] = ['OWNER', 'ADMIN', 'INCLUSION_LEAD'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  /** Assemble a handover record (DRAFT) from everything the nursery holds about the child. */
  async generate(actor: Actor, facilityId: string, childId: string, dto: GenerateHandoverDto) {
    await this.assertMayHandover(actor, facilityId, childId);

    const affiliation = await this.prisma.childAffiliation.findFirstOrThrow({
      where: { childId, facilityId, status: 'ACTIVE', endedAt: null },
      select: { id: true },
    });
    const child = await this.prisma.child.findUniqueOrThrow({
      where: { id: childId },
      select: { firstName: true },
    });
    const facility = await this.prisma.facility.findUniqueOrThrow({
      where: { id: facilityId },
      select: { name: true },
    });

    const snapshot = await this.assemble(childId, facilityId);
    const summary = buildNarrative(child.firstName, facility.name, snapshot);

    const record = await this.prisma.handoverRecord.create({
      data: {
        childId,
        affiliationId: affiliation.id,
        facilityId,
        createdById: actor.id,
        recipientType: dto.recipientType,
        recipientName: dto.recipientName?.trim() ?? null,
        status: 'DRAFT',
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        summary,
      },
      select: this.staffShape(),
    });

    this.logger.log(`Handover ${record.id} assembled for child ${childId} at ${facilityId} (${dto.recipientType})`);
    return this.shapeForStaff(record);
  }

  async listForFacility(actor: Actor, facilityId: string, childId: string) {
    await this.assertMayHandover(actor, facilityId, childId);
    const rows = await this.prisma.handoverRecord.findMany({
      where: { facilityId, childId },
      orderBy: { createdAt: 'desc' },
      select: this.staffShape(),
    });
    return rows.map((r) => this.shapeForStaff(r));
  }

  async update(actor: Actor, facilityId: string, handoverId: string, dto: UpdateHandoverDto) {
    const record = await this.getStaffRecord(actor, facilityId, handoverId);
    if (record.status !== 'DRAFT') {
      throw new BadRequestException('This handover has already been shared and can no longer be edited.');
    }
    const updated = await this.prisma.handoverRecord.update({
      where: { id: handoverId },
      data: {
        ...(dto.summary !== undefined ? { summary: dto.summary.trim() } : {}),
        ...(dto.recipientType !== undefined ? { recipientType: dto.recipientType } : {}),
        ...(dto.recipientName !== undefined ? { recipientName: dto.recipientName.trim() } : {}),
      },
      select: this.staffShape(),
    });
    return this.shapeForStaff(updated);
  }

  /** Disclose it onward. ONLY once the guardian has authorised this specific disclosure. */
  async share(actor: Actor, facilityId: string, handoverId: string) {
    const record = await this.getStaffRecord(actor, facilityId, handoverId);
    if (record.status === 'SHARED') {
      throw new BadRequestException('This handover has already been shared.');
    }
    if (!record.guardianConsentedAt) {
      throw new BadRequestException(
        'The guardian has not yet authorised this handover. It can only be shared once they have.',
      );
    }
    const updated = await this.prisma.handoverRecord.update({
      where: { id: handoverId },
      data: { status: 'SHARED', sharedAt: new Date() },
      select: this.staffShape(),
    });
    return this.shapeForStaff(updated);
  }

  // ── Guardian path ──────────────────────────────────────────────────────────

  /** Handovers about the guardian's child — the ones awaiting their authorisation, and sent. */
  async listForGuardian(actor: Actor, childId: string) {
    await this.assertGuardian(childId, actor.id);
    const rows = await this.prisma.handoverRecord.findMany({
      where: { childId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        recipientType: true,
        recipientName: true,
        summary: true,
        guardianConsentedAt: true,
        sharedAt: true,
        createdAt: true,
        facility: { select: { name: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      recipientType: r.recipientType,
      recipientName: r.recipientName,
      summary: r.summary,
      authorised: !!r.guardianConsentedAt,
      guardianConsentedAt: r.guardianConsentedAt,
      sharedAt: r.sharedAt,
      createdAt: r.createdAt,
      facilityName: r.facility.name,
    }));
  }

  /** The guardian authorises the onward disclosure. This is the consent that lets it leave. */
  async authorize(actor: Actor, childId: string, handoverId: string) {
    await this.assertGuardian(childId, actor.id);
    const record = await this.prisma.handoverRecord.findFirst({
      where: { id: handoverId, childId },
      select: { id: true, status: true, guardianConsentedAt: true },
    });
    if (!record) throw new NotFoundException('Handover not found.');
    if (record.status === 'SHARED') {
      throw new BadRequestException('This handover has already been shared.');
    }
    if (!record.guardianConsentedAt) {
      await this.prisma.handoverRecord.update({
        where: { id: handoverId },
        data: { guardianConsentedAt: new Date() },
      });
    }
    return { authorised: true };
  }

  // ── Assembler ──────────────────────────────────────────────────────────────

  private async assemble(childId: string, facilityId: string) {
    const [obs, concernObs, educator, parent, reviews, concerns, plans] = await Promise.all([
      this.prisma.observation.count({ where: { childId, facilityId } }),
      this.prisma.observation.count({ where: { childId, facilityId, type: 'CONCERN' } }),
      this.prisma.assessment.findFirst({
        where: { childId, informantType: 'EDUCATOR', tier1Completed: true },
        orderBy: { createdAt: 'desc' },
        select: { flaggedDomains: true, tier1CompletedAt: true },
      }),
      this.prisma.assessment.findFirst({
        where: { childId, informantType: 'PARENT', tier1Completed: true },
        orderBy: { createdAt: 'desc' },
        select: { flaggedDomains: true },
      }),
      this.prisma.developmentalReview.findMany({
        where: { childId, facilityId, status: { in: ['SHARED', 'ACKNOWLEDGED'] } },
        orderBy: { sharedAt: 'desc' },
        select: { ageMonths: true, flaggedDomains: true, summary: true, recommendation: true },
      }),
      this.prisma.concern.findMany({
        where: { childId, facilityId },
        select: { status: true, domains: true },
      }),
      this.prisma.supportPlan.findMany({
        where: { childId, facilityId },
        select: {
          title: true,
          status: true,
          domains: true,
          outcomes: {
            select: {
              outcomeText: true,
              status: true,
              currentProgress: true,
              interventions: { select: { title: true, kind: true } },
            },
          },
        },
      }),
    ]);

    const flagged = educator?.flaggedDomains ?? [];
    const bothAgree = (parent?.flaggedDomains ?? []).filter((d) => flagged.includes(d));

    const outcomes = plans.flatMap((p) => p.outcomes);
    const achieved = outcomes.filter((o) => o.status === 'ACHIEVED').length;
    const whatHelped = outcomes
      .flatMap((o) => o.interventions.map((i) => i.title))
      .filter((t, i, arr) => arr.indexOf(t) === i)
      .slice(0, 12);

    return {
      observations: { total: obs, concerns: concernObs },
      screening: {
        educatorFlagged: flagged,
        bothSettingsAgree: bothAgree,
        educatorCompletedAt: educator?.tier1CompletedAt ?? null,
      },
      reviews: reviews.map((r) => ({
        ageMonths: r.ageMonths,
        flaggedDomains: r.flaggedDomains,
        summary: r.summary,
        recommendation: r.recommendation,
      })),
      concerns: {
        total: concerns.length,
        shared: concerns.filter((c) => c.status !== 'DRAFT').length,
        domains: [...new Set(concerns.flatMap((c) => c.domains))],
      },
      support: {
        plans: plans.length,
        outcomesTotal: outcomes.length,
        outcomesAchieved: achieved,
        whatHelped,
      },
    };
  }

  private async assertMayHandover(actor: Actor, facilityId: string, childId: string) {
    await assertFacilityMember(this.prisma, actor, facilityId, HandoverService.HANDOVER_ROLES);
    await assertChildAccess(this.prisma, {
      childId,
      facilityId,
      capability: 'canRaiseConcern',
      requiredScope: 'OBSERVATIONS_ONLY',
      consentType: 'DATA_PROCESSING',
    });
  }

  private async getStaffRecord(actor: Actor, facilityId: string, handoverId: string) {
    const record = await this.prisma.handoverRecord.findFirst({
      where: { id: handoverId, facilityId },
      select: { ...this.staffShape(), childId: true },
    });
    if (!record) throw new NotFoundException('Handover not found.');
    await this.assertMayHandover(actor, facilityId, (record as any).childId);
    return record as any;
  }

  private async assertGuardian(childId: string, userId: string) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { profile: { select: { userId: true } } },
    });
    if (!child) throw new NotFoundException('Child not found.');
    if (child.profile?.userId === userId) return;
    const guardian = await this.prisma.guardian.findFirst({
      where: { childId, userId, hasAuthorityToConsent: true },
      select: { id: true },
    });
    if (guardian) return;
    throw new ForbiddenException('You do not have access to this child.');
  }

  private staffShape() {
    return {
      id: true,
      status: true,
      recipientType: true,
      recipientName: true,
      snapshot: true,
      summary: true,
      guardianConsentedAt: true,
      sharedAt: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true } },
    } satisfies Prisma.HandoverRecordSelect;
  }

  private shapeForStaff(r: any) {
    return {
      id: r.id,
      status: r.status,
      recipientType: r.recipientType,
      recipientName: r.recipientName,
      snapshot: r.snapshot,
      summary: r.summary,
      guardianAuthorised: !!r.guardianConsentedAt,
      guardianConsentedAt: r.guardianConsentedAt,
      sharedAt: r.sharedAt,
      createdAt: r.createdAt,
      createdBy: r.createdBy ? { id: r.createdBy.id, name: r.createdBy.name } : null,
    };
  }
}

// ── Template narrative (deterministic) ──

function buildNarrative(name: string, facilityName: string, s: any): string {
  const parts: string[] = [];
  parts.push(`This is a summary of ${name}'s time at ${facilityName}, prepared to share with the people supporting ${name} next.`);

  if (s.screening.educatorFlagged.length > 0) {
    parts.push(`Our screening highlighted ${s.screening.educatorFlagged.join(', ')}${
      s.screening.bothSettingsAgree.length ? ` (home and nursery agreed on ${s.screening.bothSettingsAgree.join(', ')})` : ''
    }.`);
  } else {
    parts.push('Our screening did not highlight any particular areas of concern.');
  }

  if (s.reviews.length > 0) {
    parts.push(`A developmental review was carried out at around ${s.reviews[0].ageMonths} months.`);
  }
  if (s.concerns.total > 0) {
    parts.push(`${s.concerns.shared} concern${s.concerns.shared === 1 ? ' was' : 's were'} discussed with the family${
      s.concerns.domains.length ? `, around ${s.concerns.domains.join(', ')}` : ''
    }.`);
  }
  if (s.support.plans > 0) {
    parts.push(
      `We put ${s.support.plans} support plan${s.support.plans === 1 ? '' : 's'} in place (${s.support.outcomesAchieved} of ${s.support.outcomesTotal} outcomes met).` +
        (s.support.whatHelped.length ? ` What helped: ${s.support.whatHelped.join('; ')}.` : ''),
    );
  }
  if (s.observations.total > 0) {
    parts.push(`This rests on ${s.observations.total} recorded observation${s.observations.total === 1 ? '' : 's'} of ${name} day to day.`);
  }
  parts.push('None of this is a diagnosis — it is what a nursery has seen and done, shared so the support can continue.');
  return parts.join(' ');
}
