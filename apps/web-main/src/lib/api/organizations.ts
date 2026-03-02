import { apiClient } from '@upllyft/api-client';

// ── Types ──────────────────────────────────────────────────────────

export interface OrgDetails {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  banner?: string;
  website?: string;
  isVerified: boolean;
}

export interface OrgStats {
  org: OrgDetails;
  memberCount: number;
  communityCount: number;
}

export interface OrgMember {
  id: string;
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' | 'REJECTED';
  joinedAt: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
    role: string;
    verificationStatus: string;
  };
}

export interface OrgCommunity {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  isActive: boolean;
  organization?: { name: string; logo?: string };
  _count?: { members: number };
}

export interface OnboardingSettings {
  parentOnboardingEnabled: boolean;
  therapistOnboardingEnabled: boolean;
}

export interface OrgCommission {
  id: string;
  name: string;
  commissionPercentage: number | null;
  effectiveCommission: number;
  therapistCount: number;
  totalBookings: number;
  totalRevenue: number;
}

export interface OrgCommissionsResponse {
  organizations: OrgCommission[];
  globalCommission: number;
}

// ── Organization CRUD ──────────────────────────────────────────────

export async function getOrganization(slug: string): Promise<OrgDetails> {
  const { data } = await apiClient.get<OrgDetails>(`/organizations/${slug}`);
  return data;
}

export async function getOrganizationStats(slug: string): Promise<OrgStats> {
  const { data } = await apiClient.get<OrgStats>(`/organizations/${slug}/stats`);
  return data;
}

// ── Members ────────────────────────────────────────────────────────

export async function getOrgMembers(slug: string): Promise<OrgMember[]> {
  const { data } = await apiClient.get<OrgMember[]>(
    `/organizations/${slug}/members`,
  );
  return data;
}

export async function inviteOrgMember(
  slug: string,
  payload: { email: string; role: string },
): Promise<void> {
  await apiClient.post(`/organizations/${slug}/members`, payload);
}

export async function bulkInviteOrgMembers(
  slug: string,
  members: { email: string; role: string }[],
): Promise<{ invited: number; failed: number; errors: string[] }> {
  const { data } = await apiClient.post(
    `/organizations/${slug}/members/bulk-invite`,
    { members },
  );
  return data;
}

export async function suspendOrgMember(
  slug: string,
  memberId: string,
  reason?: string,
): Promise<void> {
  await apiClient.post(`/organizations/${slug}/members/${memberId}/suspend`, {
    reason,
  });
}

export async function deactivateOrgMember(
  slug: string,
  memberId: string,
  reason?: string,
): Promise<void> {
  await apiClient.post(
    `/organizations/${slug}/members/${memberId}/deactivate`,
    { reason },
  );
}

export async function reactivateOrgMember(
  slug: string,
  memberId: string,
): Promise<void> {
  await apiClient.post(
    `/organizations/${slug}/members/${memberId}/reactivate`,
  );
}

// ── Invitations ─────────────────────────────────────────────────────

export interface OrgInvitation {
  id: string;
  email: string;
  organizationId: string;
  role: string;
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED' | 'EXPIRED';
  invitedById: string;
  expiresAt: string;
  createdAt: string;
  organization?: {
    name: string;
    logo?: string;
  };
  invitedBy?: {
    name: string;
    email: string;
  };
}

export async function getMyInvitations(): Promise<OrgInvitation[]> {
  const { data } = await apiClient.get<OrgInvitation[]>('/organizations/invitations/my');
  return data;
}

export async function acceptInvitation(token: string): Promise<void> {
  await apiClient.post('/organizations/invitations/accept', { token });
}

export async function declineInvitation(token: string): Promise<void> {
  await apiClient.post('/organizations/invitations/decline', { token });
}

// ── Communities ─────────────────────────────────────────────────────

export async function getOrgCommunities(
  slug: string,
): Promise<OrgCommunity[]> {
  const { data } = await apiClient.get<OrgCommunity[]>(
    `/organizations/${slug}/communities`,
  );
  return data;
}

export async function createOrgCommunity(
  slug: string,
  payload: {
    name: string;
    description?: string;
    isPrivate: boolean;
    organizationId: string;
  },
): Promise<OrgCommunity> {
  const { data } = await apiClient.post<OrgCommunity>(`/organizations/${slug}/communities`, {
    ...payload,
    type: 'professional',
  });
  return data;
}

// ── Events (org-scoped) ────────────────────────────────────────────

export async function createOrgEvent(payload: {
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  communityId?: string;
  organizationId?: string;
  eventType: string; // EventCategory in Prisma
  format: string; // EventFormat in Prisma
  ageGroup: string[];
  languages: string[];
}): Promise<unknown> {
  const { data } = await apiClient.post('/events', payload);
  return data;
}

// ── Settings ───────────────────────────────────────────────────────

export async function updateOrgSettings(
  slug: string,
  payload: Partial<{
    name: string;
    description: string;
    website: string;
    logo: string;
    banner: string;
  }>,
): Promise<OrgDetails> {
  const { data } = await apiClient.patch<OrgDetails>(
    `/organizations/${slug}/settings`,
    payload,
  );
  return data;
}

// ── Admin: Onboarding Settings ─────────────────────────────────────

export async function getOnboardingSettings(): Promise<OnboardingSettings> {
  const { data } = await apiClient.get<OnboardingSettings>(
    '/admin/onboarding/settings',
  );
  return data;
}

export async function updateOnboardingSettings(
  settings: OnboardingSettings,
): Promise<OnboardingSettings> {
  const { data } = await apiClient.put<OnboardingSettings>(
    '/admin/onboarding/settings',
    settings,
  );
  return data;
}

// ── Admin: Organization Commissions ────────────────────────────────

export async function getOrganizationsWithCommission(params?: {
  search?: string;
}): Promise<OrgCommissionsResponse> {
  const { data } = await apiClient.get<OrgCommissionsResponse>(
    '/marketplace/admin/organizations',
    { params },
  );
  return data;
}

export async function updateOrganizationCommission(
  organizationId: string,
  commissionPercentage: number | null,
): Promise<void> {
  await apiClient.patch(
    `/marketplace/admin/organizations/${organizationId}/commission`,
    { commissionPercentage },
  );
}
