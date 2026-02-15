import { apiClient } from '@upllyft/api-client';
import type { Post } from './posts';

export interface BookmarksResponse {
  bookmarks: Post[];
  total: number;
  page: number;
  pages: number;
  hasMore: boolean;
}

export async function getAllBookmarks(params?: { page?: number; limit?: number }): Promise<BookmarksResponse> {
  const { data } = await apiClient.get<BookmarksResponse>('/bookmarks', { params });
  return data;
}

export async function checkBookmark(postId: string): Promise<{ bookmarked: boolean }> {
  const { data } = await apiClient.get<{ bookmarked: boolean }>(`/bookmarks/check/${postId}`);
  return data;
}
