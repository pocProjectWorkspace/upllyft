import type { User } from '@upllyft/types';
import { apiClient, setAuthToken } from './client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
  setAuthToken(data.accessToken);
  return data;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', payload);
  setAuthToken(data.accessToken);
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
  setAuthToken(null);
}

export async function refreshToken(): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/refresh');
  setAuthToken(data.accessToken);
  return data;
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>('/auth/me');
  return data;
}
