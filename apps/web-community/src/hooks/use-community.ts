import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCommunityStats,
  browseCommunities,
  getMyCommunities,
  getCommunity,
  createCommunity,
  joinCommunity,
  leaveCommunity,
  getCommunityMembers,
  getTopContributors,
  getCommunityWhatsAppGroups,
  getCommunityPosts,
  type BrowseCommunitiesParams,
  type CreateCommunityDto,
} from '@/lib/api/community';

const communityKeys = {
  all: ['communities'] as const,
  stats: () => [...communityKeys.all, 'stats'] as const,
  browse: (params?: BrowseCommunitiesParams) => [...communityKeys.all, 'browse', params] as const,
  mine: () => [...communityKeys.all, 'mine'] as const,
  detail: (id: string) => [...communityKeys.all, 'detail', id] as const,
  members: (params?: Record<string, unknown>) => [...communityKeys.all, 'members', params] as const,
  topContributors: (limit?: number) => [...communityKeys.all, 'top-contributors', limit] as const,
  whatsappGroups: (id: string) => [...communityKeys.all, 'whatsapp', id] as const,
  posts: (id: string, params?: Record<string, unknown>) => [...communityKeys.all, 'posts', id, params] as const,
};

export function useCommunityStats() {
  return useQuery({
    queryKey: communityKeys.stats(),
    queryFn: getCommunityStats,
  });
}

export function useBrowseCommunities(params?: BrowseCommunitiesParams) {
  return useQuery({
    queryKey: communityKeys.browse(params),
    queryFn: () => browseCommunities(params),
  });
}

export function useMyCommunities() {
  return useQuery({
    queryKey: communityKeys.mine(),
    queryFn: getMyCommunities,
  });
}

export function useCommunity(id: string) {
  return useQuery({
    queryKey: communityKeys.detail(id),
    queryFn: () => getCommunity(id),
    enabled: !!id,
  });
}

export function useCreateCommunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateCommunityDto) => createCommunity(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all });
    },
  });
}

export function useJoinCommunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => joinCommunity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all });
    },
  });
}

export function useLeaveCommunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leaveCommunity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all });
    },
  });
}

export function useCommunityMembers(params?: { page?: number; limit?: number; role?: string; search?: string }) {
  return useQuery({
    queryKey: communityKeys.members(params),
    queryFn: () => getCommunityMembers(params),
  });
}

export function useTopContributors(limit?: number) {
  return useQuery({
    queryKey: communityKeys.topContributors(limit),
    queryFn: () => getTopContributors(limit),
  });
}

export function useCommunityWhatsAppGroups(communityId: string) {
  return useQuery({
    queryKey: communityKeys.whatsappGroups(communityId),
    queryFn: () => getCommunityWhatsAppGroups(communityId),
    enabled: !!communityId,
  });
}

export function useCommunityPosts(communityId: string, params?: { page?: number; limit?: number; sort?: string }) {
  return useQuery({
    queryKey: communityKeys.posts(communityId, params),
    queryFn: () => getCommunityPosts(communityId, params),
    enabled: !!communityId,
  });
}
