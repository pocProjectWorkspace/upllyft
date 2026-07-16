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
  CreateDevReviewDto,
  UpdateDevReviewDto,
  AcknowledgeDevReviewDto,
} from './dto/developmental-reviews.dto';

interface Actor {
  id: string;
  role: string;
}

const DOMAIN_WORDS: Record<string, string> = {
  grossMotor: 'moving and balance',
  fineMotor: 'using their hands',
  speechLanguage: 'talking and understanding',
  socialEmotional: 'playing and getting on with others',
  cognitiveLearning: 'thinking and learning',
  adaptiveSelfCare: 'everyday self-care',
  sensoryProcessing: 'how they handle sights, sounds and textures',
  visionHearing: 'seeing and hearing',
};
const humanDomain = (d: string) => DOMAIN_WORDS[d] ?? d;

/** The age band this review is aimed at, in months. Generic ~2-year window, not a statute. */
const REVIEW_MIN_MONTHS = 22;
const REVIEW_MAX_MONTHS = 32;

/**
 * The early developmental review at ~age 2 (F9) — a defined top-of-funnel instrument.
 *
 * It does NOT re-implement screening: it REUSES the F4 engine, reading the child's completed
 * educator screening (and the parent's, where there is one) and assembling a single
 * plain-language snapshot the nursery shares with the family. The summary is generated from
 * a TEMPLATE (deterministic, non-diagnostic) — no model call — so it is predictable and safe.
 *
 * Same nursery pattern as the rest: inclusion-role gate + `canScreen` + an ACTIVE ASSESSMENT
 * consent; the guardian sees only a SHARED review.
 */
@Injectable()
export class DevelopmentalReviewsService {
  private readonly logger = new Logger(DevelopmentalReviewsService.name);
  private static readonly REVIEW_ROLES: FacilityRole[] = ['OWNER', 'ADMIN', 'INCLUSION_LEAD'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  /** Assemble a review from the recorded screening. */
  async create(actor: Actor, facilityId: string, childId: string, dto: CreateDevReviewDto) {
    await this.assertMayReview(actor, facilityId, childId);

    const affiliation = await this.prisma.childAffiliation.findFirstOrThrow({
      where: { childId, facilityId, status: 'ACTIVE', endedAt: null },
      select: { id: true },
    });
    const child = await this.prisma.child.findUniqueOrThrow({
      where: { id: childId },
      select: { firstName: true, dateOfBirth: true },
    });

    const educator = await this.prisma.assessment.findFirst({
      where: { childId, informantType: 'EDUCATOR', tier1Completed: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, flaggedDomains: true },
    });
    if (!educator) {
      throw new BadRequestException(
        'Complete an educator screening for this child first — the review is built from it.',
      );
    }
    const parent = await this.prisma.assessment.findFirst({
      where: { childId, informantType: 'PARENT', tier1Completed: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, flaggedDomains: true },
    });

    const flagged = educator.flaggedDomains ?? [];
    const bothAgree = (parent?.flaggedDomains ?? []).filter((d) => flagged.includes(d));

    const concernObs = await this.prisma.observation.count({
      where: { childId, facilityId, type: 'CONCERN' },
    });

    const ageMonths = monthsBetween(child.dateOfBirth, new Date());
    const summary = buildSummary(child.firstName, ageMonths, flagged, bothAgree);
    const recommendation = dto.recommendation?.trim() ?? buildRecommendation(flagged, bothAgree);

    const review = await this.prisma.developmentalReview.create({
      data: {
        childId,
        affiliationId: affiliation.id,
        facilityId,
        createdById: actor.id,
        ageMonths,
        status: 'DRAFT',
        flaggedDomains: flagged,
        educatorAssessmentId: educator.id,
        parentAssessmentId: parent?.id ?? null,
        evidenceSummary: {
          educatorAssessmentId: educator.id,
          parentAssessmentId: parent?.id ?? null,
          flaggedDomains: flagged,
          bothSettingsAgree: bothAgree,
          concernObservations: concernObs,
        } as Prisma.InputJsonValue,
        summary,
        recommendation,
      },
      select: this.staffShape(),
    });

    this.logger.log(`Developmental review ${review.id} created for child ${childId} at ${facilityId}`);
    return this.shapeForStaff(review);
  }

  async listForFacility(actor: Actor, facilityId: string, childId: string) {
    await this.assertMayReview(actor, facilityId, childId);
    const rows = await this.prisma.developmentalReview.findMany({
      where: { facilityId, childId },
      orderBy: { createdAt: 'desc' },
      select: this.staffShape(),
    });
    return rows.map((r) => this.shapeForStaff(r));
  }

  async updateSummary(actor: Actor, facilityId: string, reviewId: string, dto: UpdateDevReviewDto) {
    const review = await this.getStaffReview(actor, facilityId, reviewId);
    if (review.status !== 'DRAFT') {
      throw new BadRequestException('This review has already been shared and can no longer be edited.');
    }
    const updated = await this.prisma.developmentalReview.update({
      where: { id: reviewId },
      data: {
        ...(dto.summary !== undefined ? { summary: dto.summary.trim() } : {}),
        ...(dto.recommendation !== undefined ? { recommendation: dto.recommendation.trim() } : {}),
      },
      select: this.staffShape(),
    });
    return this.shapeForStaff(updated);
  }

  async share(actor: Actor, facilityId: string, reviewId: string) {
    const review = await this.getStaffReview(actor, facilityId, reviewId);
    if (review.status !== 'DRAFT') {
      throw new BadRequestException('This review has already been shared.');
    }
    const updated = await this.prisma.developmentalReview.update({
      where: { id: reviewId },
      data: { status: 'SHARED', sharedAt: new Date() },
      select: { ...this.staffShape(), childId: true },
    });

    const guardianUserId = await this.guardianUserId((updated as any).childId);
    if (guardianUserId) {
      this.notifications
        .createNotification({
          userId: guardianUserId,
          type: NotificationType.CASE_ASSIGNED,
          title: 'A developmental review from your nursery',
          message: "Your child's nursery has shared a developmental review with you.",
          relatedEntityId: (updated as any).childId,
          relatedEntityType: 'child',
        })
        .catch(() => {});
    }
    return this.shapeForStaff(updated);
  }

  /** Children on this facility's roster who are in the review age band and have no review yet. */
  async due(actor: Actor, facilityId: string) {
    await assertFacilityMember(this.prisma, actor, facilityId, DevelopmentalReviewsService.REVIEW_ROLES);

    const now = new Date();
    const maxDob = subtractMonths(now, REVIEW_MIN_MONTHS); // older than MIN months → born before this
    const minDob = subtractMonths(now, REVIEW_MAX_MONTHS); // younger than MAX months → born after this

    const affiliations = await this.prisma.childAffiliation.findMany({
      where: {
        facilityId,
        status: 'ACTIVE',
        endedAt: null,
        child: { dateOfBirth: { gte: minDob, lte: maxDob } },
      },
      select: {
        childId: true,
        child: { select: { firstName: true, dateOfBirth: true } },
      },
    });

    const childIds = affiliations.map((a) => a.childId);
    const reviewed = await this.prisma.developmentalReview.findMany({
      where: { facilityId, childId: { in: childIds } },
      select: { childId: true },
    });
    const reviewedSet = new Set(reviewed.map((r) => r.childId));

    return affiliations
      .filter((a) => !reviewedSet.has(a.childId))
      .map((a) => ({
        childId: a.childId,
        firstName: a.child.firstName,
        ageMonths: monthsBetween(a.child.dateOfBirth, now),
      }))
      .sort((a, b) => b.ageMonths - a.ageMonths);
  }

  // ── Guardian path ──────────────────────────────────────────────────────────

  async listForGuardian(actor: Actor, childId: string) {
    await this.assertGuardian(childId, actor.id);
    const rows = await this.prisma.developmentalReview.findMany({
      where: { childId, status: { in: ['SHARED', 'ACKNOWLEDGED'] } },
      orderBy: { sharedAt: 'desc' },
      select: {
        id: true,
        status: true,
        ageMonths: true,
        flaggedDomains: true,
        summary: true,
        recommendation: true,
        sharedAt: true,
        acknowledgedAt: true,
        parentResponse: true,
        facility: { select: { name: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      ageMonths: r.ageMonths,
      flaggedDomains: r.flaggedDomains,
      summary: r.summary,
      recommendation: r.recommendation,
      sharedAt: r.sharedAt,
      acknowledgedAt: r.acknowledgedAt,
      yourResponse: r.parentResponse,
      facilityName: r.facility.name,
    }));
  }

  async acknowledge(actor: Actor, childId: string, reviewId: string, dto: AcknowledgeDevReviewDto) {
    await this.assertGuardian(childId, actor.id);
    const review = await this.prisma.developmentalReview.findFirst({
      where: { id: reviewId, childId, status: { in: ['SHARED', 'ACKNOWLEDGED'] } },
      select: { id: true },
    });
    if (!review) throw new NotFoundException('Review not found.');
    await this.prisma.developmentalReview.update({
      where: { id: reviewId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        ...(dto.response ? { parentResponse: dto.response.trim() } : {}),
      },
    });
    return { acknowledged: true };
  }

  // ── Internals ────────────────────────────────────────────────────────────

  private async assertMayReview(actor: Actor, facilityId: string, childId: string) {
    await assertFacilityMember(this.prisma, actor, facilityId, DevelopmentalReviewsService.REVIEW_ROLES);
    await assertChildAccess(this.prisma, {
      childId,
      facilityId,
      capability: 'canScreen',
      requiredScope: 'OBSERVATIONS_ONLY',
      consentType: 'ASSESSMENT',
    });
  }

  private async getStaffReview(actor: Actor, facilityId: string, reviewId: string) {
    const review = await this.prisma.developmentalReview.findFirst({
      where: { id: reviewId, facilityId },
      select: { ...this.staffShape(), childId: true },
    });
    if (!review) throw new NotFoundException('Review not found.');
    await this.assertMayReview(actor, facilityId, (review as any).childId);
    return review as any;
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
      ageMonths: true,
      flaggedDomains: true,
      educatorAssessmentId: true,
      parentAssessmentId: true,
      evidenceSummary: true,
      summary: true,
      recommendation: true,
      sharedAt: true,
      acknowledgedAt: true,
      parentResponse: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true } },
    } satisfies Prisma.DevelopmentalReviewSelect;
  }

  private shapeForStaff(r: any) {
    return {
      id: r.id,
      status: r.status,
      ageMonths: r.ageMonths,
      flaggedDomains: r.flaggedDomains,
      educatorAssessmentId: r.educatorAssessmentId,
      parentAssessmentId: r.parentAssessmentId,
      evidence: r.evidenceSummary,
      summary: r.summary,
      recommendation: r.recommendation,
      sharedAt: r.sharedAt,
      acknowledgedAt: r.acknowledgedAt,
      parentResponse: r.parentResponse,
      createdAt: r.createdAt,
      createdBy: r.createdBy ? { id: r.createdBy.id, name: r.createdBy.name } : null,
    };
  }
}

// ── Template summary (deterministic, non-diagnostic) ──

function buildSummary(name: string, ageMonths: number, flagged: string[], bothAgree: string[]): string {
  const lead = `At around ${ageMonths} months, here is how ${name} is getting on across their development.`;
  if (flagged.length === 0) {
    return `${lead} From our screening, ${name} appears to be developing broadly as expected across the areas we look at. We'll keep watching day to day, and it's always worth chatting with us if anything changes.`;
  }
  const areas = flagged.map(humanDomain).join(', ');
  const agree =
    bothAgree.length > 0
      ? ` You and the nursery have both noticed the same around ${bothAgree.map(humanDomain).join(', ')}, which is helpful to know.`
      : '';
  return `${lead} ${name} is doing well in many areas. From our screening, we'd suggest keeping a closer eye on ${areas}.${agree} This is a screening review, not a diagnosis — it simply helps us, and you, know where a little extra attention might help.`;
}

function buildRecommendation(flagged: string[], bothAgree: string[]): string {
  if (flagged.length === 0) return 'Continue as you are, and let us know if anything changes.';
  if (bothAgree.length > 0) {
    return 'We’d suggest talking together about some simple next steps, and it may be worth raising this with your health visitor or GP.';
  }
  return 'Let’s keep a closer eye on this together over the coming weeks and review again.';
}

/** Whole months between two dates. */
function monthsBetween(from: Date, to: Date): number {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
}

/** A date `n` months before `d` — used to turn an age band into a date-of-birth window. */
function subtractMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() - n);
  return r;
}
