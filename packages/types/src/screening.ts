export enum ScreeningDomain {
  COMMUNICATION = 'COMMUNICATION',
  GROSS_MOTOR = 'GROSS_MOTOR',
  FINE_MOTOR = 'FINE_MOTOR',
  PROBLEM_SOLVING = 'PROBLEM_SOLVING',
  PERSONAL_SOCIAL = 'PERSONAL_SOCIAL',
}

export enum ScreeningStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export interface ScreeningResult {
  domain: ScreeningDomain;
  score: number;
  maxScore: number;
  status: 'on_track' | 'monitor' | 'at_risk';
}

export interface Screening {
  id: string;
  childId: string;
  status: ScreeningStatus;
  results: ScreeningResult[];
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
