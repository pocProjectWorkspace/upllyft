'use client';

import { FileText } from 'lucide-react';
import type { Portal } from '../lib/api';
import { clinicColor, dateMed, dayLong, time } from '../lib/format';
import type { PortalActions } from './clinic-portal';

export function ReportsTab({ data, filter, actions }: { data: Portal; filter: string | null; actions: PortalActions }) {
  const byKey = new Map(data.clinics.map((c) => [c.key, c]));
  const list = data.assessments.filter((a) => !filter || a.clinicKey === filter);

  if (!list.length) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm leading-relaxed text-gray-500">
        No assessments or reports yet.
        <br />
        Reports appear here once your therapist signs them off and shares them with you.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {list.map((a) => {
        const c = byKey.get(a.clinicKey);
        const color = clinicColor(c?.colorIndex);
        const at = a.at ? new Date(a.at) : null;
        const status = a.reportShared
          ? { label: 'Report shared', cls: 'text-[#0B7E6B] bg-[#E4F4EF]' }
          : a.reportWithheld
            ? { label: 'Report waiting for your consent', cls: 'text-gray-600 bg-gray-100' }
            : a.upcoming
              ? { label: 'Upcoming', cls: 'text-[#D6336C] bg-[#FDE7EE]' }
              : { label: 'Report in progress', cls: 'text-amber-800 bg-amber-50' };
        return (
          <div key={a.id} className="rounded-2xl border border-gray-100 bg-white px-5 py-5">
            <div className="flex flex-wrap items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: color.bg }}>
                <FileText className="h-[18px] w-[18px]" style={{ color: color.ink }} />
              </div>
              <div className="min-w-[220px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15.5px] font-extrabold text-gray-900">{a.title}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${status.cls}`}>{status.label}</span>
                </div>
                <div className="mt-1 text-[13px] text-gray-500">
                  {[at ? `${dayLong(at)} · ${time(at)}` : a.sharedAt ? `Shared ${dateMed(a.sharedAt)}` : null, a.therapist, c?.short]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              {a.reportShared && (
                <button
                  onClick={() => actions.openDoc({ kind: 'report', id: a.id })}
                  className="rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 px-4 py-2.5 text-[13.5px] font-bold text-white"
                >
                  View report
                </button>
              )}
              {a.reportWithheld && (
                <button
                  onClick={() => actions.goTo('forms', a.clinicKey)}
                  className="rounded-xl border-[1.5px] border-gray-200 px-4 py-2.5 text-[13.5px] font-bold text-gray-700"
                >
                  Review consent
                </button>
              )}
            </div>
            {a.upcoming && a.prep.length > 0 && (
              <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3.5">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">How to prepare</div>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {a.prep.map((p) => (
                    <li key={p} className="flex gap-2 text-[13.5px] text-gray-700">
                      <span className="font-extrabold text-teal-500">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {a.upcoming && (
              <div className="mt-3.5 text-xs text-gray-500">
                Your report is usually shared within 7 days of the assessment, once the therapist signs it off.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
