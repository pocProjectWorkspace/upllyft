import api from '../api';
import { UserProfile, UserStats, UpdateProfileData } from '../types/profile';

export async function getProfile(): Promise<UserProfile> {
  const { data } = await api.get('/users/me');
  return data;
}

export async function updateProfile(updates: UpdateProfileData): Promise<UserProfile> {
  const { data } = await api.put('/users/profile', updates);
  return data;
}

export async function getUserStats(): Promise<UserStats> {
  const { data } = await api.get('/users/me');
  return {
    postCount: data.stats?.posts ?? data._count?.posts ?? 0,
    connectionCount: data.stats?.followers ?? 0,
    bookmarkCount: data._count?.bookmarks ?? 0,
  };
}
