export const caseStatusColors: Record<string, string> = {
  INTAKE: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  ON_HOLD: 'bg-yellow-100 text-yellow-800',
  DISCHARGED: 'bg-gray-100 text-gray-800',
  CLOSED: 'bg-gray-100 text-gray-600',
};

export const caseStatusLabels: Record<string, string> = {
  INTAKE: 'Intake',
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  DISCHARGED: 'Discharged',
  CLOSED: 'Closed',
};

export const iepStatusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  ACTIVE: 'bg-blue-100 text-blue-800',
  ARCHIVED: 'bg-gray-100 text-gray-600',
};

export const iepStatusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  ACTIVE: 'Active',
  ARCHIVED: 'Archived',
};

export const sessionAttendanceColors: Record<string, string> = {
  PRESENT: 'bg-green-100 text-green-800',
  ABSENT: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
  LATE: 'bg-yellow-100 text-yellow-800',
};

export const billingStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
  DENIED: 'bg-red-100 text-red-800',
};

export const consentTypeLabels: Record<string, string> = {
  TREATMENT: 'Treatment',
  SHARING: 'Information Sharing',
  ASSESSMENT: 'Assessment',
  RECORDING: 'Recording',
  RESEARCH: 'Research',
};

export const documentTypeLabels: Record<string, string> = {
  PROGRESS_NOTE: 'Progress Note',
  ASSESSMENT: 'Assessment',
  IEP_DOCUMENT: 'IEP Document',
  CONSENT_FORM: 'Consent Form',
  REFERRAL: 'Referral',
  DISCHARGE_SUMMARY: 'Discharge Summary',
  OTHER: 'Other',
};

export const auditActionColors: Record<string, string> = {
  CASE_CREATED: 'bg-green-100 text-green-800',
  STATUS_CHANGED: 'bg-blue-100 text-blue-800',
  NOTE_ADDED: 'bg-teal-100 text-teal-800',
  SESSION_ADDED: 'bg-purple-100 text-purple-800',
  DOCUMENT_UPLOADED: 'bg-indigo-100 text-indigo-800',
  IEP_UPDATED: 'bg-orange-100 text-orange-800',
  CONSENT_UPDATED: 'bg-pink-100 text-pink-800',
  BILLING_UPDATED: 'bg-amber-100 text-amber-800',
  TEAM_CHANGED: 'bg-cyan-100 text-cyan-800',
};

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
