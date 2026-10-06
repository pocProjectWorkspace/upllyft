'use client';

import { useEffect, useState } from 'react';
import { Avatar, Dialog, DialogContent, DialogTitle, Skeleton, toast } from '@upllyft/ui';
import { useShare, useShareTargets } from './hooks';

const PERIODS: Array<{ value: number | 'all'; label: string }> = [
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
  { value: 'all', label: 'Everything' },
];

export function ShareDialog({ childId, childName, open, onClose }: { childId: string; childName: string; open: boolean; onClose: () => void }) {
  const targets = useShareTargets(childId, open);
  const share = useShare(childId);
  const [to, setTo] = useState<string | null>(null);
  const [period, setPeriod] = useState<number | 'all'>(30);
  const [notes, setNotes] = useState(true);

  useEffect(() => {
    if (open && !to && targets.data?.length) setTo(targets.data[0].userId);
  }, [open, to, targets.data]);

  const chosen = targets.data?.find((t) => t.userId === to);
  const periodLabel = PERIODS.find((p) => p.value === period)?.label.toLowerCase();

  async function submit() {
    if (!to) return;
    try {
      await share.mutateAsync({ therapistUserId: to, periodDays: period, includeNotes: notes });
      toast({ title: 'Progress shared', description: `${chosen?.name ?? 'Your therapist'} can now see ${childName}’s progress.` });
      onClose();
    } catch (e: any) {
      toast({ title: 'Could not share', description: e?.response?.data?.message ?? 'Please try again.', variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <div className="space-y-5">
          <div>
            <DialogTitle className="text-lg font-semibold text-gray-900">Share {childName}’s progress</DialogTitle>
            <p className="text-sm text-gray-500">Your therapist only sees a summary when you send it, and you can stop sharing anytime.</p>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-gray-800">Send to</legend>
            {targets.isLoading ? (
              <Skeleton className="h-16 rounded-xl" />
            ) : !targets.data?.length ? (
              <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
                You can share with a therapist once you’ve booked a session with them for {childName}, or they’ve assigned {childName} an activity.
              </p>
            ) : (
              <div className="space-y-2">
                {targets.data.map((t) => (
                  <button
                    key={t.userId}
                    type="button"
                    onClick={() => setTo(t.userId)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${
                      to === t.userId ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300'
                    }`}
                  >
                    <Avatar src={t.image ?? undefined} name={t.name} size="md" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-gray-900">{t.name}</span>
                      <span className="block text-xs text-gray-500">
                        {[t.role, t.nextSession ? `Next session ${new Date(t.nextSession).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-gray-800">Period</legend>
            <div className="flex flex-wrap gap-2">
              {PERIODS.map((p) => (
                <button
                  key={String(p.value)}
                  type="button"
                  onClick={() => setPeriod(p.value)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                    period === p.value ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-gray-200 text-gray-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex items-start gap-3">
            <input type="checkbox" checked={notes} onChange={(e) => setNotes(e.target.checked)} className="mt-1 accent-teal-600" />
            <span>
              <span className="block text-sm font-semibold text-gray-800">Include my notes</span>
              <span className="block text-xs text-gray-500">Otherwise only the activities and help levels are shared</span>
            </span>
          </label>

          {chosen && (
            <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
              {chosen.name} will see {childName}’s activities and help levels from {periodLabel}
              {notes ? ', with your notes' : ''}, until you stop sharing.
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600">
              Cancel
            </button>
            <button
              type="button"
              disabled={!to || share.isPending}
              onClick={submit}
              className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {share.isPending ? 'Sharing…' : 'Share summary'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
