import { apiClient } from '@upllyft/api-client';

// Clinic Portal: the parent's view over the clinic's own records. Shapes mirror
// apps/api/src/clinic-portal/clinic-portal.service.ts.

export type ConsentKey = 'assessment' | 'therapy' | 'reports' | 'tele' | 'media' | 'ai';
export type SessionStatus = 'scheduled' | 'rescheduled' | 'cancelled' | 'attended' | 'missed';

export interface PortalClinic {
  key: string;
  facilityId: string | null;
  name: string;
  short: string;
  initials: string;
  colorIndex: number;
  area: string | null;
  phone: string | null;
  source: 'clinic' | 'upllyft';
  therapist: string | null;
  therapistUserId: string | null;
  discipline: string | null;
  changeWindowHours: number;
  plan: { label: string; done: number; total: number } | null;
  intake: {
    caseId: string;
    status: 'NOT_STARTED' | 'SUBMITTED' | 'REVIEWED';
    submittedAt: string | null;
    reviewedAt: string | null;
    due: string | null;
  } | null;
  /** Null when the link has no facility (an independent therapist). */
  consents: Record<ConsentKey, boolean> | null;
}

export interface PortalSession {
  id: string;
  clinicKey: string;
  type: 'Session' | 'Consultation' | 'Assessment';
  title: string;
  startAt: string;
  mins: number;
  mode: 'online' | 'inperson';
  status: SessionStatus;
  therapist: string | null;
  hasSummary: boolean;
}

export interface PortalAssessment {
  id: string;
  clinicKey: string;
  title: string;
  at: string | null;
  upcoming: boolean;
  mode: 'async' | null;
  therapist: string | null;
  prep: string[];
  reportShared: boolean;
  /** Shared by the clinic, but the parent's report-sharing consent is off. */
  reportWithheld: boolean;
  sharedAt: string | null;
}

export interface PortalActivity {
  id: string;
  kind: 'WORKSHEET' | 'LIBRARY';
  resourceId: string;
  clinicKey: string | null;
  title: string;
  description: string | null;
  type: string | null;
  domain: string | null;
  minutes: number | null;
  note: string | null;
  therapist: string | null;
  sharedAt: string | null;
  isNew: boolean;
  triedThisWeek: boolean;
  openUrl: string | null;
}

export interface Portal {
  child: { id: string; firstName: string; dateOfBirth: string | null };
  multipleChildren: boolean;
  clinics: PortalClinic[];
  sessions: PortalSession[];
  assessments: PortalAssessment[];
  activities: PortalActivity[];
  cancelReasons: string[];
  now: string;
}

export interface SlotDay {
  date: string;
  slots: Array<{ start: string; available: boolean }>;
}

export interface PortalReport {
  id: string;
  title: string;
  sharedAt: string | null;
  therapist: string | null;
  text: string;
  fileUrl: string | null;
}

export interface PortalSummary {
  title: string;
  at: string;
  therapist: string | null;
  summary: { workedOn?: string | null; howTheyDid?: string | null; tryAtHome?: string | null };
  sharedAt: string | null;
}

export interface PortalIntake {
  child: { firstName: string; dateOfBirth: string | null };
  clinicName: string | null;
  intake: Record<string, any> | null;
  prefill: {
    fromClinic: string;
    data: Record<string, any>;
    presentingConcern: string | null;
    referralQuestions: string[];
    parentGoals: string[];
  } | null;
}

const base = (childId: string) => `/clinic-portal/children/${childId}`;

export const portalApi = {
  get: async (childId: string): Promise<Portal> => (await apiClient.get(base(childId))).data,
  slots: async (childId: string, sessionId: string): Promise<{ days: SlotDay[]; windowHours?: number; reason?: string }> =>
    (await apiClient.get(`${base(childId)}/sessions/${sessionId}/slots`)).data,
  reschedule: async (childId: string, sessionId: string, startAt: string) =>
    (await apiClient.post(`${base(childId)}/sessions/${sessionId}/reschedule`, { startAt })).data,
  cancel: async (childId: string, sessionId: string, reason: string) =>
    (await apiClient.post(`${base(childId)}/sessions/${sessionId}/cancel`, { reason })).data,
  summary: async (childId: string, sessionId: string): Promise<PortalSummary> =>
    (await apiClient.get(`${base(childId)}/sessions/${sessionId}/summary`)).data,
  report: async (childId: string, reviewId: string): Promise<PortalReport> =>
    (await apiClient.get(`${base(childId)}/reports/${reviewId}`)).data,
  seen: async (childId: string, itemId: string) => (await apiClient.post(`${base(childId)}/activities/${itemId}/seen`)).data,
  setConsent: async (childId: string, facilityId: string, key: ConsentKey, value: boolean) =>
    (await apiClient.put(`${base(childId)}/clinics/${facilityId}/consents`, { key, value })).data,
  intake: async (childId: string, caseId: string): Promise<PortalIntake> =>
    (await apiClient.get(`${base(childId)}/intake/${caseId}`)).data,
  submitIntake: async (childId: string, caseId: string, body: Record<string, unknown>) =>
    (await apiClient.post(`${base(childId)}/intake/${caseId}`, body)).data,
};

/** The API's message, for a toast. */
export function errorMessage(e: any, fallback = 'Something went wrong. Please try again.'): string {
  const m = e?.response?.data?.message;
  if (typeof m === 'string') return m;
  if (m && typeof m.message === 'string') return m.message;
  return fallback;
}
