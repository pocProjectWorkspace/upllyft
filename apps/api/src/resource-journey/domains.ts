/**
 * The 8 development areas of the Resources journey.
 *
 * MIRRORED in packages/types/src/resource-journey.ts (the API cannot import
 * @upllyft/types). scripts/check-journey-domain-parity.mjs fails type-check when the
 * two copies drift — change one, change the other.
 *
 * Screening's `visionHearing` deliberately maps to no area: it is medical, and no home
 * activity addresses it. `behav` has no screening or worksheet counterpart; resources
 * reach it only through their own tags.
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

export const DOMAIN_KEYS: readonly JourneyDomain[] = JOURNEY_DOMAINS.map((d) => d.key);

export function isJourneyDomain(value: unknown): value is JourneyDomain {
  return typeof value === 'string' && (DOMAIN_KEYS as readonly string[]).includes(value);
}

/** Worksheet `targetDomains` value → journey area (null when it has none). */
export function domainFromWorksheet(value: string): JourneyDomain | null {
  return JOURNEY_DOMAINS.find((d) => d.worksheet === value)?.key ?? null;
}

/** Journey area → worksheet `targetDomains` value (null for sensory / behaviour). */
export function worksheetDomainFor(key: JourneyDomain): string | null {
  return JOURNEY_DOMAINS.find((d) => d.key === key)?.worksheet ?? null;
}

/** Screening domain id → journey area (null for visionHearing and unknown ids). */
export function domainFromScreening(value: string): JourneyDomain | null {
  return JOURNEY_DOMAINS.find((d) => d.screening === value)?.key ?? null;
}

export function domainLabel(key: string): string {
  return JOURNEY_DOMAINS.find((d) => d.key === key)?.label ?? key;
}

/** Keeps only valid area keys, de-duplicated, in the canonical order. */
export function parseDomains(value: unknown): JourneyDomain[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];
  const wanted = new Set(raw.map((v) => String(v).trim()));
  return DOMAIN_KEYS.filter((k) => wanted.has(k));
}
