import { apiClient } from '@upllyft/api-client';

// ── Current clinic (for clinic-admin scoped views like Leads) ──
export const getMyClinic = (): Promise<{ id: string; name: string } | null> =>
  apiClient.get('/admin/clinic').then((r) => r.data);

// ── Shared status unions ──
export type TriageDecision = 'PROCEED' | 'REQUEST_MORE_INFO' | 'URGENT_REFERRAL' | 'ALTERNATE_SERVICE' | 'OUT_OF_SCOPE';
export type RiskLevel = 'NONE' | 'LOW' | 'MODERATE' | 'HIGH';
export type LeadChannel = 'WEBSITE' | 'WHATSAPP' | 'SOCIAL' | 'PHONE' | 'REFERRAL' | 'INSURER' | 'WALK_IN' | 'OTHER';
export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'WAITLISTED' | 'CONVERTED' | 'OUT_OF_SCOPE' | 'DUPLICATE' | 'CLOSED';
export type ReviewTriggerType = 'PLAN_DATE' | 'SESSION_COUNT' | 'AUTH_EXPIRY' | 'GOAL_PROGRESS' | 'CLINICAL_FLAG' | 'MANUAL';
export type ReviewStatus = 'DUE' | 'IN_PROGRESS' | 'COMPLETED';
export type IncidentCategory = 'MEDICAL_INSTABILITY' | 'MENTAL_HEALTH_RISK' | 'SAFEGUARDING' | 'SEVERE_BEHAVIOUR' | 'ABUSE_NEGLECT' | 'OUT_OF_SCOPE' | 'OTHER';
export type IncidentUrgency = 'EMERGENCY' | 'URGENT' | 'ROUTINE';
export type IncidentStatus = 'OPEN' | 'IN_REVIEW' | 'ACTION_TAKEN' | 'CLOSED';
export type ReportStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

// ── Report approval (case documents) ──
export const submitReport = (caseId: string, docId: string) =>
  apiClient.post(`/cases/${caseId}/documents/${docId}/submit`, {}).then((r) => r.data);
export const approveReport = (caseId: string, docId: string) =>
  apiClient.post(`/cases/${caseId}/documents/${docId}/approve`, {}).then((r) => r.data);
export const rejectReport = (caseId: string, docId: string, reason: string) =>
  apiClient.post(`/cases/${caseId}/documents/${docId}/reject`, { reason }).then((r) => r.data);
export const createParentReport = (caseId: string, docId: string, data: { title: string; content?: string; fileUrl?: string }) =>
  apiClient.post(`/cases/${caseId}/documents/${docId}/parent-version`, data).then((r) => r.data);

// ── MDT ──
export interface MdtReview { id: string; caseId: string; scheduledAt?: string | null; status: string; summary?: string | null; attendees?: any[]; }
export const listMdt = (caseId: string): Promise<MdtReview[]> =>
  apiClient.get('/mdt-reviews', { params: { caseId } }).then((r) => r.data);
export const createMdt = (data: { caseId: string; scheduledAt?: string; attendeeUserIds?: string[] }) =>
  apiClient.post('/mdt-reviews', data).then((r) => r.data);
export const setMdtAttendance = (id: string, data: { userId: string; attended?: boolean; approved?: boolean }) =>
  apiClient.patch(`/mdt-reviews/${id}/attendance`, data).then((r) => r.data);
export const completeMdt = (id: string, summary: string) =>
  apiClient.patch(`/mdt-reviews/${id}/complete`, { summary }).then((r) => r.data);

// ── Triage / pathways ──
export interface TriageReview { id: string; caseId?: string | null; status: string; decision?: TriageDecision | null; riskLevel: RiskLevel; aiSummary?: string | null; notes?: string | null; createdAt: string; }
export const listTriage = (caseId: string): Promise<TriageReview[]> =>
  apiClient.get('/triage', { params: { caseId } }).then((r) => r.data);
export const createTriage = (data: { caseId?: string; aiSummary?: string; riskLevel?: RiskLevel; notes?: string }) =>
  apiClient.post('/triage', data).then((r) => r.data);
export const decideTriage = (id: string, data: { decision: TriageDecision; riskLevel?: RiskLevel; pathwayTemplateId?: string; notes?: string }) =>
  apiClient.patch(`/triage/${id}/decision`, data).then((r) => r.data);
export const listPathways = (clinicId?: string) =>
  apiClient.get('/pathway-templates', { params: clinicId ? { clinicId } : {} }).then((r) => r.data);

// ── Leads ──
export interface Lead { id: string; clinicId: string; channel: LeadChannel; status: LeadStatus; concern?: string | null; contactName?: string | null; contactPhone?: string | null; contactEmail?: string | null; referrerName?: string | null; createdAt: string; }
export const listLeads = (clinicId: string, status?: LeadStatus): Promise<Lead[]> =>
  apiClient.get('/leads', { params: { clinicId, ...(status ? { status } : {}) } }).then((r) => r.data);
export const createLead = (data: Partial<Lead>) => apiClient.post('/leads', data).then((r) => r.data);
export const updateLeadStatus = (id: string, data: { status: LeadStatus; closeReason?: string; assignedToId?: string }) =>
  apiClient.patch(`/leads/${id}/status`, data).then((r) => r.data);
export const convertLead = (id: string, childId: string) =>
  apiClient.post(`/leads/${id}/convert`, { childId }).then((r) => r.data);

// ── Case reviews ──
export interface CaseReview { id: string; caseId: string; triggerType: ReviewTriggerType; status: ReviewStatus; dueAt?: string | null; outcome?: string | null; createdAt: string; }
export const listReviews = (caseId: string): Promise<CaseReview[]> =>
  apiClient.get('/case-reviews', { params: { caseId } }).then((r) => r.data);
export const createReview = (data: { caseId: string; triggerType: ReviewTriggerType; treatmentPlanId?: string; dueAt?: string }) =>
  apiClient.post('/case-reviews', data).then((r) => r.data);
export const completeReview = (id: string, outcome: string) =>
  apiClient.patch(`/case-reviews/${id}/complete`, { outcome }).then((r) => r.data);

// ── Incidents ──
export interface CaseIncident { id: string; caseId?: string | null; category: IncidentCategory; urgency: IncidentUrgency; status: IncidentStatus; description: string; ownerId?: string | null; actionPlan?: string | null; createdAt: string; }
export const listIncidents = (caseId: string): Promise<CaseIncident[]> =>
  apiClient.get('/incidents', { params: { caseId } }).then((r) => r.data);
export const createIncident = (data: { category: IncidentCategory; description: string; caseId?: string; urgency?: IncidentUrgency; raisedFromModule?: string }) =>
  apiClient.post('/incidents', data).then((r) => r.data);
export const updateIncident = (id: string, data: { status?: IncidentStatus; ownerId?: string; clinicalDecision?: string; actionPlan?: string }) =>
  apiClient.patch(`/incidents/${id}`, data).then((r) => r.data);
export const closeIncident = (id: string, actionPlan?: string) =>
  apiClient.patch(`/incidents/${id}/close`, { actionPlan }).then((r) => r.data);

// ── Discharge ──
export const dischargeCase = (caseId: string, data: { clinicalReason?: string; adminReason?: string; retentionDays?: number }) =>
  apiClient.post(`/cases/${caseId}/discharge`, data).then((r) => r.data);
export const archiveCase = (caseId: string) =>
  apiClient.post(`/cases/${caseId}/discharge/archive`, {}).then((r) => r.data);
export const reactivateCase = (caseId: string) =>
  apiClient.post(`/cases/${caseId}/discharge/reactivate`, {}).then((r) => r.data);
