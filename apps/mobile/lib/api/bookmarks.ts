import api from '../api';
import { Post } from '../types/community';

interface BookmarksResponse {
  bookmarks: Array<{
    id: string;
    post: Post;
    createdAt: string;
  }>;
  total: number;
  page: number;
  pages: number;
  hasMore: boolean;
}

export async function getBookmarks(page = 1, limit = 15): Promise<BookmarksResponse> {
  const { data } = await api.get('/bookmarks', { params: { page, limit } });
  return data;
}

export async function removeBookmark(postId: string): Promise<void> {
  await api.delete(`/bookmarks/post/${postId}`);
}

export async function toggleBookmark(postId: string): Promise<void> {
  await api.post(`/bookmarks/toggle/${postId}`);
}
