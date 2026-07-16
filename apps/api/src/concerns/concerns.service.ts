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
import { ConcernCoachingService } from './concern-coaching.service';
import { RaiseConcernDto, UpdateConcernDto, AcknowledgeConcernDto } from './dto/concerns.dto';

interface Actor {
  id: string;
  role: string;
}

/**
 * The concern → conversation pathway (F6).
 *
 * WHO RAISES: the inclusion lead (or an owner/admin), never a plain keyworker. A keyworker
 * OBSERVES — they record CONCERN observations. The inclusion lead is the one who weighs
 * those up and decides to raise it with the parent (the FacilityRole comment: "INCLUSION_LEAD
 * owns flag → conversation → referral"). Enforced by role AND by the `canRaiseConcern`
 * capability + an ACTIVE, consented affiliation.
 *
 * THE COACHING IS PRIVATE. `staffCoaching` is never returned on the guardian path. The
 * guardian only ever sees a SHARED concern's `parentSummary` and status.
 */
@Injectable()
export class ConcernsService {
  private readonly logger = new Logger(ConcernsService.name);
  private static readonly RAISE_ROLES: FacilityRole[] = ['OWNER', 'ADMIN', 'INCLUSION_LEAD'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly coaching: ConcernCoachingService,
    private readonly notifications: NotificationService,
  ) {}

  /**
   * Raise a concern: gather the evidence already recorded, generate the coaching + a draft
   * parent message, and save it as a DRAFT for the lead to review and edit before sharing.
   */
  async raise(actor: Actor, facilityId: string, childId: string, dto: RaiseConcernDto) {
    await this.assertMayRaise(actor, facilityId, childId);

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

    // ── Evidence, from what has already been recorded (no new PHI invented) ──────
    const concernObs = await this.prisma.observation.findMany({
      where: { childId, facilityId, type: 'CONCERN' },
      orderBy: { observedAt: 'desc' },
      take: 20,
      select: { note: true, domain: true },
    });

    // Latest completed-enough educator screening (tier 1 done → has domain scores).
    const educatorScreening = await this.prisma.assessment.findFirst({
      where: { childId, informantType: 'EDUCATOR', tier1Completed: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, flaggedDomains: true },
    });
    const parentScreening = await this.prisma.assessment.findFirst({
      where: { childId, informantType: 'PARENT', tier1Completed: true },
      orderBy: { createdAt: 'desc' },
      select: { flaggedDomains: true },
    });

    const obsDomains = concernObs.map((o) => o.domain).filter((d): d is string => !!d);
    const screeningFlags = educatorScreening?.flaggedDomains ?? [];
    const domains = [...new Set([...obsDomains, ...screeningFlags])];

    if (concernObs.length === 0 && screeningFlags.length === 0) {
      throw new BadRequestException(
        'There is nothing to raise yet — record a concern observation or complete a screening first.',
      );
    }

    // A home-and-nursery agreement is the strongest thing to say — surface it for the coach.
    const bothFlag = (parentScreening?.flaggedDomains ?? []).filter((d) => screeningFlags.includes(d));
    const concordanceNote = bothFlag.length
      ? `home and nursery screenings both flagged ${bothFlag.join(', ')}`
      : undefined;

    const coached = await this.coaching.coach({
      childFirstName: child.firstName,
      facilityName: facility.name,
      domains,
      concernNotes: concernObs.map((o) => o.note),
      screeningFlags,
      concordanceNote,
    });

    const concern = await this.prisma.concern.create({
      data: {
        childId,
        affiliationId: affiliation.id,
        facilityId,
        raisedById: actor.id,
        status: 'DRAFT',
        domains,
        staffCoaching: coached.staffCoaching,
        coachingModel: coached.model,
        parentSummary: coached.parentSummary,
        evidenceSummary: {
          concernObservations: concernObs.length,
          assessmentId: educatorScreening?.id ?? null,
          flaggedDomains: screeningFlags,
          bothSettingsAgree: bothFlag,
        } as Prisma.InputJsonValue,
      },
      select: this.staffShape(),
    });

    this.logger.log(
      `Concern ${concern.id} raised for child ${childId} at facility ${facilityId} by ${actor.id} ` +
        `(${coached.model}); domains: ${domains.join(', ')}`,
    );

    return this.shapeForStaff(concern);
  }

  /** The concerns a nursery has for a child (staff view — includes the private coaching). */
  async listForFacility(actor: Actor, facilityId: string, childId: string) {
    await this.assertMayRaise(actor, facilityId, childId);
    const rows = await this.prisma.concern.findMany({
      where: { facilityId, childId },
      orderBy: { createdAt: 'desc' },
      select: this.staffShape(),
    });
    return rows.map((r) => this.shapeForStaff(r));
  }

  /** Edit the parent-facing summary before sharing. Only while DRAFT. */
  async updateSummary(actor: Actor, facilityId: string, concernId: string, dto: UpdateConcernDto) {
    const concern = await this.getStaffConcern(actor, facilityId, concernId);
    if (concern.status !== 'DRAFT') {
      throw new BadRequestException('This concern has already been shared and can no longer be edited.');
    }
    const updated = await this.prisma.concern.update({
      where: { id: concernId },
      data: { parentSummary: dto.parentSummary.trim() },
      select: this.staffShape(),
    });
    return this.shapeForStaff(updated);
  }

  /** Share it with the guardian. */
  async share(actor: Actor, facilityId: string, concernId: string) {
    const concern = await this.getStaffConcern(actor, facilityId, concernId);
    if (concern.status !== 'DRAFT') {
      throw new BadRequestException('This concern has already been shared.');
    }

    const updated = await this.prisma.concern.update({
      where: { id: concernId },
      data: { status: 'SHARED', sharedAt: new Date() },
      select: { ...this.staffShape(), childId: true, child: { select: { profile: { select: { userId: true } } } } },
    });

    // Notify the guardian, gently — the message itself lives on their child's page, which
    // is what the notification links to (relatedEntityType has no 'concern' member).
    const guardianUserId = (updated as any).child?.profile?.userId as string | undefined;
    if (guardianUserId) {
      this.notifications
        .createNotification({
          userId: guardianUserId,
          type: NotificationType.CASE_ASSIGNED,
          title: `A note from your nursery`,
          message: `Your child's nursery would like to share something with you.`,
          relatedEntityId: (updated as any).childId,
          relatedEntityType: 'child',
        })
        .catch(() => {});
    }

    return this.shapeForStaff(updated);
  }

  // ── Guardian path ────────────────────────────────────────────────────────────

  /**
   * A guardian's view of concerns SHARED about their child. Never includes the private
   * staff coaching, and never a DRAFT — a parent sees only what the nursery chose to share.
   */
  async listForGuardian(actor: Actor, childId: string) {
    await this.assertGuardian(childId, actor.id);
    const rows = await this.prisma.concern.findMany({
      where: { childId, status: { in: ['SHARED', 'ACKNOWLEDGED', 'CLOSED'] } },
      orderBy: { sharedAt: 'desc' },
      select: {
        id: true,
        status: true,
        domains: true,
        parentSummary: true,
        sharedAt: true,
        acknowledgedAt: true,
        parentResponse: true,
        facility: { select: { name: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      domains: r.domains,
      summary: r.parentSummary,
      sharedAt: r.sharedAt,
      acknowledgedAt: r.acknowledgedAt,
      yourResponse: r.parentResponse,
      facilityName: r.facility.name,
    }));
  }

  async acknowledge(actor: Actor, childId: string, concernId: string, dto: AcknowledgeConcernDto) {
    await this.assertGuardian(childId, actor.id);
    const concern = await this.prisma.concern.findFirst({
      where: { id: concernId, childId, status: { in: ['SHARED', 'ACKNOWLEDGED'] } },
      select: { id: true },
    });
    if (!concern) throw new NotFoundException('Concern not found.');

    await this.prisma.concern.update({
      where: { id: concernId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        ...(dto.response ? { parentResponse: dto.response.trim() } : {}),
      },
    });
    return { acknowledged: true };
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  /**
   * The full raise/read gate: a member in an inclusion role AND capability+consent. The
   * membership check goes first (404 for a non-member, no cross-tenant oracle — same as
   * observations).
   */
  private async assertMayRaise(actor: Actor, facilityId: string, childId: string) {
    await assertFacilityMember(this.prisma, actor, facilityId, ConcernsService.RAISE_ROLES);
    await assertChildAccess(this.prisma, {
      childId,
      facilityId,
      capability: 'canRaiseConcern',
      requiredScope: 'OBSERVATIONS_ONLY',
      consentType: 'DATA_PROCESSING',
    });
  }

  private async getStaffConcern(actor: Actor, facilityId: string, concernId: string) {
    const concern = await this.prisma.concern.findFirst({
      where: { id: concernId, facilityId },
      select: { ...this.staffShape(), childId: true },
    });
    if (!concern) throw new NotFoundException('Concern not found.');
    await this.assertMayRaise(actor, facilityId, (concern as any).childId);
    return concern as any;
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
      domains: true,
      staffCoaching: true,
      coachingModel: true,
      parentSummary: true,
      evidenceSummary: true,
      sharedAt: true,
      acknowledgedAt: true,
      parentResponse: true,
      createdAt: true,
      raisedBy: { select: { id: true, name: true } },
    } satisfies Prisma.ConcernSelect;
  }

  private shapeForStaff(r: any) {
    return {
      id: r.id,
      status: r.status,
      domains: r.domains,
      staffCoaching: r.staffCoaching,
      coachingModel: r.coachingModel,
      parentSummary: r.parentSummary,
      evidence: r.evidenceSummary,
      sharedAt: r.sharedAt,
      acknowledgedAt: r.acknowledgedAt,
      parentResponse: r.parentResponse,
      createdAt: r.createdAt,
      raisedBy: r.raisedBy ? { id: r.raisedBy.id, name: r.raisedBy.name } : null,
    };
  }
}
