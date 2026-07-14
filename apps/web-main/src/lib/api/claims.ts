import { apiClient } from '@upllyft/api-client';

export interface ClaimPreview {
  status: 'PENDING' | 'ACCEPTED' | 'DISPUTED' | 'EXPIRED' | 'REVOKED';
  expired: boolean;
  facilityName: string;
  facilityType: 'CLINIC' | 'NURSERY' | 'SCHOOL';
  childFirstName: string;
  guardianName: string;
  guardianEmail: string;
}

export interface ClaimCandidates {
  claimed: { firstName: string; dateOfBirth: string; facilityName: string };
  yourChildren: { id: string; firstName: string; dateOfBirth: string }[];
}

export interface ClaimAccepted {
  childId: string;
  facilityId: string;
  facilityName: string;
  merged: boolean;
  consentRequired: boolean;
}

/** Unauthenticated — you can't decide whether to sign up until you can see who's asking. */
export const previewClaim = (token: string): Promise<ClaimPreview> =>
  apiClient.get(`/child-claims/${token}`).then(r => r.data);

export const claimCandidates = (token: string): Promise<ClaimCandidates> =>
  apiClient.get(`/child-claims/${token}/candidates`).then(r => r.data);

export const acceptClaim = (token: string, existingChildId?: string): Promise<ClaimAccepted> =>
  apiClient
    .post(`/child-claims/${token}/accept`, existingChildId ? { existingChildId } : {})
    .then(r => r.data);

/** Unauthenticated by design — nobody should need an account to say "not my child". */
export const disputeClaim = (token: string, reason?: string) =>
  apiClient.post(`/child-claims/${token}/dispute`, { reason }).then(r => r.data);

/**
 * Consent is a SEPARATE act from claiming. Claiming says "yes, that's my child";
 * this says "and yes, you may record observations about them". Collapsing the two
 * into one button would make the consent meaningless.
 */
export const grantConsent = (data: {
  childId: string;
  facilityId: string;
  type: string;
  purpose?: string;
}) => apiClient.post('/child-consent/grant', data).then(r => r.data);
