import { ForbiddenException } from '@nestjs/common';

export interface TenantActor {
  id: string;
  role: string;
  clinicId?: string | null;
  organizationId?: string | null;
}

/**
 * Resolve the clinic a request is scoped to. FAIL-CLOSED.
 *
 * Returns:
 *   - a clinicId  → caller sees only that clinic's data
 *   - null        → SUPERADMIN only; platform-wide read is intentional
 *
 * Throws for any other actor without a clinic. Do NOT "helpfully" fall back to an
 * unscoped query when clinicId is absent — an absent scope must REJECT, never
 * widen. The `...(clinicId ? { clinicId } : {})` idiom this replaces did the
 * opposite, and is the reason scope resolution now lives in one place.
 *
 * This is an interim guard. It disappears when Facility/ChildAffiliation lands
 * and scoping becomes a join rather than a filter — see
 * docs/tenancy-and-multi-setting-model.md.
 */
export function resolveClinicScope(user: TenantActor | undefined): string | null {
  if (!user) throw new ForbiddenException('Not authenticated');

  if (user.role === 'SUPERADMIN') return null;

  if (!user.clinicId) {
    throw new ForbiddenException(
      'Your account is not associated with a clinic. Ask a platform admin to assign you to one.',
    );
  }

  return user.clinicId;
}
