'use client';

// Today's Board — the clinic's daily operational view: every therapist's sessions +
// assessments for today, grouped by therapist. Reuses the org bookings-calendar
// endpoint (org-scoped) filtered to today. Completes the Clinic-Actions nav (TC-CLN-01).

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge, useToast } from '@upllyft/ui';
import { getOrgBookingsCalendar, type CalendarEvent } from '@/lib/api/organizations';

function timeOf(s: string) {
  const d = new Date(s);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function TodaysBoardPage() {
  const { toast } = useToast();
  const params = useParams();
  const slug = params.slug as string;

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const label = today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  useEffect(() => {
    const from = new Date(today);
    from.setHours(0, 0, 0, 0);
    const to = new Date(today);
    to.setHours(23, 59, 59, 999);
    let active = true;
    getOrgBookingsCalendar(slug, from.toISOString(), to.toISOString())
      .then((r) => {
        if (active) setEvents(r.events);
      })
      .catch(() => {
        if (active) toast({ title: 'Error', description: "Failed to load today's board", variant: 'destructive' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Group by therapist, each sorted by start time.
  const byTherapist = useMemo(() => {
    const map = new Map<string, { name: string; items: CalendarEvent[] }>();
    for (const e of events) {
      const g = map.get(e.therapistId) ?? { name: e.therapistName, items: [] };
      g.items.push(e);
      map.set(e.therapistId, g);
    }
    return Array.from(map.values())
      .map((g) => ({ ...g, items: g.items.slice().sort((a, b) => a.start.localeCompare(b.start)) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [events]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Today&apos;s Board</h1>
        <p className="text-sm text-gray-500">{label} · {events.length} appointment{events.length === 1 ? '' : 's'} across the clinic</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
          <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          Loading…
        </div>
      ) : byTherapist.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-sm text-gray-400">
          Nothing scheduled today.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {byTherapist.map((g) => (
            <div key={g.name} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900">{g.name}</h2>
                <span className="text-xs text-gray-400">{g.items.length}</span>
              </div>
              <div className="space-y-2">
                {g.items.map((e) => (
                  <div key={`${e.kind}-${e.id}`} className="rounded-xl border border-gray-100 p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{timeOf(e.start)}</span>
                      {e.kind === 'assessment' && <Badge color="purple">Assessment</Badge>}
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5 truncate">{e.title}</p>
                    <p className="text-xs text-gray-400 truncate">{e.patientName ?? '—'} · {e.status}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
