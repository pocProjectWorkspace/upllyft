import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient, FacilityRole } from '@prisma/client';

/**
 * Facility membership — the authority model for everything that is not a Case.
 *
 * WHY NOT `resolveClinicScope()`: that reads `clinicId` off the JWT, which only
 * exists for clinic staff. A nursery keyworker has no clinicId and never will, so
 * scoping them through it would either throw or (worse) fall back to unscoped.
 * Membership is resolved from the DB against the facility being addressed — one
 * role-agnostic lookup, the same shape `resolveTenantClaims` settled on.
 *
 * FAIL-CLOSED, and NOT-FOUND rather than FORBIDDEN: a caller who does not staff a
 * facility is told it does not exist. A 403 would confirm the id is real, which
 * hands an outsider a facility enumeration oracle for free.
 */

export interface FacilityActor {
  id: string;
  role: string;
}

/** Roles that may administer a facility — change its details, its rooms, its staff. */
export const FACILITY_ADMIN_ROLES: FacilityRole[] = ['OWNER', 'ADMIN'];

export interface FacilityMembership {
  facilityId: string;
  role: FacilityRole;
  /** True for SUPERADMIN, who staffs nothing but may see everything. */
  isPlatformAdmin: boolean;
}

/**
 * Assert the actor staffs this facility, optionally in one of `roles`.
 *
 * SUPERADMIN short-circuits to a synthetic membership. This is deliberate and it
 * is the same trap Phase D2 hit: a role-agnostic membership lookup silently scopes
 * a platform admin to whichever facility they happen to be a member of, or locks
 * them out of all of them. Platform-wide is a distinct state, not a missing one.
 */
export async function assertFacilityMember(
  prisma: PrismaClient | Prisma.TransactionClient,
  actor: FacilityActor | undefined,
  facilityId: string,
  roles?: FacilityRole[],
): Promise<FacilityMembership> {
  if (!actor) throw new ForbiddenException('Not authenticated');

  if (actor.role === 'SUPERADMIN') {
    const exists = await prisma.facility.findUnique({
      where: { id: facilityId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Facility not found.');
    return { facilityId, role: 'OWNER', isPlatformAdmin: true };
  }

  const membership = await prisma.facilityMember.findFirst({
    where: { facilityId, userId: actor.id, status: 'ACTIVE' },
    select: { facilityId: true, role: true },
  });

  // Not a member => as far as this caller is concerned, it does not exist.
  if (!membership) throw new NotFoundException('Facility not found.');

  if (roles && !roles.includes(membership.role)) {
    throw new ForbiddenException(
      `This action requires one of: ${roles.join(', ')}. You are ${membership.role}.`,
    );
  }

  return { ...membership, isPlatformAdmin: false };
}

/** Every facility the actor staffs. SUPERADMIN sees all — the only unscoped path. */
export function facilitiesVisibleTo(actor: FacilityActor): Prisma.FacilityWhereInput {
  if (actor.role === 'SUPERADMIN') return {};
  return { members: { some: { userId: actor.id, status: 'ACTIVE' } } };
}
