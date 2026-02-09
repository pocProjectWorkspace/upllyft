import api from '../api';

export interface PublicUser {
  id: string;
  name: string;
  email?: string;
  role: string;
  bio: string | null;
  organization: string | null;
  avatar: string | null;
  isVerified: boolean;
  isFollowing?: boolean;
  followerCount?: number;
  followingCount?: number;
  _count?: { posts: number; comments: number; followers: number; following: number };
}

export async function getUser(id: string): Promise<PublicUser> {
  const { data } = await api.get(`/users/${id}`);
  return data;
}

export async function followUser(id: string): Promise<void> {
  await api.post(`/users/${id}/follow`);
}

export async function unfollowUser(id: string): Promise<void> {
  await api.delete(`/users/${id}/follow`);
}

export async function getFollowers(id: string): Promise<PublicUser[]> {
  const { data } = await api.get(`/users/${id}/followers`);
  return Array.isArray(data) ? data : data.followers ?? [];
}

export async function getFollowing(id: string): Promise<PublicUser[]> {
  const { data } = await api.get(`/users/${id}/following`);
  return Array.isArray(data) ? data : data.following ?? [];
}
