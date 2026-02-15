export enum Domain {
  MOTOR = 'MOTOR',
  LANGUAGE = 'LANGUAGE',
  SOCIAL = 'SOCIAL',
  COGNITIVE = 'COGNITIVE',
  ADAPTIVE = 'ADAPTIVE',
  SENSORY = 'SENSORY',
}

export enum AssessmentStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  TIER2_REQUIRED = 'TIER2_REQUIRED',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
}

export type DomainStatusType = 'ON_TRACK' | 'MONITOR' | 'CONCERN';

export interface DomainScore {
  domain: Domain;
  score: number;
  maxScore: number;
  percentile: number;
  status: DomainStatusType;
}

export interface Assessment {
  id: string;
  childId: string;
  type: string;
  status: AssessmentStatus;
  score?: number;
  completedAt?: string;
  createdAt: string;
}

export interface AssessmentResult {
  assessmentId: string;
  domains: DomainScore[];
  overallScore: number;
  recommendations: string[];
}

export interface QuestionOption {
  id: string;
  text: string;
  value: number;
}

export interface Question {
  id: string;
  text: string;
  domain: Domain;
  ageRange: string;
  options: QuestionOption[];
}
