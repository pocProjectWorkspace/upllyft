'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listMoments,
  createMoment,
  interpretMoment,
  deleteMoment,
  getInsights,
  updateInsightStatus,
  getProgress,
  getAreaDetail,
  type MomentCategory,
  type MiraInsightStatus,
} from '@/lib/api/moments';

export function useMoments(childId: string | undefined, params?: { category?: MomentCategory; limit?: number }) {
  return useQuery({
    queryKey: ['moments', childId, params],
    queryFn: () => listMoments(childId!, params),
    enabled: !!childId,
  });
}

export function useCreateMoment(childId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof createMoment>[1]) => createMoment(childId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moments', childId] });
      queryClient.invalidateQueries({ queryKey: ['moment-progress', childId] });
    },
  });
}

export function useInterpretMoment(childId: string | undefined) {
  return useMutation({
    mutationFn: (text: string) => interpretMoment(childId!, text),
  });
}

export function useDeleteMoment(childId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (momentId: string) => deleteMoment(childId!, momentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moments', childId] }),
  });
}

export function useMomentInsights(childId: string | undefined) {
  return useQuery({
    queryKey: ['moment-insights', childId],
    queryFn: () => getInsights(childId!),
    enabled: !!childId,
    staleTime: 5 * 60 * 1000, // generation is server-governed; don't hammer it
  });
}

export function useUpdateInsight(childId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ insightId, status }: { insightId: string; status: MiraInsightStatus }) =>
      updateInsightStatus(childId!, insightId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moment-insights', childId] }),
  });
}

export function useMomentProgress(childId: string | undefined) {
  return useQuery({
    queryKey: ['moment-progress', childId],
    queryFn: () => getProgress(childId!),
    enabled: !!childId,
  });
}

export function useAreaDetail(childId: string | undefined, domain: string | undefined) {
  return useQuery({
    queryKey: ['moment-area', childId, domain],
    queryFn: () => getAreaDetail(childId!, domain!),
    enabled: !!childId && !!domain,
  });
}
