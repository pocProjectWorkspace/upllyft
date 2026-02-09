import api from '../api';
import { TherapistProfile, SessionType } from '../types/marketplace';

export async function getMyTherapistProfile(): Promise<TherapistProfile> {
  const { data } = await api.get('/marketplace/therapists/me/profile');
  return data;
}

export async function updateMyTherapistProfile(updates: Partial<{
  bio: string; credentials: string[]; specializations: string[];
  yearsExperience: number; title: string; languages: string[];
}>): Promise<TherapistProfile> {
  const { data } = await api.patch('/marketplace/therapists/me/profile', updates);
  return data;
}

export async function getMySessionTypes(): Promise<SessionType[]> {
  const { data } = await api.get('/marketplace/therapists/me/session-types');
  return Array.isArray(data) ? data : [];
}

export async function createSessionType(st: { name: string; description?: string; duration: number; defaultPrice: number; currency?: string }): Promise<SessionType> {
  const { data } = await api.post('/marketplace/therapists/me/session-types', st);
  return data;
}

export async function updateSessionType(id: string, updates: Partial<SessionType>): Promise<SessionType> {
  const { data } = await api.patch(`/marketplace/therapists/me/session-types/${id}`, updates);
  return data;
}

export async function getMyPricing(): Promise<unknown[]> {
  const { data } = await api.get('/marketplace/therapists/me/pricing');
  return Array.isArray(data) ? data : [];
}

export async function getMyAnalytics(): Promise<{ totalBookings: number; totalRevenue: number; averageRating: number; completedSessions: number }> {
  const { data } = await api.get('/marketplace/therapists/me/analytics');
  return data;
}
