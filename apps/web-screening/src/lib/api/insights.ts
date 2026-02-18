import { apiClient } from '@upllyft/api-client';

// ── Types ──

export interface CaseParameters {
  age?: string;
  diagnosis: string[];
  interventions: string[];
  challenges: string[];
  goals?: string[];
}

export interface PubMedArticle {
  pmid: string;
  title: string;
  abstract: string;
  authors?: string[];
  journal: string;
  year: string;
  doi?: string;
  relevanceScore?: number;
}

export interface SimilarCase {
  id?: string;
  title: string;
  content: string;
  authorName: string;
  authorRole: string;
  similarity: number;
  relevanceExplanation: string;
}

export interface ExpertConnection {
  id?: string;
  name: string;
  role: string;
  specialization: string[];
  yearsOfExperience: number;
  trustScore: number;
  organization?: string;
  _count?: {
    posts: number;
    comments: number;
  };
}

export interface DetailedRecommendation {
  title: string;
  description: string;
  actionSteps: string[];
  priority: 'high' | 'medium' | 'low';
  timeline: string;
  availability: {
    india: boolean;
    telehealth: boolean;
    languages: string[];
  };
  costEstimate: string;
}

export interface OverallAssessment {
  riskLevel: 'low' | 'moderate' | 'high';
  developmentalAge?: string;
  headline: string;
  summary: string;
}

export interface DomainAnalysisItem {
  domain: string;
  score: number;
  status: 'on-track' | 'monitor' | 'concern';
  clinicalAnalysis: string;
  impact: string;
}

export interface ClinicalCorrelation {
  title: string;
  relatedHistory: string;
  insight: string;
}

export interface RoadmapItem {
  area: string;
  action: string;
  reason: string;
}

export interface StrategicRoadmap {
  shortTerm: RoadmapItem[];
  mediumTerm: RoadmapItem[];
  longTerm: RoadmapItem[];
}

export interface InsightChild {
  id: string;
  name: string;
  avatar?: string;
  age?: string;
  dateOfBirth?: string;
}

export interface RelevantCommunity {
  id: string;
  name: string;
  slug: string;
  description: string;
  memberCount: number;
  matchReason: string;
  tags: string[];
}

export interface RelevantOrganization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  _count: {
    communities: number;
    members: number;
  };
}

export interface RelevantPost {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorRole: string;
  authorAvatar?: string;
  tags: string[];
  upvotes: number;
  viewCount: number;
  commentCount: number;
  createdAt: string;
  communityName?: string;
  communitySlug?: string;
}

export interface ClinicalInsight {
  caseAnalysis: CaseParameters;
  similarCases: SimilarCase[];
  researchArticles: PubMedArticle[];
  evidenceBasedRecommendations: DetailedRecommendation[];
  alternativeApproaches: DetailedRecommendation[];
  expertConnections: ExpertConnection[];
  communities?: RelevantCommunity[];
  organizations?: RelevantOrganization[];
  confidence: number;
  citations?: string[];
  // Enriched fields (from assessment-based analysis)
  overallAssessment?: OverallAssessment;
  domainAnalysis?: DomainAnalysisItem[];
  clinicalCorrelations?: ClinicalCorrelation[];
  strategicRoadmap?: StrategicRoadmap;
  child?: InsightChild;
  assessmentId?: string;
  assessmentDate?: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: any;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title?: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversationSummary {
  id: string;
  title?: string;
  query?: string;
  confidence?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface AnalyzeAssessmentDto {
  childId: string;
  assessmentId: string;
  context?: string;
  focusAreas?: string[];
}

// ── API Functions ──

export async function analyzeCase(
  query: string,
): Promise<ClinicalInsight & { conversationId: string }> {
  const res = await apiClient.post('/agents/clinical-insights/analyze', { query });
  const body = res.data;
  return body?.data ?? body;
}

export async function analyzeAssessment(
  dto: AnalyzeAssessmentDto,
): Promise<ClinicalInsight & { conversationId: string }> {
  const res = await apiClient.post('/agents/clinical-insights/analyze-assessment', dto);
  const body = res.data;
  return body?.data ?? body;
}

export async function getInsightsHistory(): Promise<ConversationSummary[]> {
  const res = await apiClient.get('/agents/clinical-insights/history');
  const body = res.data;
  return Array.isArray(body) ? body : body?.data ?? [];
}

export async function getInsightConversation(id: string): Promise<Conversation> {
  const res = await apiClient.get(`/agents/clinical-insights/history/${id}`);
  const body = res.data;
  return body?.data ?? body;
}

export async function followUp(
  conversationId: string,
  query: string,
): Promise<ClinicalInsight> {
  const res = await apiClient.post(
    `/agents/clinical-insights/conversation/${conversationId}/follow-up`,
    { query },
  );
  const body = res.data;
  return body?.data ?? body;
}

export async function submitFeedback(
  conversationId: string,
  value: 1 | -1,
): Promise<void> {
  await apiClient.post('/agents/clinical-insights/feedback', {
    conversationId,
    value,
  });
}

export async function getRelevantPosts(
  conversationId: string,
): Promise<RelevantPost[]> {
  const res = await apiClient.get(`/agents/clinical-insights/conversation/${conversationId}/posts`);
  const body = res.data;
  return body?.data ?? [];
}

export async function createStructuredPlan(
  recommendation: any,
): Promise<any> {
  const res = await apiClient.post('/agents/clinical-insights/action/create-plan', recommendation);
  const body = res.data;
  return body?.data ?? body;
}
