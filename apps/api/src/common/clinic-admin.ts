import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { FacilityComplianceStatus, Prisma, PrismaClient, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FACILITY_ADMIN_ROLES } from './facility-scope';
import { resolveClinicScope, type TenantActor } from './tenant-scope';

/**
 * Clinic administration by OWNERSHIP, not only by `Role.ADMIN`.
 *
 * `Role.ADMIN` means both "platform admin" and "clinic admin", so a therapist who
 * runs their own practice cannot simply be promoted to it — that would also open
 * the admin console, every organisation and platform revenue. Instead, anyone who
 * holds an ACTIVE OWNER/ADMIN FacilityMember row on a CLINIC facility administers
 * THAT clinic, and nothing else.
 *
 * `Role.ADMIN` / `SUPERADMIN` keep passing exactly as they did under `@Roles(ADMIN)`.
 */

interface Actor extends TenantActor {}

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * The clinic this user administers (its id doubles as the facility id), or null.
 *
 * Facility ownership first; then the legacy `Clinic.adminId` link, which is still
 * how clinics created by a platform admin after the facility backfill are wired.
 */
export async function managedClinicFor(prisma: Db, actor: Actor): Promise<string | null> {
  const membership = await prisma.facilityMember.findFirst({
    where: {
      userId: actor.id,
      status: 'ACTIVE',
      role: { in: FACILITY_ADMIN_ROLES },
      facility: { type: 'CLINIC' },
    },
    select: { facilityId: true },
    orderBy: { createdAt: 'asc' },
  });
  if (membership) {
    // Only a facility with a legacy Clinic row behind it can be managed through
    // the clinic endpoints (Facility.id === Clinic.id).
    const clinic = await prisma.clinic.findUnique({
      where: { id: membership.facilityId },
      select: { id: true },
    });
    if (clinic) return clinic.id;
  }

  const legacy = await prisma.clinic.findUnique({
    where: { adminId: actor.id },
    select: { id: true },
  });
  return legacy?.id ?? null;
}

/** True for platform admins and for anyone who owns/administers a clinic facility. */
export async function isClinicAdmin(prisma: Db, actor: Actor): Promise<boolean> {
  if (actor.role === 'ADMIN' || actor.role === 'SUPERADMIN') return true;
  return (await managedClinicFor(prisma, actor)) !== null;
}

/**
 * Replaces `@Roles(Role.ADMIN)` on clinic-administration endpoints. Stamps the
 * managed clinic on `req.managedClinic` (null for a platform admin with no clinic)
 * so handlers don't repeat the lookup.
 */
@Injectable()
export class ClinicAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as Actor | undefined;
    if (!user) throw new ForbiddenException('Not authenticated');

    const managed = await managedClinicFor(this.prisma, user);
    req.managedClinic = managed;

    if (user.role === 'ADMIN' || user.role === 'SUPERADMIN') return true;

    // Endpoints that scope by the token act on the token's clinic, so an owner may
    // only use them there. A token minted before the practice existed carries no
    // scope yet; the clinic-admin endpoints (which use managedClinic) still work.
    let scope: string | null = null;
    try {
      scope = resolveClinicScope(user);
    } catch {
      scope = null;
    }
    if (managed && (!scope || scope === managed)) return true;

    throw new ForbiddenException('Only the clinic’s owner or administrators can do this.');
  }
}

/**
 * A therapist's own practice has no separate compliance reviewer: the review IS the
 * platform's licence verification of its owner. Keep the two in step, so a verified
 * therapist can open cases in their practice and a rejected one cannot.
 *
 * Scoped to practices OWNED by a THERAPIST account — multi-staff clinics run by an
 * ADMIN keep their own compliance review.
 */
export async function syncPracticeCompliance(
  prisma: Db,
  userId: string,
  verification: VerificationStatus,
): Promise<void> {
  const owner = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (owner?.role !== 'THERAPIST') return;

  const owned = await prisma.facilityMember.findMany({
    where: { userId, role: 'OWNER', status: 'ACTIVE', facility: { type: 'CLINIC' } },
    select: { facilityId: true },
  });
  if (owned.length === 0) return;

  const status = practiceComplianceFor(verification);
  const ids = owned.map((m) => m.facilityId);
  const data = {
    complianceStatus: status,
    complianceReviewedAt: status === 'ACTIVE' ? new Date() : null,
    complianceReviewedBy: status === 'ACTIVE' ? 'licence-verification' : null,
  };
  await prisma.facility.updateMany({ where: { id: { in: ids } }, data });
  await prisma.clinic.updateMany({ where: { id: { in: ids } }, data });
}

export function practiceComplianceFor(verification: VerificationStatus): FacilityComplianceStatus {
  if (verification === 'VERIFIED') return 'ACTIVE';
  if (verification === 'REJECTED') return 'SUSPENDED';
  return 'IN_REVIEW';
}
