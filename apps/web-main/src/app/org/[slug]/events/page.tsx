'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Skeleton } from '@upllyft/ui';
import { getOrgEvents, type OrgEvent } from '@/lib/api/organizations';

/** An event is "live" between its start and end. Undated ends get a 1-hour default. */
function isLive(event: OrgEvent, now: number): boolean {
  const start = new Date(event.startDate).getTime();
  const end = event.endDate
    ? new Date(event.endDate).getTime()
    : start + 60 * 60 * 1000;
  return now >= start && now <= end;
}

function formatWhen(event: OrgEvent): string {
  const start = new Date(event.startDate);
  return start.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function prettyType(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function OrgEventsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [events, setEvents] = useState<OrgEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    getOrgEvents(slug)
      .then(setEvents)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const { live, upcoming, past } = useMemo(() => {
    const now = Date.now();
    const live: OrgEvent[] = [];
    const upcoming: OrgEvent[] = [];
    const past: OrgEvent[] = [];

    for (const event of events) {
      if (event.isCancelled) continue;
      if (isLive(event, now)) live.push(event);
      else if (new Date(event.startDate).getTime() > now) upcoming.push(event);
      else past.push(event);
    }
    // Most-recent-first reads better for history; upcoming stays soonest-first.
    past.reverse();
    return { live, upcoming, past };
  }, [events]);

  const isEmpty = !loading && !error && events.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Events</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage events for your organization&apos;s communities.
          </p>
        </div>
        <a
          href={`/org/${slug}/events/create`}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium shadow-md hover:opacity-90 transition-opacity"
          style={{ background: 'var(--org-gradient)', color: 'var(--org-on-primary)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Event
        </a>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      )}

      {error && (
        <div className="bg-white rounded-2xl border border-red-100 p-8 text-center">
          <p className="text-sm text-red-600">Couldn&apos;t load events. Please try again.</p>
        </div>
      )}

      {isEmpty && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No events yet</h3>
          <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
            Create your first event to bring your community together.
          </p>
          <a
            href={`/org/${slug}/events/create`}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Event
          </a>
        </div>
      )}

      {!loading && !error && events.length > 0 && (
        <>
          {live.length > 0 && <EventSection title="Happening now" events={live} live />}
          {upcoming.length > 0 && <EventSection title="Upcoming" events={upcoming} />}
          {past.length > 0 && <EventSection title="Past" events={past} muted />}
        </>
      )}
    </div>
  );
}

function EventSection({
  title,
  events,
  live = false,
  muted = false,
}: {
  title: string;
  events: OrgEvent[];
  live?: boolean;
  muted?: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        {live && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
        )}
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{title}</h2>
        <span className="text-xs text-gray-400">({events.length})</span>
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <EventCard key={event.id} event={event} live={live} muted={muted} />
        ))}
      </div>
    </section>
  );
}

function EventCard({ event, live, muted }: { event: OrgEvent; live: boolean; muted: boolean }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-200 p-4 flex items-start gap-4 ${
        muted ? 'opacity-70' : ''
      }`}
    >
      <div
        className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 leading-none"
        style={{ backgroundColor: 'var(--org-primary-soft)', color: 'var(--org-primary)' }}
      >
        <span className="text-[10px] font-semibold uppercase">
          {new Date(event.startDate).toLocaleString(undefined, { month: 'short' })}
        </span>
        <span className="text-lg font-bold">{new Date(event.startDate).getDate()}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-gray-900 truncate">{event.title}</h3>
          {live && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-red-600 bg-red-50 rounded-full px-2 py-0.5">
              Live
            </span>
          )}
          <span
            className="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5"
            style={{ backgroundColor: 'var(--org-primary-soft)', color: 'var(--org-primary)' }}
          >
            {prettyType(event.eventType)}
          </span>
        </div>

        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{event.description}</p>

        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
          <span>{formatWhen(event)}</span>
          <span>·</span>
          <span>
            {event.format === 'VIRTUAL'
              ? 'Virtual'
              : event.venue || event.city || event.location || 'In person'}
          </span>
          {event.creator?.name && (
            <>
              <span>·</span>
              <span className="truncate">Hosted by {event.creator.name}</span>
            </>
          )}
          {event.community && (
            <>
              <span>·</span>
              <span className="truncate">{event.community.name}</span>
            </>
          )}
          {event.attendeeCount > 0 && (
            <>
              <span>·</span>
              <span>{event.attendeeCount} attending</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
