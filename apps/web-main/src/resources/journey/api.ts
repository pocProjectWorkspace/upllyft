import { apiClient } from '@upllyft/api-client';
import type { JourneyDomain, JourneyItemStatus } from '@upllyft/types';

export type ResourceKind = 'WORKSHEET' | 'LIBRARY';
export type CardType = 'Guide' | 'Worksheet' | 'Video' | 'Social story' | 'Printable';
export type ScreeningLevel = 'focus' | 'watch' | 'ontrack';

export interface LibraryCard {
  kind: ResourceKind;
  id: string;
  title: string;
  description: string | null;
  type: CardType;
  domains: JourneyDomain[];
  durationMinutes: number | null;
  ageMin: number | null;
  ageMax: number | null;
  practises: string | null;
  forText: string | null;
  source: string;
  createdAt: string;
  fileUrl?: string | null;
  downloadUrl?: string | null;
  mimeType?: string | null;
  matchesScreening?: boolean;
  fitsAge?: boolean;
  savedItemId?: string | null;
  status?: JourneyItemStatus | null;
}

export interface LibraryPage {
  items: LibraryCard[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  facets: { byDomain: Record<JourneyDomain, number>; byType: Record<string, number> };
}

export interface LibraryFilters {
  q?: string;
  type?: string;
  domain?: string;
  ageFit?: boolean;
  matchOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface ScreeningSummary {
  assessmentId: string;
  completedAt: string | null;
  areas: Array<{ domain: JourneyDomain; level: ScreeningLevel | null }>;
  findings: Array<{ domain: JourneyDomain; level: ScreeningLevel; text: string; count: number }>;
}

export interface LogEntry {
  id: string;
  date: string;
  help: number;
  engagement: number;
  note?: string | null;
}

export interface ChildItem {
  id: string;
  childId: string;
  kind: ResourceKind;
  resource: LibraryCard | null;
  source: 'SAVED' | 'ASSIGNED';
  assignedBy: { id: string; name: string | null; image: string | null } | null;
  goal: string | null;
  targetDate: string | null;
  assignedArea: JourneyDomain | null;
  domain: JourneyDomain | null;
  unassigned: boolean;
  masteredOverride: boolean | null;
  status: JourneyItemStatus;
  createdAt: string;
  logs: LogEntry[];
  lastLog: { date: string; help: number; note?: string | null } | null;
}

export interface TimelineEntry {
  id: string;
  date: string;
  itemId: string;
  title: string;
  domain: JourneyDomain | null;
  help: number;
  engagement: number;
  note?: string | null;
  milestone: string | null;
}

export interface ShareSummary {
  id: string;
  periodDays: number | null;
  includeNotes: boolean;
  createdAt: string;
  therapist: { id: string; name: string | null; image: string | null };
}

export interface Progress {
  child: { id: string; firstName: string; age: number | null };
  stats: { logged30: number; areas30: number; mastered: number };
  weekly: Array<{ domain: JourneyDomain; weeks: Array<number | null> }>;
  timeline: TimelineEntry[];
  suggestions: LibraryCard[];
  shares?: ShareSummary[];
  share?: { id: string; periodDays: number | null; includeNotes: boolean; createdAt: string; parentName: string | null };
}

export interface ShareTarget {
  userId: string;
  name: string;
  image: string | null;
  role: string | null;
  nextSession: string | null;
}

export interface LogInput {
  kind: ResourceKind;
  resourceId: string;
  date: string;
  help: number;
  engagement: number;
  note?: string;
}

const base = '/resource-journey';

function params(f: LibraryFilters) {
  const p: Record<string, string> = {};
  if (f.q) p.q = f.q;
  if (f.type && f.type !== 'All') p.type = f.type;
  if (f.domain) p.domain = f.domain;
  if (f.ageFit) p.ageFit = 'true';
  if (f.matchOnly) p.matchOnly = 'true';
  if (f.page) p.page = String(f.page);
  if (f.limit) p.limit = String(f.limit);
  return p;
}

export const journeyApi = {
  library: async (childId: string, f: LibraryFilters): Promise<LibraryPage> =>
    (await apiClient.get(`${base}/children/${childId}/library`, { params: params(f) })).data,
  screening: async (childId: string): Promise<ScreeningSummary | null> =>
    (await apiClient.get(`${base}/children/${childId}/screening-summary`)).data.summary,
  items: async (childId: string): Promise<{ items: ChildItem[]; summary: Record<string, number> }> =>
    (await apiClient.get(`${base}/children/${childId}/items`)).data,
  save: async (childId: string, kind: ResourceKind, resourceId: string) =>
    (await apiClient.post(`${base}/children/${childId}/items`, { kind, resourceId })).data,
  setMastered: async (itemId: string, mastered: boolean | null) =>
    (await apiClient.patch(`${base}/items/${itemId}`, { mastered })).data,
  remove: async (itemId: string) => (await apiClient.delete(`${base}/items/${itemId}`)).data,
  log: async (childId: string, input: LogInput): Promise<{ itemId: string; status: JourneyItemStatus; becameMastered: boolean }> =>
    (await apiClient.post(`${base}/children/${childId}/logs`, input)).data,
  progress: async (childId: string, domain?: string): Promise<Progress> =>
    (await apiClient.get(`${base}/children/${childId}/progress`, { params: domain ? { domain } : {} })).data,
  shareTargets: async (childId: string): Promise<ShareTarget[]> =>
    (await apiClient.get(`${base}/children/${childId}/share-targets`)).data.targets,
  share: async (childId: string, body: { therapistUserId: string; periodDays: number | 'all'; includeNotes: boolean }) =>
    (await apiClient.post(`${base}/children/${childId}/shares`, body)).data,
  revoke: async (shareId: string) => (await apiClient.delete(`${base}/shares/${shareId}`)).data,

  // therapist
  sharedWithMe: async (): Promise<{
    shares: Array<{
      id: string;
      periodDays: number | null;
      includeNotes: boolean;
      createdAt: string;
      parent: { id: string; name: string | null };
      child: { id: string; firstName: string; age: number | null };
    }>;
  }> => (await apiClient.get(`${base}/shared-with-me`)).data,
  sharedProgress: async (shareId: string, domain?: string): Promise<Progress> =>
    (await apiClient.get(`${base}/shared-with-me/${shareId}/progress`, { params: domain ? { domain } : {} })).data,
  myClients: async (): Promise<{
    clients: Array<{
      id: string;
      firstName: string;
      age: number | null;
      parent: { id: string; name: string | null };
      assignedCount: number;
      lastActivity: string | null;
    }>;
  }> => (await apiClient.get(`${base}/my-clients`)).data,
  assignable: async (f: LibraryFilters & { childId?: string }): Promise<LibraryPage> =>
    (await apiClient.get(`${base}/assignable`, { params: { ...params(f), ...(f.childId ? { childId: f.childId } : {}) } })).data,
  assign: async (
    childId: string,
    body: { kind: ResourceKind; resourceId: string; goal?: string; targetDate?: string; assignedArea?: string },
  ) => (await apiClient.post(`${base}/clients/${childId}/assign`, body)).data,
  assigned: async (childId: string): Promise<{ items: ChildItem[] }> =>
    (await apiClient.get(`${base}/clients/${childId}/assigned`)).data,
  unassign: async (itemId: string) => (await apiClient.delete(`${base}/assigned/${itemId}`)).data,
};
