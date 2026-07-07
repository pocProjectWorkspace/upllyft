import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@upllyft/ui';
import * as api from '@/lib/api/care-plans';

const k = {
  pricing: (caseId: string) => ['care-plans', 'pricing', caseId] as const,
  list: (caseId: string) => ['care-plans', 'list', caseId] as const,
  plan: (caseId: string, planId: string) => ['care-plans', 'plan', caseId, planId] as const,
};

const fail = (msg: string) => () => toast({ title: msg, variant: 'destructive' });

export function usePricingDefaults(caseId: string) {
  return useQuery({
    queryKey: k.pricing(caseId),
    queryFn: () => api.getPricingDefaults(caseId),
    enabled: !!caseId,
    staleTime: 1000 * 60 * 30,
  });
}

export function useCarePlans(caseId: string) {
  return useQuery({
    queryKey: k.list(caseId),
    queryFn: () => api.listCarePlans(caseId),
    enabled: !!caseId,
  });
}

export function useCarePlan(caseId: string, planId?: string) {
  return useQuery({
    queryKey: k.plan(caseId, planId || ''),
    queryFn: () => api.getCarePlan(caseId, planId!),
    enabled: !!caseId && !!planId,
  });
}

export function useCreateCarePlan(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: api.CreateCarePlanInput) => api.createCarePlan(caseId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: k.list(caseId) }),
    onError: fail('Failed to create care plan'),
  });
}

export function useUpdateCarePlan(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, data }: { planId: string; data: Partial<api.CreateCarePlanInput> }) =>
      api.updateCarePlan(caseId, planId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: k.list(caseId) }),
    onError: fail('Failed to update care plan'),
  });
}

export function useLockCarePlan(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => api.lockCarePlan(caseId, planId),
    onSuccess: () => qc.invalidateQueries({ queryKey: k.list(caseId) }),
    onError: fail('Failed to lock plan'),
  });
}

export function useConfirmCarePlan(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => api.confirmCarePlan(caseId, planId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: k.list(caseId) });
      qc.invalidateQueries({ queryKey: ['cases'] });
      toast({ title: `Plan booked — ${res.sessionsCreated} sessions created` });
    },
    onError: fail('Failed to book care plan'),
  });
}

/** Local mirror of the backend session-generation algorithm for instant preview. */
export function generateScheduleLocal(
  startDate: string,
  daysOfWeek: number[],
  timeOfDay: string,
  count: number,
  daySchedule?: Record<string, string> | null,
): Date[] {
  if (!daysOfWeek.length || count < 1 || !startDate) return [];
  const parse = (t: string): [number, number] => {
    const [hh, mm] = (t || '00:00').split(':').map((n) => parseInt(n, 10));
    return [hh || 0, mm || 0];
  };
  const days = new Set(daysOfWeek);
  const out: Date[] = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  let guard = 0;
  while (out.length < count && guard < 1000) {
    const wd = cursor.getDay();
    if (days.has(wd)) {
      const [hh, mm] = parse(daySchedule?.[String(wd)] ?? timeOfDay);
      const d = new Date(cursor);
      d.setHours(hh, mm, 0, 0);
      out.push(d);
    }
    cursor.setDate(cursor.getDate() + 1);
    guard++;
  }
  return out;
}
