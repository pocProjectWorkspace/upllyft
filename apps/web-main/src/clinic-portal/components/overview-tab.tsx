'use client';

import Link from 'next/link';
import type { Portal } from '../lib/api';
import { clinicColor, dateMed, dayLong, dayShort, relativeDay, time } from '../lib/format';
import type { PortalActions, PortalRow } from './clinic-portal';

interface Attention {
  key: string;
  dot: string;
  title: string;
  sub: string;
  cta: string;
  href?: string;
  onClick?: () => void;
}

export function OverviewTab({ data, rows, actions, now }: { data: Portal; rows: PortalRow[]; actions: PortalActions; now: Date }) {
  const name = data.child.firstName;
  const upcoming = rows.filter((r) => r.upcoming).sort((a, b) => +a.start - +b.start);
  const next = upcoming[0] ?? null;
  const byKey = new Map(data.clinics.map((c) => [c.key, c]));

  // "Needs your attention" — at most three, most actionable first.
  const attention: Attention[] = [];
  for (const c of data.clinics) {
    if (c.intake?.status === 'NOT_STARTED') {
      const other = data.clinics.find((o) => o.key !== c.key && o.intake && o.intake.status !== 'NOT_STARTED');
      attention.push({
        key: `intake-${c.key}`,
        dot: '#E0912E',
        title: `Complete ${c.short}’s intake form`,
        sub: [
          c.intake.due ? `Needed before ${dayShort(new Date(c.intake.due))}` : 'Needed before the first session',
          other ? `you can pre-fill it from what you shared with ${other.short}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
        cta: 'Start form',
        href: `/clinic-portal/intake/${c.intake.caseId}?child=${data.child.id}`,
      });
    }
  }
  for (const a of data.assessments.filter((x) => x.reportShared).slice(0, 1)) {
    const c = byKey.get(a.clinicKey);
    attention.push({
      key: `report-${a.id}`,
      dot: '#0EA48B',
      title: `Report: ${a.title}`,
      sub: `Shared${a.therapist ? ` by ${a.therapist}` : ''}${c ? ` · ${c.short}` : ''}`,
      cta: 'Read',
      onClick: () => actions.openDoc({ kind: 'report', id: a.id }),
    });
  }
  const fresh = data.activities.filter((a) => a.isNew);
  if (fresh.length) {
    const who = [...new Set(fresh.map((a) => a.therapist).filter(Boolean))] as string[];
    attention.push({
      key: 'activities',
      dot: '#3163D4',
      title: `${fresh.length} new home ${fresh.length === 1 ? 'activity' : 'activities'} to try`,
      sub: who.length ? `Shared by ${who.join(' and ')}` : 'Shared by your therapist',
      cta: 'View',
      onClick: () => actions.goTo('home'),
    });
  }
  for (const a of data.assessments.filter((x) => x.reportWithheld).slice(0, 1)) {
    const c = byKey.get(a.clinicKey);
    attention.push({
      key: `withheld-${a.id}`,
      dot: '#9AA4A1',
      title: `${c?.short ?? 'Your clinic'} has shared a report`,
      sub: 'Turn on “Share reports with me” for this clinic to read it',
      cta: 'Consent',
      onClick: () => actions.goTo('forms', a.clinicKey),
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-5">
        {next ? (
          <div className="rounded-2xl bg-gradient-to-br from-[#0FA58C] to-[#0A7766] p-6 text-white">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wide opacity-85">Next up · {relativeDay(next.start, now)}</span>
              <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold">{next.type}</span>
            </div>
            <div className="mt-2.5 text-2xl font-extrabold tracking-tight">{next.title}</div>
            <div className="mt-1 text-[15px] font-semibold">
              {dayLong(next.start)} · {time(next.start)} · {next.mins} min
            </div>
            <div className="mt-2 text-sm opacity-90">
              {[next.therapist, next.clinic.name, next.mode === 'online' ? 'Video call' : `In person${next.clinic.area ? ` · ${next.clinic.area}` : ''}`]
                .filter(Boolean)
                .join(' · ')}
            </div>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {next.canChange && (
                <>
                  <button onClick={() => actions.reschedule(next)} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#0B7E6B]">
                    Reschedule
                  </button>
                  <button onClick={() => actions.cancel(next)} className="rounded-xl border-[1.5px] border-white/55 px-4 py-2.5 text-sm font-bold text-white">
                    Cancel
                  </button>
                </>
              )}
              {next.locked && <LockNote row={next} variant="hero" />}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-500">No upcoming sessions right now.</div>
        )}

        {attention.length > 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4">
            <h2 className="text-base font-extrabold text-gray-900">Needs your attention</h2>
            <ul className="mt-2">
              {attention.slice(0, 3).map((a) => (
                <li key={a.key} className="flex items-center gap-3.5 border-t border-gray-100 py-3">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: a.dot }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-gray-900">{a.title}</div>
                    <div className="mt-0.5 text-xs text-gray-500">{a.sub}</div>
                  </div>
                  {a.href ? (
                    <Link href={a.href} className="shrink-0 rounded-lg border-[1.5px] border-[#D6E9E2] bg-[#F3FAF7] px-3.5 py-2 text-xs font-bold text-[#0B7E6B]">
                      {a.cta}
                    </Link>
                  ) : (
                    <button onClick={a.onClick} className="shrink-0 rounded-lg border-[1.5px] border-[#D6E9E2] bg-[#F3FAF7] px-3.5 py-2 text-xs font-bold text-[#0B7E6B]">
                      {a.cta}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <h2 className="text-base font-extrabold text-gray-900">{name}’s care {data.clinics.length === 1 ? 'team' : 'teams'}</h2>
        {data.clinics.map((c) => {
          const color = clinicColor(c.colorIndex);
          const n = upcoming.find((r) => r.clinicKey === c.key);
          const pct = c.plan && c.plan.total ? Math.round((c.plan.done / c.plan.total) * 100) : 0;
          return (
            <div key={c.key} className="rounded-2xl border border-gray-100 bg-white px-5 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold" style={{ background: color.bg, color: color.ink }}>
                  {c.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-extrabold text-gray-900">{c.name}</div>
                  {c.area && <div className="mt-0.5 text-xs font-medium text-gray-400">{c.area}</div>}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    c.source === 'clinic' ? 'bg-gray-100 text-gray-600' : 'bg-[#E8F6F1] text-[#0B7E6B]'
                  }`}
                >
                  {c.source === 'clinic' ? 'Via clinic' : 'Booked on Upllyft'}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{c.discipline ?? 'Therapist'}</div>
                  <div className="mt-0.5 text-sm font-bold text-gray-900">{c.therapist ?? '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Next</div>
                  <div className="mt-0.5 text-sm font-bold text-gray-900">{n ? `${dayShort(n.start)}, ${time(n.start)}` : 'Nothing booked'}</div>
                </div>
              </div>
              {c.plan ? (
                <div className="mt-4">
                  <div className="flex justify-between text-xs font-semibold text-gray-600">
                    <span>{c.plan.label}</span>
                    <span>
                      {c.plan.done} of {c.plan.total} sessions
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color.ink }} />
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl bg-gray-50 px-3 py-2.5 text-xs text-gray-500">Care plan will be shared after the first assessment.</div>
              )}
              <div className="mt-4 flex items-center gap-4 border-t border-gray-100 pt-3.5 text-[13px] font-bold">
                <button onClick={() => actions.goTo('sessions', c.key)} className="text-[#0B7E6B] hover:text-[#086353]">
                  View sessions
                </button>
                <button onClick={() => actions.goTo('forms', c.key)} className="text-[#0B7E6B] hover:text-[#086353]">
                  Forms &amp; consent
                </button>
                {c.phone && (
                  <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="ml-auto font-semibold text-gray-400">
                    {c.phone}
                  </a>
                )}
              </div>
              {c.intake?.status === 'REVIEWED' && c.intake.reviewedAt && (
                <div className="mt-2 text-[11px] text-gray-400">Intake reviewed {dateMed(c.intake.reviewedAt)}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Why the parent can't change this one online, and what to do instead. */
export function LockNote({ row, variant }: { row: PortalRow; variant: 'hero' | 'row' }) {
  const phone = row.clinic.phone;
  const text =
    row.lockReason === 'tele'
      ? `Online sessions are off in your consent for ${row.clinic.short}${phone ? ` — call ${phone}` : ''}`
      : variant === 'hero'
        ? `Less than ${row.clinic.changeWindowHours} hours away — to change it, call ${row.clinic.short}${phone ? ` on ${phone}` : ''}`
        : `Within ${row.clinic.changeWindowHours}h${phone ? ` · call ${phone}` : ' · call the clinic'}`;
  return variant === 'hero' ? (
    <div className="rounded-xl bg-white/15 px-3.5 py-2.5 text-[13px] leading-snug">{text}</div>
  ) : (
    <span className="rounded-lg bg-[#FBF4E2] px-3 py-2 text-xs font-semibold text-[#8A6D1E]">{text}</span>
  );
}
