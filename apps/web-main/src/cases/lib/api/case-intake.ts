import { apiClient } from '@upllyft/api-client';

export type IntakeState = 'DRAFT' | 'SUMMARISED';

export interface CaseIntake {
  id: string;
  caseId: string;
  state: IntakeState;
  data: Record<string, any>;
  presentingConcern?: string | null;
  referralQuestions: string[];
  parentGoals: string[];
  urgencyFlag?: string | null;
  aiSummary?: string | null;
  consentAssessment: boolean;
  consentTherapy: boolean;
  consentSharing: boolean;
  consentAi: boolean;
  recordedBy?: string | null;
  summarisedAt?: string | null;
  updatedAt: string;
}

export interface SaveCaseIntakeInput {
  data?: Record<string, any>;
  presentingConcern?: string;
  referralQuestions?: string[];
  parentGoals?: string[];
  urgencyFlag?: string;
  consentAssessment?: boolean;
  consentTherapy?: boolean;
  consentSharing?: boolean;
  consentAi?: boolean;
  recordedBy?: string;
}

const base = (caseId: string) => `/cases/${caseId}/intake`;

export const getIntake = (caseId: string): Promise<CaseIntake | null> =>
  apiClient.get(base(caseId)).then((r) => r.data);

export const saveIntakeDraft = (caseId: string, data: SaveCaseIntakeInput): Promise<CaseIntake> =>
  apiClient.put(`${base(caseId)}/draft`, data).then((r) => r.data);

export const summariseIntake = (caseId: string, data: SaveCaseIntakeInput): Promise<CaseIntake> =>
  apiClient.post(`${base(caseId)}/summarise`, data).then((r) => r.data);
