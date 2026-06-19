import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@upllyft/ui';
import * as payerApi from '@/lib/api/payer';

const keys = {
  all: ['payer'] as const,
  policies: (childId: string) => [...keys.all, 'policies', childId] as const,
  preAuths: (caseId: string) => [...keys.all, 'preauths', caseId] as const,
  readiness: (bookingId: string) => [...keys.all, 'readiness', bookingId] as const,
};

// ── Insurance policies ──
export function useInsurancePolicies(childId?: string) {
  return useQuery({
    queryKey: keys.policies(childId || ''),
    queryFn: () => payerApi.listInsurancePolicies(childId as string),
    enabled: !!childId,
  });
}

export function useCreateInsurancePolicy(childId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<payerApi.InsurancePolicy>) =>
      payerApi.createInsurancePolicy(childId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.policies(childId) });
      toast({ title: 'Insurance policy added' });
    },
    onError: () => toast({ title: 'Failed to add policy', variant: 'destructive' }),
  });
}

// ── Pre-authorizations ──
export function usePreAuths(caseId?: string) {
  return useQuery({
    queryKey: keys.preAuths(caseId || ''),
    queryFn: () => payerApi.listPreAuths(caseId as string),
    enabled: !!caseId,
  });
}

export function useCreatePreAuth(caseId: string, childId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: payerApi.CreatePreAuthInput) => payerApi.createPreAuth(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.preAuths(caseId) });
      if (childId) qc.invalidateQueries({ queryKey: keys.policies(childId) });
      toast({ title: 'Pre-authorisation requested' });
    },
    onError: () => toast({ title: 'Failed to request pre-authorisation', variant: 'destructive' }),
  });
}

export function useDecidePreAuth(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: payerApi.DecidePreAuthInput }) =>
      payerApi.decidePreAuth(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.preAuths(caseId) });
      toast({ title: 'Pre-authorisation updated' });
    },
    onError: () => toast({ title: 'Failed to update pre-authorisation', variant: 'destructive' }),
  });
}

export function useRenewPreAuth(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => payerApi.renewPreAuth(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.preAuths(caseId) });
      toast({ title: 'Pre-authorisation renewed' });
    },
    onError: () => toast({ title: 'Failed to renew', variant: 'destructive' }),
  });
}

// ── Booking readiness / clearance ──
export function useBookingReadiness(bookingId?: string) {
  return useQuery({
    queryKey: keys.readiness(bookingId || ''),
    queryFn: () => payerApi.getBookingReadiness(bookingId as string),
    enabled: !!bookingId,
  });
}

export function useSetBookingClearance(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { status: payerApi.FinancialClearanceStatus; note?: string }) =>
      payerApi.setBookingClearance(bookingId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.readiness(bookingId) });
      toast({ title: 'Financial clearance updated' });
    },
    onError: () => toast({ title: 'Failed to update clearance', variant: 'destructive' }),
  });
}
