import { apiClient } from '@upllyft/api-client';

export interface Child {
  id: string;
  profileId: string;
  firstName: string;
  nickname?: string;
  dateOfBirth: string;
  gender: string;
  schoolType?: string;
  grade?: string;
  hasCondition: boolean;
  diagnosisStatus?: string;
  conditions: ChildCondition[];
  createdAt: string;
  updatedAt: string;
}

export interface ChildCondition {
  id: string;
  childId: string;
  conditionType: string;
  severity?: string;
  currentTherapies: string[];
  medications: string[];
  primaryChallenges?: string;
  strengths?: string;
  notes?: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  fullName?: string;
  relationshipToChild?: string;
  phoneNumber?: string;
  email?: string;
  city?: string;
  state?: string;
  country?: string;
  occupation?: string;
  educationLevel?: string;
  onboardingCompleted: boolean;
  completenessScore: number;
  children: Child[];
  createdAt: string;
  updatedAt: string;
}

export interface CompletenessBreakdown {
  totalScore: number;
  sections: Record<string, { score: number; maxScore: number; completed: boolean }>;
  lastUpdated?: string;
}

export async function getMyProfile(): Promise<UserProfile> {
  const { data } = await apiClient.get<UserProfile>('/profile/me');
  return data;
}

export async function getProfile(userId: string): Promise<UserProfile> {
  const { data } = await apiClient.get<UserProfile>(`/profile/${userId}`);
  return data;
}

export async function updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
  const { data } = await apiClient.put<UserProfile>('/profile/me', updates);
  return data;
}

export async function updateAvatar(imageUrl: string): Promise<{ url: string }> {
  const { data } = await apiClient.put<{ url: string }>('/users/avatar', { imageUrl });
  return data;
}

export async function addChild(childData: Partial<Child>): Promise<Child> {
  const { data } = await apiClient.post<Child>('/profile/child', childData);
  return data;
}

export async function updateChild(childId: string, childData: Partial<Child>): Promise<Child> {
  const { data } = await apiClient.put<Child>(`/profile/child/${childId}`, childData);
  return data;
}

export async function deleteChild(childId: string): Promise<void> {
  await apiClient.delete(`/profile/child/${childId}`);
}

export async function getCompleteness(): Promise<CompletenessBreakdown> {
  const { data } = await apiClient.get<CompletenessBreakdown>('/profile/completeness/me');
  return data;
}

export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}
