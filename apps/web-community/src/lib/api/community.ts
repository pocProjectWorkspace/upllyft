import { apiClient } from '@upllyft/api-client';

export interface Community {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: 'CONDITION_SPECIFIC' | 'REGIONAL' | 'PROFESSIONAL' | 'ORGANIZATION';
  condition?: string;
  location?: string;
  isPrivate: boolean;
  requiresApproval: boolean;
  memberCount?: number;
  postCount?: number;
  icon?: string;
  bannerImage?: string;
  tags: string[];
  isMember?: boolean;
  userMembership?: {
    status: 'ACTIVE' | 'PENDING' | 'BLOCKED';
    role: 'MEMBER' | 'MODERATOR' | 'OWNER' | 'ADMIN';
  };
  whatsappEnabled?: boolean;
  creator?: {
    id: string;
    name: string;
    image?: string;
  };
  _count?: {
    members: number;
    posts: number;
    children?: number;
    whatsappGroups?: number;
  };
}

export interface CommunityMember {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
  verificationStatus?: string;
  organization?: string;
  specialization?: string[];
  bio?: string;
  trustScore?: number;
  _count?: {
    posts: number;
    comments: number;
    followers?: number;
    following?: number;
  };
}

export interface CommunityStats {
  totalMembers: number;
  verifiedMembers: number;
  totalPosts: number;
  totalComments: number;
  activeToday: number;
}

export interface WhatsAppGroup {
  id: string;
  name: string;
  description?: string;
  groupLink: string;
  qrCodeUrl?: string;
  memberLimit: number;
  currentCount: number;
  isFull: boolean;
  language: string;
  isActive: boolean;
  groupNumber?: number;
}

export interface CreateCommunityDto {
  name: string;
  description: string;
  type: string;
  condition?: string;
  location?: string;
  isPrivate: boolean;
  requiresApproval: boolean;
  rules?: string;
  welcomeMessage?: string;
  whatsappEnabled: boolean;
  autoCreateWhatsAppGroup?: boolean;
  whatsappGroupLimit?: number;
  primaryLanguage: string;
  tags: string[];
  icon?: string;
  bannerImage?: string;
}

export interface BrowseCommunitiesParams {
  page?: number;
  limit?: number;
  type?: string;
  search?: string;
}

export async function getCommunityStats(): Promise<CommunityStats> {
  const { data } = await apiClient.get('/community/stats');
  return {
    totalMembers: data.totalMembers ?? 0,
    verifiedMembers: data.verifiedMembers ?? data.verifiedProfessionals ?? 0,
    totalPosts: data.totalPosts ?? 0,
    totalComments: data.totalComments ?? 0,
    activeToday: data.activeToday ?? 0,
  };
}

export async function browseCommunities(params?: BrowseCommunitiesParams): Promise<{ data: Community[]; total: number }> {
  const { data } = await apiClient.get('/community/browse', { params });
  return {
    data: data.communities ?? data.data ?? [],
    total: data.total ?? 0,
  };
}

export async function getMyCommunities(): Promise<Community[]> {
  const { data } = await apiClient.get('/community/my-communities');
  return data;
}

export async function getCommunity(id: string): Promise<Community> {
  const { data } = await apiClient.get(`/community/${id}`);
  return data;
}

export async function createCommunity(dto: CreateCommunityDto): Promise<Community> {
  const { data } = await apiClient.post('/community/create', dto);
  return data;
}

export async function joinCommunity(id: string): Promise<void> {
  await apiClient.post(`/community/${id}/join`);
}

export async function leaveCommunity(id: string): Promise<void> {
  await apiClient.post(`/community/${id}/leave`);
}

export async function getCommunityMembers(params?: { page?: number; limit?: number; role?: string; search?: string }): Promise<{ data: CommunityMember[]; total: number }> {
  const { data } = await apiClient.get('/community/members', { params });
  return data;
}

export async function getTopContributors(limit?: number): Promise<CommunityMember[]> {
  const { data } = await apiClient.get('/community/top-contributors', { params: { limit } });
  return data;
}

export async function getCommunityWhatsAppGroups(communityId: string): Promise<WhatsAppGroup[]> {
  const { data } = await apiClient.get(`/community/${communityId}/whatsapp-groups`);
  return data;
}

export async function getCommunityPosts(communityId: string, params?: { page?: number; limit?: number; sort?: string }): Promise<{ data: any[]; total: number }> {
  const { data } = await apiClient.get(`/community/${communityId}/posts`, { params });
  return {
    data: data.posts ?? data.data ?? [],
    total: data.total ?? 0,
  };
}

export async function getCommunityMembersList(communityId: string, params?: { page?: number; limit?: number }): Promise<{ data: CommunityMember[]; total: number }> {
  const { data } = await apiClient.get(`/community/${communityId}/community-members`, { params });
  const raw = data.members ?? data.data ?? [];
  // Backend returns CommunityMember records with nested `user` — flatten to match CommunityMember interface
  const members = raw.map((m: any) => (m.user ? { ...m.user, role: m.user.role ?? m.role } : m));
  return {
    data: members,
    total: data.total ?? 0,
  };
}
