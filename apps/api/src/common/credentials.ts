import { ForbiddenException } from '@nestjs/common';
import { CredentialStatus } from '@prisma/client';

/**
 * The licence gate: a therapist may only be put on a case when their licence is
 * VERIFIED and unexpired.
 *
 * This lives in common/ because it was previously a PRIVATE method on CasesService
 * and therefore enforced on exactly ONE of the two case-creation paths.
 * `cases.service.createCase` checked it; `clinic-patients.assignTherapist` — which
 * also creates cases and CaseTherapist rows — did not, so an unverified clinician
 * could be put on a case through the admin route while the same action was refused
 * through the therapist route.
 *
 * A gate enforced at one choke point and missed at another is not a gate. If you add
 * a third path that assigns a clinician, call this.
 */
export interface AssignableProfile {
  credentialStatus: CredentialStatus;
  licenceExpiry: Date | null;
}

/**
 * The same rule as a value, for lists that must show who can be picked (the assign
 * modal) rather than fail after the pick. The reason is the gate's own message.
 */
export function therapistAssignability(profile: AssignableProfile): {
  assignable: boolean;
  reason: string | null;
} {
  if (profile.credentialStatus !== CredentialStatus.VERIFIED) {
    return {
      assignable: false,
      reason: 'Therapist licence is not verified — they cannot be assigned to a case.',
    };
  }
  if (profile.licenceExpiry && profile.licenceExpiry.getTime() < Date.now()) {
    return {
      assignable: false,
      reason: 'Therapist licence has expired — they cannot be assigned to a case.',
    };
  }
  return { assignable: true, reason: null };
}

export function assertTherapistAssignable(profile: AssignableProfile): void {
  const { assignable, reason } = therapistAssignability(profile);
  if (!assignable) throw new ForbiddenException(reason);
}
