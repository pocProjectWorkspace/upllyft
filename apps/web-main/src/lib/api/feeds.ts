import { apiClient } from '@upllyft/api-client';

// ── Types ──────────────────────────────────────────────────────────

export type FeedView = 'for-you' | 'following' | 'saved';
export type FeedDensity = 'compact' | 'comfortable' | 'spacious';

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

export interface FeedFilters {
  postType?: string;
  category?: string;
  tags?: string[];
  dateRange?: 'today' | 'week' | 'month' | 'all';
  search?: string;
}

export interface PersonalizedFeedParams {
  view: FeedView;
  page: number;
  limit: number;
  filters?: FeedFilters;
  signal?: AbortSignal;
}

export interface FeedPost {
  id: string;
  title: string;
  content: string;
  type: 'DISCUSSION' | 'QUESTION' | 'CASE_STUDY' | 'RESOURCE';
  category: string;
  tags: string[];
  author: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    role: string;
    verificationStatus: string;
  };
  authorId: string;
  createdAt: string;
  updatedAt: string;
  published: boolean;
  viewCount: number;
  upvotes: number;
  downvotes: number;
  commentCount?: number;
  isBookmarked?: boolean;
  userVote?: 'up' | 'down' | null;
  isAnonymous?: boolean;
}

export interface PersonalizedFeedResponse {
  posts: FeedPost[];
  total: number;
  page: number;
  pages: number;
  hasMore: boolean;
}

export interface FeedViewOption {
  id: FeedView;
  label: string;
  description: string;
}

export interface FeedInteraction {
  postId: string;
  action: 'view' | 'click' | 'engagement' | 'hide';
  duration?: number;
  scrollDepth?: number;
}

// ── API Functions ──────────────────────────────────────────────────

export async function getPersonalizedFeed(
  params: PersonalizedFeedParams,
): Promise<PersonalizedFeedResponse> {
  const { view, page, limit, filters, signal } = params;
  const { data } = await apiClient.get<PersonalizedFeedResponse>(
    '/feeds/personalized',
    {
      params: { view, page, limit, ...filters },
      signal,
    },
  );
  return data;
}

export async function getFilteredFeed(
  filters: FeedFilters & { page?: number; limit?: number },
): Promise<PersonalizedFeedResponse> {
  const { data } = await apiClient.get<PersonalizedFeedResponse>(
    '/feeds/filtered',
    { params: filters },
  );
  return data;
}

export async function getPreferences(): Promise<FeedPreferences> {
  const { data } = await apiClient.get<FeedPreferences>('/feeds/preferences');
  return data;
}

export async function updatePreferences(
  preferences: Partial<FeedPreferences>,
): Promise<FeedPreferences> {
  const { data } = await apiClient.post<FeedPreferences>(
    '/feeds/preferences',
    preferences,
  );
  return data;
}

export async function trackInteraction(
  interaction: FeedInteraction,
): Promise<void> {
  await apiClient.post('/feeds/interaction', interaction);
}

export async function getAvailableViews(): Promise<FeedViewOption[]> {
  const { data } = await apiClient.get<FeedViewOption[]>('/feeds/views');
  return data;
}

export async function addMutedKeyword(keyword: string): Promise<FeedPreferences> {
  const { data } = await apiClient.post<FeedPreferences>(
    '/feeds/preferences/muted-keywords',
    { keyword },
  );
  return data;
}

export async function removeMutedKeyword(
  keyword: string,
): Promise<FeedPreferences> {
  const { data } = await apiClient.delete<FeedPreferences>(
    `/feeds/preferences/muted-keywords/${encodeURIComponent(keyword)}`,
  );
  return data;
}

export async function addPreferredCategory(
  category: string,
): Promise<FeedPreferences> {
  const { data } = await apiClient.post<FeedPreferences>(
    '/feeds/preferences/categories',
    { category },
  );
  return data;
}

export async function removePreferredCategory(
  category: string,
): Promise<FeedPreferences> {
  const { data } = await apiClient.delete<FeedPreferences>(
    `/feeds/preferences/categories/${encodeURIComponent(category)}`,
  );
  return data;
}
