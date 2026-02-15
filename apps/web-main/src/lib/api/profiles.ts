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

// --- Child Conditions ---

export interface AddChildConditionData {
  childId: string;
  conditionType: string;
  severity?: string;
  currentTherapies?: string[];
  medications?: string[];
  primaryChallenges?: string;
  strengths?: string;
  notes?: string;
}

export async function addChildCondition(data: AddChildConditionData): Promise<ChildCondition> {
  const { data: result } = await apiClient.post<ChildCondition>('/profile/child/condition', data);
  return result;
}

export async function updateChildCondition(
  conditionId: string,
  data: Partial<AddChildConditionData>,
): Promise<ChildCondition> {
  const { data: result } = await apiClient.put<ChildCondition>(
    `/profile/child/condition/${conditionId}`,
    data,
  );
  return result;
}

export async function deleteChildCondition(conditionId: string): Promise<void> {
  await apiClient.delete(`/profile/child/condition/${conditionId}`);
}

// --- Completeness ---

export async function recalculateCompleteness(): Promise<CompletenessBreakdown> {
  const { data } = await apiClient.post<CompletenessBreakdown>('/profile/completeness/recalculate');
  return data;
}

// --- Onboarding ---

export interface OnboardingStatus {
  completed: boolean;
  currentStep?: string;
  stepsCompleted?: string[];
}

export async function completeOnboarding(): Promise<{ success: boolean }> {
  const { data } = await apiClient.post<{ success: boolean }>('/profile/onboarding/complete');
  return data;
}

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const { data } = await apiClient.get<OnboardingStatus>('/profile/onboarding/status');
  return data;
}

// --- Social / Follow ---

export interface FollowUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  verificationStatus?: string;
  bio?: string;
  _count?: {
    posts: number;
    followers: number;
  };
  isFollowing?: boolean;
}

export interface FollowListResponse {
  followers?: FollowUser[];
  following?: FollowUser[];
  hasMore: boolean;
}

export async function followUser(userId: string): Promise<void> {
  await apiClient.post(`/users/${userId}/follow`);
}

export async function unfollowUser(userId: string): Promise<void> {
  await apiClient.delete(`/users/${userId}/follow`);
}

export async function getFollowers(userId: string, page = 1, limit = 50): Promise<FollowListResponse> {
  const { data } = await apiClient.get(`/users/${userId}/followers`, { params: { page, limit } });
  return data;
}

export async function getFollowing(userId: string, page = 1, limit = 50): Promise<FollowListResponse> {
  const { data } = await apiClient.get(`/users/${userId}/following`, { params: { page, limit } });
  return data;
}

// --- Activity & Social Stats ---

export interface Activity {
  id: string;
  type: 'post' | 'comment' | 'resource' | 'achievement';
  title?: string;
  content: string;
  createdAt: string;
  upvotes?: number;
  postId?: string;
  postTitle?: string;
}

export interface ContributionStatsData {
  posts: number;
  questionsAnswered: number;
  resourcesShared: number;
  upvotesReceived: number;
  followers: number;
  following: number;
}

export interface SocialProfile {
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
  trustScore: number;
  badges: string[];
  contributionStats: ContributionStatsData;
  recentActivity: Activity[];
}

export async function getUserSocialProfile(userId: string): Promise<SocialProfile> {
  const { data } = await apiClient.get<SocialProfile>(`/users/${userId}/social`);
  return data;
}

export async function getMySocialProfile(): Promise<SocialProfile> {
  const { data } = await apiClient.get<SocialProfile>('/users/me/social');
  return data;
}

// --- Utilities ---

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
