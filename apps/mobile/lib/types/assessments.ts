export type AnswerType = 'YES' | 'SOMETIMES' | 'NOT_SURE' | 'NO';

export interface QuestionItem {
  id: string;
  text: string;
  domain: string;
  tier: number;
}

export interface Questionnaire {
  assessmentId: string;
  tier: number;
  questions: QuestionItem[];
}

export interface QuestionResponse {
  questionId: string;
  answer: AnswerType;
}

export interface Assessment {
  id: string;
  childId: string;
  status: string;
  tier1CompletedAt: string | null;
  tier2CompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  child?: { id: string; name: string };
  flaggedDomains?: string[];
}

export interface AssessmentReport {
  assessmentId: string;
  summary: string;
  domainScores: Array<{ domain: string; score: number; level: string; description: string }>;
  recommendations: string[];
  flaggedAreas: string[];
}
