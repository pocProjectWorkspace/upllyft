'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { portalApi, type ConsentKey } from './lib/api';

export const portalKeys = {
  all: ['clinic-portal'] as const,
  child: (childId: string) => ['clinic-portal', childId] as const,
  slots: (childId: string, sessionId: string) => ['clinic-portal', childId, 'slots', sessionId] as const,
  report: (childId: string, id: string) => ['clinic-portal', childId, 'report', id] as const,
  summary: (childId: string, id: string) => ['clinic-portal', childId, 'summary', id] as const,
  intake: (childId: string, caseId: string) => ['clinic-portal', childId, 'intake', caseId] as const,
};

export function usePortal(childId: string) {
  return useQuery({ queryKey: portalKeys.child(childId), queryFn: () => portalApi.get(childId), enabled: !!childId });
}

/** Slots are re-fetched every time the dialog opens: they are only true right now. */
export function useSlots(childId: string, sessionId: string | null) {
  return useQuery({
    queryKey: portalKeys.slots(childId, sessionId ?? ''),
    queryFn: () => portalApi.slots(childId, sessionId!),
    enabled: !!childId && !!sessionId,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useReport(childId: string, id: string | null) {
  return useQuery({ queryKey: portalKeys.report(childId, id ?? ''), queryFn: () => portalApi.report(childId, id!), enabled: !!id, retry: false });
}

export function useSummary(childId: string, id: string | null) {
  return useQuery({ queryKey: portalKeys.summary(childId, id ?? ''), queryFn: () => portalApi.summary(childId, id!), enabled: !!id, retry: false });
}

function useRefresh(childId: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: portalKeys.child(childId) });
}

export function useReschedule(childId: string) {
  const refresh = useRefresh(childId);
  return useMutation({
    mutationFn: (v: { sessionId: string; startAt: string }) => portalApi.reschedule(childId, v.sessionId, v.startAt),
    onSettled: refresh,
  });
}

export function useCancel(childId: string) {
  const refresh = useRefresh(childId);
  return useMutation({
    mutationFn: (v: { sessionId: string; reason: string }) => portalApi.cancel(childId, v.sessionId, v.reason),
    onSettled: refresh,
  });
}

export function useSeen(childId: string) {
  const refresh = useRefresh(childId);
  return useMutation({ mutationFn: (itemId: string) => portalApi.seen(childId, itemId), onSettled: refresh });
}

/** Optimistic: the switch moves at once and rolls back if the API refuses. */
export function useSetConsent(childId: string) {
  const qc = useQueryClient();
  const key = portalKeys.child(childId);
  return useMutation({
    mutationFn: (v: { facilityId: string; key: ConsentKey; value: boolean }) =>
      portalApi.setConsent(childId, v.facilityId, v.key, v.value),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old: any) =>
        old
          ? {
              ...old,
              clinics: old.clinics.map((c: any) =>
                c.facilityId === v.facilityId && c.consents ? { ...c, consents: { ...c.consents, [v.key]: v.value } } : c,
              ),
            }
          : old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useIntake(childId: string, caseId: string) {
  return useQuery({ queryKey: portalKeys.intake(childId, caseId), queryFn: () => portalApi.intake(childId, caseId), enabled: !!childId && !!caseId });
}

export function useSubmitIntake(childId: string, caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => portalApi.submitIntake(childId, caseId, body),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: portalKeys.child(childId) });
      qc.invalidateQueries({ queryKey: portalKeys.intake(childId, caseId) });
    },
  });
}
