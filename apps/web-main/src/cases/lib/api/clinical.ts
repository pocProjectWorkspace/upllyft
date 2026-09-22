import { apiClient } from '@upllyft/api-client';
import type {
  TherapyDiscipline,
  ClinicalActivityType,
  ClinicalTemplateSchema,
  ClinicalAnswers,
  ClinicalPrefill,
  ClinicalInsights,
} from '@upllyft/types';

export type {
  TherapyDiscipline,
  ClinicalActivityType,
  ClinicalTemplateSchema,
  ClinicalAnswers,
  ClinicalPrefill,
  ClinicalInsights,
} from '@upllyft/types';

export type ClinicalRecordStatus = 'DRAFT' | 'SIGNED' | 'AMENDED';

export interface ClinicalTemplateSummary {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  discipline: TherapyDiscipline;
  activityType: ClinicalActivityType;
  version: number;
}

export interface ClinicalTemplateFull extends ClinicalTemplateSummary {
  schema: ClinicalTemplateSchema;
}

export interface CatalogEntry {
  discipline: TherapyDiscipline;
  activities: Array<{
    id: string;
    code: string;
    name: string;
    activityType: ClinicalActivityType;
  }>;
}

export interface ClinicalRecord {
  id: string;
  caseId: string;
  templateId: string;
  templateCode: string;
  templateVersion: number;
  discipline: TherapyDiscipline;
  activityType: ClinicalActivityType;
  title: string;
  answers: ClinicalAnswers;
  status: ClinicalRecordStatus;
  signedAt?: string | null;
  signatureName?: string | null;
  reportDocumentId?: string | null;
  insights?: ClinicalInsights | null;
  insightsModel?: string | null;
  insightsGeneratedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  template?: { id: string; code: string; name: string; schema?: ClinicalTemplateSchema };
  therapist?: { id: string; name: string; image?: string | null };
}

export interface CreateClinicalRecordInput {
  templateId: string;
  title?: string;
  answers?: ClinicalAnswers;
}

export interface PaginatedRecords {
  items: ClinicalRecord[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ── Templates ──

export async function getTemplateCatalog(): Promise<CatalogEntry[]> {
  const res = await apiClient.get('/clinical-templates/catalog');
  return res.data;
}

export async function listTemplates(params?: {
  discipline?: TherapyDiscipline;
  activityType?: ClinicalActivityType;
}): Promise<ClinicalTemplateSummary[]> {
  const res = await apiClient.get('/clinical-templates', { params });
  return res.data;
}

export async function getTemplate(id: string): Promise<ClinicalTemplateFull> {
  const res = await apiClient.get(`/clinical-templates/${id}`);
  return res.data;
}

// ── Records (case-scoped) ──

export async function getPrefill(caseId: string): Promise<ClinicalPrefill> {
  const res = await apiClient.get(`/cases/${caseId}/clinical-records/prefill`);
  return res.data;
}

export async function listRecords(
  caseId: string,
  params?: { activityType?: ClinicalActivityType; status?: ClinicalRecordStatus; cursor?: string; limit?: string },
): Promise<PaginatedRecords> {
  const res = await apiClient.get(`/cases/${caseId}/clinical-records`, { params });
  return res.data;
}

export async function getRecord(caseId: string, recordId: string): Promise<ClinicalRecord> {
  const res = await apiClient.get(`/cases/${caseId}/clinical-records/${recordId}`);
  return res.data;
}

export async function createRecord(
  caseId: string,
  data: CreateClinicalRecordInput,
): Promise<ClinicalRecord> {
  const res = await apiClient.post(`/cases/${caseId}/clinical-records`, data);
  return res.data;
}

export async function updateRecord(
  caseId: string,
  recordId: string,
  data: { title?: string; answers?: ClinicalAnswers },
): Promise<ClinicalRecord> {
  const res = await apiClient.patch(`/cases/${caseId}/clinical-records/${recordId}`, data);
  return res.data;
}

export async function signRecord(
  caseId: string,
  recordId: string,
  signatureName?: string,
): Promise<ClinicalRecord> {
  const res = await apiClient.post(`/cases/${caseId}/clinical-records/${recordId}/sign`, {
    signatureName,
  });
  return res.data;
}

export async function generateRecordReport(
  caseId: string,
  recordId: string,
  data?: { audience?: 'PROFESSIONAL' | 'PARENT'; additionalContext?: string },
): Promise<{ document: { id: string; title: string }; content: string }> {
  const res = await apiClient.post(
    `/cases/${caseId}/clinical-records/${recordId}/generate-report`,
    data ?? {},
  );
  return res.data;
}

export async function deleteRecord(caseId: string, recordId: string): Promise<{ success: boolean }> {
  const res = await apiClient.delete(`/cases/${caseId}/clinical-records/${recordId}`);
  return res.data;
}

export async function generateRecordInsights(
  caseId: string,
  recordId: string,
): Promise<{ insights: ClinicalInsights; insightsModel: string; insightsGeneratedAt: string }> {
  const res = await apiClient.post(
    `/cases/${caseId}/clinical-records/${recordId}/insights`,
  );
  return res.data;
}
