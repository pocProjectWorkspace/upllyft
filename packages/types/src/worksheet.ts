export enum WorksheetType {
  ACTIVITY = 'ACTIVITY',
  VISUAL_SUPPORT = 'VISUAL_SUPPORT',
  STRUCTURED_PLAN = 'STRUCTURED_PLAN',
  PROGRESS_TRACKER = 'PROGRESS_TRACKER',
}

export enum WorksheetStatus {
  DRAFT = 'DRAFT',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PUBLISHED = 'PUBLISHED',
}

export interface WorksheetSection {
  title: string;
  content: string;
  type?: string;
}

export interface WorksheetContent {
  sections: WorksheetSection[];
  instructions?: string;
}

export interface Worksheet {
  id: string;
  title: string;
  type: WorksheetType;
  subType?: string;
  status: WorksheetStatus;
  content: WorksheetContent;
  metadata: Record<string, unknown>;
  pdfUrl?: string;
  previewUrl?: string;
  createdById: string;
  childId?: string;
  caseId?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum WorksheetAssignmentStatus {
  ASSIGNED = 'ASSIGNED',
  VIEWED = 'VIEWED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
}

export interface WorksheetAssignment {
  id: string;
  worksheetId: string;
  assignedById: string;
  assignedToId: string;
  childId?: string;
  dueDate?: string;
  instructions?: string;
  status: WorksheetAssignmentStatus;
  completedAt?: string;
}
