import type { MomentCategory, ProgressStatus, MiraInsightType } from '@/lib/api/moments';

/**
 * Visual language for the Moments surface — restrained, status-led, mirroring the
 * design handoff: teal = going well, amber = worth watching, blue = emerging,
 * violet = strategies, slate = calm/nothing needed.
 */

export const CATEGORY_META: Record<
  MomentCategory,
  { label: string; chip: string; card: string; tag: string }
> = {
  WENT_WELL: {
    label: 'Went well',
    chip: 'Something went well',
    card: 'bg-teal-50/60 border-teal-200',
    tag: 'bg-teal-50 text-teal-700',
  },
  DIFFICULT: {
    label: 'Difficult',
    chip: 'Something was difficult',
    card: 'bg-amber-50/60 border-amber-200',
    tag: 'bg-amber-50 text-amber-700',
  },
  CHANGED: {
    label: 'Changed',
    chip: 'Something changed',
    card: 'bg-violet-50/60 border-violet-200',
    tag: 'bg-violet-50 text-violet-700',
  },
  MILESTONE: {
    label: 'A first',
    chip: 'A first / milestone',
    card: 'bg-teal-50/60 border-teal-200',
    tag: 'bg-teal-100 text-teal-800',
  },
};

export const STATUS_META: Record<
  ProgressStatus,
  { label: string; blurb: string; dot: string; card: string; text: string; calm?: boolean; summary?: string }
> = {
  WATCH: {
    label: 'Something to watch',
    blurb: 'Patterns worth keeping an eye on',
    dot: 'bg-amber-500',
    card: 'bg-amber-50/60 border-amber-200',
    text: 'text-amber-800',
  },
  IMPROVING: {
    label: 'Improving',
    blurb: 'Getting steadier, and showing up in more places',
    dot: 'bg-teal-500',
    card: 'bg-teal-50/60 border-teal-200',
    text: 'text-teal-700',
  },
  EMERGING: {
    label: 'Emerging',
    blurb: 'New signs — early days',
    dot: 'bg-sky-500',
    card: 'bg-sky-50/60 border-sky-200',
    text: 'text-sky-700',
  },
  STEADY: {
    label: 'Steady',
    blurb: 'Holding where it is — nothing needed right now',
    dot: 'bg-slate-400',
    card: 'bg-slate-50 border-slate-200',
    text: 'text-slate-600',
    calm: true,
    summary: 'holding steady — nothing needed right now',
  },
  NOTHING_NEW: {
    label: 'Nothing new',
    blurb: 'Quiet since the last check',
    dot: 'bg-slate-300',
    card: 'bg-slate-50 border-slate-200',
    text: 'text-slate-500',
    calm: true,
    summary: 'quiet — nothing has come up recently',
  },
};

export const STATUS_ORDER: ProgressStatus[] = [
  'WATCH',
  'IMPROVING',
  'EMERGING',
  'STEADY',
  'NOTHING_NEW',
];

export const INSIGHT_TYPE_META: Record<
  MiraInsightType,
  { label: string; card: string; text: string }
> = {
  RECURRING_CHALLENGE: {
    label: 'Something worth watching',
    card: 'bg-amber-50/60 border-amber-200',
    text: 'text-amber-800',
  },
  EMERGING_PROGRESS: {
    label: 'Emerging progress',
    card: 'bg-teal-50/60 border-teal-200',
    text: 'text-teal-700',
  },
  STRATEGY_WORKS: {
    label: 'A strategy that keeps working',
    card: 'bg-violet-50/60 border-violet-200',
    text: 'text-violet-700',
  },
};

export const DOMAIN_LABELS: Record<string, string> = {
  grossMotor: 'Gross Motor',
  fineMotor: 'Fine Motor',
  speechLanguage: 'Speech & Language',
  socialEmotional: 'Social-Emotional',
  cognitiveLearning: 'Cognitive / Learning',
  adaptiveSelfCare: 'Adaptive / Self-Care',
  sensoryProcessing: 'Sensory Processing',
  visionHearing: 'Vision & Hearing',
};

/** "Today", "Yesterday", else "12 Aug". */
export function friendlyDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
