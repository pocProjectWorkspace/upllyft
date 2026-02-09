import { apiClient } from '@upllyft/api-client';

// ── Types ──

export type AssessmentStatus = 'IN_PROGRESS' | 'TIER1_COMPLETE' | 'TIER2_REQUIRED' | 'COMPLETED' | 'EXPIRED';
export type AnswerType = 'YES' | 'SOMETIMES' | 'NOT_SURE' | 'NO';
export type DomainStatus = 'GREEN' | 'YELLOW' | 'RED';
export type ZoneType = 'green' | 'yellow' | 'red';
export type AccessLevel = 'VIEW' | 'ANNOTATE';

export interface Child {
  id: string;
  firstName: string;
  nickname?: string;
  dateOfBirth: string;
  gender: string;
  profileId: string;
}

export interface DomainScore {
  riskIndex: number;
  status: DomainStatus;
  tier2Required: boolean;
  tier2Reason?: 'RISK_INDEX' | 'RED_FLAG';
}

export interface DomainScoreResult extends DomainScore {
  domainId: string;
  domainName: string;
  zone: ZoneType;
  interpretation: string;
  recommendations: Recommendation[];
  ageEquivalent?: string;
  redFlagViolations?: string[];
}

export interface Recommendation {
  severity: 'Mild' | 'Moderate' | 'Severe';
  intervention: string;
}

export interface Assessment {
  id: string;
  childId: string;
  ageGroup: string;
  status: AssessmentStatus;
  tier1Completed: boolean;
  tier2Completed: boolean;
  tier1CompletedAt?: string;
  tier2CompletedAt?: string;
  completedAt?: string;
  expiresAt?: string;
  overallScore?: number;
  domainScores?: Record<string, DomainScore>;
  flaggedDomains?: string[];
  child: Child;
  createdAt: string;
  updatedAt: string;
  _count?: { responses: number };
}

export interface Question {
  id: string;
  question: string;
  weight: number;
  redFlag: boolean;
  construct: string;
  sources: string[];
  whyWeAsk: string;
}

export interface Domain {
  domainId: string;
  domainName: string;
  description: string;
  questions: Question[];
}

export interface Questionnaire {
  ageGroup: string;
  displayName: string;
  estimatedTime: string;
  domains: Domain[];
  flaggedDomains?: string[];
}

export interface QuestionResponse {
  questionId: string;
  answer: AnswerType;
}

export interface SubmitTier1Result {
  tier2Required: boolean;
  flaggedDomains: string[];
  domainScores: DomainScoreResult[];
  overallScore: number;
  assessment: Assessment;
}

export interface ReportData {
  assessment: Assessment;
  child: Child;
  ageGroup: string;
  domainScores: DomainScoreResult[];
  recommendations: string[];
  responses: Array<{
    id: string;
    tier: number;
    domain: string;
    questionId: string;
    answer: AnswerType;
    score: number;
  }>;
  developmentalAgeEquivalent: string;
  overallInterpretation: string;
}

export interface ReportV2 {
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  reportTitle?: string;
  executiveSummary?: string;
  developmentalNarrative?: {
    biologicalFoundation: string;
    environmentalInterface: string;
    strengthsProfile: string;
  };
  clinicalCorrelations?: Array<{
    observation: string;
    relatedHistory: string;
    insight: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
  domainDeepDives?: Array<{
    domainId: string;
    domainName: string;
    score: number;
    status: DomainStatus;
    clinicalAnalysis: string;
    impactTrajectory: string;
  }>;
  strategicRoadmap?: {
    immediatePriorities: Array<{ action: string; area: string; reason: string }>;
    environmentalModifications: string[];
    longTermGoals: string[];
  };
  professionalQuestions?: string[];
  metadata?: Record<string, unknown>;
}

export interface AssessmentShare {
  id: string;
  assessmentId: string;
  sharedBy: string;
  sharedWith: string;
  accessLevel: AccessLevel;
  sharedAt: string;
  viewedAt?: string;
  isActive: boolean;
  annotations?: {
    notes: Annotation[];
  };
  assessment?: Assessment;
  parent?: { id: string; name: string; email: string };
  therapist?: { id: string; name: string; email: string };
}

export interface Annotation {
  id: string;
  notes: string;
  domain?: string;
  questionId?: string;
  sectionId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  createdBy: string;
}

export interface CreateAssessmentDto {
  childId: string;
  ageGroup: string;
}

export interface ShareAssessmentDto {
  therapistId: string;
  accessLevel?: AccessLevel;
  message?: string;
}

export interface AddAnnotationDto {
  notes: string;
  domain?: string;
  questionId?: string;
  sectionId?: string;
  metadata?: Record<string, unknown>;
}

export interface TherapistOption {
  id: string;
  name: string;
  email: string;
  image?: string;
  specialization?: string[];
}

// ── API Functions ──

export async function createAssessment(data: CreateAssessmentDto): Promise<Assessment> {
  const res = await apiClient.post('/assessments', data);
  return res.data;
}

export async function getAssessment(id: string): Promise<Assessment> {
  const res = await apiClient.get(`/assessments/${id}`);
  return res.data;
}

export async function getChildAssessments(childId: string): Promise<Assessment[]> {
  const res = await apiClient.get(`/assessments/child/${childId}`);
  return res.data;
}

export async function deleteAssessment(id: string): Promise<void> {
  await apiClient.delete(`/assessments/${id}`);
}

export async function getTier1Questionnaire(id: string): Promise<Questionnaire> {
  const res = await apiClient.get(`/assessments/${id}/questionnaire/tier1`);
  return res.data;
}

export async function getTier2Questionnaire(id: string): Promise<Questionnaire> {
  const res = await apiClient.get(`/assessments/${id}/questionnaire/tier2`);
  return res.data;
}

export async function submitTier1Responses(
  id: string,
  data: { responses: QuestionResponse[] },
): Promise<SubmitTier1Result> {
  const res = await apiClient.post(`/assessments/${id}/responses/tier1`, data);
  return res.data;
}

export async function submitTier2Responses(
  id: string,
  data: { responses: QuestionResponse[] },
): Promise<{ completed: boolean; assessment: Assessment }> {
  const res = await apiClient.post(`/assessments/${id}/responses/tier2`, data);
  return res.data;
}

export async function getReportData(id: string): Promise<ReportData> {
  const res = await apiClient.get(`/assessments/${id}/report`);
  return res.data;
}

export async function getReportV2Data(id: string, regenerate?: boolean): Promise<ReportV2> {
  const params = regenerate ? { regenerate: 'true' } : {};
  const res = await apiClient.get(`/assessments/${id}/report-v2`, { params });
  return res.data;
}

export async function shareAssessment(id: string, data: ShareAssessmentDto): Promise<AssessmentShare> {
  const res = await apiClient.post(`/assessments/${id}/share`, data);
  return res.data;
}

export async function getSharedAssessments(): Promise<AssessmentShare[]> {
  const res = await apiClient.get('/assessments/shared-with-me/all');
  return res.data;
}

export async function getMyShareForAssessment(assessmentId: string): Promise<AssessmentShare | null> {
  try {
    const res = await apiClient.get(`/assessments/${assessmentId}/my-share`);
    return res.data;
  } catch {
    return null;
  }
}

export async function addAnnotation(id: string, data: AddAnnotationDto): Promise<AssessmentShare> {
  const res = await apiClient.post(`/assessments/${id}/annotations`, data);
  return res.data;
}

export async function revokeShare(id: string, therapistId: string): Promise<void> {
  await apiClient.delete(`/assessments/${id}/share/${therapistId}`);
}

export async function searchTherapists(search?: string): Promise<TherapistOption[]> {
  const params = search ? { search } : {};
  const res = await apiClient.get('/marketplace/therapists', { params });
  return res.data?.therapists || res.data || [];
}

export async function getUserProfile(): Promise<{ children: Child[] }> {
  const res = await apiClient.get('/profile/me');
  return res.data;
}
