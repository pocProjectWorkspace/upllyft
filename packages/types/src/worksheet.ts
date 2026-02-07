export enum WorksheetType {
  ACTIVITY = 'ACTIVITY',
  VISUAL_SUPPORT = 'VISUAL_SUPPORT',
  STRUCTURED_PLAN = 'STRUCTURED_PLAN',
}

export enum WorksheetStatus {
  DRAFT = 'DRAFT',
  GENERATING = 'GENERATING',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum WorksheetDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export interface Worksheet {
  id: string;
  title: string;
  type: WorksheetType;
  subType?: string;
  status: WorksheetStatus;
  difficulty: WorksheetDifficulty;
  content: Record<string, unknown>;
  pdfUrl?: string;
  childId: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}
