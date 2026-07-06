import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@upllyft/ui';
import * as api from '@/lib/api/case-intake';

const key = (caseId: string) => ['case-intake', caseId] as const;
const fail = (msg: string) => () => toast({ title: msg, variant: 'destructive' });

export function useIntake(caseId: string) {
  return useQuery({
    queryKey: key(caseId),
    queryFn: () => api.getIntake(caseId),
    enabled: !!caseId,
  });
}

export function useSaveIntakeDraft(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: api.SaveCaseIntakeInput) => api.saveIntakeDraft(caseId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(caseId) });
      toast({ title: 'Draft saved' });
    },
    onError: fail('Failed to save draft'),
  });
}

export function useSummariseIntake(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: api.SaveCaseIntakeInput) => api.summariseIntake(caseId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(caseId) });
      qc.invalidateQueries({ queryKey: ['cases'] });
      toast({ title: 'Intake completed' });
    },
    onError: fail('Failed to complete intake'),
  });
}
