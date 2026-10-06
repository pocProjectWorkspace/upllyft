/**
 * Pure rules of the Resources journey — no Prisma, no Nest — so they are unit-tested
 * directly (journey.logic.spec.ts).
 */
import { DOMAIN_KEYS, JourneyDomain, domainFromScreening, domainFromWorksheet } from './domains';

export type ItemStatus = 'To try' | 'Practising' | 'Getting there' | 'Mastered';
export type ScreeningLevel = 'focus' | 'watch' | 'ontrack';

/** help: 0 full help · 1 some help · 2 did it alone */
export interface LogLike {
  date: Date;
  help: number;
  engagement: number;
}

/**
 * Mastered override wins; else no logs → To try; ≥3 "did it alone" → Mastered;
 * ≥2 logs with the latest needing at most some help → Getting there; else Practising.
 * `logs` may be in any order.
 */
export function itemStatus(logs: LogLike[], masteredOverride?: boolean | null): ItemStatus {
  if (masteredOverride === true) return 'Mastered';
  if (!logs.length) return 'To try';
  if (logs.filter((l) => l.help === 2).length >= 3 && masteredOverride !== false) return 'Mastered';
  const latest = [...logs].sort((a, b) => b.date.getTime() - a.date.getTime())[0];
  if (logs.length >= 2 && latest.help >= 1) return 'Getting there';
  return 'Practising';
}

/** Whole years between a birth date and `today`. */
export function ageInYears(dateOfBirth: Date | null | undefined, today = new Date()): number | null {
  if (!dateOfBirth) return null;
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const m = today.getMonth() - dateOfBirth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dateOfBirth.getDate())) age--;
  return age;
}

/** Unknown bounds never exclude; an unknown age never excludes. */
export function fitsAge(age: number | null, min?: number | null, max?: number | null): boolean {
  if (age === null) return true;
  if (min != null && age < min) return false;
  if (max != null && age > max) return false;
  return true;
}

/**
 * Per-area screening levels from an assessment's `domainScores` (object keyed by domain
 * id, or an array — read defensively) and `flaggedDomains`. RED → focus, YELLOW →
 * watch, GREEN → on track. Flagged areas with no score count as focus.
 */
export function screeningLevels(
  domainScores: unknown,
  flaggedDomains: string[],
): Partial<Record<JourneyDomain, ScreeningLevel>> {
  const out: Partial<Record<JourneyDomain, ScreeningLevel>> = {};
  const entries: any[] = Array.isArray(domainScores)
    ? domainScores
    : domainScores && typeof domainScores === 'object'
      ? Object.entries(domainScores as Record<string, any>).map(([k, v]) => ({ domainId: k, ...(v ?? {}) }))
      : [];
  for (const e of entries) {
    const area = domainFromScreening(String(e?.domainId ?? e?.domain ?? e?.id ?? ''));
    if (!area) continue;
    const status = String(e?.status ?? e?.zone ?? '').toUpperCase();
    if (status === 'RED') out[area] = 'focus';
    else if (status === 'YELLOW') out[area] = out[area] === 'focus' ? 'focus' : 'watch';
    else if (status === 'GREEN' && !out[area]) out[area] = 'ontrack';
  }
  for (const d of flaggedDomains) {
    const area = domainFromScreening(d);
    if (area && out[area] !== 'focus' && out[area] !== 'watch') out[area] = 'focus';
  }
  return out;
}

/** Areas the screening asks parents to work on (focus first, then watch). */
export function concernAreas(levels: Partial<Record<JourneyDomain, ScreeningLevel>>): JourneyDomain[] {
  return [
    ...DOMAIN_KEYS.filter((k) => levels[k] === 'focus'),
    ...DOMAIN_KEYS.filter((k) => levels[k] === 'watch'),
  ];
}

/** Plain-language "what the screening found" line per area, for the screening card. */
export const CONCERN_TEXT: Record<JourneyDomain, string> = {
  comm: 'Talking, understanding and asking for things could use extra support',
  social: 'Playing, sharing and naming feelings with others is still developing',
  daily: 'Daily routines like dressing, eating and tidying need step-by-step support',
  fine: 'Small hand movements like gripping, drawing and cutting need practice',
  gross: 'Balance, jumping and coordination could use extra practice',
  learn: 'Early learning skills like matching, counting and problem-solving need support',
  sensory: 'Strong reactions to sounds, textures or busy places',
  behav: 'Big reactions when routines change or things feel hard',
};

/** Worksheet `targetDomains` → journey areas (unknown values dropped). */
export function worksheetAreas(targetDomains: string[]): JourneyDomain[] {
  const set = new Set<JourneyDomain>();
  for (const v of targetDomains) {
    // Older worksheets store the worksheet vocabulary; newer ones may store journey keys.
    const area = domainFromWorksheet(v) ?? ((DOMAIN_KEYS as readonly string[]).includes(v) ? (v as JourneyDomain) : null);
    if (area) set.add(area);
  }
  return DOMAIN_KEYS.filter((k) => set.has(k));
}

/** The design's five card types. */
export type CardType = 'Guide' | 'Worksheet' | 'Video' | 'Social story' | 'Printable';

export function libraryCardType(resourceType: string, tags: string[] = []): CardType {
  if (tags.some((t) => /social[\s-]?story/i.test(t))) return 'Social story';
  switch (resourceType) {
    case 'WORKSHEET':
      return 'Worksheet';
    case 'VIDEO':
      return 'Video';
    case 'TEMPLATE':
      return 'Printable';
    default:
      return 'Guide';
  }
}

export function worksheetCardType(subType: string): CardType {
  if (subType === 'social_story') return 'Social story';
  return 'Worksheet';
}

/** Legacy WorksheetCompletion.helpLevel → journey help (matches the migration backfill). */
export function helpFromLegacy(helpLevel?: string | null): number {
  switch (helpLevel) {
    case 'NONE':
      return 2;
    case 'SIGNIFICANT':
      return 0;
    default:
      return 1;
  }
}

/** Legacy 1–5 engagement rating → journey engagement (matches the migration backfill). */
export function engagementFromLegacy(rating?: number | null): number {
  if (rating == null) return 1;
  if (rating <= 2) return 0;
  if (rating === 3) return 1;
  return 2;
}

const DAY = 864e5;

/** Monday 00:00 UTC of the week containing `d`. */
function weekStart(d: Date): number {
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const dow = (new Date(t).getUTCDay() + 6) % 7;
  return t - dow * DAY;
}

/**
 * Independence per area per week over the last `weeks` weeks: the best help level
 * logged that week (null = nothing logged). Oldest week first.
 */
export function weeklyIndependence(
  logs: Array<LogLike & { domain: JourneyDomain | null }>,
  today = new Date(),
  weeks = 8,
): Array<{ domain: JourneyDomain; weeks: Array<number | null> }> {
  const thisWeek = weekStart(today);
  const first = thisWeek - (weeks - 1) * 7 * DAY;
  const grid = new Map<JourneyDomain, Array<number | null>>();
  for (const l of logs) {
    if (!l.domain) continue;
    const w = weekStart(l.date);
    if (w < first || w > thisWeek) continue;
    const i = Math.round((w - first) / (7 * DAY));
    const row = grid.get(l.domain) ?? Array<number | null>(weeks).fill(null);
    row[i] = Math.max(row[i] ?? -1, l.help);
    grid.set(l.domain, row);
  }
  return DOMAIN_KEYS.filter((k) => grid.has(k)).map((k) => ({ domain: k, weeks: grid.get(k)! }));
}

/** Calendar-day difference used to bound share periods and stats windows. */
export function daysAgo(days: number, today = new Date()): Date {
  return new Date(today.getTime() - days * DAY);
}
