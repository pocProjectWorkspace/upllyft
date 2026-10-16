'use client';

import { useState } from 'react';
import { BookOpen, FileText, Image as ImageIcon, PlayCircle, Printer } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { LogDialog, type LogTarget } from '@/resources/journey/log-dialog';
import { domainLabel } from '@/resources/journey/ui';
import type { Portal, PortalActivity } from '../lib/api';
import { clinicColor, sharedAgo } from '../lib/format';
import { portalKeys, useSeen } from '../hooks';
import type { PortalActions } from './clinic-portal';

const TYPE_LOOK: Record<string, { tint: string; ink: string; Icon: typeof FileText }> = {
  Worksheet: { tint: '#E2F3F0', ink: '#12998C', Icon: FileText },
  Guide: { tint: '#EEF3FE', ink: '#3A63C9', Icon: BookOpen },
  'Social story': { tint: '#F3E9FB', ink: '#8A4FCB', Icon: BookOpen },
  Printable: { tint: '#FFF4E5', ink: '#B45309', Icon: Printer },
  Video: { tint: '#FDE7EE', ink: '#D6336C', Icon: PlayCircle },
};
const DEFAULT_LOOK = { tint: '#F0F3F2', ink: '#5B6B67', Icon: ImageIcon };

export function HomeTab({
  data,
  filter,
  actions,
  childId,
}: {
  data: Portal;
  filter: string | null;
  actions: PortalActions;
  childId: string;
}) {
  const qc = useQueryClient();
  const seen = useSeen(childId);
  const [logTarget, setLogTarget] = useState<LogTarget | null>(null);
  const byKey = new Map(data.clinics.map((c) => [c.key, c]));
  const list = data.activities.filter((a) => !filter || a.clinicKey === filter);

  const open = (a: PortalActivity) => {
    if (a.isNew) seen.mutate(a.id);
    actions.openDoc({ kind: 'activity', id: a.id, activity: a });
  };
  const tried = (a: PortalActivity) => {
    if (a.isNew) seen.mutate(a.id);
    setLogTarget({ kind: a.kind, resourceId: a.resourceId, title: a.title, domain: a.domain });
  };

  return (
    <div>
      <p className="text-[13.5px] font-medium text-gray-600">
        Activities and supports {data.child.firstName}’s therapists have shared for you to try at home. Tap <b>We tried it</b> so they know how the week went.
      </p>
      {list.length ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((a) => {
            const look = (a.type && TYPE_LOOK[a.type]) || DEFAULT_LOOK;
            const c = a.clinicKey ? byKey.get(a.clinicKey) : undefined;
            const color = clinicColor(c?.colorIndex);
            return (
              <div key={a.id} className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white">
                <button onClick={() => open(a)} className="relative flex h-[110px] items-center justify-center" style={{ background: look.tint }}>
                  {a.type && (
                    <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold" style={{ color: look.ink }}>
                      {a.type}
                    </span>
                  )}
                  {a.isNew && <span className="absolute right-3 top-3 rounded-full bg-[#E0912E] px-2.5 py-1 text-[11px] font-extrabold text-white">New</span>}
                  <span className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-white shadow-sm">
                    <look.Icon className="h-6 w-6" style={{ color: look.ink }} />
                  </span>
                </button>
                <div className="flex flex-1 flex-col gap-2.5 px-4 py-4">
                  <button onClick={() => open(a)} className="text-left text-base font-bold text-gray-900">
                    {a.title}
                  </button>
                  {a.note && <div className="rounded-xl bg-gray-50 px-3 py-2 text-[13px] leading-snug text-gray-700">“{a.note}”</div>}
                  <div className="flex flex-wrap gap-1.5">
                    {a.domain && <span className="rounded-full bg-[#EEF3FE] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#3A63C9]">{domainLabel(a.domain)}</span>}
                    {a.minutes != null && <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11.5px] font-semibold text-gray-600">{a.minutes} min</span>}
                  </div>
                  <div className="mt-auto text-xs text-gray-400">
                    {a.therapist ? `From ${a.therapist}` : 'From your therapist'}
                    {c && (
                      <>
                        {' · '}
                        <b style={{ color: color.ink }}>{c.short}</b>
                      </>
                    )}
                    {a.sharedAt && ` · ${sharedAgo(a.sharedAt)}`}
                  </div>
                  <div className="flex gap-2 border-t border-gray-100 pt-3">
                    <button onClick={() => open(a)} className="flex-1 rounded-xl border-[1.5px] border-gray-200 py-2 text-[13px] font-bold text-gray-700">
                      Open
                    </button>
                    <button
                      onClick={() => tried(a)}
                      className={`flex-[1.3] rounded-xl py-2 text-[13px] font-bold ${
                        a.triedThisWeek
                          ? 'border-[1.5px] border-teal-500 bg-[#EAF7F2] text-[#0B7E6B]'
                          : 'bg-gradient-to-br from-teal-500 to-teal-700 text-white'
                      }`}
                    >
                      {a.triedThisWeek ? '✓ Tried this week' : 'We tried it'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm leading-relaxed text-gray-500">
          No home activities yet.
          <br />
          When a therapist shares an activity for home, it appears here.
        </div>
      )}

      {/* The same "I tried this" log as the Resources journey: the therapist sees it on the child's progress. */}
      <LogDialog
        childId={childId}
        childName={data.child.firstName}
        target={logTarget}
        onClose={() => {
          setLogTarget(null);
          qc.invalidateQueries({ queryKey: portalKeys.child(childId) });
        }}
      />
    </div>
  );
}
