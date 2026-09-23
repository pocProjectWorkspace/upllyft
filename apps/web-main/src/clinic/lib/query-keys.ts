/**
 * TanStack Query keys for the clinic section (PERFORMANCE_AUDIT.md item #28).
 * Every clinic query hangs off the `['clinic']` root so a single
 * `invalidateQueries({ queryKey: clinicKeys.all })` refreshes the section.
 */
export const clinicKeys = {
  all: ['clinic'] as const,
  dashboardSummary: () => [...clinicKeys.all, 'dashboard', 'summary'] as const,
  todaySessions: () => [...clinicKeys.all, 'dashboard', 'today-sessions'] as const,
  clinic: () => [...clinicKeys.all, 'clinic'] as const,
  therapistOptions: () => [...clinicKeys.all, 'therapists', 'options'] as const,
  therapistDirectory: (params: unknown) =>
    [...clinicKeys.all, 'therapists', 'directory', params] as const,
  therapistDetail: (id: string) => [...clinicKeys.all, 'therapists', id] as const,
  therapistSchedule: (id: string, range: unknown) =>
    [...clinicKeys.all, 'therapists', id, 'schedule', range] as const,
  therapistSessionTypes: (userId: string) =>
    [...clinicKeys.all, 'therapists', 'session-types', userId] as const,
  therapistCredentials: (id: string) =>
    [...clinicKeys.all, 'therapists', id, 'credentials'] as const,
  consolidatedSchedule: (params: unknown) =>
    [...clinicKeys.all, 'schedule', params] as const,
  patients: (params: unknown) => [...clinicKeys.all, 'patients', params] as const,
  patientDetail: (id: string) => [...clinicKeys.all, 'patients', id] as const,
  patientOutcome: (id: string) => [...clinicKeys.all, 'patients', id, 'outcome'] as const,
  tracking: (date: string) => [...clinicKeys.all, 'tracking', date] as const,
  clinicRevenue: (period: string) => [...clinicKeys.all, 'revenue', period] as const,
  therapistRevenue: (id: string, period: string) =>
    [...clinicKeys.all, 'revenue', 'therapist', id, period] as const,
  outcomeSummary: () => [...clinicKeys.all, 'outcomes', 'summary'] as const,
  goalProgress: () => [...clinicKeys.all, 'outcomes', 'goals'] as const,
  screeningTrends: () => [...clinicKeys.all, 'outcomes', 'screening'] as const,
  patientOutcomes: (params: unknown) => [...clinicKeys.all, 'outcomes', 'patients', params] as const,
};
