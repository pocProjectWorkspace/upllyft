import { apiClient } from '@upllyft/api-client';

// Therapist-side clinic community creation reuses the org endpoints — createCommunity
// allows any org member (not just admins), and the member-accessible roster feeds the
// moderator picker / auto-add. Focus area, moderators, auto-add and publish/draft all
// map onto the same Community model the org admin's wizard uses.

export interface MyOrganization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export interface OrgRosterTherapist {
  id: string;
  userId: string;
  name: string;
  department: string | null;
}

export async function getMyOrganizations(): Promise<MyOrganization[]> {
  const { data } = await apiClient.get<MyOrganization[]>('/users/me/organizations');
  return data;
}

export async function getOrgRoster(slug: string): Promise<OrgRosterTherapist[]> {
  const { data } = await apiClient.get<OrgRosterTherapist[]>(`/organizations/${slug}/roster`);
  return data;
}

export interface CreateClinicCommunityPayload {
  name: string;
  description?: string;
  focusArea?: string;
  privacy?: 'invite' | 'open';
  eligibleBranches?: string[];
  eligibleSpecializations?: string[];
  guidelines?: string;
  moderatorUserIds?: string[];
  autoAddMatching?: boolean;
  publish?: boolean;
}

export async function createClinicCommunity(
  slug: string,
  payload: CreateClinicCommunityPayload,
): Promise<{ id: string; slug: string }> {
  const { data } = await apiClient.post(`/organizations/${slug}/communities`, payload);
  return data;
}
