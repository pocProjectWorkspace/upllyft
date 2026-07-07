import { apiClient } from '@upllyft/api-client';

export type CarePlanRecommendation =
  | 'NONE'
  | 'SINGLE_ASSESSMENT'
  | 'MDT_ASSESSMENT'
  | 'THERAPY'
  | 'COACHING'
  | 'REFERRAL';
export type CarePlanPaymentStatus = 'PAID' | 'PENDING' | 'PREAUTH';
export type CarePlanStatus = 'DRAFT' | 'LOCKED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type TherapyDiscipline =
  | 'SPEECH'
  | 'OCCUPATIONAL'
  | 'BEHAVIOUR_ABA'
  | 'PSYCHOLOGY'
  | 'SPECIAL_EDUCATION'
  | 'PHYSIOTHERAPY'
  | 'MEDICAL'
  | 'MULTIDISCIPLINARY'
  | 'UNIVERSAL';

export interface CarePlanPricingDefault {
  id: string;
  recommendation: CarePlanRecommendation;
  label: string;
  unitPrice: number;
  currency: string;
  defaultCount: number;
  defaultDaysPerWeek: number;
  defaultDays: number[];
  packageType?: string | null;
}

export interface CarePlan {
  id: string;
  caseId: string;
  consultationRecordId?: string | null;
  recommendation: CarePlanRecommendation;
  disciplines: TherapyDiscipline[];
  primaryTherapistId?: string | null;
  startDate: string;
  timeOfDay: string;
  daysOfWeek: number[];
  daySchedule?: Record<string, string> | null;
  sessionCount: number;
  packageName?: string | null;
  unitPrice: number;
  currency: string;
  totalAmount: number;
  paymentStatus: CarePlanPaymentStatus;
  reviewInWeeks?: number | null;
  externalReferralTarget?: string | null;
  status: CarePlanStatus;
  iepId?: string | null;
  mode?: string | null;
  sessionDurationMin?: number | null;
  parentHomeProgram?: string | null;
  expectedOutcomes?: string | null;
  reviewDate?: string | null;
  parentAcceptedAt?: string | null;
  lockedAt?: string | null;
  createdAt: string;
  sessions?: any[];
  _count?: { sessions: number };
}

export interface CreateCarePlanInput {
  consultationRecordId?: string;
  consultationNotes?: string;
  recommendation: CarePlanRecommendation;
  disciplines?: TherapyDiscipline[];
  primaryTherapistId?: string;
  startDate: string;
  timeOfDay: string;
  daysOfWeek: number[];
  daySchedule?: Record<string, string>;
  sessionCount: number;
  packageName?: string;
  unitPrice?: number;
  paymentStatus?: CarePlanPaymentStatus;
  reviewInWeeks?: number;
  externalReferralTarget?: string;
  iepId?: string;
  mode?: string;
  sessionDurationMin?: number;
  parentHomeProgram?: string;
  expectedOutcomes?: string;
  reviewDate?: string;
}

const base = (caseId: string) => `/cases/${caseId}/care-plans`;

export const getPricingDefaults = (caseId: string): Promise<CarePlanPricingDefault[]> =>
  apiClient.get(`${base(caseId)}/pricing-defaults`).then((r) => r.data);

export const previewSchedule = (
  caseId: string,
  data: { startDate: string; timeOfDay: string; daysOfWeek: number[]; sessionCount: number },
): Promise<{ count: number; dates: string[] }> =>
  apiClient.post(`${base(caseId)}/preview-schedule`, data).then((r) => r.data);

export const listCarePlans = (caseId: string): Promise<CarePlan[]> =>
  apiClient.get(base(caseId)).then((r) => r.data);

export const getCarePlan = (caseId: string, planId: string): Promise<CarePlan> =>
  apiClient.get(`${base(caseId)}/${planId}`).then((r) => r.data);

export const createCarePlan = (caseId: string, data: CreateCarePlanInput): Promise<CarePlan> =>
  apiClient.post(base(caseId), data).then((r) => r.data);

export const updateCarePlan = (
  caseId: string,
  planId: string,
  data: Partial<CreateCarePlanInput>,
): Promise<CarePlan> =>
  apiClient.patch(`${base(caseId)}/${planId}`, data).then((r) => r.data);

export const lockCarePlan = (caseId: string, planId: string): Promise<CarePlan> =>
  apiClient.post(`${base(caseId)}/${planId}/lock`, {}).then((r) => r.data);

export const confirmCarePlan = (
  caseId: string,
  planId: string,
): Promise<{ plan: CarePlan; sessionsCreated: number }> =>
  apiClient.post(`${base(caseId)}/${planId}/confirm`, {}).then((r) => r.data);
