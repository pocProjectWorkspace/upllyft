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
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  isVerified: boolean;
}

export interface OrgStats {
  org: OrgDetails;
  memberCount: number;
  communityCount: number;
  upcomingEventCount: number;
}

export interface MyOrgMembership {
  role: 'ADMIN' | 'MEMBER';
  status: string;
  joinedAt: string | null;
  organization: {
    id: string;
    name: string;
    slug: string;
    logo?: string | null;
    primaryColor?: string | null;
  };
}

export interface OrgEvent {
  id: string;
  title: string;
  description: string;
  coverImage?: string | null;
  eventType: string;
  format: 'VIRTUAL' | 'IN_PERSON' | 'HYBRID';
  startDate: string;
  endDate?: string | null;
  venue?: string | null;
  city?: string | null;
  location?: string | null;
  meetingLink?: string | null;
  status: string;
  isCancelled: boolean;
  attendeeCount: number;
  maxAttendees?: number | null;
  community?: { id: string; name: string; slug: string } | null;
  creator?: { id: string; name: string | null; image?: string | null } | null;
  _count?: { interests: number };
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

/** Organizations the signed-in user belongs to, with their role in each. */
export async function getMyOrganizations(): Promise<MyOrgMembership[]> {
  const { data } = await apiClient.get<MyOrgMembership[]>('/organizations/my');
  return data;
}

export async function getOrgEvents(slug: string): Promise<OrgEvent[]> {
  const { data } = await apiClient.get<OrgEvent[]>(`/organizations/${slug}/events`);
  return data;
}

// ── Members ────────────────────────────────────────────────────────

export async function getOrgMembers(slug: string): Promise<OrgMember[]> {
  const { data } = await apiClient.get<OrgMember[]>(
    `/organizations/${slug}/members`,
  );
  return data;
}

export async function getOrgMember(
  slug: string,
  memberId: string,
): Promise<OrgMember | undefined> {
  // No single-member endpoint yet; resolve from the org roster. Cheap for
  // clinic-sized orgs — swap for `GET /organizations/:slug/members/:id` when built.
  const members = await getOrgMembers(slug);
  return members.find((m) => m.id === memberId);
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

export async function approveOrgMember(
  slug: string,
  memberId: string,
  approve: boolean,
): Promise<void> {
  await apiClient.post(`/organizations/${slug}/members/${memberId}/approve`, {
    approve,
  });
}

// ── Add Therapist wizard: profile (Basic Info + Credentials) ──

export interface TherapistProfileData {
  title?: string | null;
  bio?: string | null;
  department?: string | null;
  phone?: string | null;
  branch?: string | null;
  country?: string | null;
  qualification?: string | null;
  university?: string | null;
  yearsExperience?: number | null;
  specializations?: string[];
  licenceNumber?: string | null;
  licenceExpiry?: string | null;
  licenseAuthority?: string | null;
  rciNumber?: string | null;
  councilNumber?: string | null;
  bcbaNumber?: string | null;
  emiratesId?: string | null;
  visaStatus?: string | null;
  insuranceProvider?: string | null;
  insurancePolicyNumber?: string | null;
  insuranceExpiry?: string | null;
}

export interface WizardSessionType {
  id: string;
  name: string;
  duration: number;
  defaultPrice: number;
  currency: string;
}

export interface WizardAvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export async function getMemberTherapistProfile(
  slug: string,
  memberId: string,
): Promise<{
  member: { status: string; userId: string };
  user: { id: string; name: string | null; email: string } | null;
  profile: TherapistProfileData | null;
  sessionTypes: WizardSessionType[];
  availability: WizardAvailabilitySlot[];
}> {
  const { data } = await apiClient.get(
    `/organizations/${slug}/members/${memberId}/therapist-profile`,
  );
  return data;
}

export async function saveMemberAvailability(
  slug: string,
  memberId: string,
  slots: { dayOfWeek: number; startTime: string; endTime: string }[],
  timezone?: string,
): Promise<void> {
  await apiClient.put(`/organizations/${slug}/members/${memberId}/availability`, {
    slots,
    timezone,
  });
}

export async function saveMemberSessionTypes(
  slug: string,
  memberId: string,
  items: { name: string; duration: number; price: number; currency: string }[],
): Promise<void> {
  await apiClient.put(`/organizations/${slug}/members/${memberId}/session-types`, {
    items,
  });
}

export async function saveMemberTherapistProfile(
  slug: string,
  memberId: string,
  payload: TherapistProfileData & { name?: string },
): Promise<void> {
  await apiClient.patch(
    `/organizations/${slug}/members/${memberId}/therapist-profile`,
    payload,
  );
}

// ── Family Intake Journey ──

export interface OrgFamily {
  caseId: string;
  caseNumber: string;
  childName: string;
  childDob: string;
  parentName: string | null;
  submittedAt: string;
  assignedTherapistId: string | null;
  assignedTherapistName: string | null;
  status: 'PENDING_REVIEW' | 'ACCESS_GRANTED';
}

export interface OrgFamilyDetail {
  id: string;
  caseNumber: string;
  status: string;
  createdAt: string;
  child: {
    id: string;
    firstName: string;
    nickname: string | null;
    dateOfBirth: string;
    gender: string;
    guardians: {
      fullName: string;
      relationship: string;
      email: string | null;
      phone: string | null;
      isPrimaryContact: boolean;
      userId: string | null;
    }[];
  };
  primaryTherapist: { id: string; user: { name: string | null } } | null;
  intake: {
    state: string;
    presentingConcern: string | null;
    referralQuestions: string[];
    parentGoals: string[];
    urgencyFlag: string | null;
    aiSummary: string | null;
    consentAssessment: boolean;
    consentTherapy: boolean;
    consentSharing: boolean;
    consentAi: boolean;
  } | null;
  accessGranted: boolean;
  profileOwner: { name: string | null; email: string | null } | null;
}

export interface OrgTherapistOption {
  id: string;
  name: string;
  department: string | null;
}

export async function getOrgFamilies(slug: string): Promise<OrgFamily[]> {
  const { data } = await apiClient.get<OrgFamily[]>(`/organizations/${slug}/families`);
  return data;
}

export async function getOrgFamilyDetail(
  slug: string,
  caseId: string,
): Promise<OrgFamilyDetail> {
  const { data } = await apiClient.get<OrgFamilyDetail>(
    `/organizations/${slug}/families/${caseId}`,
  );
  return data;
}

export async function getOrgTherapists(slug: string): Promise<OrgTherapistOption[]> {
  const { data } = await apiClient.get<OrgTherapistOption[]>(
    `/organizations/${slug}/therapists`,
  );
  return data;
}

export async function assignOrgFamilyTherapist(
  slug: string,
  caseId: string,
  therapistId: string,
): Promise<void> {
  await apiClient.post(`/organizations/${slug}/families/${caseId}/assign`, {
    therapistId,
  });
}

export async function grantOrgFamilyAccess(
  slug: string,
  caseId: string,
): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post(
    `/organizations/${slug}/families/${caseId}/grant-access`,
  );
  return data;
}

// ── Leave / holidays (shares the therapist's AvailabilityException records) ──

export interface LeaveRecord {
  id: string;
  therapistId: string;
  date: string;
  reason?: string | null;
}

export async function getMemberLeave(
  slug: string,
  memberId: string,
): Promise<LeaveRecord[]> {
  const { data } = await apiClient.get<LeaveRecord[]>(
    `/organizations/${slug}/members/${memberId}/leave`,
  );
  return data;
}

export async function addMemberLeave(
  slug: string,
  memberId: string,
  body: { fromDate: string; toDate?: string; reason?: string },
): Promise<void> {
  await apiClient.post(`/organizations/${slug}/members/${memberId}/leave`, body);
}

export async function removeMemberLeave(
  slug: string,
  memberId: string,
  exceptionId: string,
): Promise<void> {
  await apiClient.delete(
    `/organizations/${slug}/members/${memberId}/leave/${exceptionId}`,
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
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
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

// ── Facilities under an organization (F3 tenancy) ──

export interface OrgFacility {
  id: string;
  name: string;
  slug: string;
  type: 'CLINIC' | 'NURSERY' | 'SCHOOL';
  organizationId: string;
  complianceStatus: string;
  licenseAuthority: string | null;
  emirate: string | null;
  _count: { rooms: number; members: number };
}

/** Facilities the current user staffs. Filter by organizationId for a given org's sites. */
export async function getMyFacilities(): Promise<OrgFacility[]> {
  const { data } = await apiClient.get<OrgFacility[]>('/facilities');
  return data;
}
