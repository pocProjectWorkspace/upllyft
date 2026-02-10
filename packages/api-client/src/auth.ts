import type { User } from '@upllyft/types';
import { apiClient, setAuthToken, setRefreshToken, clearStoredTokens } from './client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  role?: string;
  captcha: string;
  licenseNumber?: string;
  specialization?: string[];
  yearsOfExperience?: number;
  organization?: string;
  bio?: string;
}

export interface MembershipStatus {
  hasActiveMemberships: boolean;
  hasSuspendedMemberships: boolean;
  hasDeactivatedMemberships: boolean;
  suspendedOrganizations: Array<{ name: string; slug: string }>;
  deactivatedOrganizations: Array<{ name: string; slug: string }>;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  membershipStatus?: MembershipStatus;
  message?: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

function storeTokens(accessToken: string, refreshToken: string) {
  setAuthToken(accessToken);
  setRefreshToken(refreshToken);
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
  storeTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', payload);
  storeTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout');
  } catch {
    // Ignore logout API errors — clear tokens regardless
  }
  clearStoredTokens();
}

export async function refreshToken(token: string): Promise<RefreshResponse> {
  const { data } = await apiClient.post<RefreshResponse>('/auth/refresh', {
    refreshToken: token,
  });
  storeTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>('/auth/me');
  return data;
}
