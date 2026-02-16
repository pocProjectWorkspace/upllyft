import { apiClient } from '@upllyft/api-client';

export interface FeedInteraction {
  postId: string;
  action: 'view' | 'click' | 'engagement' | 'hide';
  duration?: number;
  scrollDepth?: number;
}

export type FeedDensity = 'comfortable' | 'compact' | 'cozy';

export interface FeedPreferences {
  density: FeedDensity;
  contentWeights: {
    discussions: number;
    questions: number;
    resources: number;
    caseStudies: number;
  };
  mutedKeywords: string[];
  preferredCategories: string[];
}

export async function trackInteraction(data: FeedInteraction): Promise<void> {
  await apiClient.post('/feed/interactions', data);
}

export async function getPreferences(): Promise<FeedPreferences> {
  const { data } = await apiClient.get<FeedPreferences>('/feed/preferences');
  return data;
}

export async function updatePreferences(updates: Partial<FeedPreferences>): Promise<FeedPreferences> {
  const { data } = await apiClient.put<FeedPreferences>('/feed/preferences', updates);
  return data;
}

export async function addMutedKeyword(keyword: string): Promise<FeedPreferences> {
  const { data } = await apiClient.post<FeedPreferences>('/feed/preferences/muted-keywords', { keyword });
  return data;
}

export async function removeMutedKeyword(keyword: string): Promise<FeedPreferences> {
  const { data } = await apiClient.delete<FeedPreferences>(`/feed/preferences/muted-keywords/${encodeURIComponent(keyword)}`);
  return data;
}

export async function addPreferredCategory(category: string): Promise<FeedPreferences> {
  const { data } = await apiClient.post<FeedPreferences>('/feed/preferences/categories', { category });
  return data;
}

export async function removePreferredCategory(category: string): Promise<FeedPreferences> {
  const { data } = await apiClient.delete<FeedPreferences>(`/feed/preferences/categories/${encodeURIComponent(category)}`);
  return data;
}

// Personalized feed types and API

export type FeedView = 'for-you' | 'following' | 'latest' | 'trending';

export interface FeedFilters {
  category?: string;
  search?: string;
  type?: string;
}

export interface FeedPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  upvotes: number;
  commentCount: number;
  category?: string;
  type?: string;
}

export interface FeedResponse {
  posts: FeedPost[];
  hasMore: boolean;
  total: number;
}

export async function getPersonalizedFeed(params: {
  view: FeedView;
  page: number;
  limit: number;
  filters?: FeedFilters;
  signal?: AbortSignal;
}): Promise<FeedResponse> {
  const { data } = await apiClient.get<FeedResponse>('/feed/personalized', {
    params: { view: params.view, page: params.page, limit: params.limit, ...params.filters },
    signal: params.signal,
  });
  return data;
}
