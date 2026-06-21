import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@upllyft/ui';
import * as ops from '@/lib/api/clinic-ops';

const k = {
  mdt: (caseId: string) => ['ops', 'mdt', caseId] as const,
  triage: (caseId: string) => ['ops', 'triage', caseId] as const,
  reviews: (caseId: string) => ['ops', 'reviews', caseId] as const,
  incidents: (caseId: string) => ['ops', 'incidents', caseId] as const,
  leads: (clinicId: string, status?: string) => ['ops', 'leads', clinicId, status] as const,
  documents: (caseId: string) => ['cases', 'documents', caseId] as const,
};

function ok(qc: any, key: any, msg: string) {
  return () => {
    qc.invalidateQueries({ queryKey: key });
    toast({ title: msg });
  };
}
const fail = (msg: string) => () => toast({ title: msg, variant: 'destructive' });

// ── Report approval ──
export function useReportApproval(caseId: string) {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: k.documents(caseId) });
  return {
    submit: useMutation({ mutationFn: (docId: string) => ops.submitReport(caseId, docId), onSuccess: () => { inv(); toast({ title: 'Submitted for approval' }); }, onError: fail('Failed to submit') }),
    approve: useMutation({ mutationFn: (docId: string) => ops.approveReport(caseId, docId), onSuccess: () => { inv(); toast({ title: 'Report approved' }); }, onError: fail('Failed to approve') }),
    reject: useMutation({ mutationFn: ({ docId, reason }: { docId: string; reason: string }) => ops.rejectReport(caseId, docId, reason), onSuccess: () => { inv(); toast({ title: 'Report rejected' }); }, onError: fail('Failed to reject') }),
    parentVersion: useMutation({ mutationFn: ({ docId, data }: { docId: string; data: any }) => ops.createParentReport(caseId, docId, data), onSuccess: () => { inv(); toast({ title: 'Parent version created' }); }, onError: fail('Failed') }),
  };
}

// ── MDT ──
export function useMdt(caseId: string) {
  return useQuery({ queryKey: k.mdt(caseId), queryFn: () => ops.listMdt(caseId), enabled: !!caseId });
}
export function useCreateMdt(caseId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => ops.createMdt({ caseId, ...data }), onSuccess: ok(qc, k.mdt(caseId), 'MDT scheduled'), onError: fail('Failed to schedule MDT') });
}
export function useCompleteMdt(caseId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, summary }: { id: string; summary: string }) => ops.completeMdt(id, summary), onSuccess: ok(qc, k.mdt(caseId), 'MDT completed'), onError: fail('Failed') });
}

// ── Triage ──
export function useTriage(caseId: string) {
  return useQuery({ queryKey: k.triage(caseId), queryFn: () => ops.listTriage(caseId), enabled: !!caseId });
}
export function useCreateTriage(caseId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => ops.createTriage({ caseId, ...data }), onSuccess: ok(qc, k.triage(caseId), 'Triage review created'), onError: fail('Failed') });
}
export function useDecideTriage(caseId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => ops.decideTriage(id, data), onSuccess: ok(qc, k.triage(caseId), 'Triage decision recorded'), onError: fail('Failed') });
}

// ── Reviews ──
export function useReviews(caseId: string) {
  return useQuery({ queryKey: k.reviews(caseId), queryFn: () => ops.listReviews(caseId), enabled: !!caseId });
}
export function useCreateReview(caseId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => ops.createReview({ caseId, ...data }), onSuccess: ok(qc, k.reviews(caseId), 'Review created'), onError: fail('Failed') });
}
export function useCompleteReview(caseId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, outcome }: { id: string; outcome: string }) => ops.completeReview(id, outcome), onSuccess: ok(qc, k.reviews(caseId), 'Review completed'), onError: fail('Failed') });
}

// ── Incidents ──
export function useIncidents(caseId: string) {
  return useQuery({ queryKey: k.incidents(caseId), queryFn: () => ops.listIncidents(caseId), enabled: !!caseId });
}
export function useCreateIncident(caseId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => ops.createIncident({ caseId, ...data }), onSuccess: ok(qc, k.incidents(caseId), 'Incident raised'), onError: fail('Failed') });
}
export function useUpdateIncident(caseId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => ops.updateIncident(id, data), onSuccess: ok(qc, k.incidents(caseId), 'Incident updated'), onError: fail('Failed') });
}
export function useCloseIncident(caseId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, actionPlan }: { id: string; actionPlan?: string }) => ops.closeIncident(id, actionPlan), onSuccess: ok(qc, k.incidents(caseId), 'Incident closed'), onError: fail('Failed') });
}

// ── Discharge ──
export function useDischarge(caseId: string) {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['cases'] });
  return {
    discharge: useMutation({ mutationFn: (data: any) => ops.dischargeCase(caseId, data), onSuccess: () => { inv(); toast({ title: 'Case discharged' }); }, onError: fail('Failed to discharge') }),
    archive: useMutation({ mutationFn: () => ops.archiveCase(caseId), onSuccess: () => { inv(); toast({ title: 'Case archived' }); }, onError: fail('Failed') }),
    reactivate: useMutation({ mutationFn: () => ops.reactivateCase(caseId), onSuccess: () => { inv(); toast({ title: 'Case reactivated' }); }, onError: fail('Failed') }),
  };
}

// ── Current clinic ──
export function useMyClinic() {
  return useQuery({ queryKey: ['ops', 'my-clinic'], queryFn: () => ops.getMyClinic() });
}

// ── Leads ──
export function useLeads(clinicId?: string, status?: ops.LeadStatus) {
  return useQuery({ queryKey: k.leads(clinicId || '', status), queryFn: () => ops.listLeads(clinicId as string, status), enabled: !!clinicId });
}
export function useUpdateLeadStatus(clinicId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => ops.updateLeadStatus(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['ops', 'leads', clinicId] }); toast({ title: 'Lead updated' }); }, onError: fail('Failed') });
}
export function useCreateLead(clinicId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => ops.createLead({ clinicId, ...data }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['ops', 'leads', clinicId] }); toast({ title: 'Lead created' }); }, onError: fail('Failed') });
}
