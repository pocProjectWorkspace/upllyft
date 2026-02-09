import api from '../api';
import { Post, PostsResponse } from '../types/community';

export async function getRecentPosts(limit = 3): Promise<Post[]> {
  const { data } = await api.get<PostsResponse>('/posts', {
    params: { page: 1, limit, sort: 'recent' },
  });
  return data.posts;
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { data } = await api.get<{ count: number }>('/notifications/unread-count');
  return data.count;
}
