// apps/api/src/agents/clinical-insights.types.ts
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
  authors: string[];
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
  yearsOfExperience?: number;
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

export interface RelevantCommunity {
  id: string;
  name: string;
  slug: string;
  description: string;
  memberCount: number;
  matchReason: string;
  tags: string[];
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

export interface ClinicalInsight {
  caseAnalysis: CaseParameters;
  similarCases: SimilarCase[];
  researchArticles: PubMedArticle[];
  evidenceBasedRecommendations: DetailedRecommendation[];
  alternativeApproaches: DetailedRecommendation[];
  expertConnections: ExpertConnection[];
  communities: RelevantCommunity[];
  organizations: RelevantOrganization[];
  confidence: number;
  citations: string[];
}

export interface ClinicalInsightsResponse {
  success: boolean;
  data: ClinicalInsight;
  timestamp: string;
}

export interface StreamProgressEvent {
  step: string;
  progress: number;
  message: string;
  data?: Partial<ClinicalInsight>;
}

export interface ClinicalMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: any;
  createdAt: Date;
}

export interface ClinicalConversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages?: ClinicalMessage[];
}