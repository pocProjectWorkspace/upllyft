import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@upllyft/ui';
import * as api from '@/lib/api/clinic-intake';

const keys = {
  all: ['clinic-intake'] as const,
  identity: (childId: string) => [...keys.all, 'identity', childId] as const,
  guardians: (childId: string) => [...keys.all, 'guardians', childId] as const,
};

// ── Identity ──
export function useIdentity(childId?: string) {
  return useQuery({
    queryKey: keys.identity(childId || ''),
    queryFn: () => api.getIdentity(childId as string),
    enabled: !!childId,
  });
}

export function useCaptureIdentity(childId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: api.CaptureIdentityInput) => api.captureIdentity(childId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.identity(childId) });
      toast({ title: 'Identity saved' });
    },
    onError: () => toast({ title: 'Failed to save identity', variant: 'destructive' }),
  });
}

export function useVerifyIdentity(childId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.verifyIdentity(childId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.identity(childId) });
      toast({ title: 'Identity verified' });
    },
    onError: () => toast({ title: 'Failed to verify identity', variant: 'destructive' }),
  });
}

// ── Guardians ──
export function useGuardians(childId?: string) {
  return useQuery({
    queryKey: keys.guardians(childId || ''),
    queryFn: () => api.listGuardians(childId as string),
    enabled: !!childId,
  });
}

export function useCreateGuardian(childId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<api.Guardian>) => api.createGuardian(childId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.guardians(childId) });
      toast({ title: 'Guardian added' });
    },
    onError: () => toast({ title: 'Failed to add guardian', variant: 'destructive' }),
  });
}

export function useUpdateGuardian(childId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<api.Guardian> }) =>
      api.updateGuardian(childId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.guardians(childId) });
      toast({ title: 'Guardian updated' });
    },
    onError: () => toast({ title: 'Failed to update guardian', variant: 'destructive' }),
  });
}

export function useRemoveGuardian(childId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.removeGuardian(childId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.guardians(childId) });
      toast({ title: 'Guardian removed' });
    },
    onError: () => toast({ title: 'Failed to remove guardian', variant: 'destructive' }),
  });
}
