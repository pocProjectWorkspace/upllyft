'use client';

// Clinic-wide Bookings Calendar — every therapist's sessions + assessment reviews
// across the org, with Day/Week navigation and a therapist filter. Org-scoped.

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge, useToast } from '@upllyft/ui';
import {
  getOrgTherapists,
  getOrgBookingsCalendar,
  type OrgTherapistOption,
  type CalendarEvent,
} from '@/lib/api/organizations';

type View = 'day' | 'week';

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => d.toISOString();
const timeOf = (s: string) => {
  const d = new Date(s);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
// Monday-based week start.
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7; // Mon=0 … Sun=6
  x.setDate(x.getDate() - day);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const chipColors = ['bg-teal-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-emerald-500'];

export default function BookingsCalendarPage() {
  const { toast } = useToast();
  const params = useParams();
  const slug = params.slug as string;

  const [view, setView] = useState<View>('week');
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [therapists, setTherapists] = useState<OrgTherapistOption[]>([]);
  const [activeTherapists, setActiveTherapists] = useState<Set<string>>(new Set());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const days = useMemo(() => {
    if (view === 'day') return [anchor];
    const start = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [view, anchor]);

  const range = useMemo(() => {
    const from = view === 'day' ? startOfDay(anchor) : startOfWeek(anchor);
    const to = view === 'day' ? endOfDay(anchor) : endOfDay(addDays(startOfWeek(anchor), 6));
    return { from: iso(from), to: iso(to) };
  }, [view, anchor]);

  // Assign a stable colour per therapist.
  const colorOf = useMemo(() => {
    const map = new Map<string, string>();
    therapists.forEach((t, i) => map.set(t.id, chipColors[i % chipColors.length]));
    return (id: string) => map.get(id) ?? 'bg-gray-400';
  }, [therapists]);

  useEffect(() => {
    getOrgTherapists(slug).then(setTherapists).catch(() => {});
  }, [slug]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getOrgBookingsCalendar(slug, range.from, range.to)
      .then((r) => {
        if (active) setEvents(r.events);
      })
      .catch(() => {
        if (active) toast({ title: 'Error', description: 'Failed to load calendar', variant: 'destructive' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug, range.from, range.to]);

  const shown = useMemo(
    () => (activeTherapists.size === 0 ? events : events.filter((e) => activeTherapists.has(e.therapistId))),
    [events, activeTherapists],
  );

  function eventsForDay(d: Date) {
    const key = startOfDay(d).getTime();
    return shown.filter((e) => startOfDay(new Date(e.start)).getTime() === key);
  }

  function toggleTherapist(id: string) {
    setActiveTherapists((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function shift(dir: number) {
    setAnchor((a) => addDays(a, dir * (view === 'day' ? 1 : 7)));
  }

  const rangeLabel =
    view === 'day'
      ? anchor.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
      : `${startOfWeek(anchor).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${addDays(startOfWeek(anchor), 6).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Bookings</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            {(['day', 'week'] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm capitalize ${view === v ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {v}
              </button>
            ))}
          </div>
          <button onClick={() => shift(-1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50" aria-label="Previous">‹</button>
          <button onClick={() => setAnchor(startOfDay(new Date()))} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">Today</button>
          <button onClick={() => shift(1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50" aria-label="Next">›</button>
          <button disabled title="Reserve a booking — coming soon" className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-400">
            + New Booking
          </button>
        </div>
      </div>

      <p className="text-sm font-medium text-gray-700">{rangeLabel}</p>

      {/* Therapist filter chips */}
      {therapists.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {therapists.map((t) => {
            const on = activeTherapists.size === 0 || activeTherapists.has(t.id);
            return (
              <button
                key={t.id}
                onClick={() => toggleTherapist(t.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border ${
                  activeTherapists.has(t.id) ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-600'
                } ${on ? '' : 'opacity-50'}`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${colorOf(t.id)}`} />
                {t.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
          <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          Loading calendar…
        </div>
      ) : (
        <div className={`grid gap-3 ${view === 'week' ? 'grid-cols-1 sm:grid-cols-7' : 'grid-cols-1'}`}>
          {days.map((d) => {
            const dayEvents = eventsForDay(d);
            const isToday = startOfDay(d).getTime() === startOfDay(new Date()).getTime();
            return (
              <div key={d.toISOString()} className="bg-white rounded-2xl border border-gray-200 p-3 min-h-[120px]">
                <div className={`text-xs font-semibold mb-2 ${isToday ? 'text-teal-600' : 'text-gray-500'}`}>
                  {d.toLocaleDateString(undefined, { weekday: 'short' })} {d.getDate()}
                </div>
                {dayEvents.length === 0 ? (
                  <p className="text-xs text-gray-300">—</p>
                ) : (
                  <div className="space-y-1.5">
                    {dayEvents.map((e) => (
                      <div key={`${e.kind}-${e.id}`} className="rounded-lg border border-gray-100 p-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${colorOf(e.therapistId)}`} />
                          <span className="font-medium text-gray-900">{timeOf(e.start)}</span>
                          {e.kind === 'assessment' && <Badge color="purple">Assessment</Badge>}
                        </div>
                        <div className="text-gray-700 mt-0.5 truncate">{e.title}</div>
                        <div className="text-gray-400 truncate">
                          {e.patientName ?? '—'} · {e.therapistName}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
