import { Prisma, PrismaClient } from '@prisma/client';

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
 * Attach a child to a facility. DUAL-WRITE: sets the legacy `Child.clinicId` AND
 * creates the affiliation, so migrated and un-migrated readers agree.
 *
 * Idempotent — re-attaching an already-active child is a no-op rather than a
 * duplicate affiliation.
 *
 * Drop the `clinicId` half in Phase F.
 */
export async function attachChildToFacility(
  prisma: PrismaClient | Prisma.TransactionClient,
  childId: string,
  facilityId: string,
  opts: { type?: 'PATIENT' | 'ENROLLED'; dataScope?: 'OBSERVATIONS_ONLY' | 'FULL_CLINICAL' } = {},
): Promise<void> {
  const type = opts.type ?? 'PATIENT';
  const dataScope = opts.dataScope ?? (type === 'PATIENT' ? 'FULL_CLINICAL' : 'OBSERVATIONS_ONLY');

  const existing = await prisma.childAffiliation.findFirst({
    where: { childId, facilityId, endedAt: null },
    select: { id: true },
  });

  if (!existing) {
    await prisma.childAffiliation.create({
      data: { childId, facilityId, type, status: 'ACTIVE', dataScope },
    });
  }

  // Legacy mirror — remove in Phase F.
  await prisma.child.update({
    where: { id: childId },
    data: { clinicId: facilityId },
  });
}
