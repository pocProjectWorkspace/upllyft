import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ObservationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertChildAccess } from '../common/consent';
import { assertFacilityMember } from '../common/facility-scope';
import { CreateObservationDto, ListObservationsQueryDto } from './dto/observations.dto';

interface Actor {
  id: string;
  role: string;
}

/**
 * Continuous observation capture.
 *
 * THE ACCESS RULE IS THE WHOLE THING. An observation is anchored to a `ChildAffiliation`,
 * and there is no path to one that does not route through it — so the consent gate applies
 * by construction:
 *
 *   WRITE (staff)     the child holds an ACTIVE affiliation to the facility AND the
 *                     guardian's observation consent is live AND the facility type may
 *                     observe. Enforced by `assertChildAccess`, which checks capability
 *                     BEFORE consent, so consent can never grant a capability the facility
 *                     lacks.
 *
 *   READ (staff)      re-checks the same gate on every call. A guardian who revokes
 *                     consent takes back the nursery's access to what it recorded —
 *                     revocation is not cosmetic.
 *
 *   READ (guardian)   always. It is their child. This path does not touch the facility
 *                     gate at all.
 *
 * WHY ACTIVE MATTERS BEYOND CONSENT: "a PENDING_CONSENT affiliation accrues no data" is the
 * invariant that keeps the F3 placeholder-merge safe (a placeholder is deleted on merge,
 * and it is only ever empty because nothing can be written before consent). Requiring
 * ACTIVE to observe is what upholds it. Do not relax it.
 */
@Injectable()
export class ObservationsService {
  private readonly logger = new Logger(ObservationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record an observation. `assertChildAccess` throws unless the actor staffs the facility,
   * the affiliation is ACTIVE, consent is live, and the facility type may observe.
   */
  async create(actor: Actor, facilityId: string, childId: string, dto: CreateObservationDto) {
    await this.assertStaffMayObserve(actor, facilityId, childId);

    // The affiliation is the anchor. It exists and is ACTIVE — assertChildAccess just
    // proved it — but we need its id, and we bind the observation to THAT specific active
    // enrolment rather than trusting the caller.
    const affiliation = await this.prisma.childAffiliation.findFirstOrThrow({
      where: { childId, facilityId, status: 'ACTIVE', endedAt: null },
      select: { id: true },
    });

    const observedAt = dto.observedAt ? new Date(dto.observedAt) : new Date();
    // A keyworker can write up the morning at lunchtime, but not record the future.
    if (observedAt > new Date()) {
      observedAt.setTime(Date.now());
    }

    const observation = await this.prisma.observation.create({
      data: {
        childId,
        affiliationId: affiliation.id,
        facilityId,
        authorId: actor.id,
        note: dto.note.trim(),
        domain: dto.domain ?? null,
        type: dto.type ?? 'NOTE',
        observedAt,
      },
      select: this.publicShape(),
    });

    this.logger.log(
      `Observation ${observation.id} recorded for child ${childId} at facility ${facilityId} (${dto.type ?? 'NOTE'})`,
    );

    return this.shape(observation);
  }

  /** The timeline a nursery sees — re-gated, newest first, filterable. */
  async listForFacility(
    actor: Actor,
    facilityId: string,
    childId: string,
    query: ListObservationsQueryDto,
  ) {
    await this.assertStaffMayObserve(actor, facilityId, childId);

    const rows = await this.prisma.observation.findMany({
      where: {
        childId,
        facilityId,
        ...(query.domain ? { domain: query.domain } : {}),
        ...(query.type ? { type: query.type } : {}),
      },
      orderBy: { observedAt: 'desc' },
      select: this.publicShape(),
    });

    return rows.map((r) => this.shape(r));
  }

  /**
   * The timeline a GUARDIAN sees of their own child — across every setting that has
   * observed them. Authorised on the guardian relationship, NOT the facility gate: it is
   * their child, and they are entitled to see what has been recorded about them.
   */
  async listForGuardian(actor: Actor, childId: string, query: ListObservationsQueryDto) {
    await this.assertGuardian(childId, actor.id);

    const rows = await this.prisma.observation.findMany({
      where: {
        childId,
        ...(query.domain ? { domain: query.domain } : {}),
        ...(query.type ? { type: query.type } : {}),
      },
      orderBy: { observedAt: 'desc' },
      select: { ...this.publicShape(), facility: { select: { name: true } } },
    });

    return rows.map((r) => ({ ...this.shape(r), facilityName: (r as any).facility?.name ?? null }));
  }

  /**
   * Delete an observation. The AUTHOR may retract their own; a facility admin may remove
   * any at their facility (a keyworker's slip should not need the keyworker to fix). A
   * departed author (authorId null) can only be cleaned up by an admin.
   */
  async remove(actor: Actor, facilityId: string, observationId: string) {
    // We don't yet know the child; resolve the observation first, then gate on it.
    await this.assertStaffMayObserve(actor, facilityId, await this.childOf(observationId, facilityId));

    const obs = await this.prisma.observation.findFirst({
      where: { id: observationId, facilityId },
      select: { id: true, authorId: true },
    });
    if (!obs) throw new NotFoundException('Observation not found.');

    if (obs.authorId !== actor.id) {
      const isAdmin = await this.prisma.facilityMember.findFirst({
        where: { userId: actor.id, facilityId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN', 'INCLUSION_LEAD'] } },
        select: { id: true },
      });
      if (!isAdmin) {
        throw new ForbiddenException('You can only remove observations you recorded.');
      }
    }

    await this.prisma.observation.delete({ where: { id: observationId } });
    return { deleted: true };
  }

  // ─── internals ──────────────────────────────────────────────────────────────

  /**
   * TWO checks, and both are needed.
   *
   * `assertChildAccess` proves the CHILD is ACTIVE + consented at this facility, but says
   * nothing about whether the CALLER staffs it. Without the membership check, any
   * authenticated user who knew a (facilityId, childId) pair where consent happened to
   * exist could read another setting's observations — a cross-tenant read. (A real hole
   * the e2e suite caught.)
   *
   * `assertFacilityMember` is checked FIRST and 404s a non-member, so an outsider cannot
   * even distinguish "not a member" from "no such facility" — no enumeration oracle.
   */
  private async assertStaffMayObserve(actor: Actor, facilityId: string, childId: string) {
    await assertFacilityMember(this.prisma, actor, facilityId);
    await assertChildAccess(this.prisma, {
      childId,
      facilityId,
      capability: 'canObserve',
      requiredScope: 'OBSERVATIONS_ONLY',
      consentType: 'DATA_PROCESSING',
    });
  }

  private async childOf(observationId: string, facilityId: string): Promise<string> {
    const obs = await this.prisma.observation.findFirst({
      where: { id: observationId, facilityId },
      select: { childId: true },
    });
    if (!obs) throw new NotFoundException('Observation not found.');
    return obs.childId;
  }

  private async assertGuardian(childId: string, userId: string): Promise<void> {
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

  private publicShape() {
    return {
      id: true,
      note: true,
      domain: true,
      type: true,
      observedAt: true,
      createdAt: true,
      author: { select: { id: true, name: true } },
    } satisfies Prisma.ObservationSelect;
  }

  private shape(r: any) {
    return {
      id: r.id,
      note: r.note,
      domain: r.domain,
      type: r.type as ObservationType,
      observedAt: r.observedAt,
      createdAt: r.createdAt,
      author: r.author ? { id: r.author.id, name: r.author.name } : null,
    };
  }
}
