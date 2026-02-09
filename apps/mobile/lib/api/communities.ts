import api from '../api';

export interface Community {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  postCount: number;
  imageUrl: string | null;
  isJoined?: boolean;
  createdAt: string;
}

export interface CommunitiesResponse {
  communities: Community[];
  total: number;
  page: number;
  pages: number;
}

export async function browseCommunities(page = 1, limit = 15): Promise<CommunitiesResponse> {
  const { data } = await api.get('/community/browse', { params: { page, limit } });
  return data;
}

export async function getMyCommunities(): Promise<Community[]> {
  const { data } = await api.get('/community/my-communities');
  return Array.isArray(data) ? data : data.communities ?? [];
}

export async function getCommunity(id: string): Promise<Community> {
  const { data } = await api.get(`/community/${id}`);
  return data;
}

export async function joinCommunity(id: string): Promise<void> {
  await api.post(`/community/${id}/join`);
}

export async function leaveCommunity(id: string): Promise<void> {
  await api.post(`/community/${id}/leave`);
}

export async function getCommunityPosts(id: string, page = 1, limit = 15) {
  const { data } = await api.get(`/community/${id}/posts`, { params: { page, limit } });
  return data;
}
