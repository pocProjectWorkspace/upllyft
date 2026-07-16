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
import {
  CreateSupportPlanDto,
  UpdateSupportPlanDto,
  OutcomeInputDto,
  UpdateOutcomeDto,
  AddInterventionDto,
  AddReviewDto,
  AcknowledgeSupportPlanDto,
} from './dto/support-plans.dto';

interface Actor {
  id: string;
  role: string;
}

/**
 * In-setting support & the graduated approach (F7) + the interventions that hang off it (F8).
 *
 * This is the "Do → Review" of Assess-Plan-Do-Review — the step AFTER a concern (F6). An
 * inclusion lead opens a plan (often from the concern it grew from), sets a few targeted
 * outcomes, records the interventions being tried for each, and runs review cycles that check
 * whether they worked and decide what next (continue / adjust / escalate to referral / close).
 *
 * WHO PLANS: the same inclusion roles that raise concerns — a keyworker observes, the lead
 * acts. Gated by role AND by the shared `canRaiseConcern` capability + an ACTIVE, consented
 * affiliation. (A support plan is the continuation of a concern; the authorisation is the
 * same, so we reuse it rather than add a near-duplicate capability.)
 *
 * WHAT THE PARENT SEES: a SHARED plan's parent-facing `summary`, its outcomes, the HOME
 * strategies, and any review shared with them — never `staffNotes`, and never a DRAFT.
 */
@Injectable()
export class SupportPlansService {
  private readonly logger = new Logger(SupportPlansService.name);
  private static readonly PLAN_ROLES: FacilityRole[] = ['OWNER', 'ADMIN', 'INCLUSION_LEAD'];
  /** Statuses a guardian may see — i.e. everything from the moment it is shared. */
  private static readonly SHARED_STATUSES = ['ACTIVE', 'UNDER_REVIEW', 'CLOSED'] as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  // ── Staff path ───────────────────────────────────────────────────────────────

  /** Open a support plan (DRAFT) for an enrolled child, optionally with initial outcomes. */
  async create(actor: Actor, facilityId: string, childId: string, dto: CreateSupportPlanDto) {
    await this.assertMayPlan(actor, facilityId, childId);

    const affiliation = await this.prisma.childAffiliation.findFirstOrThrow({
      where: { childId, facilityId, status: 'ACTIVE', endedAt: null },
      select: { id: true },
    });

    // If it grew from a concern, that concern must belong to this facility + child.
    if (dto.concernId) {
      const concern = await this.prisma.concern.findFirst({
        where: { id: dto.concernId, facilityId, childId },
        select: { id: true },
      });
      if (!concern) {
        throw new BadRequestException('That concern does not belong to this child at this facility.');
      }
    }

    const plan = await this.prisma.supportPlan.create({
      data: {
        childId,
        affiliationId: affiliation.id,
        facilityId,
        concernId: dto.concernId ?? null,
        createdById: actor.id,
        title: dto.title.trim(),
        status: 'DRAFT',
        domains: dto.domains ?? [],
        summary: dto.summary?.trim() ?? null,
        staffNotes: dto.staffNotes?.trim() ?? null,
        reviewDate: parseDate(dto.reviewDate),
        outcomes: dto.outcomes?.length
          ? { create: dto.outcomes.map((o, i) => this.outcomeCreate(o, i)) }
          : undefined,
      },
      select: this.staffShape(),
    });

    this.logger.log(
      `Support plan ${plan.id} opened for child ${childId} at facility ${facilityId} by ${actor.id}` +
        (dto.concernId ? ` (from concern ${dto.concernId})` : ''),
    );
    return this.shapeForStaff(plan);
  }

  /** The support plans a nursery holds for a child (staff view — includes staff notes). */
  async listForFacility(actor: Actor, facilityId: string, childId: string) {
    await this.assertMayPlan(actor, facilityId, childId);
    const rows = await this.prisma.supportPlan.findMany({
      where: { facilityId, childId },
      orderBy: { createdAt: 'desc' },
      select: this.staffShape(),
    });
    return rows.map((r) => this.shapeForStaff(r));
  }

  /** Edit the plan's fields. Not once CLOSED. */
  async update(actor: Actor, facilityId: string, planId: string, dto: UpdateSupportPlanDto) {
    const plan = await this.getStaffPlan(actor, facilityId, planId);
    if (plan.status === 'CLOSED') {
      throw new BadRequestException('This plan is closed and can no longer be edited.');
    }
    const updated = await this.prisma.supportPlan.update({
      where: { id: planId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.domains !== undefined ? { domains: dto.domains } : {}),
        ...(dto.summary !== undefined ? { summary: dto.summary.trim() } : {}),
        ...(dto.staffNotes !== undefined ? { staffNotes: dto.staffNotes.trim() } : {}),
        ...(dto.reviewDate !== undefined ? { reviewDate: parseDate(dto.reviewDate) } : {}),
      },
      select: this.staffShape(),
    });
    return this.shapeForStaff(updated);
  }

  async addOutcome(actor: Actor, facilityId: string, planId: string, dto: OutcomeInputDto) {
    const plan = await this.getStaffPlan(actor, facilityId, planId);
    if (plan.status === 'CLOSED') {
      throw new BadRequestException('This plan is closed.');
    }
    const nextOrder = plan.outcomes.length;
    await this.prisma.supportOutcome.create({
      data: { planId, ...this.outcomeCreate(dto, nextOrder) },
    });
    return this.shapeForStaff(await this.reloadStaff(planId));
  }

  async updateOutcome(
    actor: Actor,
    facilityId: string,
    planId: string,
    outcomeId: string,
    dto: UpdateOutcomeDto,
  ) {
    const plan = await this.getStaffPlan(actor, facilityId, planId);
    if (!plan.outcomes.some((o: any) => o.id === outcomeId)) {
      throw new NotFoundException('Outcome not found on this plan.');
    }
    await this.prisma.supportOutcome.update({
      where: { id: outcomeId },
      data: {
        ...(dto.outcomeText !== undefined ? { outcomeText: dto.outcomeText.trim() } : {}),
        ...(dto.successCriteria !== undefined ? { successCriteria: dto.successCriteria.trim() } : {}),
        ...(dto.currentProgress !== undefined ? { currentProgress: dto.currentProgress } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.targetDate !== undefined ? { targetDate: parseDate(dto.targetDate) } : {}),
      },
    });
    return this.shapeForStaff(await this.reloadStaff(planId));
  }

  /** F8 — record an intervention (in-setting or home) against an outcome. */
  async addIntervention(
    actor: Actor,
    facilityId: string,
    planId: string,
    outcomeId: string,
    dto: AddInterventionDto,
  ) {
    const plan = await this.getStaffPlan(actor, facilityId, planId);
    if (plan.status === 'CLOSED') {
      throw new BadRequestException('This plan is closed.');
    }
    if (!plan.outcomes.some((o: any) => o.id === outcomeId)) {
      throw new NotFoundException('Outcome not found on this plan.');
    }
    await this.prisma.supportIntervention.create({
      data: {
        outcomeId,
        kind: dto.kind,
        title: dto.title.trim(),
        description: dto.description?.trim() ?? null,
        worksheetAssignmentId: dto.worksheetAssignmentId ?? null,
        createdById: actor.id,
      },
    });
    return this.shapeForStaff(await this.reloadStaff(planId));
  }

  /** Run a review cycle — the "Review" of APDR. Snapshots progress, records the decision. */
  async addReview(actor: Actor, facilityId: string, planId: string, dto: AddReviewDto) {
    const plan = await this.getStaffPlan(actor, facilityId, planId);
    if (plan.status === 'DRAFT') {
      throw new BadRequestException('Share the plan with the parent before reviewing it.');
    }
    if (plan.status === 'CLOSED') {
      throw new BadRequestException('This plan is already closed.');
    }

    // Apply any per-outcome updates, then snapshot where every outcome now stands so the
    // review preserves history even as the live outcomes keep moving.
    const updates = dto.outcomeUpdates ?? [];
    for (const u of updates) {
      if (!plan.outcomes.some((o: any) => o.id === u.outcomeId)) {
        throw new BadRequestException('An outcome update refers to an outcome not on this plan.');
      }
      await this.prisma.supportOutcome.update({
        where: { id: u.outcomeId },
        data: {
          ...(u.progress !== undefined ? { currentProgress: u.progress } : {}),
          ...(u.status !== undefined ? { status: u.status } : {}),
        },
      });
    }

    const fresh = await this.prisma.supportOutcome.findMany({
      where: { planId },
      select: { id: true, currentProgress: true, status: true },
    });
    const snapshot = fresh.map((o) => ({ outcomeId: o.id, progress: o.currentProgress, status: o.status }));

    await this.prisma.supportReview.create({
      data: {
        planId,
        reviewedById: actor.id,
        outcomeProgress: snapshot as unknown as Prisma.InputJsonValue,
        progressNote: dto.progressNote?.trim() ?? null,
        decision: dto.decision,
        sharedWithParent: dto.sharedWithParent ?? false,
      },
    });

    // The decision moves the plan: CLOSE ends it; anything else keeps support running and
    // (optionally) sets the next review date. ESCALATE keeps the plan open — the referral is
    // a separate action; the plan stays as the record of what was tried first.
    await this.prisma.supportPlan.update({
      where: { id: planId },
      data: {
        status: dto.decision === 'CLOSE' ? 'CLOSED' : 'ACTIVE',
        ...(dto.nextReviewDate !== undefined ? { reviewDate: parseDate(dto.nextReviewDate) } : {}),
      },
    });

    return this.shapeForStaff(await this.reloadStaff(planId));
  }

  /** Share the plan with the guardian: DRAFT → ACTIVE, and notify them. */
  async share(actor: Actor, facilityId: string, planId: string) {
    const plan = await this.getStaffPlan(actor, facilityId, planId);
    if (plan.status !== 'DRAFT') {
      throw new BadRequestException('This plan has already been shared.');
    }
    if (!plan.summary || !plan.summary.trim()) {
      throw new BadRequestException('Add a short summary for the parent before sharing.');
    }

    await this.prisma.supportPlan.update({
      where: { id: planId },
      data: { status: 'ACTIVE', sharedAt: new Date() },
    });

    const guardianUserId = await this.guardianUserId(plan.childId);
    if (guardianUserId) {
      this.notifications
        .createNotification({
          userId: guardianUserId,
          type: NotificationType.CASE_ASSIGNED,
          title: 'A support plan from your nursery',
          message: "Your child's nursery has shared a plan of the support they're putting in place.",
          relatedEntityId: plan.childId,
          relatedEntityType: 'child',
        })
        .catch(() => {});
    }

    return this.shapeForStaff(await this.reloadStaff(planId));
  }

  // ── Guardian path ────────────────────────────────────────────────────────────

  /** A guardian's view of support plans SHARED about their child. Never the staff notes. */
  async listForGuardian(actor: Actor, childId: string) {
    await this.assertGuardian(childId, actor.id);
    const rows = await this.prisma.supportPlan.findMany({
      where: { childId, status: { in: [...SupportPlansService.SHARED_STATUSES] } },
      orderBy: { sharedAt: 'desc' },
      select: this.guardianShape(),
    });
    return rows.map((r) => this.shapeForGuardian(r));
  }

  async acknowledge(
    actor: Actor,
    childId: string,
    planId: string,
    dto: AcknowledgeSupportPlanDto,
  ) {
    await this.assertGuardian(childId, actor.id);
    const plan = await this.prisma.supportPlan.findFirst({
      where: {
        id: planId,
        childId,
        status: { in: [...SupportPlansService.SHARED_STATUSES] },
      },
      select: { id: true },
    });
    if (!plan) throw new NotFoundException('Support plan not found.');

    await this.prisma.supportPlan.update({
      where: { id: planId },
      data: {
        acknowledgedAt: new Date(),
        ...(dto.response ? { parentResponse: dto.response.trim() } : {}),
      },
    });
    return { acknowledged: true };
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private outcomeCreate(o: OutcomeInputDto, order: number) {
    return {
      domain: o.domain.trim(),
      outcomeText: o.outcomeText.trim(),
      successCriteria: o.successCriteria?.trim() ?? null,
      baselineValue: o.baselineValue ?? null,
      targetDate: parseDate(o.targetDate),
      reviewIntervalDays: o.reviewIntervalDays ?? null,
      order: o.order ?? order,
    };
  }

  /**
   * The plan gate: an inclusion-role member AND capability + consent. Membership first (404
   * for a non-member — no cross-tenant oracle), same as observations/concerns. Reuses the
   * `canRaiseConcern` capability: a support plan is the continuation of a concern.
   */
  private async assertMayPlan(actor: Actor, facilityId: string, childId: string) {
    await assertFacilityMember(this.prisma, actor, facilityId, SupportPlansService.PLAN_ROLES);
    await assertChildAccess(this.prisma, {
      childId,
      facilityId,
      capability: 'canRaiseConcern',
      requiredScope: 'OBSERVATIONS_ONLY',
      consentType: 'DATA_PROCESSING',
    });
  }

  private async getStaffPlan(actor: Actor, facilityId: string, planId: string) {
    const plan = await this.prisma.supportPlan.findFirst({
      where: { id: planId, facilityId },
      select: { ...this.staffShape(), childId: true },
    });
    if (!plan) throw new NotFoundException('Support plan not found.');
    await this.assertMayPlan(actor, facilityId, (plan as any).childId);
    return plan as any;
  }

  private reloadStaff(planId: string) {
    return this.prisma.supportPlan.findUniqueOrThrow({
      where: { id: planId },
      select: this.staffShape(),
    });
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

  private async guardianUserId(childId: string): Promise<string | undefined> {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { profile: { select: { userId: true } } },
    });
    return child?.profile?.userId ?? undefined;
  }

  private staffShape() {
    return {
      id: true,
      status: true,
      title: true,
      domains: true,
      summary: true,
      staffNotes: true,
      reviewDate: true,
      concernId: true,
      sharedAt: true,
      acknowledgedAt: true,
      parentResponse: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true } },
      outcomes: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          domain: true,
          outcomeText: true,
          successCriteria: true,
          baselineValue: true,
          targetDate: true,
          reviewIntervalDays: true,
          currentProgress: true,
          status: true,
          order: true,
          interventions: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              kind: true,
              title: true,
              description: true,
              status: true,
              worksheetAssignmentId: true,
            },
          },
        },
      },
      reviews: {
        orderBy: { reviewedAt: 'desc' },
        select: {
          id: true,
          progressNote: true,
          decision: true,
          sharedWithParent: true,
          reviewedAt: true,
          reviewedBy: { select: { id: true, name: true } },
        },
      },
    } satisfies Prisma.SupportPlanSelect;
  }

  private shapeForStaff(r: any) {
    return {
      id: r.id,
      status: r.status,
      title: r.title,
      domains: r.domains,
      summary: r.summary,
      staffNotes: r.staffNotes,
      reviewDate: r.reviewDate,
      concernId: r.concernId,
      sharedAt: r.sharedAt,
      acknowledgedAt: r.acknowledgedAt,
      parentResponse: r.parentResponse,
      createdAt: r.createdAt,
      createdBy: r.createdBy ? { id: r.createdBy.id, name: r.createdBy.name } : null,
      outcomes: r.outcomes ?? [],
      reviews: r.reviews ?? [],
    };
  }

  private guardianShape() {
    return {
      id: true,
      status: true,
      title: true,
      domains: true,
      summary: true,
      reviewDate: true,
      sharedAt: true,
      acknowledgedAt: true,
      parentResponse: true,
      facility: { select: { name: true } },
      outcomes: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          domain: true,
          outcomeText: true,
          status: true,
          currentProgress: true,
          // Only HOME strategies reach the parent — the things they can act on.
          interventions: {
            where: { kind: 'HOME' as const },
            orderBy: { createdAt: 'asc' },
            select: { id: true, title: true, description: true, status: true },
          },
        },
      },
      reviews: {
        where: { sharedWithParent: true },
        orderBy: { reviewedAt: 'desc' },
        select: { id: true, progressNote: true, decision: true, reviewedAt: true },
      },
    } satisfies Prisma.SupportPlanSelect;
  }

  private shapeForGuardian(r: any) {
    return {
      id: r.id,
      status: r.status,
      title: r.title,
      domains: r.domains,
      summary: r.summary,
      reviewDate: r.reviewDate,
      sharedAt: r.sharedAt,
      acknowledgedAt: r.acknowledgedAt,
      yourResponse: r.parentResponse,
      facilityName: r.facility?.name ?? null,
      outcomes: (r.outcomes ?? []).map((o: any) => ({
        id: o.id,
        domain: o.domain,
        outcomeText: o.outcomeText,
        status: o.status,
        progress: o.currentProgress,
        homeStrategies: o.interventions ?? [],
      })),
      reviews: r.reviews ?? [],
    };
  }
}

/** Parse an ISO date string to a Date, or undefined for absent/blank. */
function parseDate(v?: string): Date | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(`Invalid date: ${v}`);
  }
  return d;
}
