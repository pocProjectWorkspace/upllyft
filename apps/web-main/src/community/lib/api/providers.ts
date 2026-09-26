import { apiClient } from '@upllyft/api-client';

export interface Provider {
  id: string;
  serialNumber: number;
  state: string;
  city: string;
  organizationName: string;
  organizationType: string;
  contactPersonName: string;
  contactNumber: string;
  email: string;
  address: string;
  websiteLinkedin: string;
  normalizedState: string;
  normalizedOrgType: string;
  isVerified: boolean;
  latitude: number;
  longitude: number;
  viewCount: number;
  contactClickCount: number;
  country: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderFilters {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
  organizationType?: string;
  isVerified?: boolean;
  sort?: 'name' | 'views' | 'recent';
}

export interface ProvidersResponse {
  data: Provider[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProviderStats {
  total: number;
  verified: number;
  states: number;
  types: number;
  topStates: Array<{ name: string; count: number }>;
  topOrgTypes: Array<{ name: string; count: number }>;
}

export interface StateOption {
  value: string;
  label: string;
}

export interface CityOption {
  value: string;
  label: string;
}

export interface OrgTypeOption {
  value: string;
  label: string;
}

export async function getProviders(filters?: ProviderFilters): Promise<ProvidersResponse> {
  const { data } = await apiClient.get('/providers', { params: filters });
  return data;
}

export async function getProvider(id: string): Promise<Provider> {
  const { data } = await apiClient.get(`/providers/${id}`);
  return data;
}

export async function getProviderStats(country?: string): Promise<ProviderStats> {
  const { data } = await apiClient.get('/providers/stats', { params: { country } });
  return data;
}

export async function getStates(country?: string): Promise<StateOption[]> {
  const { data } = await apiClient.get('/providers/states', { params: { country } });
  return data;
}

export async function getCities(state: string, country?: string): Promise<CityOption[]> {
  const { data } = await apiClient.get('/providers/cities', { params: { state, country } });
  return data;
}

export async function getOrganizationTypes(country?: string): Promise<OrgTypeOption[]> {
  const { data } = await apiClient.get('/providers/organization-types', { params: { country } });
  return data;
}

export async function trackContactClick(id: string): Promise<void> {
  await apiClient.post(`/providers/${id}/contact-click`);
}
