/**
 * Resources journey constants for the app.
 *
 * MIRROR of packages/types/src/resource-journey.ts (the mobile app does not depend on
 * @upllyft/types). apps/api/scripts/check-journey-domain-parity.mjs fails type-check
 * if the JOURNEY_DOMAINS arrays drift.
 */
export const JOURNEY_DOMAINS = [
  { key: 'comm', label: 'Communication', worksheet: 'COMMUNICATION', screening: 'speechLanguage' },
  { key: 'social', label: 'Social-emotional', worksheet: 'SOCIAL_EMOTIONAL', screening: 'socialEmotional' },
  { key: 'daily', label: 'Daily living', worksheet: 'SELF_CARE', screening: 'adaptiveSelfCare' },
  { key: 'fine', label: 'Fine motor', worksheet: 'FINE_MOTOR', screening: 'fineMotor' },
  { key: 'gross', label: 'Gross motor', worksheet: 'GROSS_MOTOR', screening: 'grossMotor' },
  { key: 'learn', label: 'Learning', worksheet: 'COGNITIVE', screening: 'cognitiveLearning' },
  { key: 'sensory', label: 'Sensory', worksheet: null, screening: 'sensoryProcessing' },
  { key: 'behav', label: 'Behaviour', worksheet: null, screening: null },
] as const;

export type JourneyDomain = (typeof JOURNEY_DOMAINS)[number]['key'];

export const JOURNEY_DOMAIN_COLORS: Record<JourneyDomain, string> = {
  comm: '#7c3aed',
  social: '#2563eb',
  daily: '#059669',
  fine: '#0891b2',
  gross: '#0d9488',
  learn: '#d97706',
  sensory: '#db2777',
  behav: '#ea580c',
};

export type JourneyItemStatus = 'To try' | 'Practising' | 'Getting there' | 'Mastered';

export const STATUS_COLORS: Record<JourneyItemStatus, { bg: string; fg: string }> = {
  'To try': { bg: '#f3f4f6', fg: '#4b5563' },
  Practising: { bg: '#eff6ff', fg: '#1d4ed8' },
  'Getting there': { bg: '#fffbeb', fg: '#b45309' },
  Mastered: { bg: '#ecfdf5', fg: '#047857' },
};

export const HELP_LABELS = ['Full help', 'Some help', 'Did it alone'] as const;
export const ENGAGEMENT_LABELS = ['Resisted', 'Okay', 'Enjoyed it'] as const;
export const HELP_COLORS = ['#fcd34d', '#5eead4', '#0f766e'] as const;

export function domainLabel(key: string | null | undefined): string {
  return JOURNEY_DOMAINS.find((d) => d.key === key)?.label ?? 'Other';
}

export function domainColor(key: string | null | undefined): string {
  return JOURNEY_DOMAIN_COLORS[key as JourneyDomain] ?? '#64748b';
}
