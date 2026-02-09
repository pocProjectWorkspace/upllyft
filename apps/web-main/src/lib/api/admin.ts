import { apiClient } from '@upllyft/api-client';

// ─── Types ───────────────────────────────────────────────────────

export interface PlatformStats {
  totalUsers: number;
  totalOrganizations: number;
  aiUsage: number;
  storageUsed: number;
}

export interface CommunityStats {
  totalCommunities: number;
  communitiesLast7Days: number;
  globalCommunities: number;
  orgCommunities: number;
  totalMembers: number;
  avgMembersPerCommunity: number;
}

export interface EngagementStats {
  newUsersLast7Days: number;
  dau: number;
  dauMauRatio: number;
  postsLast7Days: number;
  avgPostsPerUser: number;
  commentsLast7Days: number;
  avgCommentsPerPost: number;
  totalQuestions: number;
}

export interface ModerationStats {
  pendingVerifications: number;
  pendingTherapists: number;
  pendingEducators: number;
  totalFlagged: number;
  flaggedPosts: number;
  flaggedComments: number;
}

export interface EngagementTrend {
  date: string;
  posts: number;
  comments: number;
  questions: number;
}

export interface UserDistribution {
  role: string;
  count: number;
}

export interface RecentActivity {
  type: 'user' | 'post' | 'flag';
  description: string;
  time: string;
}

export interface AdminUser {
  id: string;
  name?: string;
  email: string;
  image?: string;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt?: string;
  verificationStatus?: string;
}

export interface FlaggedContent {
  id: string;
  type: 'post' | 'comment' | 'user';
  preview: string;
  fullContent: string;
  author: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reportedAt: string;
  status: 'pending' | 'reviewing' | 'resolved';
  flaggedBy: 'system' | 'user';
  aiAnalysis?: string | null;
}

export interface VerificationDocument {
  id: string;
  type: string;
  fileUrl: string;
  status: string;
  createdAt: string;
  reviewNotes?: string;
}

export interface PendingVerification {
  id: string;
  name: string;
  email: string;
  role: string;
  organization?: string;
  specialization?: string[];
  yearsOfExperience?: number;
  licenseNumber?: string;
  verificationStatus: string;
  createdAt: string;
  verificationDocs: VerificationDocument[];
}

export interface VerificationStats {
  pending: number;
  verified: number;
  rejected: number;
  total: number;
  verificationRate: number;
}

export interface AnalyticsData {
  userGrowth: { date: string; count: number }[];
  contentStats: { type: string; count: number }[];
  engagementMetrics: { metric: string; value: number }[];
  aiUsage: { feature: string; calls: number }[];
  topPosts: { title: string; views: number; author: string }[];
  topCategories: { category: string; posts: number }[];
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isVerified: boolean;
  _count?: { members: number };
}

export interface BannerAd {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl: string;
  placement: 'FEED' | 'SIDEBAR' | 'BANNER_TOP' | 'BANNER_BOTTOM';
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED';
  startDate: string | null;
  endDate: string | null;
  priority: number;
  impressions?: number;
  clicks?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BannerAdsResponse {
  data: BannerAd[];
  total: number;
  page: number;
  pages: number;
}

export interface SystemSettings {
  siteName: string;
  siteDescription: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  aiEnabled: boolean;
  aiProvider: string;
  aiModel: string;
  maxTokensPerRequest: number;
  enableAutoModeration: boolean;
  moderationThreshold: number;
  requireEmailVerification: boolean;
  require2FA: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  maxPostLength: number;
  maxCommentLength: number;
  allowFileUploads: boolean;
  maxFileSize: number;
  allowedFileTypes: string[];
  emailNotifications: boolean;
  pushNotifications: boolean;
  digestFrequency: string;
}

// ─── Dashboard ───────────────────────────────────────────────────

export async function getAdminStats(): Promise<PlatformStats> {
  const { data } = await apiClient.get<PlatformStats>('/admin/stats');
  return data;
}

export async function getCommunityStats(): Promise<CommunityStats> {
  const { data } = await apiClient.get<CommunityStats>('/admin/stats/communities');
  return data;
}

export async function getEngagementStats(): Promise<EngagementStats> {
  const { data } = await apiClient.get<EngagementStats>('/admin/stats/engagement');
  return data;
}

export async function getModerationStats(): Promise<ModerationStats> {
  const { data } = await apiClient.get<ModerationStats>('/admin/stats/content-moderation');
  return data;
}

export async function getEngagementTrends(): Promise<EngagementTrend[]> {
  const { data } = await apiClient.get<EngagementTrend[]>('/admin/charts/engagement-trends');
  return data;
}

export async function getUserDistribution(): Promise<UserDistribution[]> {
  const { data } = await apiClient.get<UserDistribution[]>('/admin/charts/user-distribution');
  return data;
}

export async function getRecentActivity(): Promise<RecentActivity[]> {
  const { data } = await apiClient.get<RecentActivity[]>('/admin/recent-activity');
  return data;
}

// ─── Users ───────────────────────────────────────────────────────

export async function getAdminUsers(params?: {
  role?: string;
  status?: string;
}): Promise<AdminUser[]> {
  const { data } = await apiClient.get<AdminUser[]>('/admin/users', { params });
  return data;
}

export async function updateUserRole(
  userId: string,
  role: string,
): Promise<void> {
  await apiClient.patch(`/admin/users/${userId}/role`, { role });
}

export async function banUser(userId: string): Promise<void> {
  await apiClient.patch(`/admin/users/${userId}/ban`);
}

// ─── Content Moderation ──────────────────────────────────────────

export async function getFlaggedContent(filter?: string): Promise<FlaggedContent[]> {
  const { data } = await apiClient.get<FlaggedContent[]>('/admin/moderation/flagged', {
    params: filter ? { filter } : undefined,
  });
  return data;
}

export async function moderateContent(
  contentId: string,
  action: 'approve' | 'remove',
  notes: string,
): Promise<void> {
  await apiClient.patch(`/admin/moderation/${contentId}`, { action, notes });
}

// ─── Verification ────────────────────────────────────────────────

export async function getVerificationQueue(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: PendingVerification[]; total: number; pages: number }> {
  const { data } = await apiClient.get('/verification/queue', {
    params: { limit: 10, ...params },
  });
  return data;
}

export async function getVerificationStats(): Promise<VerificationStats> {
  const { data } = await apiClient.get<VerificationStats>('/verification/statistics');
  return data;
}

export async function verifyUser(
  userId: string,
  status: 'VERIFIED' | 'REJECTED',
  notes: string,
): Promise<void> {
  await apiClient.patch(`/verification/user/${userId}/verify`, { status, notes });
}

// ─── Analytics ───────────────────────────────────────────────────

export async function getAnalytics(range?: string): Promise<AnalyticsData> {
  const { data } = await apiClient.get<AnalyticsData>('/admin/analytics', {
    params: range ? { range } : undefined,
  });
  return data;
}

// ─── Organizations ───────────────────────────────────────────────

export async function getOrganizations(): Promise<Organization[]> {
  const { data } = await apiClient.get<Organization[]>('/organizations');
  return data;
}

export async function createOrganization(payload: {
  name: string;
  description?: string;
}): Promise<Organization> {
  const { data } = await apiClient.post<Organization>('/organizations', payload);
  return data;
}

// ─── Banner Ads ──────────────────────────────────────────────────

export async function getBannerAds(params?: {
  page?: number;
  limit?: number;
  status?: string;
  placement?: string;
  search?: string;
}): Promise<BannerAdsResponse> {
  const { data } = await apiClient.get<BannerAdsResponse>('/banner-ads', {
    params: { limit: 20, ...params },
  });
  return data;
}

export async function createBannerAd(
  payload: Omit<BannerAd, 'id' | 'impressions' | 'clicks' | 'createdAt' | 'updatedAt'>,
): Promise<BannerAd> {
  const { data } = await apiClient.post<BannerAd>('/banner-ads', payload);
  return data;
}

export async function updateBannerAd(
  id: string,
  payload: Partial<BannerAd>,
): Promise<BannerAd> {
  const { data } = await apiClient.patch<BannerAd>(`/banner-ads/${id}`, payload);
  return data;
}

export async function deleteBannerAd(id: string): Promise<void> {
  await apiClient.delete(`/banner-ads/${id}`);
}

// ─── System Settings ─────────────────────────────────────────────

export async function getSystemSettings(): Promise<SystemSettings> {
  const { data } = await apiClient.get<SystemSettings>('/admin/settings');
  return data;
}

export async function updateSystemSettings(
  payload: Partial<SystemSettings>,
): Promise<SystemSettings> {
  const { data } = await apiClient.patch<SystemSettings>('/admin/settings', payload);
  return data;
}
