import { ForbiddenException } from '@nestjs/common';
import { Prisma, PrismaClient, ConsentType } from '@prisma/client';
import {
  FACILITY_CAPABILITIES,
  facilityCan,
  scopeAtLeast,
  type DataScope,
  type FacilityCapability,
  type FacilityType,
} from './facility-capabilities';

/**
 * Phase E — consent as an ACCESS GATE, not a stored form.
 *
 * A grant reads: *this guardian permits THIS FACILITY to do THIS, for THIS
 * purpose, until THIS date, revocably.* Storing that and never checking it is the
 * failure mode this replaces.
 *
 * One resolver answers every access question in the product:
 *
 *   canAccess(actor, child, resource) =
 *        actor is a guardian with authority                  -> allow
 *     || actor staffs facility F
 *        AND child holds an ACTIVE affiliation to F
 *        AND an unrevoked, in-validity consent covers (F, resource)
 *        AND resource <= affiliation.dataScope
 *        AND F's type permits the action
 *                                                            -> allow
 *     otherwise                                              -> deny
 *
 * There is no path to a child that does not route through an affiliation, which is
 * the whole point: the unsafe query becomes the hard one to write.
 */

/** An unrevoked, in-validity consent of this type, granted to this facility. */
export function activeConsentWhere(
  childId: string,
  facilityId: string,
  type: ConsentType,
): Prisma.ChildConsentWhereInput {
  const now = new Date();
  return {
    childId,
    facilityId,
    type,
    revokedAt: null,
    validFrom: { lte: now },
    OR: [{ validUntil: null }, { validUntil: { gte: now } }],
  };
}

export async function hasConsent(
  prisma: PrismaClient | Prisma.TransactionClient,
  childId: string,
  facilityId: string,
  type: ConsentType,
): Promise<boolean> {
  const found = await prisma.childConsent.findFirst({
    where: activeConsentWhere(childId, facilityId, type),
    select: { id: true },
  });
  return !!found;
}

export interface ChildAccessRequest {
  childId: string;
  /** The facility the actor is acting on behalf of. Null = platform (SUPERADMIN). */
  facilityId: string | null;
  /** What the actor wants to do. Checked against the facility's capability map. */
  capability: FacilityCapability;
  /** Sensitivity of the data being reached for. Checked against the affiliation's scope. */
  requiredScope: DataScope;
  /** The consent that must exist for this action. */
  consentType: ConsentType;
}

export interface ChildAccessResult {
  allowed: boolean;
  reason?: string;
}

/**
 * The resolver. Deny by default; every clause must pass.
 *
 * NOTE this is deliberately NOT role-based. Holding the EDUCATOR role is not a
 * relationship to a child — staffing a facility the child is affiliated to, with
 * consent, is.
 */
export async function resolveChildAccess(
  prisma: PrismaClient | Prisma.TransactionClient,
  req: ChildAccessRequest,
): Promise<ChildAccessResult> {
  // Platform-wide (SUPERADMIN). Deliberate, and the only unscoped path.
  if (req.facilityId === null) return { allowed: true };

  // Fetch the affiliation WITHOUT filtering on status, then judge it. Filtering
  // here would collapse two very different denials — "we have never heard of this
  // child" and "you added this child and their guardian has not answered yet" —
  // into one misleading message telling a nursery that a child on its own roster is
  // not affiliated with it. The ACCESS DECISION is identical; the EXPLANATION is
  // not, and the explanation is what a keyworker reads.
  const affiliation = await prisma.childAffiliation.findFirst({
    where: {
      childId: req.childId,
      facilityId: req.facilityId,
      endedAt: null,
    },
    select: {
      status: true,
      dataScope: true,
      facility: { select: { type: true, name: true } },
    },
  });

  if (!affiliation) {
    return { allowed: false, reason: 'This child is not affiliated to your facility.' };
  }

  if (affiliation.status !== 'ACTIVE') {
    return {
      allowed: false,
      reason:
        affiliation.status === 'PENDING_CONSENT'
          ? "This child's guardian has not yet granted access. You can see that they are enrolled, and nothing more."
          : 'This child’s enrolment at your facility has ended.',
    };
  }

  const type = affiliation.facility.type as FacilityType;

  // What may a facility of this TYPE ever do? A nursery can never open a case or
  // record a diagnosis, whatever consent says — consent cannot grant a capability
  // the facility does not have.
  if (!facilityCan(type, req.capability)) {
    return {
      allowed: false,
      reason: `${affiliation.facility.name} is a ${type.toLowerCase()} and cannot perform this action.`,
    };
  }

  // How much may THIS affiliation see? Capped by the facility type's ceiling.
  if (!scopeAtLeast(affiliation.dataScope as DataScope, req.requiredScope)) {
    return {
      allowed: false,
      reason: `Your facility's access to this child is limited to ${affiliation.dataScope}.`,
    };
  }

  // And has the guardian actually agreed to it?
  if (!(await hasConsent(prisma, req.childId, req.facilityId, req.consentType))) {
    return {
      allowed: false,
      reason: `No active ${req.consentType} consent from the child's guardian.`,
    };
  }

  return { allowed: true };
}

/** Throwing form, for use in services and guards. */
export async function assertChildAccess(
  prisma: PrismaClient | Prisma.TransactionClient,
  req: ChildAccessRequest,
): Promise<void> {
  const result = await resolveChildAccess(prisma, req);
  if (!result.allowed) {
    throw new ForbiddenException(result.reason ?? 'Access denied.');
  }
}

/**
 * The ceiling a facility type may ever grant. Enforce on every write of
 * ChildAffiliation.dataScope — this is the invariant that keeps a nursery below the
 * diagnosis line, structurally rather than by convention.
 */
export function assertScopeWithinCeiling(type: FacilityType, scope: DataScope): void {
  const ceiling = FACILITY_CAPABILITIES[type].maxDataScope;
  if (!scopeAtLeast(ceiling, scope)) {
    throw new ForbiddenException(
      `A ${type.toLowerCase()} may not hold ${scope} access (ceiling: ${ceiling}).`,
    );
  }
}

export interface GrantConsentInput {
  childId: string;
  facilityId: string;
  type: ConsentType;
  purpose: string;
  /** The USER whose agreement this records. MUST be the guardian, never staff. */
  grantedByUserId: string;
  /** Staff member who captured it, when consent was taken in person. Audit only. */
  recordedByUserId?: string;
  validUntil?: Date | null;
  caseId?: string | null;
}

/**
 * Record that a guardian granted consent.
 *
 * ATTRIBUTION IS THE WHOLE POINT. `grantedByUserId` must be the guardian — the
 * person whose agreement this is. The intake write-through previously recorded
 * `grantedById: <the staff member typing the form>`, so the record asserted that the
 * therapist consented on the family's behalf. Staff CAPTURE consent; they do not
 * GIVE it. That distinction is the difference between a consent record and a
 * fiction.
 *
 * Resolves the child's Guardian row where one exists (the model that actually holds
 * `hasAuthorityToConsent`) and links the live affiliation.
 *
 * Idempotent: an existing active grant of the same (child, facility, type) is
 * returned rather than duplicated.
 */
export async function grantConsent(
  prisma: PrismaClient | Prisma.TransactionClient,
  input: GrantConsentInput,
) {
  const existing = await prisma.childConsent.findFirst({
    where: activeConsentWhere(input.childId, input.facilityId, input.type),
    select: { id: true },
  });
  if (existing) return existing;

  const guardian = await prisma.guardian.findFirst({
    where: {
      childId: input.childId,
      userId: input.grantedByUserId,
      hasAuthorityToConsent: true,
    },
    select: { id: true },
  });

  const affiliation = await prisma.childAffiliation.findFirst({
    where: { childId: input.childId, facilityId: input.facilityId, endedAt: null },
    select: { id: true, status: true },
  });

  const consent = await prisma.childConsent.create({
    data: {
      childId: input.childId,
      facilityId: input.facilityId,
      affiliationId: affiliation?.id ?? null,
      caseId: input.caseId ?? null,
      guardianId: guardian?.id ?? null,
      grantedById: input.grantedByUserId,
      type: input.type,
      purpose: input.purpose,
      validUntil: input.validUntil ?? null,
      notes: input.recordedByUserId
        ? `Captured by staff user ${input.recordedByUserId}`
        : null,
    },
    select: { id: true },
  });

  // The guardian's agreement is what ACTIVATES the affiliation.
  //
  // A facility-created child starts at PENDING_CONSENT: the nursery has added them
  // to a roster, and nothing more. Without this, the guardian could grant consent
  // and the affiliation would sit at PENDING_CONSENT forever — `resolveChildAccess`
  // requires an ACTIVE affiliation, so the nursery would be locked out of a child
  // whose parent had explicitly said yes. Consent is the gate; this is the gate
  // opening.
  //
  // Note the direction: this can only ever move PENDING_CONSENT -> ACTIVE. It never
  // resurrects an ENDED affiliation — a child who left the nursery does not
  // re-enrol because an old consent was re-granted.
  if (affiliation?.status === 'PENDING_CONSENT') {
    await prisma.childAffiliation.update({
      where: { id: affiliation.id },
      data: { status: 'ACTIVE' },
    });
  }

  return consent;
}

/** Revoke every active grant of this type. Revocation must bite immediately. */
export async function revokeConsent(
  prisma: PrismaClient | Prisma.TransactionClient,
  childId: string,
  facilityId: string,
  type: ConsentType,
): Promise<number> {
  const now = new Date();
  const res = await prisma.childConsent.updateMany({
    where: { childId, facilityId, type, revokedAt: null },
    data: { revokedAt: now },
  });
  return res.count;
}
