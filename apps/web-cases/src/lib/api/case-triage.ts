import { apiClient } from '@upllyft/api-client';

export type TriageDecision =
  | 'PROCEED'
  | 'REQUEST_MORE_INFO'
  | 'URGENT_REFERRAL'
  | 'ALTERNATE_SERVICE'
  | 'OUT_OF_SCOPE';
export type TriagePathway =
  | 'CONSULTATION_ONLY'
  | 'SINGLE_ASSESSMENT'
  | 'MDT_ASSESSMENT'
  | 'THERAPY_TRIAL'
  | 'PARENT_COUNSELLING'
  | 'EXTERNAL_REFERRAL';
export type RiskLevel = 'NONE' | 'LOW' | 'MODERATE' | 'HIGH';

export interface TriageCandidate {
  id: string; // TherapistProfile id
  userId: string;
  name: string;
  image?: string | null;
  discipline: string;
  languages: string[];
  languageMatch: boolean;
  languageLabel: string;
  ageExpertise: boolean;
  ageLabel: string;
  caseloadPct: number;
  openSlots: number;
  conflictOfInterest: boolean;
  bestMatch: boolean;
}

export interface ConfirmTriageInput {
  decision: TriageDecision;
  riskLevel?: RiskLevel;
  pathway?: TriagePathway;
  primaryTherapistId?: string;
  secondaryTherapistIds?: string[];
  appointment?: { type?: string; scheduledAt?: string; durationMin?: number; location?: string };
  notify?: { channel?: string; message?: string; requireAck?: boolean };
  riskFlags?: Record<string, boolean>;
  aiSummary?: string;
  notes?: string;
  infoRequested?: string[];
  referralTarget?: string;
  referralReason?: string;
}

const base = (caseId: string) => `/cases/${caseId}/triage-spine`;

export const getCurrentTriage = (caseId: string) =>
  apiClient.get(`${base(caseId)}/current`).then((r) => r.data);

export const getTriageCandidates = (caseId: string): Promise<TriageCandidate[]> =>
  apiClient.get(`${base(caseId)}/candidates`).then((r) => r.data);

export const confirmTriage = (caseId: string, data: ConfirmTriageInput) =>
  apiClient.post(`${base(caseId)}/confirm`, data).then((r) => r.data);

// ── Therapist availability (for Triage Step-4 scheduling, TC-TRI-01/02) ──
// Reuses the marketplace availability endpoint: recurring weekly slots + leave
// exceptions. No sessionTypeId needed (unlike :id/slots), so it works at triage.
export interface TherapistAvailabilityData {
  recurring: { id: string; dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }[];
  exceptions: { id: string; date: string; type: string }[];
}

export async function getTherapistAvailabilityForTriage(
  therapistId: string,
): Promise<TherapistAvailabilityData> {
  const { data } = await apiClient.get<TherapistAvailabilityData>(
    `/marketplace/therapists/${therapistId}/availability`,
  );
  return data;
}
