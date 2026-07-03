import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@upllyft/ui';
import * as clinicalApi from '@/lib/api/clinical';

const keys = {
  all: ['clinical'] as const,
  catalog: () => [...keys.all, 'catalog'] as const,
  templates: (params?: any) => [...keys.all, 'templates', params] as const,
  template: (id: string) => [...keys.all, 'template', id] as const,
  prefill: (caseId: string) => [...keys.all, 'prefill', caseId] as const,
  records: (caseId: string, params?: any) => [...keys.all, 'records', caseId, params] as const,
  record: (caseId: string, recordId: string) =>
    [...keys.all, 'record', caseId, recordId] as const,
};

// ── Templates ──

export function useTemplateCatalog() {
  return useQuery({
    queryKey: keys.catalog(),
    queryFn: () => clinicalApi.getTemplateCatalog(),
    staleTime: 1000 * 60 * 10,
  });
}

export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: keys.template(id || ''),
    queryFn: () => clinicalApi.getTemplate(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
  });
}

// ── Prefill ──

export function usePrefill(caseId: string, enabled = true) {
  return useQuery({
    queryKey: keys.prefill(caseId),
    queryFn: () => clinicalApi.getPrefill(caseId),
    enabled: !!caseId && enabled,
    staleTime: 1000 * 60 * 5,
  });
}

// ── Records ──

export function useClinicalRecords(
  caseId: string,
  params?: { activityType?: clinicalApi.ClinicalActivityType; status?: clinicalApi.ClinicalRecordStatus },
) {
  return useQuery({
    queryKey: keys.records(caseId, params),
    queryFn: () => clinicalApi.listRecords(caseId, params),
    enabled: !!caseId,
  });
}

export function useClinicalRecord(caseId: string, recordId: string | undefined) {
  return useQuery({
    queryKey: keys.record(caseId, recordId || ''),
    queryFn: () => clinicalApi.getRecord(caseId, recordId!),
    enabled: !!caseId && !!recordId,
  });
}

export function useCreateClinicalRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, data }: { caseId: string; data: clinicalApi.CreateClinicalRecordInput }) =>
      clinicalApi.createRecord(caseId, data),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: keys.records(caseId) });
    },
    onError: () => toast({ title: 'Failed to create record', variant: 'destructive' }),
  });
}

export function useUpdateClinicalRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      caseId,
      recordId,
      data,
    }: {
      caseId: string;
      recordId: string;
      data: { title?: string; answers?: clinicalApi.ClinicalAnswers };
    }) => clinicalApi.updateRecord(caseId, recordId, data),
    onSuccess: (_, { caseId, recordId }) => {
      qc.invalidateQueries({ queryKey: keys.record(caseId, recordId) });
      qc.invalidateQueries({ queryKey: keys.records(caseId) });
    },
  });
}

export function useSignClinicalRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      caseId,
      recordId,
      signatureName,
    }: {
      caseId: string;
      recordId: string;
      signatureName?: string;
    }) => clinicalApi.signRecord(caseId, recordId, signatureName),
    onSuccess: (_, { caseId, recordId }) => {
      qc.invalidateQueries({ queryKey: keys.record(caseId, recordId) });
      qc.invalidateQueries({ queryKey: keys.records(caseId) });
      toast({ title: 'Record signed & locked' });
    },
    onError: () => toast({ title: 'Failed to sign record', variant: 'destructive' }),
  });
}

export function useGenerateRecordReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      caseId,
      recordId,
      data,
    }: {
      caseId: string;
      recordId: string;
      data?: { audience?: 'PROFESSIONAL' | 'PARENT'; additionalContext?: string };
    }) => clinicalApi.generateRecordReport(caseId, recordId, data),
    onSuccess: (_, { caseId, recordId }) => {
      qc.invalidateQueries({ queryKey: keys.record(caseId, recordId) });
      toast({ title: 'Report generated', description: 'Saved to Documents for review.' });
    },
    onError: () => toast({ title: 'Failed to generate report', variant: 'destructive' }),
  });
}

export function useDeleteClinicalRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, recordId }: { caseId: string; recordId: string }) =>
      clinicalApi.deleteRecord(caseId, recordId),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: keys.records(caseId) });
      toast({ title: 'Record deleted' });
    },
    onError: () => toast({ title: 'Failed to delete record', variant: 'destructive' }),
  });
}
