import { apiClient } from '@upllyft/api-client';

export interface ShortlistTherapist {
  id: string;
  title?: string | null;
  specializations: string[];
  languages: string[];
  yearsExperience?: number | null;
  overallRating: number;
  startingPrice?: number | null;
  profileImage?: string | null;
  user: { id: string; name: string; image?: string | null };
}

export interface ShortlistClinic {
  id: string;
  name: string;
  logoUrl?: string | null;
  rating?: number | null;
  totalReviews: number;
  specializations: string[];
  address?: string | null;
  _count: { therapists: number };
}

export interface ShortlistEntry {
  id: string;
  therapistId: string | null;
  clinicId: string | null;
  createdAt: string;
  therapist: ShortlistTherapist | null;
  clinic: ShortlistClinic | null;
}

export async function getShortlist(): Promise<ShortlistEntry[]> {
  const { data } = await apiClient.get('/marketplace/shortlist');
  return data.entries;
}

export async function toggleShortlist(target: {
  therapistId?: string;
  clinicId?: string;
}): Promise<{ saved: boolean }> {
  const { data } = await apiClient.post('/marketplace/shortlist', target);
  return data;
}
