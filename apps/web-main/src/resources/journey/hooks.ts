'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyChildren } from '@/booking/lib/api/find-care';
import { journeyApi, type LibraryFilters, type LogInput, type ResourceKind } from './api';

/** One place for every Resources-journey query key. */
export const journeyKeys = {
  all: ['journey'] as const,
  children: () => ['journey', 'children'] as const,
  child: (childId: string) => ['journey', 'child', childId] as const,
  library: (childId: string, f: LibraryFilters) => ['journey', 'child', childId, 'library', f] as const,
  screening: (childId: string) => ['journey', 'child', childId, 'screening'] as const,
  items: (childId: string) => ['journey', 'child', childId, 'items'] as const,
  progress: (childId: string, domain?: string) => ['journey', 'child', childId, 'progress', domain ?? ''] as const,
  targets: (childId: string) => ['journey', 'child', childId, 'targets'] as const,
  sharedWithMe: () => ['journey', 'shared-with-me'] as const,
  sharedProgress: (shareId: string, domain?: string) => ['journey', 'shared', shareId, domain ?? ''] as const,
  clients: () => ['journey', 'clients'] as const,
  assignable: (f: LibraryFilters & { childId?: string }) => ['journey', 'assignable', f] as const,
  assigned: (childId: string) => ['journey', 'assigned', childId] as const,
};

export function useMyChildren(enabled = true) {
  return useQuery({ queryKey: journeyKeys.children(), queryFn: getMyChildren, enabled, staleTime: 5 * 60_000 });
}

export function useLibrary(childId: string, f: LibraryFilters) {
  return useQuery({
    queryKey: journeyKeys.library(childId, f),
    queryFn: () => journeyApi.library(childId, f),
    enabled: !!childId,
    placeholderData: keepPreviousData,
  });
}

export function useScreening(childId: string) {
  return useQuery({ queryKey: journeyKeys.screening(childId), queryFn: () => journeyApi.screening(childId), enabled: !!childId });
}

export function useItems(childId: string) {
  return useQuery({ queryKey: journeyKeys.items(childId), queryFn: () => journeyApi.items(childId), enabled: !!childId });
}

export function useProgress(childId: string, domain?: string, enabled = true) {
  return useQuery({
    queryKey: journeyKeys.progress(childId, domain),
    queryFn: () => journeyApi.progress(childId, domain),
    enabled: !!childId && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useShareTargets(childId: string, enabled: boolean) {
  return useQuery({ queryKey: journeyKeys.targets(childId), queryFn: () => journeyApi.shareTargets(childId), enabled: !!childId && enabled });
}

/** Everything a write can change for a child: library flags, items, progress. */
function useInvalidateChild() {
  const qc = useQueryClient();
  return (childId: string) => qc.invalidateQueries({ queryKey: journeyKeys.child(childId) });
}

export function useSave(childId: string) {
  const invalidate = useInvalidateChild();
  return useMutation({
    mutationFn: (v: { kind: ResourceKind; resourceId: string }) => journeyApi.save(childId, v.kind, v.resourceId),
    onSettled: () => invalidate(childId),
  });
}

export function useRemove(childId: string) {
  const invalidate = useInvalidateChild();
  return useMutation({ mutationFn: (itemId: string) => journeyApi.remove(itemId), onSettled: () => invalidate(childId) });
}

export function useSetMastered(childId: string) {
  const qc = useQueryClient();
  const invalidate = useInvalidateChild();
  return useMutation({
    mutationFn: (v: { itemId: string; mastered: boolean | null }) => journeyApi.setMastered(v.itemId, v.mastered),
    // Show the new status straight away; the refetch confirms it.
    onMutate: async (v) => {
      const key = journeyKeys.items(childId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Awaited<ReturnType<typeof journeyApi.items>>>(key);
      if (prev) {
        qc.setQueryData(key, {
          ...prev,
          items: prev.items.map((i) =>
            i.id === v.itemId ? { ...i, masteredOverride: v.mastered, status: v.mastered ? 'Mastered' : i.status } : i,
          ),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(journeyKeys.items(childId), ctx.prev),
    onSettled: () => invalidate(childId),
  });
}

export function useLog(childId: string) {
  const invalidate = useInvalidateChild();
  return useMutation({ mutationFn: (input: LogInput) => journeyApi.log(childId, input), onSettled: () => invalidate(childId) });
}

export function useShare(childId: string) {
  const invalidate = useInvalidateChild();
  return useMutation({
    mutationFn: (body: { therapistUserId: string; periodDays: number | 'all'; includeNotes: boolean }) => journeyApi.share(childId, body),
    onSettled: () => invalidate(childId),
  });
}

export function useRevoke(childId: string) {
  const invalidate = useInvalidateChild();
  return useMutation({ mutationFn: (shareId: string) => journeyApi.revoke(shareId), onSettled: () => invalidate(childId) });
}
