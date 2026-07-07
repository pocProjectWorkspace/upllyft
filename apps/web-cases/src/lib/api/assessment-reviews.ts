import { apiClient } from '@upllyft/api-client';
import type { TherapyDiscipline } from '@/lib/api/care-plans';

export type AssessmentReviewType = 'SINGLE' | 'MDT';
export type AssessmentPhase = 'PLAN' | 'EXEC' | 'REPORT' | 'SHARED';
export type AssessmentExecStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED';

export interface AssessmentDiscipline {
  id: string;
  discipline: TherapyDiscipline;
  status: AssessmentExecStatus;
  assignee?: string | null;
  clinicalRecordId?: string | null;
  reportTitle?: string | null;
  flagged: boolean;
}

export interface AssessmentReview {
  id: string;
  caseId: string;
  type: AssessmentReviewType;
  phase: AssessmentPhase;
  title?: string | null;
  scopeText?: string | null;
  scopeApproved: boolean;
  dayMode?: string | null;
  questionnaireSent: boolean;
  schoolInputRequested: boolean;
  paymentStatus: 'PAID' | 'PENDING' | 'PREAUTH';
  meetingAt?: string | null;
  syncMode?: string | null;
  reportText?: string | null;
  approval?: string | null;
  recipients?: { parent?: boolean; school?: boolean; doctor?: boolean } | null;
  sharedAt?: string | null;
  disciplines: AssessmentDiscipline[];
  createdAt: string;
}

const base = (caseId: string) => `/cases/${caseId}/assessment-reviews`;

export const listReviews = (caseId: string): Promise<AssessmentReview[]> =>
  apiClient.get(base(caseId)).then((r) => r.data);
export const getReview = (caseId: string, id: string): Promise<AssessmentReview> =>
  apiClient.get(`${base(caseId)}/${id}`).then((r) => r.data);
export const createReview = (
  caseId: string,
  data: { type: AssessmentReviewType; disciplines: TherapyDiscipline[]; title?: string },
): Promise<AssessmentReview> => apiClient.post(base(caseId), data).then((r) => r.data);
export const updateReview = (
  caseId: string,
  id: string,
  data: Partial<AssessmentReview> & { meetingAt?: string },
): Promise<AssessmentReview> => apiClient.patch(`${base(caseId)}/${id}`, data).then((r) => r.data);
export const addDiscipline = (
  caseId: string,
  id: string,
  discipline: TherapyDiscipline,
): Promise<AssessmentReview> =>
  apiClient.post(`${base(caseId)}/${id}/disciplines`, { discipline, flagged: true }).then((r) => r.data);
export const updateDiscipline = (
  caseId: string,
  id: string,
  rowId: string,
  data: { status?: AssessmentExecStatus; assignee?: string; reportTitle?: string },
): Promise<AssessmentReview> =>
  apiClient.patch(`${base(caseId)}/${id}/disciplines/${rowId}`, data).then((r) => r.data);
export const draftReport = (caseId: string, id: string): Promise<AssessmentReview> =>
  apiClient.post(`${base(caseId)}/${id}/draft-report`, {}).then((r) => r.data);
export const shareReport = (
  caseId: string,
  id: string,
  recipients: { parent?: boolean; school?: boolean; doctor?: boolean },
): Promise<AssessmentReview> =>
  apiClient.post(`${base(caseId)}/${id}/share`, { recipients }).then((r) => r.data);
