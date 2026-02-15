import { apiClient } from '@upllyft/api-client';

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  type: string;
  category?: string;
  tags: string[];
  author: {
    id: string;
    name: string;
    image?: string | null;
    role: string;
    verificationStatus?: string;
  };
  viewCount: number;
  upvotes: number;
  createdAt: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  pages: number;
  searchTime: number;
}

export interface SearchFilters {
  category?: string;
  type?: string;
  authorRole?: string;
  verifiedOnly?: boolean;
  sortBy?: 'relevance' | 'date' | 'popularity';
}

export async function searchPosts(
  query: string,
  filters?: SearchFilters,
  page = 1,
  limit = 20,
): Promise<SearchResponse> {
  const { data } = await apiClient.post<SearchResponse>('/search', {
    query,
    limit,
    offset: (page - 1) * limit,
    ...filters,
  });
  return data;
}

export async function getSearchSuggestions(query: string): Promise<string[]> {
  const { data } = await apiClient.get<string[]>('/search/suggestions', {
    params: { q: query },
  });
  return data;
}

export async function getTrendingSearches(): Promise<string[]> {
  const { data } = await apiClient.get<string[]>('/search/trending');
  return data;
}
