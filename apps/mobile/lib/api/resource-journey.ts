import api from '../api';
import type { JourneyDomain, JourneyItemStatus } from '../journey';

export type ResourceKind = 'WORKSHEET' | 'LIBRARY';

export interface JourneyChild {
  id: string;
  firstName: string;
  dateOfBirth: string | null;
}

export interface LibraryCard {
  kind: ResourceKind;
  id: string;
  title: string;
  description: string | null;
  type: string;
  domains: JourneyDomain[];
  durationMinutes: number | null;
  ageMin: number | null;
  ageMax: number | null;
  practises: string | null;
  forText: string | null;
  source: string;
  fileUrl?: string | null;
  downloadUrl?: string | null;
  matchesScreening?: boolean;
  savedItemId?: string | null;
  status?: JourneyItemStatus | null;
}

export interface LibraryPage {
  items: LibraryCard[];
  total: number;
  page: number;
  totalPages: number;
  facets: { byDomain: Record<string, number>; byType: Record<string, number> };
}

export interface ScreeningSummary {
  completedAt: string | null;
  areas: { domain: JourneyDomain; level: 'focus' | 'watch' | 'ontrack' | null }[];
  findings: { domain: JourneyDomain; level: 'focus' | 'watch' | 'ontrack'; text: string; count: number }[];
}

export interface ChildItem {
  id: string;
  kind: ResourceKind;
  resource: LibraryCard | null;
  source: 'SAVED' | 'ASSIGNED';
  assignedBy: { id: string; name: string | null } | null;
  goal: string | null;
  domain: JourneyDomain | null;
  unassigned: boolean;
  masteredOverride: boolean | null;
  status: JourneyItemStatus;
  logs: { id: string; date: string; help: number; engagement: number; note?: string | null }[];
  lastLog: { date: string; help: number; note?: string | null } | null;
}

export interface Progress {
  stats: { logged30: number; areas30: number; mastered: number };
  timeline: {
    id: string;
    date: string;
    title: string;
    domain: JourneyDomain | null;
    help: number;
    engagement: number;
    note?: string | null;
    milestone: string | null;
  }[];
  shares?: { id: string; therapist: { name: string | null } }[];
}

const base = '/resource-journey';

export async function getMyChildren(): Promise<JourneyChild[]> {
  const { data } = await api.get('/profile/me');
  return (data?.children ?? []).map((c: any) => ({ id: c.id, firstName: c.firstName, dateOfBirth: c.dateOfBirth ?? null }));
}

export async function getLibrary(
  childId: string,
  f: { q?: string; type?: string; domain?: string | null; ageFit?: boolean; page?: number },
): Promise<LibraryPage> {
  const params: Record<string, string> = { limit: '20' };
  if (f.q) params.q = f.q;
  if (f.type && f.type !== 'All') params.type = f.type;
  if (f.domain) params.domain = f.domain;
  if (f.ageFit) params.ageFit = 'true';
  if (f.page) params.page = String(f.page);
  const { data } = await api.get(`${base}/children/${childId}/library`, { params });
  return data;
}

export async function getScreening(childId: string): Promise<ScreeningSummary | null> {
  const { data } = await api.get(`${base}/children/${childId}/screening-summary`);
  return data.summary;
}

export async function getItems(childId: string): Promise<{ items: ChildItem[]; summary: Record<string, number> }> {
  const { data } = await api.get(`${base}/children/${childId}/items`);
  return data;
}

export async function saveItem(childId: string, kind: ResourceKind, resourceId: string) {
  const { data } = await api.post(`${base}/children/${childId}/items`, { kind, resourceId });
  return data;
}

export async function setMastered(itemId: string, mastered: boolean | null) {
  const { data } = await api.patch(`${base}/items/${itemId}`, { mastered });
  return data;
}

export async function logTry(
  childId: string,
  input: { kind: ResourceKind; resourceId: string; date: string; help: number; engagement: number; note?: string },
): Promise<{ status: JourneyItemStatus; becameMastered: boolean }> {
  const { data } = await api.post(`${base}/children/${childId}/logs`, input);
  return data;
}

export async function getProgress(childId: string, domain?: string | null): Promise<Progress> {
  const { data } = await api.get(`${base}/children/${childId}/progress`, { params: domain ? { domain } : {} });
  return data;
}
