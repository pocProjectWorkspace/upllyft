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
  /**
   * Optional signed JWT captcha token returned by /auth/captcha/generate.
   * When provided, the server verifies the user-typed `captcha` against
   * this token instead of relying on a session cookie. Strongly recommended
   * for any new client — eliminates cookie-race bugs on multi-replica APIs.
   */
  captchaToken?: string;
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
  // Best-effort tell the server (revoke refresh token, destroy session,
  // clear server-owned cookies). We send the refresh token in the body
  // so the server can revoke it even if our auth header is already stale.
  const refreshToken =
    (typeof window !== 'undefined' &&
      (document.cookie.match(/upllyft_refresh_token=([^;]+)/)?.[1] ||
        localStorage.getItem('upllyft_refresh_token'))) ||
    undefined;

  // Always clear local state FIRST so a hung or 401'd network call can't
  // leave the UI in a "still logged in" state.
  clearStoredTokens();

  try {
    await apiClient.post('/auth/logout', refreshToken ? { refreshToken } : {});
  } catch {
    // Ignore — local state is already cleared
  }
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
