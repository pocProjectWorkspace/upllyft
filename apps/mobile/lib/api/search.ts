import api from '../api';
import { Post } from '../types/community';

export interface SearchResults {
  posts: Post[];
  total: number;
}

export async function searchPosts(query: string, page = 1, limit = 15): Promise<SearchResults> {
  const { data } = await api.get('/posts', { params: { search: query, page, limit } });
  return { posts: data.posts ?? [], total: data.total ?? 0 };
}
