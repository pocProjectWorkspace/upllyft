import { apiClient } from '@upllyft/api-client';

// Therapist bulk onboarding. `base` is `/admin/onboarding` (platform admins) or
// `/organizations/<slug>/onboarding` (organisation admins); both take the same calls.

export type TherapistOutcome = 'created' | 'linked' | 'exists' | 'would-create' | 'would-link' | 'error';

export interface TherapistRowReport {
  row: number;
  email: string | null;
  name: string | null;
  outcome: TherapistOutcome;
  message: string;
}

export interface TherapistImportResult {
  dryRun: boolean;
  total: number;
  created: number;
  linked: number;
  skipped: number;
  errors: number;
  /** Set-password emails this import sends, and over how many days (daily email cap). */
  emails: { emails: number; dailyLimit: number | null; alreadyQueued: number; days: number };
  rows: TherapistRowReport[];
}

export async function downloadTherapistTemplate(base: string, format: 'xlsx' | 'csv'): Promise<void> {
  const { data } = await apiClient.get(`${base}/therapists/template`, { params: { format }, responseType: 'blob' });
  const url = URL.createObjectURL(data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `upllyft-therapists-template.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importTherapists(base: string, file: File, dryRun: boolean): Promise<TherapistImportResult> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('dryRun', String(dryRun));
  // The client defaults to JSON, which makes axios serialise FormData to JSON and drop the
  // file; multipart lets the browser send the file with its own boundary.
  const { data } = await apiClient.post<TherapistImportResult>(`${base}/therapists/import`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
