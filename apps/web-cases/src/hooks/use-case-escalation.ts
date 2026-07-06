import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@upllyft/ui';
import * as api from '@/lib/api/case-escalation';

const key = (caseId: string) => ['escalations', caseId] as const;

function useEscMutation<T>(caseId: string, fn: (v: T) => Promise<any>, msg?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(caseId) });
      if (msg) toast({ title: msg });
    },
    onError: (e: any) =>
      toast({ title: e?.response?.data?.message ?? 'Action failed', variant: 'destructive' }),
  });
}

export function useEscalations(caseId: string) {
  return useQuery({ queryKey: key(caseId), queryFn: () => api.listEscalations(caseId), enabled: !!caseId });
}
export const useCreateEscalation = (caseId: string) =>
  useEscMutation(caseId, (d: api.CreateEscalationInput) => api.createEscalation(caseId, d));
export const useUpdateEscalation = (caseId: string) =>
  useEscMutation(caseId, ({ id, data }: { id: string; data: api.UpdateEscalationInput }) =>
    api.updateEscalation(caseId, id, data),
  );
export const useSendReferral = (caseId: string) =>
  useEscMutation(caseId, (id: string) => api.sendReferral(caseId, id), 'Referral sent');
export const useFollowUp = (caseId: string) =>
  useEscMutation(
    caseId,
    ({ id, ...data }: { id: string; outcome?: string; action: 'close' | 'continue' }) =>
      api.followUpEscalation(caseId, id, data),
    'Follow-up recorded',
  );
