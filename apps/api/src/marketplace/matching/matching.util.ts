/**
 * Discovery matching — DELIBERATELY SIMPLE, per the design handoff.
 *
 * We match on discipline ↔ flagged category only. No per-factor scoring, no numeric
 * percentages, no "X of 10 factors" — a granular model would be fragile, opaque and
 * impossible to defend to an anxious parent. A provider is a "strong" fit when their
 * discipline addresses one of the child's flagged screening domains; everything else is
 * "also relevant" (neutral). Self-reported concerns produce "likely" — a softer tier
 * whose copy must say "often helps with…", never "matches".
 */

export type Discipline =
  | 'speech'
  | 'ot'
  | 'psych'
  | 'behaviour'
  | 'physio'
  | 'special_ed'
  | 'unknown';

export type MatchTier = 'strong' | 'likely' | 'also' | 'none';

export interface MatchResult {
  tier: MatchTier;
  /** One plain-language line, or null. The card shows exactly this — nothing cleverer. */
  reason: string | null;
}

/** Parent-friendly concern picker ids — "Talking & understanding", not "expressive language". */
export const CONCERNS = ['talking', 'sounds', 'feelings', 'moving', 'notsure'] as const;
export type Concern = (typeof CONCERNS)[number];

const CONCERN_LABELS: Record<Concern, string> = {
  talking: 'talking & understanding',
  sounds: 'sounds & textures',
  feelings: 'big feelings',
  moving: 'moving & coordination',
  notsure: 'a range of early concerns',
};

const CONCERN_DISCIPLINES: Record<Concern, Discipline[]> = {
  talking: ['speech', 'psych'],
  sounds: ['ot'],
  feelings: ['psych', 'behaviour'],
  moving: ['ot', 'physio'],
  notsure: ['speech', 'ot', 'psych', 'behaviour'],
};

/** Screening domain (8-domain vocabulary) → disciplines that squarely address it. */
const DOMAIN_DISCIPLINES: Record<string, Discipline[]> = {
  speechLanguage: ['speech'],
  socialEmotional: ['psych', 'behaviour'],
  sensoryProcessing: ['ot'],
  grossMotor: ['ot', 'physio'],
  fineMotor: ['ot'],
  adaptiveSelfCare: ['ot'],
  cognitiveLearning: ['psych', 'special_ed'],
  visionHearing: [], // medical — no marketplace discipline addresses it
};

const DOMAIN_NEED_LABELS: Record<string, string> = {
  speechLanguage: 'speech & language',
  socialEmotional: 'social-emotional',
  sensoryProcessing: 'sensory',
  grossMotor: 'motor',
  fineMotor: 'fine-motor',
  adaptiveSelfCare: 'self-care',
  cognitiveLearning: 'learning',
  visionHearing: 'vision & hearing',
};

const DISCIPLINE_LABELS: Record<Discipline, string> = {
  speech: 'Speech therapist',
  ot: 'Occupational therapist',
  psych: 'Child psychologist',
  behaviour: 'Behaviour analyst',
  physio: 'Physical therapist',
  special_ed: 'Special educator',
  unknown: 'Therapist',
};

/**
 * Titles and specializations are free-form strings, so discipline is inferred from
 * keywords. Order matters only as tie-break: the first rule to match wins.
 */
const DISCIPLINE_RULES: Array<[Discipline, RegExp]> = [
  ['speech', /speech|slp|language (therap|path|develop)|aac\b|articulat|augmentative/i],
  ['ot', /occupational|sensory integration|fine motor|daily living/i],
  ['behaviour', /behavio(u)?r analy|\baba\b|applied behavio|bcba|bcaba|verbal behavior/i],
  ['psych', /psycholog/i],
  ['physio', /physical therap|physiotherap|gross motor/i],
  ['special_ed', /special education|special educator/i],
];

export function classifyDiscipline(title?: string | null, specializations?: string[]): Discipline {
  // The title states what the professional IS ("Clinical Psychologist"); specializations
  // list what they DO (which may include ABA etc.) — so the title wins when it matches.
  for (const source of [title ?? '', (specializations ?? []).join(' | ')]) {
    for (const [discipline, rule] of DISCIPLINE_RULES) {
      if (rule.test(source)) return discipline;
    }
  }
  return 'unknown';
}

/** Every discipline a clinic's specialization list covers (a clinic spans several). */
export function classifyClinicDisciplines(specializations?: string[]): Discipline[] {
  const found = new Set<Discipline>();
  for (const spec of specializations ?? []) {
    const d = classifyDiscipline(spec);
    if (d !== 'unknown') found.add(d);
  }
  return [...found];
}

export interface ChildNeeds {
  source: 'screening' | 'self_reported' | 'none';
  childName: string | null;
  flaggedDomains: string[];
  concern: Concern | null;
}

export function matchTherapist(
  discipline: Discipline,
  needs: ChildNeeds,
): MatchResult {
  if (needs.source === 'screening') {
    const covered = needs.flaggedDomains.filter((d) =>
      (DOMAIN_DISCIPLINES[d] ?? []).includes(discipline),
    );
    if (covered.length > 0) {
      const who = needs.childName ? `${needs.childName}'s` : 'your child’s';
      return {
        tier: 'strong',
        reason: `${DISCIPLINE_LABELS[discipline]} — matches ${who} flagged ${DOMAIN_NEED_LABELS[covered[0]]} need.`,
      };
    }
    return { tier: 'also', reason: null };
  }

  if (needs.source === 'self_reported' && needs.concern) {
    if (CONCERN_DISCIPLINES[needs.concern].includes(discipline)) {
      return {
        tier: 'likely',
        reason: `${DISCIPLINE_LABELS[discipline]}s often help with ${CONCERN_LABELS[needs.concern]}.`,
      };
    }
    return { tier: 'none', reason: null };
  }

  return { tier: 'none', reason: null }; // pure browse — sorted by rating, no badges
}

export function matchClinic(disciplines: Discipline[], needs: ChildNeeds): MatchResult {
  if (needs.source === 'screening') {
    const covered = needs.flaggedDomains.filter((domain) =>
      (DOMAIN_DISCIPLINES[domain] ?? []).some((d) => disciplines.includes(d)),
    );
    if (covered.length > 0) {
      const who = needs.childName ? `${needs.childName}'s` : 'your child’s';
      const all = covered.length === needs.flaggedDomains.length && covered.length > 1;
      return {
        tier: 'strong',
        reason: all
          ? `Covers all of ${who} flagged needs under one roof.`
          : `Team matches ${who} flagged ${DOMAIN_NEED_LABELS[covered[0]]} need.`,
      };
    }
    return { tier: 'also', reason: null };
  }

  if (needs.source === 'self_reported' && needs.concern) {
    if (CONCERN_DISCIPLINES[needs.concern].some((d) => disciplines.includes(d))) {
      return {
        tier: 'likely',
        reason: `Multi-disciplinary clinics often help with ${CONCERN_LABELS[needs.concern]}.`,
      };
    }
    return { tier: 'none', reason: null };
  }

  return { tier: 'none', reason: null };
}

const TIER_ORDER: Record<MatchTier, number> = { strong: 0, likely: 1, also: 2, none: 3 };

export function tierRank(tier: MatchTier): number {
  return TIER_ORDER[tier];
}
