// Canonical discipline metadata (colors from the design `discMeta` in Sessions.dc.html).
import type { TherapyDiscipline } from '@/lib/api/care-plans';

export interface DisciplineMeta {
  key: TherapyDiscipline;
  label: string;
  short: string;
  color: string; // accent / text
  bg: string; // tint background
}

export const DISCIPLINES: DisciplineMeta[] = [
  { key: 'SPEECH', label: 'Speech & Language', short: 'Speech', color: '#0EA48B', bg: '#EAF7F2' },
  { key: 'OCCUPATIONAL', label: 'Occupational Therapy', short: 'OT', color: '#E0912E', bg: '#FCF1E0' },
  { key: 'PSYCHOLOGY', label: 'Psychology', short: 'Psychology', color: '#7C5CE0', bg: '#F1ECFB' },
  { key: 'BEHAVIOUR_ABA', label: 'Behaviour (ABA)', short: 'Behaviour', color: '#C0653B', bg: '#FBEEE7' },
  { key: 'SPECIAL_EDUCATION', label: 'Special Education', short: 'Special Ed', color: '#2E86C1', bg: '#EAF3FB' },
  { key: 'PHYSIOTHERAPY', label: 'Physiotherapy', short: 'Physio', color: '#C9498C', bg: '#FBEAF3' },
  { key: 'MEDICAL', label: 'Medical', short: 'Medical', color: '#64748B', bg: '#F1F5F9' },
  { key: 'MULTIDISCIPLINARY', label: 'Multidisciplinary', short: 'MDT', color: '#0EA48B', bg: '#EAF7F2' },
  { key: 'UNIVERSAL', label: 'Universal', short: 'Universal', color: '#64748B', bg: '#F1F5F9' },
];

const BY_KEY = Object.fromEntries(DISCIPLINES.map((d) => [d.key, d])) as Record<
  TherapyDiscipline,
  DisciplineMeta
>;

const FALLBACK: DisciplineMeta = {
  key: 'UNIVERSAL',
  label: 'Universal',
  short: 'Universal',
  color: '#64748B',
  bg: '#F1F5F9',
};

export function disciplineMeta(key?: TherapyDiscipline | null): DisciplineMeta {
  if (!key) return FALLBACK;
  return BY_KEY[key] ?? FALLBACK;
}

export const WEEKDAYS: { num: number; label: string; short: string }[] = [
  { num: 1, label: 'Monday', short: 'Mon' },
  { num: 2, label: 'Tuesday', short: 'Tue' },
  { num: 3, label: 'Wednesday', short: 'Wed' },
  { num: 4, label: 'Thursday', short: 'Thu' },
  { num: 5, label: 'Friday', short: 'Fri' },
  { num: 6, label: 'Saturday', short: 'Sat' },
];

export function weekdayLabels(days: number[]): string {
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((n) => WEEKDAYS.find((w) => w.num === n)?.short ?? '')
    .filter(Boolean)
    .join(', ');
}
