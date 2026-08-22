import { apiClient } from '@upllyft/api-client';

export interface FindCareChild {
  id: string;
  firstName: string;
  dateOfBirth: string;
  primaryLanguage?: string | null;
}

export interface ChildScreeningSummary {
  assessmentId: string | null;
  completedAt: string | null;
  flaggedDomains: string[];
}

export async function getMyChildren(): Promise<FindCareChild[]> {
  const { data } = await apiClient.get('/profile/me');
  return (data?.children ?? []).map((c: any) => ({
    id: c.id,
    firstName: c.firstName,
    dateOfBirth: c.dateOfBirth,
    primaryLanguage: c.primaryLanguage ?? null,
  }));
}

/** The latest COMPLETED screening for a child, or nulls if they haven't screened. */
export async function getChildScreening(childId: string): Promise<ChildScreeningSummary> {
  const { data } = await apiClient.get(`/assessments/child/${childId}`);
  const list: any[] = Array.isArray(data) ? data : (data?.assessments ?? []);
  const completed = list
    .filter((a) => a.status === 'COMPLETED')
    .sort((a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime());
  const latest = completed[0];
  return {
    assessmentId: latest?.id ?? null,
    completedAt: latest?.completedAt ?? null,
    flaggedDomains: latest?.flaggedDomains ?? [],
  };
}

export const DOMAIN_LABELS: Record<string, string> = {
  grossMotor: 'Gross motor',
  fineMotor: 'Fine motor',
  speechLanguage: 'Speech & language',
  socialEmotional: 'Social-emotional',
  cognitiveLearning: 'Cognitive / learning',
  adaptiveSelfCare: 'Adaptive / self-care',
  sensoryProcessing: 'Sensory processing',
  visionHearing: 'Vision & hearing',
};

/** Parent-friendly concern picker — deliberately NOT clinical terms. */
export const CONCERN_OPTIONS = [
  { id: 'talking', label: 'Talking & understanding' },
  { id: 'sounds', label: 'Sounds & textures' },
  { id: 'feelings', label: 'Big feelings' },
  { id: 'moving', label: 'Moving & coordination' },
  { id: 'notsure', label: 'Not sure yet' },
] as const;
