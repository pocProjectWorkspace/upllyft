import { apiClient } from '@upllyft/api-client';

export type EscalationStatus =
  | 'OPEN'
  | 'IN_REVIEW'
  | 'ACTION_TAKEN'
  | 'REFERRAL_SENT'
  | 'CONTINUED'
  | 'CLOSED';
export type IncidentCategory =
  | 'MEDICAL_INSTABILITY'
  | 'MENTAL_HEALTH_RISK'
  | 'SAFEGUARDING'
  | 'SEVERE_BEHAVIOUR'
  | 'ABUSE_NEGLECT'
  | 'OUT_OF_SCOPE'
  | 'OTHER';
export type IncidentUrgency = 'EMERGENCY' | 'URGENT' | 'ROUTINE';

export interface Escalation {
  id: string;
  caseId: string;
  category: IncidentCategory;
  urgency: IncidentUrgency;
  status: EscalationStatus;
  riskLabel?: string | null;
  referralTarget?: string | null;
  reviewerNote?: string | null;
  reviewerApproved: boolean;
  consentObtained: boolean;
  shareScope?: Record<string, boolean> | null;
  followUpOutcome?: string | null;
  raisedFromModule?: string | null;
  description: string;
  sentAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
}

export interface CreateEscalationInput {
  category?: IncidentCategory;
  urgency?: IncidentUrgency;
  source?: string;
  riskLabel?: string;
  description?: string;
}
export interface UpdateEscalationInput {
  category?: IncidentCategory;
  urgency?: IncidentUrgency;
  riskLabel?: string;
  referralTarget?: string;
  reviewerNote?: string;
  reviewerApproved?: boolean;
  consentObtained?: boolean;
  shareScope?: Record<string, boolean>;
  description?: string;
}

const base = (caseId: string) => `/cases/${caseId}/escalations`;

export const listEscalations = (caseId: string): Promise<Escalation[]> =>
  apiClient.get(base(caseId)).then((r) => r.data);
export const getEscalation = (caseId: string, id: string): Promise<Escalation> =>
  apiClient.get(`${base(caseId)}/${id}`).then((r) => r.data);
export const createEscalation = (caseId: string, data: CreateEscalationInput): Promise<Escalation> =>
  apiClient.post(base(caseId), data).then((r) => r.data);
export const updateEscalation = (caseId: string, id: string, data: UpdateEscalationInput): Promise<Escalation> =>
  apiClient.patch(`${base(caseId)}/${id}`, data).then((r) => r.data);
export const sendReferral = (caseId: string, id: string): Promise<Escalation> =>
  apiClient.post(`${base(caseId)}/${id}/send`, {}).then((r) => r.data);
export const followUpEscalation = (
  caseId: string,
  id: string,
  data: { outcome?: string; action: 'close' | 'continue' },
): Promise<Escalation> => apiClient.post(`${base(caseId)}/${id}/follow-up`, data).then((r) => r.data);
