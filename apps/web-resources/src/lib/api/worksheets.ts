import { apiClient } from '@upllyft/api-client';

// ── Enums ──

export type WorksheetType = 'ACTIVITY' | 'VISUAL_SUPPORT' | 'STRUCTURED_PLAN' | 'PROGRESS_TRACKER';
export type WorksheetStatus = 'DRAFT' | 'GENERATING' | 'PUBLISHED' | 'ARCHIVED' | 'FLAGGED';
export type WorksheetDataSource = 'MANUAL' | 'SCREENING' | 'UPLOADED_REPORT' | 'IEP_GOALS' | 'SESSION_NOTES';
export type WorksheetDifficulty = 'FOUNDATIONAL' | 'DEVELOPING' | 'STRENGTHENING';
export type WorksheetColorMode = 'FULL_COLOR' | 'GRAYSCALE' | 'LINE_ART';
export type WorksheetAssignmentStatus = 'ASSIGNED' | 'VIEWED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
export type WorksheetFlagReason = 'INAPPROPRIATE' | 'INACCURATE' | 'HARMFUL' | 'SPAM' | 'OTHER';
export type WorksheetFlagStatus = 'PENDING' | 'REVIEWED' | 'DISMISSED' | 'ACTIONED';

// ── Core Types ──

export interface WorksheetImage {
  id: string;
  worksheetId: string;
  imageUrl: string;
  prompt: string;
  altText: string;
  position: number;
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
}

export interface Worksheet {
  id: string;
  title: string;
  type: WorksheetType;
  subType?: string;
  content: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  status: WorksheetStatus;
  difficulty: WorksheetDifficulty;
  colorMode: WorksheetColorMode;
  targetDomains: string[];
  ageRangeMin?: number;
  ageRangeMax?: number;
  conditionTags: string[];
  pdfUrl?: string;
  previewUrl?: string;
  dataSource: WorksheetDataSource;
  screeningId?: string;
  caseId?: string;
  iepGoalIds?: string[];
  uploadedReportUrl?: string;
  version: number;
  parentVersionId?: string;
  isPublic: boolean;
  publishedAt?: string;
  contributorNotes?: string;
  clonedFromId?: string;
  cloneCount: number;
  averageRating: number;
  reviewCount: number;
  createdById: string;
  childId?: string;
  createdAt: string;
  updatedAt: string;
  images?: WorksheetImage[];
  child?: { id: string; firstName: string; nickname?: string; dateOfBirth: string };
  createdBy?: { id: string; name: string; email: string; image?: string; isVerifiedContributor?: boolean };
}

export interface WorksheetAssignment {
  id: string;
  worksheetId: string;
  assignedById: string;
  assignedToId: string;
  childId: string;
  caseId?: string;
  status: WorksheetAssignmentStatus;
  dueDate?: string;
  notes?: string;
  parentNotes?: string;
  completedAt?: string;
  viewedAt?: string;
  createdAt: string;
  worksheet?: Worksheet;
  assignedBy?: { id: string; name: string; email: string };
  assignedTo?: { id: string; name: string; email: string };
  child?: { id: string; firstName: string; nickname?: string };
}

export interface WorksheetReview {
  id: string;
  worksheetId: string;
  userId: string;
  rating: number;
  reviewText?: string;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; image?: string };
}

export interface WorksheetFlag {
  id: string;
  worksheetId: string;
  flaggedById: string;
  reason: WorksheetFlagReason;
  details?: string;
  status: WorksheetFlagStatus;
  resolution?: string;
  resolvedById?: string;
  resolvedAt?: string;
  createdAt: string;
  worksheet?: Worksheet;
  flaggedBy?: { id: string; name: string };
  resolvedBy?: { id: string; name: string };
}

export interface WorksheetCompletion {
  id: string;
  worksheetId: string;
  childId: string;
  assignmentId?: string;
  timeSpentMinutes?: number;
  difficultyRating?: number;
  engagementRating?: number;
  helpLevel?: 'NONE' | 'MINIMAL' | 'MODERATE' | 'SIGNIFICANT';
  completionQuality?: 'TOO_EASY' | 'JUST_RIGHT' | 'CHALLENGING' | 'TOO_HARD';
  parentNotes?: string;
  completedAt: string;
  createdAt: string;
  worksheet?: Worksheet;
}

export interface ScreeningSummary {
  domainScores: Array<{ domain: string; score: number; status: string }>;
  flaggedDomains: string[];
  suggestedWorksheetDomains: string[];
}

export interface ParsedReportData {
  childAge?: number;
  conditions?: string[];
  domains?: string[];
  strengths?: string[];
  challenges?: string[];
  recommendations?: string[];
}

export interface IEPGoalsResponse {
  caseId: string;
  goals: Array<{ id: string; description: string; domain: string; status: string }>;
  child?: { id: string; firstName: string };
}

export interface SessionNotesResponse {
  caseId: string;
  sessions: Array<{ id: string; date: string; notes: string; progress?: string }>;
}

export interface CompletionStats {
  totalCompleted: number;
  avgTimeSpent: number;
  avgDifficultyRating: number;
  avgEngagementRating: number;
  qualityDistribution: Record<string, number>;
  domainCounts: Record<string, number>;
}

export interface ChildProgressTimeline {
  domains: Array<{
    domain: string;
    entries: Array<{ date: string; score: number; worksheetTitle: string }>;
    trend: 'improving' | 'declining' | 'stable';
  }>;
}

export interface ChildJourney {
  domainProgression: Array<{
    domain: string;
    worksheets: Array<{
      id: string;
      title: string;
      completedAt?: string;
      quality?: string;
      version: number;
    }>;
  }>;
  completedCount: number;
}

export interface WorksheetEffectivenessScore {
  worksheetId: string;
  score: number;
  sampleSize: number;
  domains: Array<{ domain: string; preScore: number; postScore: number; progressDelta: number }>;
}

export interface RecommendedWorksheet {
  worksheet: Worksheet;
  relevanceScore: number;
  reasoning: string;
  suggestedDifficulty?: WorksheetDifficulty;
}

export interface DifficultyRecommendation {
  difficulty: WorksheetDifficulty;
  reasoning: string;
}

export interface TopContributor {
  userId: string;
  name: string;
  image?: string;
  isVerifiedContributor: boolean;
  publishedCount: number;
  totalClones: number;
  averageRating: number;
  totalReviews: number;
}

export interface VersionHistory {
  versions: Array<{
    id: string;
    version: number;
    title: string;
    status: WorksheetStatus;
    createdAt: string;
  }>;
  totalVersions: number;
}

export interface ModerationStats {
  pending: number;
  reviewed: number;
  dismissed: number;
  actioned: number;
  flaggedWorksheets: number;
}

// ── Filter/Request Types ──

export interface WorksheetFilters {
  page?: number;
  limit?: number;
  type?: WorksheetType;
  status?: WorksheetStatus;
  difficulty?: WorksheetDifficulty;
  subType?: string;
  domain?: string;
  search?: string;
  childId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CommunityFilters {
  page?: number;
  limit?: number;
  type?: WorksheetType;
  difficulty?: WorksheetDifficulty;
  subType?: string;
  domain?: string;
  condition?: string;
  search?: string;
  ageMin?: number;
  ageMax?: number;
  sortBy?: 'newest' | 'highest_rated' | 'most_cloned' | 'title';
}

export interface AssignmentFilters {
  page?: number;
  limit?: number;
  status?: WorksheetAssignmentStatus;
  childId?: string;
  caseId?: string;
}

export interface FlagFilters {
  page?: number;
  limit?: number;
  status?: WorksheetFlagStatus;
  reason?: WorksheetFlagReason;
}

export interface GenerateWorksheetInput {
  dataSource: WorksheetDataSource;
  type: WorksheetType;
  subType?: string;
  targetDomains: string[];
  difficulty: WorksheetDifficulty;
  interests?: string;
  duration?: string;
  setting?: string;
  colorMode?: WorksheetColorMode;
  specialInstructions?: string;
  childId?: string;
  caseId?: string;
  manualInput?: { childAge: number; conditions?: string[]; developmentalNotes?: string };
  screeningInput?: { assessmentId: string; childId: string };
  uploadedReportInput?: { reportUrl: string; parsedData?: Record<string, unknown>; childId?: string };
  iepGoalsInput?: { caseId: string; goalIds: string[] };
  sessionNotesInput?: { caseId: string; sessionIds: string[] };
}

export interface AssignWorksheetDto {
  assignedToId: string;
  childId: string;
  caseId?: string;
  dueDate?: string;
  notes?: string;
}

export interface RecordCompletionDto {
  childId: string;
  assignmentId?: string;
  timeSpentMinutes?: number;
  difficultyRating?: number;
  engagementRating?: number;
  helpLevel?: 'NONE' | 'MINIMAL' | 'MODERATE' | 'SIGNIFICANT';
  completionQuality?: 'TOO_EASY' | 'JUST_RIGHT' | 'CHALLENGING' | 'TOO_HARD';
  parentNotes?: string;
}

// ── Paginated Response Types ──

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── API Functions ──

// CRUD
export async function generateWorksheet(data: GenerateWorksheetInput): Promise<Worksheet> {
  const res = await apiClient.post('/worksheets/generate', data);
  return res.data;
}

export async function getMyLibrary(filters?: WorksheetFilters): Promise<PaginatedResponse<Worksheet>> {
  const res = await apiClient.get('/worksheets/my-library', { params: filters });
  return res.data;
}

export async function getWorksheet(id: string): Promise<Worksheet> {
  const res = await apiClient.get(`/worksheets/${id}`);
  return res.data;
}

export async function getWorksheetStatus(id: string): Promise<{ id: string; status: WorksheetStatus; pdfUrl?: string; previewUrl?: string }> {
  const res = await apiClient.get(`/worksheets/${id}/status`);
  return res.data;
}

export async function updateWorksheet(id: string, data: { title?: string; content?: Record<string, unknown>; conditionTags?: string[] }): Promise<Worksheet> {
  const res = await apiClient.put(`/worksheets/${id}`, data);
  return res.data;
}

export async function deleteWorksheet(id: string): Promise<void> {
  await apiClient.delete(`/worksheets/${id}`);
}

export async function regenerateSection(worksheetId: string, data: { sectionId: string; instructions: string }): Promise<Worksheet> {
  const res = await apiClient.post(`/worksheets/${worksheetId}/regenerate-section`, data);
  return res.data;
}

export async function regenerateImage(worksheetId: string, data: { imageId: string; customPrompt?: string }): Promise<WorksheetImage> {
  const res = await apiClient.post(`/worksheets/${worksheetId}/regenerate-image`, data);
  return res.data;
}

export async function downloadWorksheetPdf(worksheetId: string, title?: string, pdfUrl?: string): Promise<void> {
  if (pdfUrl) {
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `${title || 'worksheet'}.pdf`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }
  const res = await apiClient.get(`/worksheets/${worksheetId}/download`, { responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title || 'worksheet'}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Data Sources
export async function getChildScreenings(childId: string): Promise<{ assessments: Array<{ id: string; ageGroup: string; status: string; completedAt?: string }> }> {
  const res = await apiClient.get(`/worksheets/data-sources/screenings/${childId}`);
  return res.data;
}

export async function getScreeningSummary(assessmentId: string): Promise<ScreeningSummary> {
  const res = await apiClient.get(`/worksheets/data-sources/screenings/${assessmentId}/summary`);
  return res.data;
}

export async function parseReport(reportUrl: string, fileType: string): Promise<ParsedReportData> {
  const res = await apiClient.post('/worksheets/data-sources/parse-report', { reportUrl, fileType });
  return res.data;
}

export async function getIEPGoals(caseId: string): Promise<IEPGoalsResponse> {
  const res = await apiClient.get(`/worksheets/data-sources/iep-goals/${caseId}`);
  return res.data;
}

export async function getSessionNotes(caseId: string): Promise<SessionNotesResponse> {
  const res = await apiClient.get(`/worksheets/data-sources/session-notes/${caseId}`);
  return res.data;
}

// Assignments
export async function assignWorksheet(worksheetId: string, data: AssignWorksheetDto): Promise<WorksheetAssignment> {
  const res = await apiClient.post(`/worksheets/${worksheetId}/assign`, data);
  return res.data;
}

export async function getSentAssignments(filters?: AssignmentFilters): Promise<PaginatedResponse<WorksheetAssignment>> {
  const res = await apiClient.get('/worksheets/assignments/sent', { params: filters });
  return res.data;
}

export async function getReceivedAssignments(filters?: AssignmentFilters): Promise<PaginatedResponse<WorksheetAssignment>> {
  const res = await apiClient.get('/worksheets/assignments/received', { params: filters });
  return res.data;
}

export async function getAssignment(assignmentId: string): Promise<WorksheetAssignment> {
  const res = await apiClient.get(`/worksheets/assignments/${assignmentId}`);
  return res.data;
}

export async function updateAssignment(assignmentId: string, data: { status?: WorksheetAssignmentStatus; parentNotes?: string }): Promise<WorksheetAssignment> {
  const res = await apiClient.patch(`/worksheets/assignments/${assignmentId}`, data);
  return res.data;
}

// Community
export async function browseCommunity(filters?: CommunityFilters): Promise<PaginatedResponse<Worksheet>> {
  const res = await apiClient.get('/worksheets/community', { params: filters });
  return res.data;
}

export async function publishWorksheet(worksheetId: string, contributorNotes?: string): Promise<Worksheet> {
  const res = await apiClient.post(`/worksheets/${worksheetId}/publish`, { contributorNotes });
  return res.data;
}

export async function unpublishWorksheet(worksheetId: string): Promise<Worksheet> {
  const res = await apiClient.post(`/worksheets/${worksheetId}/unpublish`);
  return res.data;
}

export async function cloneWorksheet(worksheetId: string): Promise<Worksheet> {
  const res = await apiClient.post(`/worksheets/${worksheetId}/clone`);
  return res.data;
}

// Reviews
export async function createReview(worksheetId: string, data: { rating: number; reviewText?: string }): Promise<WorksheetReview> {
  const res = await apiClient.post(`/worksheets/${worksheetId}/reviews`, data);
  return res.data;
}

export async function getReviews(worksheetId: string, filters?: { page?: number; limit?: number; sortBy?: string }): Promise<PaginatedResponse<WorksheetReview>> {
  const res = await apiClient.get(`/worksheets/${worksheetId}/reviews`, { params: filters });
  return res.data;
}

export async function deleteReview(worksheetId: string, reviewId: string): Promise<void> {
  await apiClient.delete(`/worksheets/${worksheetId}/reviews/${reviewId}`);
}

export async function markReviewHelpful(worksheetId: string, reviewId: string): Promise<WorksheetReview> {
  const res = await apiClient.post(`/worksheets/${worksheetId}/reviews/${reviewId}/helpful`);
  return res.data;
}

// Moderation
export async function flagWorksheet(worksheetId: string, data: { reason: WorksheetFlagReason; details?: string }): Promise<WorksheetFlag> {
  const res = await apiClient.post(`/worksheets/${worksheetId}/flag`, data);
  return res.data;
}

export async function getModerationQueue(filters?: FlagFilters): Promise<PaginatedResponse<WorksheetFlag>> {
  const res = await apiClient.get('/worksheets/moderation/queue', { params: filters });
  return res.data;
}

export async function resolveFlag(flagId: string, data: { status: WorksheetFlagStatus; resolution?: string }): Promise<WorksheetFlag> {
  const res = await apiClient.patch(`/worksheets/moderation/flags/${flagId}`, data);
  return res.data;
}

export async function getModerationStats(): Promise<ModerationStats> {
  const res = await apiClient.get('/worksheets/moderation/stats');
  return res.data;
}

// Completions & Analytics
export async function recordCompletion(worksheetId: string, data: RecordCompletionDto): Promise<WorksheetCompletion> {
  const res = await apiClient.post(`/worksheets/${worksheetId}/completions`, data);
  return res.data;
}

export async function getCompletionStats(childId: string): Promise<CompletionStats> {
  const res = await apiClient.get(`/worksheets/children/${childId}/completion-stats`);
  return res.data;
}

export async function getChildProgressTimeline(childId: string): Promise<ChildProgressTimeline> {
  const res = await apiClient.get(`/worksheets/analytics/child/${childId}`);
  return res.data;
}

export async function getChildJourney(childId: string): Promise<ChildJourney> {
  const res = await apiClient.get(`/worksheets/children/${childId}/journey`);
  return res.data;
}

export async function getWorksheetEffectiveness(worksheetId: string): Promise<WorksheetEffectivenessScore> {
  const res = await apiClient.get(`/worksheets/analytics/worksheet/${worksheetId}/effectiveness`);
  return res.data;
}

// Recommendations
export async function getRecommendations(childId: string): Promise<{ recommendations: RecommendedWorksheet[] }> {
  const res = await apiClient.get(`/worksheets/recommendations/${childId}`);
  return res.data;
}

export async function suggestDifficulty(childId: string): Promise<DifficultyRecommendation> {
  const res = await apiClient.get(`/worksheets/difficulty/suggest/${childId}`);
  return res.data;
}

// Version Tracking
export async function createVersion(worksheetId: string): Promise<Worksheet> {
  const res = await apiClient.post(`/worksheets/${worksheetId}/create-version`);
  return res.data;
}

export async function getVersionHistory(worksheetId: string): Promise<VersionHistory> {
  const res = await apiClient.get(`/worksheets/${worksheetId}/versions`);
  return res.data;
}

// Contributors
export async function getTopContributors(): Promise<{ data: TopContributor[] }> {
  const res = await apiClient.get('/worksheets/contributors/top');
  return res.data;
}

export async function applyForVerification(bio: string): Promise<{ message: string }> {
  const res = await apiClient.post('/worksheets/contributors/apply', { bio });
  return res.data;
}

export async function approveVerification(userId: string): Promise<void> {
  await apiClient.patch(`/worksheets/contributors/${userId}/verify`);
}

// Case Integration
export async function linkWorksheetToCase(worksheetId: string, caseId: string): Promise<Worksheet> {
  const res = await apiClient.post(`/worksheets/${worksheetId}/link-case`, { caseId });
  return res.data;
}

export async function getCaseWorksheets(caseId: string): Promise<Worksheet[]> {
  const res = await apiClient.get(`/worksheets/cases/${caseId}/worksheets`);
  return res.data;
}
