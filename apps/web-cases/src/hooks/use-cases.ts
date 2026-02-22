import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@upllyft/ui';
import * as casesApi from '@/lib/api/cases';

// ── Query Key Factory ──

const keys = {
  all: ['cases'] as const,
  list: (params?: Record<string, unknown>) => [...keys.all, 'list', params] as const,
  detail: (id: string) => [...keys.all, 'detail', id] as const,
  timeline: (caseId: string) => [...keys.all, 'timeline', caseId] as const,
  internalNotes: (caseId: string) => [...keys.all, 'internal-notes', caseId] as const,
  sessions: (caseId: string, params?: Record<string, unknown>) =>
    [...keys.all, 'sessions', caseId, params] as const,
  session: (caseId: string, sessionId: string) =>
    [...keys.all, 'session', caseId, sessionId] as const,
  ieps: (caseId: string) => [...keys.all, 'ieps', caseId] as const,
  iep: (caseId: string, iepId: string) => [...keys.all, 'iep', caseId, iepId] as const,
  iepTemplates: (params?: Record<string, unknown>) =>
    [...keys.all, 'iep-templates', params] as const,
  goalBank: (params?: Record<string, unknown>) =>
    [...keys.all, 'goal-bank', params] as const,
  milestonePlans: (caseId: string) => [...keys.all, 'milestone-plans', caseId] as const,
  milestonePlan: (caseId: string, planId: string) =>
    [...keys.all, 'milestone-plan', caseId, planId] as const,
  documents: (caseId: string, params?: Record<string, unknown>) =>
    [...keys.all, 'documents', caseId, params] as const,
  billing: (caseId: string, params?: Record<string, unknown>) =>
    [...keys.all, 'billing', caseId, params] as const,
  billingSummary: (caseId: string) => [...keys.all, 'billing-summary', caseId] as const,
  consents: (caseId: string, params?: Record<string, unknown>) =>
    [...keys.all, 'consents', caseId, params] as const,
  complianceStatus: (caseId: string) => [...keys.all, 'compliance-status', caseId] as const,
  auditLogs: (caseId: string, params?: Record<string, unknown>) =>
    [...keys.all, 'audit-logs', caseId, params] as const,
  auditSummary: (caseId: string) => [...keys.all, 'audit-summary', caseId] as const,
  worksheets: (caseId: string) => [...keys.all, 'worksheets', caseId] as const,
};

// ── Patients ──

export function useTherapistPatients(search?: string) {
  return useQuery({
    queryKey: [...keys.all, 'patients', search] as const,
    queryFn: () => casesApi.getTherapistPatients(search),
  });
}

// ── Cases ──

export function useCases(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn: () => casesApi.listCases(params),
  });
}

export function useCase(id: string) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: () => casesApi.getCase(id),
    enabled: !!id,
  });
}

export function useCreateCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => casesApi.createCase(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
      toast({ title: 'Case created successfully' });
    },
    onError: () => toast({ title: 'Failed to create case', variant: 'destructive' }),
  });
}

export function useUpdateCaseStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      casesApi.updateCaseStatus(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: keys.detail(id) });
      qc.invalidateQueries({ queryKey: keys.list() });
      qc.invalidateQueries({ queryKey: keys.timeline(id) });
      toast({ title: 'Case status updated' });
    },
    onError: () => toast({ title: 'Failed to update case status', variant: 'destructive' }),
  });
}

export function useCaseTimeline(caseId: string) {
  return useQuery({
    queryKey: keys.timeline(caseId),
    queryFn: () => casesApi.getCaseTimeline(caseId),
    enabled: !!caseId,
  });
}

// ── Case Therapists ──

export function useAddCaseTherapist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, data }: { caseId: string; data: Record<string, unknown> }) =>
      casesApi.addCaseTherapist(caseId, data),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: keys.detail(caseId) });
      qc.invalidateQueries({ queryKey: keys.timeline(caseId) });
      toast({ title: 'Therapist added to case' });
    },
    onError: () => toast({ title: 'Failed to add therapist', variant: 'destructive' }),
  });
}

export function useTransferCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, data }: { caseId: string; data: Record<string, unknown> }) =>
      casesApi.transferCase(caseId, data),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: keys.detail(caseId) });
      qc.invalidateQueries({ queryKey: keys.list() });
      qc.invalidateQueries({ queryKey: keys.timeline(caseId) });
      toast({ title: 'Case transferred successfully' });
    },
    onError: () => toast({ title: 'Failed to transfer case', variant: 'destructive' }),
  });
}

// ── Internal Notes ──

export function useInternalNotes(caseId: string) {
  return useQuery({
    queryKey: keys.internalNotes(caseId),
    queryFn: () => casesApi.listInternalNotes(caseId),
    enabled: !!caseId,
  });
}

export function useCreateInternalNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, data }: { caseId: string; data: Record<string, unknown> }) =>
      casesApi.createInternalNote(caseId, data),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: keys.internalNotes(caseId) });
      qc.invalidateQueries({ queryKey: keys.timeline(caseId) });
      toast({ title: 'Note added' });
    },
    onError: () => toast({ title: 'Failed to add note', variant: 'destructive' }),
  });
}

// ── Sessions ──

export function useSessions(caseId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: keys.sessions(caseId, params),
    queryFn: () => casesApi.listSessions(caseId, params),
    enabled: !!caseId,
  });
}

export function useSession(caseId: string, sessionId: string) {
  return useQuery({
    queryKey: keys.session(caseId, sessionId),
    queryFn: () => casesApi.getSession(caseId, sessionId),
    enabled: !!caseId && !!sessionId,
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, data }: { caseId: string; data: Record<string, unknown> }) =>
      casesApi.createSession(caseId, data),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: keys.sessions(caseId) });
      qc.invalidateQueries({ queryKey: keys.timeline(caseId) });
      toast({ title: 'Session created' });
    },
    onError: () => toast({ title: 'Failed to create session', variant: 'destructive' }),
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      caseId,
      sessionId,
      data,
    }: {
      caseId: string;
      sessionId: string;
      data: Record<string, unknown>;
    }) => casesApi.updateSession(caseId, sessionId, data),
    onSuccess: (_, { caseId, sessionId }) => {
      qc.invalidateQueries({ queryKey: keys.session(caseId, sessionId) });
      qc.invalidateQueries({ queryKey: keys.sessions(caseId) });
      toast({ title: 'Session updated' });
    },
    onError: () => toast({ title: 'Failed to update session', variant: 'destructive' }),
  });
}

export function useGenerateAiSummary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      caseId,
      sessionId,
      data,
    }: {
      caseId: string;
      sessionId: string;
      data: Record<string, unknown>;
    }) => casesApi.generateAiSummary(caseId, sessionId, data),
    onSuccess: (_, { caseId, sessionId }) => {
      qc.invalidateQueries({ queryKey: keys.session(caseId, sessionId) });
      toast({ title: 'AI summary generated' });
    },
    onError: () => toast({ title: 'Failed to generate AI summary', variant: 'destructive' }),
  });
}

export function useEnhanceClinicalNotes() {
  return useMutation({
    mutationFn: ({
      caseId,
      sessionId,
      data,
    }: {
      caseId: string;
      sessionId: string;
      data: { text: string };
    }) => casesApi.enhanceClinicalNotes(caseId, sessionId, data),
    onError: () =>
      toast({ title: 'Failed to enhance clinical notes', variant: 'destructive' }),
  });
}

export function useMiraScribe() {
  return useMutation({
    mutationFn: ({ sessionId }: { sessionId: string }) => casesApi.miraScribe(sessionId),
    onError: () =>
      toast({ title: "Mira couldn't generate a draft right now. Please try again.", variant: 'destructive' }),
  });
}

export function useLogGoalProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      caseId,
      sessionId,
      data,
    }: {
      caseId: string;
      sessionId: string;
      data: Record<string, unknown>;
    }) => casesApi.logGoalProgress(caseId, sessionId, data),
    onSuccess: (_, { caseId, sessionId }) => {
      qc.invalidateQueries({ queryKey: keys.session(caseId, sessionId) });
      qc.invalidateQueries({ queryKey: keys.sessions(caseId) });
      qc.invalidateQueries({ queryKey: keys.ieps(caseId) });
      toast({ title: 'Goal progress logged' });
    },
    onError: () => toast({ title: 'Failed to log goal progress', variant: 'destructive' }),
  });
}

export function useSignSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, sessionId }: { caseId: string; sessionId: string }) =>
      casesApi.signSession(caseId, sessionId),
    onSuccess: (_, { caseId, sessionId }) => {
      qc.invalidateQueries({ queryKey: keys.session(caseId, sessionId) });
      qc.invalidateQueries({ queryKey: keys.sessions(caseId) });
      qc.invalidateQueries({ queryKey: keys.timeline(caseId) });
      toast({ title: 'Session note signed and locked' });
    },
    onError: () => toast({ title: 'Failed to sign session note', variant: 'destructive' }),
  });
}

export function useBulkLogGoalProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      caseId,
      sessionId,
      data,
    }: {
      caseId: string;
      sessionId: string;
      data: { entries: Array<{ goalId: string; progressNote?: string; progressValue?: number }> };
    }) => casesApi.bulkLogGoalProgress(caseId, sessionId, { progress: data.entries }),
    onSuccess: (_, { caseId, sessionId }) => {
      qc.invalidateQueries({ queryKey: keys.session(caseId, sessionId) });
      qc.invalidateQueries({ queryKey: keys.sessions(caseId) });
      qc.invalidateQueries({ queryKey: keys.ieps(caseId) });
      toast({ title: 'Goal progress saved' });
    },
    onError: () => toast({ title: 'Failed to save goal progress', variant: 'destructive' }),
  });
}

// ── IEPs ──

export function useIEPs(caseId: string) {
  return useQuery({
    queryKey: keys.ieps(caseId),
    queryFn: () => casesApi.listIEPs(caseId),
    enabled: !!caseId,
  });
}

export function useIEP(caseId: string, iepId: string) {
  return useQuery({
    queryKey: keys.iep(caseId, iepId),
    queryFn: () => casesApi.getIEP(caseId, iepId),
    enabled: !!caseId && !!iepId,
  });
}

export function useCreateIEP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, data }: { caseId: string; data: Record<string, unknown> }) =>
      casesApi.createIEP(caseId, data),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: keys.ieps(caseId) });
      qc.invalidateQueries({ queryKey: keys.timeline(caseId) });
      toast({ title: 'IEP created' });
    },
    onError: () => toast({ title: 'Failed to create IEP', variant: 'destructive' }),
  });
}

export function useUpdateIEP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      caseId,
      iepId,
      data,
    }: {
      caseId: string;
      iepId: string;
      data: Record<string, unknown>;
    }) => casesApi.updateIEP(caseId, iepId, data),
    onSuccess: (_, { caseId, iepId }) => {
      qc.invalidateQueries({ queryKey: keys.iep(caseId, iepId) });
      qc.invalidateQueries({ queryKey: keys.ieps(caseId) });
      toast({ title: 'IEP updated' });
    },
    onError: () => toast({ title: 'Failed to update IEP', variant: 'destructive' }),
  });
}

export function useApproveIEP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      caseId,
      iepId,
      data,
    }: {
      caseId: string;
      iepId: string;
      data: { role: string };
    }) => casesApi.approveIEP(caseId, iepId, data),
    onSuccess: (_, { caseId, iepId }) => {
      qc.invalidateQueries({ queryKey: keys.iep(caseId, iepId) });
      qc.invalidateQueries({ queryKey: keys.ieps(caseId) });
      qc.invalidateQueries({ queryKey: keys.timeline(caseId) });
      toast({ title: 'IEP approved' });
    },
    onError: () => toast({ title: 'Failed to approve IEP', variant: 'destructive' }),
  });
}

export function useCreateNewIEPVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, iepId }: { caseId: string; iepId: string }) =>
      casesApi.createNewIEPVersion(caseId, iepId),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: keys.ieps(caseId) });
      toast({ title: 'New IEP version created' });
    },
    onError: () => toast({ title: 'Failed to create IEP version', variant: 'destructive' }),
  });
}

// ── IEP Goals ──

export function useAddIEPGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      caseId,
      iepId,
      data,
    }: {
      caseId: string;
      iepId: string;
      data: Record<string, unknown>;
    }) => casesApi.addIEPGoal(caseId, iepId, data),
    onSuccess: (_, { caseId, iepId }) => {
      qc.invalidateQueries({ queryKey: keys.iep(caseId, iepId) });
      toast({ title: 'Goal added to IEP' });
    },
    onError: () => toast({ title: 'Failed to add goal', variant: 'destructive' }),
  });
}

export function useUpdateIEPGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      caseId,
      iepId,
      goalId,
      data,
    }: {
      caseId: string;
      iepId: string;
      goalId: string;
      data: Record<string, unknown>;
    }) => casesApi.updateIEPGoal(caseId, iepId, goalId, data),
    onSuccess: (_, { caseId, iepId }) => {
      qc.invalidateQueries({ queryKey: keys.iep(caseId, iepId) });
      toast({ title: 'Goal updated' });
    },
    onError: () => toast({ title: 'Failed to update goal', variant: 'destructive' }),
  });
}

export function useBulkAddIEPGoals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      caseId,
      iepId,
      data,
    }: {
      caseId: string;
      iepId: string;
      data: Record<string, unknown>;
    }) => casesApi.bulkAddIEPGoals(caseId, iepId, data),
    onSuccess: (_, { caseId, iepId }) => {
      qc.invalidateQueries({ queryKey: keys.iep(caseId, iepId) });
      toast({ title: 'Goals added to IEP' });
    },
    onError: () => toast({ title: 'Failed to add goals', variant: 'destructive' }),
  });
}

// ── IEP AI ──

export function useGenerateIEPFromScreening() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, data }: { caseId: string; data: Record<string, unknown> }) =>
      casesApi.generateIEPFromScreening(caseId, data),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: keys.ieps(caseId) });
      qc.invalidateQueries({ queryKey: keys.timeline(caseId) });
      toast({ title: 'IEP generated from screening' });
    },
    onError: () =>
      toast({ title: 'Failed to generate IEP from screening', variant: 'destructive' }),
  });
}

export function useSuggestIEPGoals() {
  return useMutation({
    mutationFn: ({ caseId, data }: { caseId: string; data: Record<string, unknown> }) =>
      casesApi.suggestIEPGoals(caseId, data),
    onError: () => toast({ title: 'Failed to suggest goals', variant: 'destructive' }),
  });
}

// ── IEP Templates & Goal Bank ──

export function useIEPTemplates(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: keys.iepTemplates(params),
    queryFn: () => casesApi.listIEPTemplates(params),
  });
}

export function useSearchGoalBank(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: keys.goalBank(params),
    queryFn: () => casesApi.searchGoalBank(params),
  });
}

// ── Milestone Plans ──

export function useMilestonePlans(caseId: string) {
  return useQuery({
    queryKey: keys.milestonePlans(caseId),
    queryFn: () => casesApi.listMilestonePlans(caseId),
    enabled: !!caseId,
  });
}

export function useMilestonePlan(caseId: string, planId: string) {
  return useQuery({
    queryKey: keys.milestonePlan(caseId, planId),
    queryFn: () => casesApi.getMilestonePlan(caseId, planId),
    enabled: !!caseId && !!planId,
  });
}

export function useCreateMilestonePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, data }: { caseId: string; data: Record<string, unknown> }) =>
      casesApi.createMilestonePlan(caseId, data),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: keys.milestonePlans(caseId) });
      qc.invalidateQueries({ queryKey: keys.timeline(caseId) });
      toast({ title: 'Milestone plan created' });
    },
    onError: () =>
      toast({ title: 'Failed to create milestone plan', variant: 'destructive' }),
  });
}

export function useCreateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      caseId,
      planId,
      data,
    }: {
      caseId: string;
      planId: string;
      data: Record<string, unknown>;
    }) => casesApi.createMilestone(caseId, planId, data),
    onSuccess: (_, { caseId, planId }) => {
      qc.invalidateQueries({ queryKey: keys.milestonePlan(caseId, planId) });
      qc.invalidateQueries({ queryKey: keys.milestonePlans(caseId) });
      toast({ title: 'Milestone created' });
    },
    onError: () => toast({ title: 'Failed to create milestone', variant: 'destructive' }),
  });
}

export function useUpdateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      caseId,
      planId,
      milestoneId,
      data,
    }: {
      caseId: string;
      planId: string;
      milestoneId: string;
      data: Record<string, unknown>;
    }) => casesApi.updateMilestone(caseId, planId, milestoneId, data),
    onSuccess: (_, { caseId, planId }) => {
      qc.invalidateQueries({ queryKey: keys.milestonePlan(caseId, planId) });
      qc.invalidateQueries({ queryKey: keys.milestonePlans(caseId) });
      toast({ title: 'Milestone updated' });
    },
    onError: () => toast({ title: 'Failed to update milestone', variant: 'destructive' }),
  });
}

export function useGenerateMilestonesAI() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      caseId,
      planId,
      data,
    }: {
      caseId: string;
      planId: string;
      data: Record<string, unknown>;
    }) => casesApi.generateMilestonesAI(caseId, planId, data),
    onSuccess: (_, { caseId, planId }) => {
      qc.invalidateQueries({ queryKey: keys.milestonePlan(caseId, planId) });
      qc.invalidateQueries({ queryKey: keys.milestonePlans(caseId) });
      toast({ title: 'AI milestones generated' });
    },
    onError: () =>
      toast({ title: 'Failed to generate AI milestones', variant: 'destructive' }),
  });
}

// ── Documents ──

export function useDocuments(caseId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: keys.documents(caseId, params),
    queryFn: () => casesApi.listDocuments(caseId, params),
    enabled: !!caseId,
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, data }: { caseId: string; data: Record<string, unknown> }) =>
      casesApi.createDocument(caseId, data),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: keys.documents(caseId) });
      qc.invalidateQueries({ queryKey: keys.timeline(caseId) });
      toast({ title: 'Document created' });
    },
    onError: () => toast({ title: 'Failed to create document', variant: 'destructive' }),
  });
}

export function useShareDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      caseId,
      documentId,
      data,
    }: {
      caseId: string;
      documentId: string;
      data: Record<string, unknown>;
    }) => casesApi.shareDocument(caseId, documentId, data),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: keys.documents(caseId) });
      toast({ title: 'Document shared' });
    },
    onError: () => toast({ title: 'Failed to share document', variant: 'destructive' }),
  });
}

export function useRevokeDocumentShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, shareId }: { caseId: string; shareId: string }) =>
      casesApi.revokeDocumentShare(caseId, shareId),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: keys.documents(caseId) });
      toast({ title: 'Document share revoked' });
    },
    onError: () =>
      toast({ title: 'Failed to revoke document share', variant: 'destructive' }),
  });
}

export function useGenerateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, data }: { caseId: string; data: Record<string, unknown> }) =>
      casesApi.generateReport(caseId, data),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: keys.documents(caseId) });
      qc.invalidateQueries({ queryKey: keys.timeline(caseId) });
      toast({ title: 'Report generated' });
    },
    onError: () => toast({ title: 'Failed to generate report', variant: 'destructive' }),
  });
}

// ── Billing ──

export function useBilling(caseId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: keys.billing(caseId, params),
    queryFn: () => casesApi.listBilling(caseId, params),
    enabled: !!caseId,
  });
}

export function useBillingSummary(caseId: string) {
  return useQuery({
    queryKey: keys.billingSummary(caseId),
    queryFn: () => casesApi.getBillingSummary(caseId),
    enabled: !!caseId,
  });
}

export function useCreateBilling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, data }: { caseId: string; data: Record<string, unknown> }) =>
      casesApi.createBilling(caseId, data),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: keys.billing(caseId) });
      qc.invalidateQueries({ queryKey: keys.billingSummary(caseId) });
      qc.invalidateQueries({ queryKey: keys.timeline(caseId) });
      toast({ title: 'Billing entry created' });
    },
    onError: () =>
      toast({ title: 'Failed to create billing entry', variant: 'destructive' }),
  });
}

export function useUpdateBilling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      caseId,
      billingId,
      data,
    }: {
      caseId: string;
      billingId: string;
      data: Record<string, unknown>;
    }) => casesApi.updateBilling(caseId, billingId, data),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: keys.billing(caseId) });
      qc.invalidateQueries({ queryKey: keys.billingSummary(caseId) });
      toast({ title: 'Billing entry updated' });
    },
    onError: () =>
      toast({ title: 'Failed to update billing entry', variant: 'destructive' }),
  });
}

// ── Consents ──

export function useConsents(caseId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: keys.consents(caseId, params),
    queryFn: () => casesApi.listConsents(caseId, params),
    enabled: !!caseId,
  });
}

export function useCreateConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, data }: { caseId: string; data: Record<string, unknown> }) =>
      casesApi.createConsent(caseId, data),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: keys.consents(caseId) });
      qc.invalidateQueries({ queryKey: keys.complianceStatus(caseId) });
      qc.invalidateQueries({ queryKey: keys.timeline(caseId) });
      toast({ title: 'Consent recorded' });
    },
    onError: () => toast({ title: 'Failed to record consent', variant: 'destructive' }),
  });
}

export function useRevokeConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, consentId }: { caseId: string; consentId: string }) =>
      casesApi.revokeConsent(caseId, consentId),
    onSuccess: (_, { caseId }) => {
      qc.invalidateQueries({ queryKey: keys.consents(caseId) });
      qc.invalidateQueries({ queryKey: keys.complianceStatus(caseId) });
      qc.invalidateQueries({ queryKey: keys.timeline(caseId) });
      toast({ title: 'Consent revoked' });
    },
    onError: () => toast({ title: 'Failed to revoke consent', variant: 'destructive' }),
  });
}

export function useComplianceStatus(caseId: string) {
  return useQuery({
    queryKey: keys.complianceStatus(caseId),
    queryFn: () => casesApi.getComplianceStatus(caseId),
    enabled: !!caseId,
  });
}

// ── Audit ──

export function useAuditLogs(caseId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: keys.auditLogs(caseId, params),
    queryFn: () => casesApi.listAuditLogs(caseId, params),
    enabled: !!caseId,
  });
}

export function useAuditSummary(caseId: string) {
  return useQuery({
    queryKey: keys.auditSummary(caseId),
    queryFn: () => casesApi.getAuditSummary(caseId),
    enabled: !!caseId,
  });
}

// ── Case Worksheets ──

export function useCaseWorksheets(caseId: string) {
  return useQuery({
    queryKey: keys.worksheets(caseId),
    queryFn: () => casesApi.getCaseWorksheets(caseId),
    enabled: !!caseId,
  });
}
