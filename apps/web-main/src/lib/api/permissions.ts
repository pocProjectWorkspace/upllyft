import { apiClient } from '@upllyft/api-client';

/**
 * A guardian's view of who has asked for access to their child, and what they've said.
 *
 * The API returns PENDING_CONSENT affiliations too — a nursery that has added the child
 * but been granted nothing. That is the most important row on this screen: it is a
 * request still waiting on the parent, and hiding it would hide the only thing they can
 * act on.
 */
export interface FacilityPermission {
  facilityId: string;
  facilityName: string;
  facilityType: 'CLINIC' | 'NURSERY' | 'SCHOOL';
  relationship: 'PATIENT' | 'ENROLLED';
  dataScope: string;
  status: 'PENDING_CONSENT' | 'ACTIVE' | 'ENDED';
  granted: { type: string; since: string; until: string | null }[];
}

export const getPermissions = (childId: string): Promise<FacilityPermission[]> =>
  apiClient.get(`/child-consent/child/${childId}`).then(r => r.data);

export const grantConsent = (data: {
  childId: string;
  facilityId: string;
  type: string;
  purpose?: string;
}) => apiClient.post('/child-consent/grant', data).then(r => r.data);

/** Revocation must bite immediately — the gate re-checks on every access. */
export const revokeConsent = (childId: string, facilityId: string, type: string) =>
  apiClient.delete(`/child-consent/grant/${childId}/${facilityId}/${type}`).then(r => r.data);
