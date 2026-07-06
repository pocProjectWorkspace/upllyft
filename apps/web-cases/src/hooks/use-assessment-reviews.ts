import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@upllyft/ui';
import * as api from '@/lib/api/assessment-reviews';
import type { TherapyDiscipline } from '@/lib/api/care-plans';

const k = {
  list: (caseId: string) => ['assessment-reviews', caseId] as const,
  one: (caseId: string, id: string) => ['assessment-reviews', caseId, id] as const,
};
const fail = (msg: string) => () => toast({ title: msg, variant: 'destructive' });

export function useAssessmentReviews(caseId: string) {
  return useQuery({ queryKey: k.list(caseId), queryFn: () => api.listReviews(caseId), enabled: !!caseId });
}
export function useAssessmentReview(caseId: string, id?: string) {
  return useQuery({
    queryKey: k.one(caseId, id || ''),
    queryFn: () => api.getReview(caseId, id!),
    enabled: !!caseId && !!id,
  });
}

function useReviewMutation<T>(caseId: string, fn: (v: T) => Promise<any>, msg?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['assessment-reviews', caseId] });
      qc.invalidateQueries({ queryKey: ['cases'] });
      if (msg) toast({ title: msg });
      return data;
    },
    onError: fail('Action failed'),
  });
}

export const useCreateReview = (caseId: string) =>
  useReviewMutation(
    caseId,
    (d: { type: api.AssessmentReviewType; disciplines: TherapyDiscipline[]; title?: string }) =>
      api.createReview(caseId, d),
    'Assessment created',
  );
export const useUpdateReview = (caseId: string) =>
  useReviewMutation(caseId, ({ id, data }: { id: string; data: any }) => api.updateReview(caseId, id, data));
export const useAddDiscipline = (caseId: string) =>
  useReviewMutation(
    caseId,
    ({ id, discipline }: { id: string; discipline: TherapyDiscipline }) => api.addDiscipline(caseId, id, discipline),
    'Discipline added to scope',
  );
export const useUpdateDiscipline = (caseId: string) =>
  useReviewMutation(caseId, ({ id, rowId, data }: { id: string; rowId: string; data: any }) =>
    api.updateDiscipline(caseId, id, rowId, data),
  );
export const useDraftReport = (caseId: string) =>
  useReviewMutation(caseId, (id: string) => api.draftReport(caseId, id), 'Report drafted');
export const useShareReport = (caseId: string) =>
  useReviewMutation(
    caseId,
    ({ id, recipients }: { id: string; recipients: any }) => api.shareReport(caseId, id, recipients),
    'Report shared',
  );
