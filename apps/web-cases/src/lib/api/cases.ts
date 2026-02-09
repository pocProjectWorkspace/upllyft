import { apiClient } from '@upllyft/api-client';

// ── Enums ──

export type CaseStatus = 'INTAKE' | 'ACTIVE' | 'ON_HOLD' | 'DISCHARGED' | 'CLOSED';
export type CaseTherapistRole = 'PRIMARY' | 'SECONDARY' | 'CONSULTANT';
export type IEPStatus = 'DRAFT' | 'ACTIVE' | 'IN_REVIEW' | 'APPROVED' | 'ARCHIVED';
export type GoalStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'ACHIEVED' | 'DISCONTINUED';
export type MilestoneStatus = 'ON_TRACK' | 'EMERGING' | 'DELAYED' | 'ACHIEVED' | 'REGRESSED';
export type SessionNoteFormat = 'SOAP' | 'DAP' | 'NARRATIVE' | 'CUSTOM';
export type AttendanceStatus = 'PRESENT' | 'CANCELLED' | 'NO_SHOW' | 'LATE';
export type CaseDocumentType = 'IEP' | 'REPORT' | 'ASSESSMENT' | 'SUMMARY' | 'PROGRESS_REPORT' | 'DISCHARGE_SUMMARY' | 'CONSENT' | 'OTHER';
export type BillingStatus = 'PENDING' | 'BILLED' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type ConsentType = 'TREATMENT' | 'SHARING' | 'ASSESSMENT' | 'RECORDING' | 'RESEARCH';

// ── Core Types ──

export interface Child {
  id: string;
  name: string;
  nickname?: string;
  dateOfBirth: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export interface Case {
  id: string;
  caseNumber: string;
  childId: string;
  child?: Child;
  primaryTherapistId: string;
  primaryTherapist?: UserSummary;
  status: CaseStatus;
  diagnosis?: string;
  referralSource?: string;
  notes?: string;
  openedAt: string;
  dischargedAt?: string;
  dischargeReason?: string;
  organizationId?: string;
  therapists?: CaseTherapist[];
  lastSessionDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaseTherapist {
  id: string;
  caseId: string;
  therapistId: string;
  therapist?: UserSummary;
  role: CaseTherapistRole;
  permissions?: Record<string, unknown>;
  assignedAt: string;
  removedAt?: string;
}

export interface CaseInternalNote {
  id: string;
  caseId: string;
  authorId: string;
  author?: UserSummary;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEvent {
  id: string;
  caseId: string;
  userId: string;
  user?: UserSummary;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, unknown>;
  timestamp: string;
}

// ── Session Types ──

export interface SessionGoalProgress {
  id: string;
  sessionId: string;
  goalId: string;
  goal?: IEPGoal;
  progressNote?: string;
  progressValue?: number;
  createdAt: string;
}

export interface CaseSession {
  id: string;
  caseId: string;
  therapistId: string;
  therapist?: UserSummary;
  bookingId?: string;
  scheduledAt: string;
  actualDuration?: number;
  attendanceStatus: AttendanceStatus;
  sessionType?: string;
  location?: string;
  rawNotes?: string;
  aiSummary?: string;
  noteFormat?: SessionNoteFormat;
  structuredNotes?: Record<string, unknown>;
  goalProgress?: SessionGoalProgress[];
  createdAt: string;
  updatedAt: string;
}

// ── IEP Types ──

export interface IEPGoal {
  id: string;
  iepId: string;
  domain: string;
  goalText: string;
  targetDate?: string;
  baselineScreeningId?: string;
  currentProgress: number;
  status: GoalStatus;
  linkedScreeningIndicators?: Record<string, unknown>;
  order: number;
  sessionProgress?: SessionGoalProgress[];
  createdAt: string;
  updatedAt: string;
}

export interface IEP {
  id: string;
  caseId: string;
  version: number;
  status: IEPStatus;
  templateId?: string;
  createdById: string;
  createdBy?: UserSummary;
  approvedByTherapistAt?: string;
  approvedByParentAt?: string;
  reviewDate?: string;
  accommodations?: Record<string, unknown>;
  servicesTracking?: Record<string, unknown>;
  meetingNotes?: Record<string, unknown>;
  pdfUrl?: string;
  goals?: IEPGoal[];
  previousVersionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IEPTemplate {
  id: string;
  name: string;
  description?: string;
  content: Record<string, unknown>;
  isGlobal: boolean;
  organizationId?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoalBankItem {
  id: string;
  domain: string;
  condition?: string;
  goalText: string;
  isGlobal: boolean;
  organizationId?: string;
  createdById: string;
  createdAt: string;
}

// ── Milestone Types ──

export interface Milestone {
  id: string;
  planId: string;
  domain: string;
  description: string;
  expectedAge?: string;
  targetDate?: string;
  status: MilestoneStatus;
  linkedScreeningId?: string;
  achievedAt?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface MilestonePlan {
  id: string;
  caseId: string;
  version: number;
  status: string;
  pdfUrl?: string;
  sharedWithParent: boolean;
  milestones?: Milestone[];
  previousVersionId?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Document Types ──

export interface CaseDocument {
  id: string;
  caseId: string;
  type: CaseDocumentType;
  title: string;
  content?: string;
  fileUrl?: string;
  version: number;
  createdById: string;
  createdBy?: UserSummary;
  shares?: CaseShare[];
  createdAt: string;
  updatedAt: string;
}

export interface CaseShare {
  id: string;
  caseId: string;
  documentId?: string;
  sharedWithId: string;
  sharedWith?: UserSummary;
  sharedById: string;
  sharedBy?: UserSummary;
  revokedAt?: string;
  createdAt: string;
}

// ── Billing Types ──

export interface CaseBilling {
  id: string;
  caseId: string;
  sessionId?: string;
  session?: CaseSession;
  serviceCode?: string;
  amount: number;
  status: BillingStatus;
  paidAt?: string;
  invoiceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingSummary {
  totalBilled: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  recordCount: number;
}

// ── Consent Types ──

export interface CaseConsent {
  id: string;
  caseId: string;
  type: ConsentType;
  grantedById: string;
  grantedBy?: UserSummary;
  validFrom: string;
  validUntil?: string;
  revokedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface ComplianceStatus {
  caseId: string;
  requiredConsents: ConsentType[];
  activeConsents: Array<{ type: ConsentType; validUntil?: string }>;
  missingConsents: ConsentType[];
  isCompliant: boolean;
}

// ── Audit Types ──

export interface AuditLog {
  id: string;
  caseId: string;
  userId: string;
  user?: UserSummary;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, unknown>;
  timestamp: string;
}

export interface AuditSummary {
  totalActions: number;
  actionsByType: Record<string, number>;
  actionsByUser: Array<{ userId: string; name: string; count: number }>;
  recentActions: AuditLog[];
}

// ── Filter / Request Types ──

export interface CaseFilters {
  page?: number;
  limit?: number;
  status?: CaseStatus;
  childId?: string;
  therapistId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateCaseInput {
  childId: string;
  primaryTherapistId?: string;
  organizationId?: string;
  diagnosis?: string;
  referralSource?: string;
  notes?: string;
}

export interface UpdateCaseStatusInput {
  status: CaseStatus;
  dischargeReason?: string;
}

export interface AddTherapistInput {
  therapistId: string;
  role?: CaseTherapistRole;
  permissions?: Record<string, unknown>;
}

export interface TransferCaseInput {
  newTherapistId: string;
  reason?: string;
}

export interface CreateInternalNoteInput {
  content: string;
}

export interface SessionFilters {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  attendanceStatus?: AttendanceStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateSessionInput {
  scheduledAt: string;
  sessionType?: string;
  location?: string;
  bookingId?: string;
}

export interface UpdateSessionInput {
  actualDuration?: number;
  attendanceStatus?: AttendanceStatus;
  rawNotes?: string;
  noteFormat?: SessionNoteFormat;
  structuredNotes?: Record<string, unknown>;
  sessionType?: string;
  location?: string;
}

export interface GoalProgressInput {
  goalId: string;
  progressNote?: string;
  progressValue?: number;
}

export interface AiSummaryInput {
  rawNotes?: string;
  structuredNotes?: Record<string, unknown>;
}

export interface EnhanceNotesInput {
  text: string;
}

export interface CreateIEPInput {
  templateId?: string;
  reviewDate?: string;
  accommodations?: Record<string, unknown>;
  servicesTracking?: Record<string, unknown>;
}

export interface UpdateIEPInput {
  status?: IEPStatus;
  reviewDate?: string;
  accommodations?: Record<string, unknown>;
  servicesTracking?: Record<string, unknown>;
  meetingNotes?: Record<string, unknown>;
}

export interface ApproveIEPInput {
  role: string;
}

export interface AddIEPGoalInput {
  domain: string;
  goalText: string;
  targetDate?: string;
  baselineScreeningId?: string;
  order?: number;
}

export interface UpdateIEPGoalInput {
  goalText?: string;
  targetDate?: string;
  currentProgress?: number;
  status?: GoalStatus;
  order?: number;
}

export interface BulkAddGoalsInput {
  goals: AddIEPGoalInput[];
}

export interface GenerateIEPInput {
  assessmentId?: string;
  domains?: string[];
}

export interface SuggestGoalsInput {
  domain?: string;
  childAge?: number;
  conditions?: string[];
}

export interface IEPTemplateFilters {
  search?: string;
  isGlobal?: boolean;
}

export interface GoalBankFilters {
  domain?: string;
  condition?: string;
  search?: string;
}

export interface CreateMilestonePlanInput {
  sharedWithParent?: boolean;
}

export interface CreateMilestoneInput {
  domain: string;
  description: string;
  expectedAge?: string;
  targetDate?: string;
  linkedScreeningId?: string;
  order?: number;
}

export interface UpdateMilestoneInput {
  description?: string;
  expectedAge?: string;
  targetDate?: string;
  status?: MilestoneStatus;
  linkedScreeningId?: string;
  achievedAt?: string;
  order?: number;
}

export interface GenerateMilestonesInput {
  assessmentId?: string;
  domains?: string[];
}

export interface DocumentFilters {
  page?: number;
  limit?: number;
  type?: CaseDocumentType;
  search?: string;
}

export interface CreateDocumentInput {
  type: CaseDocumentType;
  title: string;
  content?: string;
  fileUrl?: string;
}

export interface ShareDocumentInput {
  sharedWithId: string;
}

export interface GenerateReportInput {
  type: CaseDocumentType;
  startDate?: string;
  endDate?: string;
  includeSessions?: boolean;
  includeGoals?: boolean;
  includeMilestones?: boolean;
}

export interface BillingFilters {
  page?: number;
  limit?: number;
  status?: BillingStatus;
  startDate?: string;
  endDate?: string;
}

export interface CreateBillingInput {
  sessionId?: string;
  serviceCode?: string;
  amount: number;
}

export interface UpdateBillingInput {
  status?: BillingStatus;
  serviceCode?: string;
  amount?: number;
  invoiceUrl?: string;
}

export interface ConsentFilters {
  page?: number;
  limit?: number;
  type?: ConsentType;
  active?: boolean;
}

export interface CreateConsentInput {
  type: ConsentType;
  validUntil?: string;
  notes?: string;
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

// ── Paginated Response ──

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── API Functions ──

// ============= Cases CRUD =============

export async function listCases(filters?: CaseFilters): Promise<PaginatedResponse<Case>> {
  const res = await apiClient.get('/cases', { params: filters });
  return res.data;
}

export async function getCase(id: string): Promise<Case> {
  const res = await apiClient.get(`/cases/${id}`);
  return res.data;
}

export async function createCase(data: CreateCaseInput): Promise<Case> {
  const res = await apiClient.post('/cases', data);
  return res.data;
}

export async function updateCaseStatus(id: string, data: UpdateCaseStatusInput): Promise<Case> {
  const res = await apiClient.patch(`/cases/${id}/status`, data);
  return res.data;
}

// ============= Case Timeline =============

export async function getCaseTimeline(caseId: string): Promise<TimelineEvent[]> {
  const res = await apiClient.get(`/cases/${caseId}/timeline`);
  return res.data;
}

// ============= Case Team =============

export async function addCaseTherapist(caseId: string, data: AddTherapistInput): Promise<CaseTherapist> {
  const res = await apiClient.post(`/cases/${caseId}/therapists`, data);
  return res.data;
}

export async function updateCaseTherapist(
  caseId: string,
  assignmentId: string,
  data: Partial<AddTherapistInput>,
): Promise<CaseTherapist> {
  const res = await apiClient.patch(`/cases/${caseId}/therapists/${assignmentId}`, data);
  return res.data;
}

export async function transferCase(caseId: string, data: TransferCaseInput): Promise<Case> {
  const res = await apiClient.post(`/cases/${caseId}/transfer`, data);
  return res.data;
}

// ============= Internal Notes =============

export async function createInternalNote(caseId: string, data: CreateInternalNoteInput): Promise<CaseInternalNote> {
  const res = await apiClient.post(`/cases/${caseId}/internal-notes`, data);
  return res.data;
}

export async function listInternalNotes(caseId: string): Promise<CaseInternalNote[]> {
  const res = await apiClient.get(`/cases/${caseId}/internal-notes`);
  return res.data;
}

// ============= Sessions =============

export async function listSessions(caseId: string, filters?: SessionFilters): Promise<PaginatedResponse<CaseSession>> {
  const res = await apiClient.get(`/cases/${caseId}/sessions`, { params: filters });
  return res.data;
}

export async function getSession(caseId: string, sessionId: string): Promise<CaseSession> {
  const res = await apiClient.get(`/cases/${caseId}/sessions/${sessionId}`);
  return res.data;
}

export async function createSession(caseId: string, data: CreateSessionInput): Promise<CaseSession> {
  const res = await apiClient.post(`/cases/${caseId}/sessions`, data);
  return res.data;
}

export async function updateSession(caseId: string, sessionId: string, data: UpdateSessionInput): Promise<CaseSession> {
  const res = await apiClient.patch(`/cases/${caseId}/sessions/${sessionId}`, data);
  return res.data;
}

export async function logGoalProgress(
  caseId: string,
  sessionId: string,
  data: GoalProgressInput,
): Promise<SessionGoalProgress> {
  const res = await apiClient.post(`/cases/${caseId}/sessions/${sessionId}/goal-progress`, data);
  return res.data;
}

export async function bulkLogGoalProgress(
  caseId: string,
  sessionId: string,
  data: { progress: GoalProgressInput[] },
): Promise<SessionGoalProgress[]> {
  const res = await apiClient.post(`/cases/${caseId}/sessions/${sessionId}/goal-progress/bulk`, data);
  return res.data;
}

export async function generateAiSummary(
  caseId: string,
  sessionId: string,
  data: AiSummaryInput,
): Promise<{ summary: string }> {
  const res = await apiClient.post(`/cases/${caseId}/sessions/${sessionId}/ai-summary`, data);
  return res.data;
}

export async function enhanceClinicalNotes(
  caseId: string,
  sessionId: string,
  data: EnhanceNotesInput,
): Promise<{ enhancedText: string }> {
  const res = await apiClient.post(`/cases/${caseId}/sessions/${sessionId}/enhance-notes`, data);
  return res.data;
}

// ============= IEPs =============

export async function listIEPs(caseId: string): Promise<IEP[]> {
  const res = await apiClient.get(`/cases/${caseId}/ieps`);
  return res.data;
}

export async function getIEP(caseId: string, iepId: string): Promise<IEP> {
  const res = await apiClient.get(`/cases/${caseId}/ieps/${iepId}`);
  return res.data;
}

export async function createIEP(caseId: string, data: CreateIEPInput): Promise<IEP> {
  const res = await apiClient.post(`/cases/${caseId}/ieps`, data);
  return res.data;
}

export async function updateIEP(caseId: string, iepId: string, data: UpdateIEPInput): Promise<IEP> {
  const res = await apiClient.patch(`/cases/${caseId}/ieps/${iepId}`, data);
  return res.data;
}

export async function approveIEP(caseId: string, iepId: string, data: ApproveIEPInput): Promise<IEP> {
  const res = await apiClient.post(`/cases/${caseId}/ieps/${iepId}/approve`, data);
  return res.data;
}

export async function createNewIEPVersion(caseId: string, iepId: string): Promise<IEP> {
  const res = await apiClient.post(`/cases/${caseId}/ieps/${iepId}/new-version`);
  return res.data;
}

// IEP Goals

export async function addIEPGoal(caseId: string, iepId: string, data: AddIEPGoalInput): Promise<IEPGoal> {
  const res = await apiClient.post(`/cases/${caseId}/ieps/${iepId}/goals`, data);
  return res.data;
}

export async function updateIEPGoal(
  caseId: string,
  iepId: string,
  goalId: string,
  data: UpdateIEPGoalInput,
): Promise<IEPGoal> {
  const res = await apiClient.patch(`/cases/${caseId}/ieps/${iepId}/goals/${goalId}`, data);
  return res.data;
}

export async function bulkAddIEPGoals(caseId: string, iepId: string, data: BulkAddGoalsInput): Promise<IEPGoal[]> {
  const res = await apiClient.post(`/cases/${caseId}/ieps/${iepId}/goals/bulk`, data);
  return res.data;
}

// IEP AI Generation

export async function generateIEPFromScreening(caseId: string, data: GenerateIEPInput): Promise<IEP> {
  const res = await apiClient.post(`/cases/${caseId}/ieps/generate`, data);
  return res.data;
}

export async function suggestIEPGoals(
  caseId: string,
  data: SuggestGoalsInput,
): Promise<{ goals: AddIEPGoalInput[] }> {
  const res = await apiClient.post(`/cases/${caseId}/ieps/suggest-goals`, data);
  return res.data;
}

// IEP Templates & Goal Bank

export async function listIEPTemplates(filters?: IEPTemplateFilters): Promise<IEPTemplate[]> {
  const res = await apiClient.get('/iep-templates', { params: filters });
  return res.data;
}

export async function searchGoalBank(filters?: GoalBankFilters): Promise<GoalBankItem[]> {
  const res = await apiClient.get('/goal-bank', { params: filters });
  return res.data;
}

// ============= Milestone Plans =============

export async function listMilestonePlans(caseId: string): Promise<MilestonePlan[]> {
  const res = await apiClient.get(`/cases/${caseId}/milestone-plans`);
  return res.data;
}

export async function getMilestonePlan(caseId: string, planId: string): Promise<MilestonePlan> {
  const res = await apiClient.get(`/cases/${caseId}/milestone-plans/${planId}`);
  return res.data;
}

export async function createMilestonePlan(caseId: string, data: CreateMilestonePlanInput): Promise<MilestonePlan> {
  const res = await apiClient.post(`/cases/${caseId}/milestone-plans`, data);
  return res.data;
}

export async function createMilestone(caseId: string, planId: string, data: CreateMilestoneInput): Promise<Milestone> {
  const res = await apiClient.post(`/cases/${caseId}/milestone-plans/${planId}/milestones`, data);
  return res.data;
}

export async function updateMilestone(
  caseId: string,
  planId: string,
  milestoneId: string,
  data: UpdateMilestoneInput,
): Promise<Milestone> {
  const res = await apiClient.patch(`/cases/${caseId}/milestone-plans/${planId}/milestones/${milestoneId}`, data);
  return res.data;
}

export async function generateMilestonesAI(
  caseId: string,
  planId: string,
  data: GenerateMilestonesInput,
): Promise<Milestone[]> {
  const res = await apiClient.post(`/cases/${caseId}/milestone-plans/${planId}/ai-generate`, data);
  return res.data;
}

// ============= Documents =============

export async function listDocuments(caseId: string, filters?: DocumentFilters): Promise<PaginatedResponse<CaseDocument>> {
  const res = await apiClient.get(`/cases/${caseId}/documents`, { params: filters });
  return res.data;
}

export async function createDocument(caseId: string, data: CreateDocumentInput): Promise<CaseDocument> {
  const res = await apiClient.post(`/cases/${caseId}/documents`, data);
  return res.data;
}

export async function shareDocument(caseId: string, documentId: string, data: ShareDocumentInput): Promise<CaseShare> {
  const res = await apiClient.post(`/cases/${caseId}/documents/${documentId}/share`, data);
  return res.data;
}

export async function revokeDocumentShare(caseId: string, shareId: string): Promise<void> {
  await apiClient.post(`/cases/${caseId}/documents/revoke-share`, { shareId });
}

export async function generateReport(caseId: string, data: GenerateReportInput): Promise<CaseDocument> {
  const res = await apiClient.post(`/cases/${caseId}/documents/generate-report`, data);
  return res.data;
}

export async function getParentSharedDocuments(): Promise<CaseDocument[]> {
  const res = await apiClient.get('/parent/shared-documents');
  return res.data;
}

// ============= Billing =============

export async function listBilling(
  caseId: string,
  filters?: BillingFilters,
): Promise<PaginatedResponse<CaseBilling> & { summary?: BillingSummary }> {
  const res = await apiClient.get(`/cases/${caseId}/billing`, { params: filters });
  return res.data;
}

export async function createBilling(caseId: string, data: CreateBillingInput): Promise<CaseBilling> {
  const res = await apiClient.post(`/cases/${caseId}/billing`, data);
  return res.data;
}

export async function updateBilling(caseId: string, billingId: string, data: UpdateBillingInput): Promise<CaseBilling> {
  const res = await apiClient.patch(`/cases/${caseId}/billing/${billingId}`, data);
  return res.data;
}

export async function getBillingSummary(caseId: string): Promise<BillingSummary | null> {
  const res = await apiClient.get(`/cases/${caseId}/billing`, { params: { limit: 1 } });
  return res.data?.summary || null;
}

// ============= Consents =============

export async function listConsents(caseId: string, filters?: ConsentFilters): Promise<CaseConsent[]> {
  const res = await apiClient.get(`/cases/${caseId}/consents`, { params: filters });
  return res.data;
}

export async function createConsent(caseId: string, data: CreateConsentInput): Promise<CaseConsent> {
  const res = await apiClient.post(`/cases/${caseId}/consents`, data);
  return res.data;
}

export async function revokeConsent(caseId: string, consentId: string): Promise<CaseConsent> {
  const res = await apiClient.post(`/cases/${caseId}/consents/${consentId}/revoke`);
  return res.data;
}

export async function getComplianceStatus(caseId: string): Promise<ComplianceStatus> {
  const res = await apiClient.get(`/cases/${caseId}/consents/compliance`);
  return res.data;
}

// ============= Audit Logs =============

export async function listAuditLogs(caseId: string, filters?: AuditLogFilters): Promise<PaginatedResponse<AuditLog>> {
  const res = await apiClient.get(`/cases/${caseId}/audit`, { params: filters });
  return res.data;
}

export async function getAuditSummary(caseId: string): Promise<AuditSummary> {
  const res = await apiClient.get(`/cases/${caseId}/audit/summary`);
  return res.data;
}

// ============= Worksheets (Case Integration) =============

export interface CaseWorksheet {
  id: string;
  title: string;
  type: string;
  subType?: string;
  status: string;
  difficulty: string;
  pdfUrl?: string;
  previewUrl?: string;
  createdAt: string;
  createdBy?: UserSummary;
}

export async function getCaseWorksheets(caseId: string): Promise<CaseWorksheet[]> {
  const res = await apiClient.get(`/worksheets/cases/${caseId}/worksheets`);
  return res.data;
}
