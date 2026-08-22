import { apiClient } from '@upllyft/api-client';

export type MomentCategory = 'WENT_WELL' | 'DIFFICULT' | 'CHANGED' | 'MILESTONE';
export type MomentCaptureVia = 'TEXT' | 'VOICE';
export type MiraInsightType = 'RECURRING_CHALLENGE' | 'EMERGING_PROGRESS' | 'STRATEGY_WORKS';
export type MiraInsightStatus = 'NEW' | 'WATCHING' | 'SHARED' | 'DISMISSED';
export type ProgressStatus = 'WATCH' | 'IMPROVING' | 'EMERGING' | 'STEADY' | 'NOTHING_NEW';

export interface Moment {
  id: string;
  text: string;
  category: MomentCategory | null;
  capturedVia: MomentCaptureVia;
  place: string | null;
  occurredAt: string;
  domainTags: string[];
  createdAt: string;
}

export interface MomentInterpretation {
  category: MomentCategory | null;
  domainTags: string[];
  domainLabels: string[];
  place: string | null;
  whatHeard: string;
  followUp: string | null;
}

export interface MiraInsight {
  id: string;
  type: MiraInsightType;
  title: string;
  body: string;
  whatHelped: string | null;
  whyMatters: string | null;
  settings: string[];
  sourceMomentIds: string[];
  status: MiraInsightStatus;
  generatedAt: string;
}

export interface ProgressArea {
  domain: string;
  label: string;
  status: ProgressStatus;
  facts: string[];
  momentCount: number;
  places: string[];
  latestMoment: { text: string; occurredAt: string } | null;
  flagged: boolean;
  trend: number[];
}

export interface ProgressResponse {
  areas: ProgressArea[];
  screening: { assessmentId: string; completedAt: string; flaggedDomains: string[] } | null;
}

export interface AreaEvidence {
  id: string;
  date: string;
  text: string;
  place: string | null;
  sourceType: string;
  sourceLabel: string;
}

export interface AreaDetail {
  domain: string;
  label: string;
  trend: number[];
  evidence: AreaEvidence[];
}

export async function listMoments(
  childId: string,
  params?: { category?: MomentCategory; domain?: string; limit?: number; offset?: number },
): Promise<{ moments: Moment[]; total: number }> {
  const { data } = await apiClient.get(`/children/${childId}/moments`, { params });
  return data;
}

export async function createMoment(
  childId: string,
  payload: {
    text: string;
    category?: MomentCategory;
    capturedVia?: MomentCaptureVia;
    place?: string;
    occurredAt?: string;
    domainTags?: string[];
    interpretation?: Record<string, unknown>;
  },
): Promise<Moment> {
  const { data } = await apiClient.post(`/children/${childId}/moments`, payload);
  return data;
}

export async function interpretMoment(childId: string, text: string): Promise<MomentInterpretation> {
  const { data } = await apiClient.post(`/children/${childId}/moments/interpret`, { text });
  return data;
}

export async function deleteMoment(childId: string, momentId: string): Promise<void> {
  await apiClient.delete(`/children/${childId}/moments/${momentId}`);
}

export async function getInsights(
  childId: string,
): Promise<{ insights: MiraInsight[]; momentCount: number }> {
  const { data } = await apiClient.get(`/children/${childId}/moments/insights`);
  return data;
}

export async function updateInsightStatus(
  childId: string,
  insightId: string,
  status: MiraInsightStatus,
): Promise<MiraInsight> {
  const { data } = await apiClient.patch(`/children/${childId}/moments/insights/${insightId}`, {
    status,
  });
  return data;
}

export async function getProgress(childId: string): Promise<ProgressResponse> {
  const { data } = await apiClient.get(`/children/${childId}/moments/progress`);
  return data;
}

export async function getAreaDetail(childId: string, domain: string): Promise<AreaDetail> {
  const { data } = await apiClient.get(`/children/${childId}/moments/progress/${domain}`);
  return data;
}
