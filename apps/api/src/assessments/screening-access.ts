import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { InformantType, Prisma, PrismaClient } from '@prisma/client';
import { resolveChildAccess } from '../common/consent';

/**
 * Who is this person, relative to this child, for the purpose of screening?
 *
 * Screening was guardian-only: every path threw unless `child.profile.userId === userId`.
 * That is a fine rule while a parent is the only informant, and it is the wrong rule the
 * moment a nursery can screen — so this is a NEW AUTHORISATION PATH, not a loosened one.
 * The guardian route is untouched; an educator route is added beside it, and everything
 * else still fails closed.
 *
 * The educator route is gated on FOUR things, in this order:
 *
 *   1. the facility's TYPE permits screening at all      (capability map: canScreen)
 *   2. the child holds an ACTIVE affiliation to it       (not merely on the roster)
 *   3. the guardian has granted an ASSESSMENT consent    (not the observation consent)
 *   4. the affiliation's dataScope reaches the screening (OBSERVATIONS_ONLY covers a
 *      facility's OWN screenings — see the DataScope enum)
 *
 * `resolveChildAccess` enforces all four, capability BEFORE consent, so a consent can
 * never grant a capability the facility lacks.
 *
 * WHY ASSESSMENT AND NOT THE OBSERVATION CONSENT: a parent who agreed a nursery may note
 * how their child plays has not thereby agreed to a formal developmental screening whose
 * output is a scored, referable report. They are different asks with different
 * consequences, and rolling the second into the first would be exactly the kind of
 * silent scope creep consent exists to prevent. It is asked separately.
 */
export interface ScreeningActor {
  id: string;
  role: string;
}

export interface ScreeningIdentity {
  informantType: InformantType;
  respondentId: string;
  /** The setting it was administered in. NULL for a parent screening at home. */
  facilityId: string | null;
}

export async function resolveScreeningIdentity(
  prisma: PrismaClient | Prisma.TransactionClient,
  childId: string,
  actor: ScreeningActor,
): Promise<ScreeningIdentity> {
  const child = await prisma.child.findUnique({
    where: { id: childId },
    select: { id: true, profile: { select: { userId: true } } },
  });

  if (!child) throw new NotFoundException('Child not found');

  // ── The guardian. Unchanged, and still the widest lens. ────────────────────
  if (child.profile?.userId === actor.id) {
    return { informantType: 'PARENT', respondentId: actor.id, facilityId: null };
  }

  // ── An educator at a facility this child actually attends. ─────────────────
  const memberships = await prisma.facilityMember.findMany({
    where: { userId: actor.id, status: 'ACTIVE' },
    select: { facilityId: true, facility: { select: { type: true } } },
  });

  if (memberships.length === 0) {
    throw new ForbiddenException('You do not have access to this child');
  }

  // A user may staff several settings; the child attends one of them (or none).
  for (const m of memberships) {
    const access = await resolveChildAccess(prisma, {
      childId,
      facilityId: m.facilityId,
      capability: 'canScreen',
      requiredScope: 'OBSERVATIONS_ONLY',
      consentType: 'ASSESSMENT',
    });

    if (access.allowed) {
      const informantType: InformantType =
        m.facility.type === 'CLINIC' ? 'CLINICIAN' : 'EDUCATOR';
      return { informantType, respondentId: actor.id, facilityId: m.facilityId };
    }

    // Surface the FIRST specific reason rather than a generic denial. "The guardian
    // has not granted consent for a developmental screening" is actionable — the
    // nursery can go and ask. "You do not have access" is not, and it is what sends
    // someone to raise a support ticket instead of speaking to the parent.
    if (access.reason && (await childAttendsFacility(prisma, childId, m.facilityId))) {
      throw new ForbiddenException(access.reason);
    }
  }

  throw new ForbiddenException('You do not have access to this child');
}

async function childAttendsFacility(
  prisma: PrismaClient | Prisma.TransactionClient,
  childId: string,
  facilityId: string,
): Promise<boolean> {
  const aff = await prisma.childAffiliation.findFirst({
    where: { childId, facilityId, endedAt: null },
    select: { id: true },
  });
  return aff !== null;
}
