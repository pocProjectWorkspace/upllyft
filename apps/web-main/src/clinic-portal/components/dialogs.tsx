'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, Skeleton, toast } from '@upllyft/ui';
import { errorMessage, type PortalActivity } from '../lib/api';
import { dateMed, dayLong, dayShort, mon, time, weekday } from '../lib/format';
import { useCancel, useReport, useReschedule, useSlots, useSummary } from '../hooks';
import type { PortalRow } from './clinic-portal';

const primary =
  'flex-1 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-300';
const secondary = 'flex-1 rounded-xl border-[1.5px] border-gray-200 bg-white py-3 text-sm font-bold text-gray-700';

const firstName = (name: string | null | undefined) => (name ?? 'Your therapist').split(' ')[0];

// ─── Reschedule ───────────────────────────────────────────────────────────────

export function RescheduleDialog({ childId, row, onClose }: { childId: string; row: PortalRow | null; onClose: () => void }) {
  const slots = useSlots(childId, row?.id ?? null);
  const reschedule = useReschedule(childId);
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => setPicked(null), [row?.id]);

  if (!row) return null;
  const therapist = firstName(row.therapist);

  async function confirm() {
    if (!picked || !row) return;
    try {
      await reschedule.mutateAsync({ sessionId: row.id, startAt: picked });
      const d = new Date(picked);
      toast({ title: `Moved to ${dayShort(d)}, ${time(d)}`, description: `${row.therapist ?? 'Your therapist'} has been notified.` });
      onClose();
    } catch (e: any) {
      // Someone else took it: show fresh slots and keep the dialog open.
      toast({ title: 'Not moved', description: errorMessage(e), variant: 'destructive' });
      setPicked(null);
      slots.refetch();
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-[560px] overflow-y-auto rounded-3xl p-7">
        <DialogTitle className="text-[19px] font-extrabold text-gray-900">Reschedule session</DialogTitle>
        <p className="mt-1 text-[13.5px] text-gray-500">
          {row.title}
          {row.therapist ? ` with ${row.therapist}` : ''} · currently {weekday(row.start)} {row.start.getDate()} {mon(row.start)}, {time(row.start)}
        </p>
        <div className="mt-3.5 rounded-xl bg-[#EFF6F3] px-3 py-2.5 text-[12.5px] text-[#3A5A52]">
          Only {therapist}’s open times are shown, so your new time is confirmed straight away.
        </div>
        <div className="mt-4 flex flex-col gap-3.5">
          {slots.isLoading ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : slots.data?.reason ? (
            <p className="text-sm text-gray-500">{slots.data.reason}</p>
          ) : !slots.data?.days.length ? (
            <p className="text-sm text-gray-500">
              No open times in the next two weeks.{row.clinic.phone ? ` Please call ${row.clinic.short} on ${row.clinic.phone}.` : ' Please call the clinic.'}
            </p>
          ) : (
            slots.data.days.map((d) => (
              <div key={d.date}>
                <div className="text-[13px] font-bold text-gray-800">{dayLong(new Date(d.date))}</div>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {d.slots.map((s) => {
                    const on = picked === s.start;
                    return (
                      <button
                        key={s.start}
                        type="button"
                        disabled={!s.available}
                        onClick={() => setPicked(s.start)}
                        aria-pressed={on}
                        className={
                          !s.available
                            ? 'cursor-not-allowed rounded-lg bg-gray-50 px-3 py-2 text-[13px] font-semibold text-gray-300 line-through'
                            : `rounded-lg border-[1.5px] px-3 py-2 text-[13px] font-bold ${
                                on ? 'border-teal-500 bg-teal-500 text-white' : 'border-gray-200 bg-white text-gray-800'
                              }`
                        }
                      >
                        {time(new Date(s.start))}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="mt-6 flex gap-2.5">
          <button onClick={onClose} className={secondary}>
            Keep current time
          </button>
          <button onClick={confirm} disabled={!picked || reschedule.isPending} className={primary}>
            {reschedule.isPending ? 'Moving…' : picked ? `Confirm ${time(new Date(picked))}` : 'Pick a time'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export function CancelDialog({
  childId,
  row,
  reasons,
  onClose,
}: {
  childId: string;
  row: PortalRow | null;
  reasons: string[];
  onClose: () => void;
}) {
  const cancel = useCancel(childId);
  const [reason, setReason] = useState<string | null>(null);
  useEffect(() => setReason(null), [row?.id]);
  if (!row) return null;

  async function confirm() {
    if (!reason || !row) return;
    try {
      await cancel.mutateAsync({ sessionId: row.id, reason });
      toast({ title: 'Session cancelled', description: `${row.clinic.short} has been notified.` });
      onClose();
    } catch (e) {
      toast({ title: 'Not cancelled', description: errorMessage(e), variant: 'destructive' });
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[560px] rounded-3xl p-7">
        <DialogTitle className="text-[19px] font-extrabold text-gray-900">Cancel this session?</DialogTitle>
        <p className="mt-1 text-[13.5px] text-gray-500">
          {row.title} · {weekday(row.start)} {row.start.getDate()} {mon(row.start)}, {time(row.start)} · {row.clinic.short}
        </p>
        <div className="mt-4 text-[13px] font-bold text-gray-800">Reason</div>
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Reason">
          {reasons.map((r) => {
            const on = reason === r;
            return (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setReason(r)}
                className={`rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-bold ${
                  on ? 'border-[#B4451E] bg-[#FBE9E4] text-[#B4451E]' : 'border-gray-200 bg-white text-gray-600'
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
        <div className="mt-4 rounded-xl bg-gray-50 px-3.5 py-3 text-[12.5px] leading-relaxed text-gray-600">
          No charge — you’re cancelling more than {row.clinic.changeWindowHours} hours ahead. Only this session is cancelled; the rest of the plan
          stays as is. {firstName(row.therapist)} will be notified.
        </div>
        <div className="mt-5 flex gap-2.5">
          <button onClick={onClose} className={secondary}>
            Keep session
          </button>
          <button
            onClick={confirm}
            disabled={!reason || cancel.isPending}
            className="flex-1 rounded-xl bg-[#B4451E] py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {cancel.isPending ? 'Cancelling…' : 'Cancel session'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Report / session summary / home activity ────────────────────────────────

export type DocTarget =
  | { kind: 'report'; id: string }
  | { kind: 'summary'; id: string }
  | { kind: 'activity'; id: string; activity: PortalActivity };

function Section({ h, children }: { h: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-[#0B7E6B]">{h}</div>
      <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{children}</div>
    </div>
  );
}

export function DocDialog({ childId, target, onClose }: { childId: string; target: DocTarget | null; onClose: () => void }) {
  const report = useReport(childId, target?.kind === 'report' ? target.id : null);
  const summary = useSummary(childId, target?.kind === 'summary' ? target.id : null);
  if (!target) return null;

  const q = target.kind === 'report' ? report : target.kind === 'summary' ? summary : null;
  let title = '';
  let meta = '';
  let footer = '';
  let body: React.ReactNode = null;
  let action: React.ReactNode = null;

  if (q?.isLoading) {
    body = (
      <div className="space-y-3">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  } else if (q?.isError) {
    body = <p className="text-sm text-gray-600">{errorMessage(q.error, 'This is not available right now.')}</p>;
  } else if (target.kind === 'report' && report.data) {
    const r = report.data;
    title = r.title;
    meta = [r.sharedAt ? `Shared ${dateMed(r.sharedAt)}` : null, r.therapist].filter(Boolean).join(' · ');
    footer = 'Shared with you under your report-sharing consent for this clinic.';
    body = r.text ? <Section h="Report">{r.text}</Section> : <p className="text-sm text-gray-500">The report is attached as a file.</p>;
    action = r.fileUrl ? (
      <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" className={`${primary} text-center`}>
        Download PDF
      </a>
    ) : (
      <button onClick={() => window.print()} className={primary}>
        Print
      </button>
    );
  } else if (target.kind === 'summary' && summary.data) {
    const s = summary.data;
    title = `Session summary · ${new Date(s.at).getDate()} ${mon(new Date(s.at))}`;
    meta = [s.title, s.therapist].filter(Boolean).join(' · ');
    footer = 'Shared by your therapist after sign-off.';
    body = (
      <>
        {s.summary.workedOn && <Section h="What we worked on">{s.summary.workedOn}</Section>}
        {s.summary.howTheyDid && <Section h="How it went">{s.summary.howTheyDid}</Section>}
        {s.summary.tryAtHome && <Section h="Try at home this week">{s.summary.tryAtHome}</Section>}
      </>
    );
  } else if (target.kind === 'activity') {
    const a = target.activity;
    title = a.title;
    meta = [a.type, a.minutes != null ? `${a.minutes} min` : null].filter(Boolean).join(' · ');
    footer = `Shared by ${a.therapist ?? 'your therapist'} to the home programme.`;
    body = (
      <>
        {a.note && <Section h={`Note from ${firstName(a.therapist)}`}>{a.note}</Section>}
        {a.description && <Section h="About this activity">{a.description}</Section>}
      </>
    );
    action = a.openUrl ? (
      <a
        href={a.openUrl}
        target={a.kind === 'LIBRARY' ? '_blank' : undefined}
        rel={a.kind === 'LIBRARY' ? 'noopener noreferrer' : undefined}
        className={`${primary} text-center`}
      >
        Open activity
      </a>
    ) : null;
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-[560px] overflow-y-auto rounded-3xl p-7">
        <DialogTitle className="text-[19px] font-extrabold text-gray-900">{title || 'Loading…'}</DialogTitle>
        {meta && <p className="mt-1 text-[13px] text-gray-500">{meta}</p>}
        <div className="mt-4 flex flex-col gap-4">{body}</div>
        {footer && <p className="mt-4 text-xs text-gray-400">{footer}</p>}
        <div className="mt-4 flex gap-2.5">
          <button onClick={onClose} className={secondary}>
            Close
          </button>
          {action}
        </div>
      </DialogContent>
    </Dialog>
  );
}
