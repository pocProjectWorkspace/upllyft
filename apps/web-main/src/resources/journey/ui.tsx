'use client';

import { memo, type ReactNode } from 'react';
import {
  JOURNEY_DOMAINS,
  JOURNEY_DOMAIN_COLORS,
  HELP_COLORS,
  HELP_LABELS,
  type JourneyDomain,
  type JourneyItemStatus,
} from '@upllyft/types';

export const DOMAINS = JOURNEY_DOMAINS;

export function domainLabel(key: string | null | undefined) {
  return JOURNEY_DOMAINS.find((d) => d.key === key)?.label ?? 'Other';
}

export function domainColor(key: string | null | undefined) {
  return JOURNEY_DOMAIN_COLORS[key as JourneyDomain] ?? { color: '#64748b', ink: '#475569' };
}

export const STATUS_STYLE: Record<JourneyItemStatus, { bg: string; fg: string }> = {
  'To try': { bg: '#f3f4f6', fg: '#4b5563' },
  Practising: { bg: '#eff6ff', fg: '#1d4ed8' },
  'Getting there': { bg: '#fffbeb', fg: '#b45309' },
  Mastered: { bg: '#ecfdf5', fg: '#047857' },
};

export const LEVEL_STYLE = {
  focus: { label: 'Focus area', bg: '#fff7ed', fg: '#c2410c' },
  watch: { label: 'Keep an eye', bg: '#fefce8', fg: '#a16207' },
  ontrack: { label: 'On track', bg: '#ecfdf5', fg: '#047857' },
} as const;

export function DomainBadge({ domain }: { domain: string | null | undefined }) {
  if (!domain) return null;
  const c = domainColor(domain);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ background: `${c.color}14`, color: c.ink }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />
      {domainLabel(domain)}
    </span>
  );
}

export function StatusPill({ status }: { status: JourneyItemStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap" style={{ background: s.bg, color: s.fg }}>
      {status}
    </span>
  );
}

/** One square per try, coloured by how much help was needed. */
export const HelpSquares = memo(function HelpSquares({ logs, max = 12 }: { logs: Array<{ help: number; date: string }>; max?: number }) {
  if (!logs.length) return null;
  const shown = logs.slice(-max);
  return (
    <div className="flex items-center gap-1" aria-label={`${logs.length} tries`}>
      {shown.map((l, i) => (
        <span
          key={i}
          title={`${new Date(l.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${HELP_LABELS[l.help]}`}
          className="h-3.5 w-3.5 rounded-[4px]"
          style={{ background: HELP_COLORS[l.help] }}
        />
      ))}
      {logs.length > max && <span className="ml-1 text-[11px] text-gray-400">+{logs.length - max}</span>}
    </div>
  );
});

export function HelpLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
      <span>Each square is one try:</span>
      {HELP_LABELS.map((label, i) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px]" style={{ background: HELP_COLORS[i] }} />
          {label}
        </span>
      ))}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-200 hover:border-teal-300 hover:bg-teal-50'
      }`}
    >
      {children}
      {count != null && (
        <span className={`rounded-full px-1.5 text-[11px] ${active ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
      )}
    </button>
  );
}

export function formatDay(date: string | Date) {
  const d = new Date(date);
  const today = new Date();
  const diff = Math.round((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 864e5);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ageText(dateOfBirth: string | null | undefined) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  if (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) age--;
  return age;
}
