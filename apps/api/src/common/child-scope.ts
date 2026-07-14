import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient, AffiliationType, AffiliationStatus } from '@prisma/client';
import { assertScopeWithinCeiling } from './consent';
import { facilityCan, type DataScope, type FacilityType } from './facility-capabilities';

/**
 * Phase D — scope children by AFFILIATION, not by `Child.clinicId`.
 *
 * `Child.clinicId` is a single nullable FK and therefore cannot express a child
 * who is enrolled at a nursery AND a patient at a clinic — the referral loop the
 * nursery proposition depends on. `ChildAffiliation` replaces it.
 *
 * NOTE ON IDS: the Clinic→Facility backfill preserved ids (Facility.id = Clinic.id),
 * so the `clinicId` that `resolveClinicScope()` pulls off the JWT is ALSO the
 * facilityId. That is what lets readers migrate here without re-plumbing scope
 * resolution. Do not rely on this beyond Phase F — by then `clinicId` is gone and
 * the token should carry `facilityId` outright.
 *
 * Until Phase F, `Child.clinicId` is DUAL-WRITTEN alongside the affiliation so the
 * un-migrated readers keep working. Reads should already come from here.
 */

/** Children affiliated to this facility. `null` = SUPERADMIN, platform-wide. */
export function childInFacility(facilityId: string | null): Prisma.ChildWhereInput {
  if (!facilityId) return {};
  return {
    affiliations: {
      some: { facilityId, status: 'ACTIVE', endedAt: null },
    },
  };
}

/**
 * Children on a facility's ROSTER — including those whose guardian has not yet
 * consented (`PENDING_CONSENT`).
 *
 * This is deliberately NOT the default. `childInFacility()` is ACTIVE-only, so a
 * reader that forgets to think about consent gets the fail-closed answer. Seeing a
 * not-yet-consented child is an explicit opt-in, and it is only ever correct for
 * one thing: the roster itself, so a nursery can tell WHO it is still waiting on.
 *
 * A roster row is a name and a consent status. It is not the record — opening that
 * still goes through `resolveChildAccess()`, which requires an ACTIVE affiliation
 * AND a live consent. That split (list ≠ read) is the F2 decision, unchanged.
 */
export function childOnRoster(facilityId: string | null): Prisma.ChildWhereInput {
  if (!facilityId) return {};
  return {
    affiliations: {
      some: {
        facilityId,
        status: { in: ['PENDING_CONSENT', 'ACTIVE'] },
        endedAt: null,
      },
    },
  };
}

/**
 * Therapists who are staff at this facility — via FacilityMember, not the
 * deprecated `TherapistProfile.clinicId`.
 *
 * `TherapistProfile.clinicId` is a single FK for the same reason `Child.clinicId`
 * was: it cannot express a clinician working across two sites of a group, which
 * `FacilityMember` handles natively.
 */
export function therapistInFacility(
  facilityId: string | null,
): Prisma.TherapistProfileWhereInput {
  if (!facilityId) return {};
  return {
    user: {
      facilityMemberships: {
        some: { facilityId, status: 'ACTIVE' },
      },
    },
  };
}

/** Same predicate, for a query rooted at CaseSession (session → case → child). */
export function sessionInFacility(facilityId: string | null): Prisma.CaseSessionWhereInput {
  if (!facilityId) return {};
  return { case: { child: childInFacility(facilityId) } };
}

/**
 * Attach a child to a facility.
 *
 * Idempotent — re-attaching an already-live child returns the existing affiliation
 * rather than creating a duplicate.
 *
 * THREE THINGS THIS FUNCTION IS CAREFUL ABOUT, each of which was a live bug when a
 * nursery first called it:
 *
 * 1. STATUS IS NOT ALWAYS ACTIVE. An enrolment starts at PENDING_CONSENT: the
 *    nursery has added the child, the guardian has not yet agreed to anything. If
 *    this defaulted to ACTIVE, adding a child to a roster would GRANT THE NURSERY
 *    ACCESS TO THAT CHILD — the facility would be consenting on the guardian's
 *    behalf, which is the one thing consent exists to prevent. A clinic PATIENT
 *    still defaults to ACTIVE (unchanged): its gate is the consent check at detail,
 *    which `resolveChildAccess()` applies regardless of status.
 *
 * 2. THE LEGACY `Child.clinicId` MIRROR IS FOR CLINICS ONLY. `clinicId` is what the
 *    un-migrated readers still scope on, so mirroring a NURSERY's id into it would
 *    make an enrolled child surface in clinic patient lists and clinic tracking —
 *    the helper written to make scoping safe would be manufacturing the leak. The
 *    facility type is looked up here rather than trusted from the caller, because a
 *    caller that could be trusted to pass it correctly wouldn't need this guard.
 *
 * 3. SCOPE IS CAPPED BY TYPE. `assertScopeWithinCeiling` rejects FULL_CLINICAL on a
 *    nursery even if a caller asks for it. A nursery cannot be talked into seeing a
 *    diagnosis.
 *
 * Drop the `clinicId` half in Phase F.
 */
export async function attachChildToFacility(
  prisma: PrismaClient | Prisma.TransactionClient,
  childId: string,
  facilityId: string,
  opts: {
    type?: AffiliationType;
    dataScope?: DataScope;
    /** Override only with cause. The defaults are the safe ones — see (1) above. */
    status?: AffiliationStatus;
    roomId?: string | null;
    keyworkerId?: string | null;
  } = {},
): Promise<{ affiliationId: string; created: boolean }> {
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    select: { id: true, type: true },
  });

  if (!facility) {
    throw new NotFoundException(`Facility ${facilityId} does not exist.`);
  }

  const facilityType = facility.type as FacilityType;

  const type: AffiliationType =
    opts.type ?? (facilityType === 'CLINIC' ? 'PATIENT' : 'ENROLLED');

  // A nursery may not hold a clinical affiliation. It cannot open a case or treat,
  // so a PATIENT affiliation there would be a lens onto nothing — or worse, a lens
  // onto everything.
  if (type === 'PATIENT' && !facilityCan(facilityType, 'canCreateCase')) {
    throw new ForbiddenException(
      `A ${facilityType.toLowerCase()} cannot hold a PATIENT affiliation; children are ENROLLED.`,
    );
  }

  const dataScope: DataScope =
    opts.dataScope ?? (type === 'PATIENT' ? 'FULL_CLINICAL' : 'OBSERVATIONS_ONLY');
  assertScopeWithinCeiling(facilityType, dataScope);

  const status: AffiliationStatus =
    opts.status ?? (type === 'PATIENT' ? 'ACTIVE' : 'PENDING_CONSENT');

  const existing = await prisma.childAffiliation.findFirst({
    where: { childId, facilityId, endedAt: null },
    select: { id: true },
  });

  if (existing) {
    return { affiliationId: existing.id, created: false };
  }

  const affiliation = await prisma.childAffiliation.create({
    data: {
      childId,
      facilityId,
      type,
      status,
      dataScope,
      roomId: opts.roomId ?? null,
      keyworkerId: opts.keyworkerId ?? null,
    },
    select: { id: true },
  });

  // Legacy mirror — CLINIC only (see (2) above). Remove in Phase F.
  //
  // `Child.clinicId` is an FK to `Clinic`, NOT to `Facility`. Every clinic facility
  // in existence today came from the backfill, which preserved ids (Facility.id ==
  // Clinic.id), so the mirror resolves. A NATIVELY-created clinic facility has no
  // legacy `Clinic` row, and writing its id here raises a foreign-key violation
  // that takes the whole enrolment down with it. Mirror only where there is
  // something to mirror INTO.
  //
  // The gap this leaves is real: a child at a clinic facility with no legacy row is
  // invisible to the un-migrated readers that still scope on `clinicId`. The fix
  // belongs at facility CREATION — a new CLINIC facility must dual-write its
  // `Clinic` row under the same id, preserving the invariant the backfill
  // established. It does not belong here, silently, inside an attach.
  if (facilityType === 'CLINIC') {
    const legacy = await prisma.clinic.findUnique({
      where: { id: facilityId },
      select: { id: true },
    });
    if (legacy) {
      await prisma.child.update({
        where: { id: childId },
        data: { clinicId: facilityId },
      });
    }
  }

  return { affiliationId: affiliation.id, created: true };
}
