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

// ── Observations a guardian can see (F5) ──

export interface GuardianObservation {
  id: string;
  note: string;
  domain: string | null;
  type: 'NOTE' | 'MOMENT' | 'MILESTONE' | 'CONCERN';
  observedAt: string;
  createdAt: string;
  author: { id: string; name: string | null } | null;
  facilityName: string | null;
}

export const getChildObservations = (childId: string): Promise<GuardianObservation[]> =>
  apiClient.get(`/children/${childId}/observations`).then(r => r.data);

// ── Concerns a nursery has shared (F6) ──

export interface GuardianConcern {
  id: string;
  status: 'SHARED' | 'ACKNOWLEDGED' | 'CLOSED';
  domains: string[];
  summary: string;
  sharedAt: string | null;
  acknowledgedAt: string | null;
  yourResponse: string | null;
  facilityName: string;
}

export const getChildConcerns = (childId: string): Promise<GuardianConcern[]> =>
  apiClient.get(`/children/${childId}/concerns`).then(r => r.data);

export const acknowledgeConcern = (childId: string, concernId: string, response?: string) =>
  apiClient.post(`/children/${childId}/concerns/${concernId}/acknowledge`, { response }).then(r => r.data);

// ── Support plans a nursery has shared (F7 + F8) ──

export interface GuardianHomeStrategy {
  id: string;
  title: string;
  description: string | null;
  status: string;
}

export interface GuardianOutcome {
  id: string;
  domain: string;
  outcomeText: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'ACHIEVED' | 'DISCONTINUED';
  progress: number;
  homeStrategies: GuardianHomeStrategy[];
}

export interface GuardianSupportReview {
  id: string;
  progressNote: string | null;
  decision: string;
  reviewedAt: string;
}

export interface GuardianSupportPlan {
  id: string;
  status: 'ACTIVE' | 'UNDER_REVIEW' | 'CLOSED';
  title: string;
  domains: string[];
  summary: string | null;
  reviewDate: string | null;
  sharedAt: string | null;
  acknowledgedAt: string | null;
  yourResponse: string | null;
  facilityName: string | null;
  outcomes: GuardianOutcome[];
  reviews: GuardianSupportReview[];
}

export const getChildSupportPlans = (childId: string): Promise<GuardianSupportPlan[]> =>
  apiClient.get(`/children/${childId}/support-plans`).then(r => r.data);

export const acknowledgeSupportPlan = (childId: string, planId: string, response?: string) =>
  apiClient.post(`/children/${childId}/support-plans/${planId}/acknowledge`, { response }).then(r => r.data);
