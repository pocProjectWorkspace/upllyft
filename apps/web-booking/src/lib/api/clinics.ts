import { apiClient } from '@upllyft/api-client';

export interface ClinicSummary {
  id: string;
  name: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  description?: string | null;
  website?: string | null;
  rating?: number | null;
  totalReviews: number;
  specializations: string[];
  _count: { therapists: number };
}

export interface TherapistInClinic {
  id: string;
  bio?: string | null;
  specializations: string[];
  title?: string | null;
  profileImage?: string | null;
  overallRating: number;
  yearsExperience?: number | null;
  languages: string[];
  user: { id: string; name: string; email: string; image?: string | null };
  sessionTypes: { id: string; name: string; duration: number; isActive: boolean }[];
  sessionPricing: { id: string; price: number; currency: string }[];
}

export interface ClinicDetail extends ClinicSummary {
  therapists: TherapistInClinic[];
}

export interface ClinicSearchResult {
  clinics: ClinicSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ClinicSearchFilters {
  search?: string;
  specialization?: string;
  country?: string;
  page?: number;
  limit?: number;
}

export async function searchClinics(filters?: ClinicSearchFilters): Promise<ClinicSearchResult> {
  const params: Record<string, string> = {};
  if (filters?.search) params.search = filters.search;
  if (filters?.specialization) params.specialization = filters.specialization;
  if (filters?.country) params.country = filters.country;
  if (filters?.page) params.page = String(filters.page);
  if (filters?.limit) params.limit = String(filters.limit);
  const { data } = await apiClient.get<ClinicSearchResult>('/marketplace/clinics', { params });
  return data;
}

export async function getClinic(clinicId: string): Promise<ClinicDetail> {
  const { data } = await apiClient.get<ClinicDetail>(`/marketplace/clinics/${clinicId}`);
  return data;
}
