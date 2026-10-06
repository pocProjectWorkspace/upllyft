'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, toast } from '@upllyft/ui';
import { ENGAGEMENT_LABELS, HELP_COLORS, HELP_LABELS } from '@upllyft/types';
import type { ResourceKind } from './api';
import { useLog } from './hooks';
import { DomainBadge } from './ui';

export interface LogTarget {
  kind: ResourceKind;
  resourceId: string;
  title: string;
  domain: string | null;
  /** Prefill (from Mira). */
  help?: number | null;
  engagement?: number | null;
  date?: string | null;
}

/** YYYY-MM-DD in the parent's own timezone (toISOString would give the UTC day). */
function isoDay(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "How did it go?" — when, how much help, how engaged, an optional note. */
export function LogDialog({
  childId,
  childName,
  target,
  onClose,
}: {
  childId: string;
  childName: string;
  target: LogTarget | null;
  onClose: () => void;
}) {
  const log = useLog(childId);
  const [when, setWhen] = useState<'0' | '1' | 'pick'>('0');
  const [picked, setPicked] = useState(isoDay(2));
  const [help, setHelp] = useState<number | null>(null);
  const [engagement, setEngagement] = useState<number | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!target) return;
    setHelp(target.help ?? null);
    setEngagement(target.engagement ?? null);
    setNote('');
    const day = target.date?.slice(0, 10);
    if (!day || day === isoDay(0)) setWhen('0');
    else if (day === isoDay(1)) setWhen('1');
    else {
      setWhen('pick');
      setPicked(day);
    }
  }, [target]);

  if (!target) return null;
  const date = when === 'pick' ? picked : isoDay(Number(when));
  const ready = help !== null && engagement !== null && !!date;

  async function save() {
    if (!ready || !target) return;
    try {
      const res = await log.mutateAsync({
        kind: target.kind,
        resourceId: target.resourceId,
        date: new Date(`${date}T12:00:00`).toISOString(),
        help: help!,
        engagement: engagement!,
        note: note.trim() || undefined,
      });
      toast({
        title: res.becameMastered ? `${childName} mastered it!` : 'Added to progress',
        description: res.becameMastered
          ? `Three times on their own — "${target.title}" is marked Mastered.`
          : `Saved to ${childName}’s private progress.`,
      });
      onClose();
    } catch (e: any) {
      toast({ title: 'Could not save', description: e?.response?.data?.message ?? 'Please try again.', variant: 'destructive' });
    }
  }

  const option = (active: boolean) =>
    `rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
      active ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-gray-200 text-gray-700 hover:border-teal-300'
    }`;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <div className="space-y-5">
          <div>
            <DomainBadge domain={target.domain} />
            <DialogTitle className="mt-2 text-lg font-semibold text-gray-900">How did it go with {childName}?</DialogTitle>
            <p className="text-sm text-gray-500">{target.title}</p>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-gray-800">When</legend>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={option(when === '0')} onClick={() => setWhen('0')}>Today</button>
              <button type="button" className={option(when === '1')} onClick={() => setWhen('1')}>Yesterday</button>
              <button type="button" className={option(when === 'pick')} onClick={() => setWhen('pick')}>Pick a date</button>
              {when === 'pick' && (
                <input
                  type="date"
                  value={picked}
                  max={isoDay(0)}
                  onChange={(e) => setPicked(e.target.value)}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
              )}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-gray-800">How much help did {childName} need?</legend>
            <div className="grid grid-cols-3 gap-2">
              {HELP_LABELS.map((label, i) => (
                <button key={label} type="button" className={option(help === i)} onClick={() => setHelp(i)}>
                  <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] align-middle" style={{ background: HELP_COLORS[i] }} />
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-gray-800">How engaged were they?</legend>
            <div className="grid grid-cols-3 gap-2">
              {ENGAGEMENT_LABELS.map((label, i) => (
                <button key={label} type="button" className={option(engagement === i)} onClick={() => setEngagement(i)}>
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-gray-800">
              Anything worth remembering? <span className="font-normal text-gray-400">Optional</span>
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={1000}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              placeholder="e.g. Used the picture strip on the table"
            />
          </label>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-400">Added to {childName}’s private progress</p>
            <button
              type="button"
              disabled={!ready || log.isPending}
              onClick={save}
              className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {log.isPending ? 'Saving…' : 'Save log'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
