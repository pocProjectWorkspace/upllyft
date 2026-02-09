import type {
  WorksheetType,
  WorksheetStatus,
  WorksheetDifficulty,
  WorksheetDataSource,
  WorksheetAssignmentStatus,
  WorksheetColorMode,
  WorksheetFlagReason,
  WorksheetFlagStatus,
} from './api/worksheets';

export const worksheetTypeLabels: Record<WorksheetType, string> = {
  ACTIVITY: 'Activity Worksheet',
  VISUAL_SUPPORT: 'Visual Support',
  STRUCTURED_PLAN: 'Structured Plan',
  PROGRESS_TRACKER: 'Progress Tracker',
};

export const worksheetStatusLabels: Record<WorksheetStatus, string> = {
  DRAFT: 'Draft',
  GENERATING: 'Generating',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
  FLAGGED: 'Flagged',
};

export const worksheetStatusColors: Record<WorksheetStatus, string> = {
  DRAFT: 'gray',
  GENERATING: 'yellow',
  PUBLISHED: 'green',
  ARCHIVED: 'gray',
  FLAGGED: 'red',
};

export const difficultyLabels: Record<WorksheetDifficulty, string> = {
  FOUNDATIONAL: 'Foundational',
  DEVELOPING: 'Developing',
  STRENGTHENING: 'Strengthening',
};

export const difficultyColors: Record<WorksheetDifficulty, string> = {
  FOUNDATIONAL: 'green',
  DEVELOPING: 'blue',
  STRENGTHENING: 'purple',
};

export const dataSourceLabels: Record<WorksheetDataSource, string> = {
  MANUAL: 'Manual Input',
  SCREENING: 'Screening Results',
  UPLOADED_REPORT: 'Uploaded Report',
  IEP_GOALS: 'IEP Goals',
  SESSION_NOTES: 'Session Notes',
};

export const assignmentStatusLabels: Record<WorksheetAssignmentStatus, string> = {
  ASSIGNED: 'Assigned',
  VIEWED: 'Viewed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  OVERDUE: 'Overdue',
};

export const assignmentStatusColors: Record<WorksheetAssignmentStatus, string> = {
  ASSIGNED: 'blue',
  VIEWED: 'blue',
  IN_PROGRESS: 'yellow',
  COMPLETED: 'green',
  OVERDUE: 'red',
};

export const colorModeLabels: Record<WorksheetColorMode, string> = {
  FULL_COLOR: 'Full Color',
  GRAYSCALE: 'Grayscale',
  LINE_ART: 'Line Art',
};

export const flagReasonLabels: Record<WorksheetFlagReason, string> = {
  INAPPROPRIATE: 'Inappropriate Content',
  INACCURATE: 'Inaccurate Information',
  HARMFUL: 'Harmful Content',
  SPAM: 'Spam',
  OTHER: 'Other',
};

export const flagStatusLabels: Record<WorksheetFlagStatus, string> = {
  PENDING: 'Pending',
  REVIEWED: 'Reviewed',
  DISMISSED: 'Dismissed',
  ACTIONED: 'Actioned',
};

export const flagStatusColors: Record<WorksheetFlagStatus, string> = {
  PENDING: 'yellow',
  REVIEWED: 'blue',
  DISMISSED: 'gray',
  ACTIONED: 'red',
};

export const domainLabels: Record<string, string> = {
  COMMUNICATION: 'Communication',
  SOCIAL_EMOTIONAL: 'Social-Emotional',
  FINE_MOTOR: 'Fine Motor',
  GROSS_MOTOR: 'Gross Motor',
  COGNITIVE: 'Cognitive',
  SELF_CARE: 'Self-Care',
};

export const subTypeLabels: Record<string, string> = {
  visual_schedule: 'Visual Schedule',
  social_story: 'Social Story',
  emotion_thermometer: 'Emotion Thermometer',
  weekly_plan: 'Weekly Plan',
  daily_routine: 'Daily Routine',
  matching: 'Matching',
  sorting: 'Sorting',
  tracing: 'Tracing',
  coloring: 'Coloring',
  sequencing: 'Sequencing',
  fill_in: 'Fill in the Blank',
  cut_paste: 'Cut & Paste',
};

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatRelativeDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatShortDate(date);
}

export function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

export function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}
