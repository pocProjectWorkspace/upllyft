'use client';

import Link from 'next/link';
import { Switch, toast } from '@upllyft/ui';
import type { ConsentKey, Portal } from '../lib/api';
import { errorMessage } from '../lib/api';
import { clinicColor, CONSENT_LABELS, dateMed, dayShort } from '../lib/format';
import { useSetConsent } from '../hooks';

export function FormsTab({ data, filter, childId }: { data: Portal; filter: string | null; childId: string }) {
  const setConsent = useSetConsent(childId);
  const clinics = data.clinics.filter((c) => !filter || c.key === filter);

  const toggle = (facilityId: string, short: string, key: ConsentKey, value: boolean) =>
    setConsent.mutate(
      { facilityId, key, value },
      {
        onSuccess: () => toast({ title: `Consent updated · ${short} notified` }),
        onError: (e) => toast({ title: 'Consent not changed', description: errorMessage(e), variant: 'destructive' }),
      },
    );

  return (
    <div>
      <div className="rounded-xl border border-[#D6EBE3] bg-[#EFF6F3] px-4 py-3 text-[13px] leading-snug text-[#3A5A52]">
        Consent is set separately for each clinic — sharing with one clinic never shares with another.
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {clinics.map((c) => {
          const color = clinicColor(c.colorIndex);
          const i = c.intake;
          const pending = i?.status === 'NOT_STARTED';
          return (
            <div key={c.key} className="rounded-2xl border border-gray-100 bg-white px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[13px] font-extrabold" style={{ background: color.bg, color: color.ink }}>
                  {c.initials}
                </div>
                <div className="text-[15px] font-extrabold text-gray-900">{c.name}</div>
              </div>

              {i && (
                <div
                  className={`mt-4 flex flex-wrap items-center gap-3 rounded-xl border-[1.5px] px-4 py-3.5 ${
                    pending ? 'border-[#F3D9A8] bg-[#FFF8EC]' : 'border-gray-100 bg-white'
                  }`}
                >
                  <div className="min-w-[180px] flex-1">
                    <div className="text-sm font-bold text-gray-900">Intake form</div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      {pending
                        ? `Not started${i.due ? ` · due before ${dayShort(new Date(i.due))}` : ''}`
                        : i.status === 'REVIEWED'
                          ? `Submitted · reviewed${c.therapist ? ` by ${c.therapist}` : ''}${i.reviewedAt ? ` on ${dateMed(i.reviewedAt)}` : ''}`
                          : `Submitted ${dateMed(i.submittedAt)} · waiting for the clinic to review`}
                    </div>
                  </div>
                  <Link
                    href={`/clinic-portal/intake/${i.caseId}?child=${childId}`}
                    className={
                      pending
                        ? 'rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 px-3.5 py-2 text-[13px] font-bold text-white'
                        : 'rounded-lg border-[1.5px] border-gray-200 px-3.5 py-2 text-[13px] font-bold text-gray-700'
                    }
                  >
                    {pending ? 'Start form' : i.status === 'REVIEWED' ? 'View' : 'Edit'}
                  </Link>
                </div>
              )}

              <div className="mt-5 text-xs font-bold uppercase tracking-wide text-gray-400">Consent</div>
              {c.consents && c.facilityId ? (
                <ul className="mt-1.5">
                  {CONSENT_LABELS.map(([key, label]) => (
                    <li key={key} className="flex items-center gap-3 border-t border-gray-100 py-2.5">
                      <label htmlFor={`${c.key}-${key}`} className="flex-1 text-[13.5px] font-semibold text-gray-800">
                        {label}
                      </label>
                      <Switch
                        id={`${c.key}-${key}`}
                        checked={c.consents![key]}
                        onCheckedChange={(v: boolean) => toggle(c.facilityId!, c.short, key, v)}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[13px] text-gray-500">
                  {c.therapist ?? 'This therapist'} practises independently on Upllyft. Consent for each session is taken when you book.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
