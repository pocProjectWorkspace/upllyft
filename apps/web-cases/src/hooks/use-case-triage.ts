import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@upllyft/ui';
import * as api from '@/lib/api/case-triage';

const k = {
  current: (caseId: string) => ['case-triage', 'current', caseId] as const,
  candidates: (caseId: string) => ['case-triage', 'candidates', caseId] as const,
};

export function useCurrentTriage(caseId: string) {
  return useQuery({
    queryKey: k.current(caseId),
    queryFn: () => api.getCurrentTriage(caseId),
    enabled: !!caseId,
  });
}

export function useTriageCandidates(caseId: string) {
  return useQuery({
    queryKey: k.candidates(caseId),
    queryFn: () => api.getTriageCandidates(caseId),
    enabled: !!caseId,
  });
}

export function useConfirmTriage(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: api.ConfirmTriageInput) => api.confirmTriage(caseId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: k.current(caseId) });
      qc.invalidateQueries({ queryKey: ['cases'] });
      toast({ title: 'Triage confirmed' });
    },
    onError: () => toast({ title: 'Failed to confirm triage', variant: 'destructive' }),
  });
}
