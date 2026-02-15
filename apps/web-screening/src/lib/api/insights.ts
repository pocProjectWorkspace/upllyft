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

export interface ClinicalInsight {
  caseAnalysis: CaseParameters;
  similarCases: SimilarCase[];
  researchArticles: PubMedArticle[];
  evidenceBasedRecommendations: DetailedRecommendation[];
  alternativeApproaches: DetailedRecommendation[];
  expertConnections: ExpertConnection[];
  confidence: number;
  citations?: string[];
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    insights?: ClinicalInsight;
  };
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
}

// ── API Functions ──

export async function analyzeCase(
  query: string,
): Promise<ClinicalInsight & { conversationId: string }> {
  const res = await apiClient.post('/agents/clinical-insights/analyze', { query });
  return res.data;
}

export async function getInsightsHistory(): Promise<ConversationSummary[]> {
  const res = await apiClient.get('/agents/clinical-insights/history');
  return res.data;
}

export async function getInsightConversation(id: string): Promise<Conversation> {
  const res = await apiClient.get(`/agents/clinical-insights/history/${id}`);
  return res.data;
}

export async function followUp(
  conversationId: string,
  query: string,
): Promise<ClinicalInsight> {
  const res = await apiClient.post(
    `/agents/clinical-insights/conversation/${conversationId}/follow-up`,
    { query },
  );
  return res.data;
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
