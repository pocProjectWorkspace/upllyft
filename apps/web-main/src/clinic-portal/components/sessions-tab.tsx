'use client';

import { useState } from 'react';
import { clinicColor, mon, STATUS_STYLE, time, TYPE_STYLE, weekday } from '../lib/format';
import type { PortalActions, PortalRow } from './clinic-portal';
import { LockNote } from './overview-tab';

export function SessionsTab({ rows, actions }: { rows: PortalRow[]; actions: PortalActions }) {
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming');
  const upcoming = rows.filter((r) => r.upcoming).sort((a, b) => +a.start - +b.start);
  const past = rows.filter((r) => !r.upcoming).sort((a, b) => +b.start - +a.start);
  const list = view === 'upcoming' ? upcoming : past;
  const windows = [...new Set(rows.map((r) => r.clinic.changeWindowHours))];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl bg-gray-100 p-1" role="tablist">
          {(
            [
              ['upcoming', `Upcoming (${upcoming.length})`],
              ['past', `Past & cancelled (${past.length})`],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={view === k}
              onClick={() => setView(k)}
              className={`rounded-lg px-3.5 py-1.5 text-[13px] font-bold ${view === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {windows.length === 1 && (
          <div className="text-xs font-medium text-gray-500">Free to reschedule or cancel up to {windows[0]} hours before</div>
        )}
      </div>

      {list.length ? (
        <ul className="mt-4 flex flex-col gap-2.5">
          {list.map((s) => {
            const color = clinicColor(s.clinic.colorIndex);
            const status = s.status !== 'scheduled' ? STATUS_STYLE[s.status] : null;
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-100 bg-white px-4 py-4">
                <div className="w-[54px] shrink-0 rounded-xl py-1.5 text-center" style={{ background: color.bg, color: color.ink }}>
                  <div className="text-[11px] font-bold uppercase">{mon(s.start)}</div>
                  <div className="text-xl font-extrabold leading-tight">{s.start.getDate()}</div>
                </div>
                <div className="min-w-[220px] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-bold text-gray-900">{s.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide ${TYPE_STYLE[s.type]}`}>{s.type}</span>
                    {status && <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${status.cls}`}>{status.label}</span>}
                  </div>
                  <div className="mt-1 text-[13px] text-gray-500">
                    {weekday(s.start)} · {time(s.start)} · {s.mins} min{s.therapist ? ` · ${s.therapist}` : ''} ·{' '}
                    <b style={{ color: color.ink }}>{s.clinic.short}</b> · {s.mode === 'online' ? 'Video call' : 'In person'}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {s.canChange && (
                    <>
                      <button onClick={() => actions.reschedule(s)} className="rounded-xl border-[1.5px] border-gray-200 bg-white px-3.5 py-2 text-[13px] font-bold text-gray-700">
                        Reschedule
                      </button>
                      <button onClick={() => actions.cancel(s)} className="rounded-xl border-[1.5px] border-[#F2D9D3] bg-white px-3.5 py-2 text-[13px] font-bold text-[#B4451E]">
                        Cancel
                      </button>
                    </>
                  )}
                  {s.locked && <LockNote row={s} variant="row" />}
                  {s.hasSummary && (
                    <button
                      onClick={() => actions.openDoc({ kind: 'summary', id: s.id })}
                      className="rounded-xl border-[1.5px] border-[#D6E9E2] bg-[#F3FAF7] px-3.5 py-2 text-[13px] font-bold text-[#0B7E6B]"
                    >
                      Summary &amp; home activity
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-500">
          {view === 'upcoming' ? 'No upcoming sessions.' : 'No past or cancelled sessions yet.'}
        </div>
      )}
    </div>
  );
}
