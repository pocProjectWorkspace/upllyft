/**
 * The 8 development areas of the Resources journey — shared by web, mobile and Mira.
 *
 * MIRROR of apps/api/src/resource-journey/domains.ts. Keep the JOURNEY_DOMAINS array
 * identical; apps/api/scripts/check-journey-domain-parity.mjs fails type-check otherwise.
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

/** Card / chip colours from the design (accent, darker ink). */
export const JOURNEY_DOMAIN_COLORS: Record<JourneyDomain, { color: string; ink: string }> = {
  comm: { color: '#7c3aed', ink: '#6d28d9' },
  social: { color: '#2563eb', ink: '#1d4ed8' },
  daily: { color: '#059669', ink: '#047857' },
  fine: { color: '#0891b2', ink: '#0e7490' },
  gross: { color: '#0d9488', ink: '#0f766e' },
  learn: { color: '#d97706', ink: '#b45309' },
  sensory: { color: '#db2777', ink: '#be185d' },
  behav: { color: '#ea580c', ink: '#c2410c' },
};

export type JourneyItemStatus = 'To try' | 'Practising' | 'Getting there' | 'Mastered';

/** 0 full help · 1 some help · 2 did it alone */
export const HELP_LABELS = ['Full help', 'Some help', 'Did it alone'] as const;
/** 0 resisted · 1 okay · 2 enjoyed it */
export const ENGAGEMENT_LABELS = ['Resisted', 'Okay', 'Enjoyed it'] as const;
export const HELP_COLORS = ['#fcd34d', '#5eead4', '#0f766e'] as const;
