'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CommunityShell } from '@/components/community-shell';
import { useEvents, useMarkInterest, useRemoveInterest } from '@/hooks/use-events';
import type { EventType, EventFormat, CommunityEvent } from '@/lib/api/events';
import {
  Button,
  Card,
  Badge,
  Input,
  Avatar,
  Skeleton,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@upllyft/ui';

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'THERAPY', label: 'Therapy' },
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'SUPPORT_GROUP', label: 'Support Group' },
  { value: 'WEBINAR', label: 'Webinar' },
  { value: 'COMMUNITY', label: 'Community' },
  { value: 'EDUCATIONAL', label: 'Educational' },
];

const EVENT_FORMATS: { value: EventFormat; label: string }[] = [
  { value: 'IN_PERSON', label: 'In Person' },
  { value: 'VIRTUAL', label: 'Virtual' },
  { value: 'HYBRID', label: 'Hybrid' },
];

const TYPE_COLORS: Record<EventType, 'teal' | 'blue' | 'purple' | 'green' | 'yellow' | 'red'> = {
  THERAPY: 'teal',
  WORKSHOP: 'blue',
  SUPPORT_GROUP: 'purple',
  WEBINAR: 'green',
  COMMUNITY: 'yellow',
  EDUCATIONAL: 'red',
};

const FORMAT_COLORS: Record<EventFormat, 'teal' | 'blue' | 'purple'> = {
  IN_PERSON: 'blue',
  VIRTUAL: 'purple',
  HYBRID: 'teal',
};

function formatLabel(value: string): string {
  return value
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function EventCard({ event }: { event: CommunityEvent }) {
  const markInterest = useMarkInterest();
  const removeInterest = useRemoveInterest();

  function handleInterest(status: 'INTERESTED' | 'GOING') {
    if (event.userInterest === status) {
      removeInterest.mutate(event.id);
    } else {
      markInterest.mutate({ eventId: event.id, status });
    }
  }

  return (
    <Card hover className="overflow-hidden flex flex-col">
      {/* Cover image or gradient placeholder */}
      <Link href={`/events/${event.id}`}>
        {event.coverImage ? (
          <img
            src={event.coverImage}
            alt={event.title}
            className="w-full h-40 object-cover"
          />
        ) : (
          <div className="w-full h-40 bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
            <svg className="w-10 h-10 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1">
        {/* Badges */}
        <div className="flex gap-2 mb-2">
          <Badge color={TYPE_COLORS[event.type]}>{formatLabel(event.type)}</Badge>
          <Badge color={FORMAT_COLORS[event.format]}>{formatLabel(event.format)}</Badge>
        </div>

        {/* Title & description */}
        <Link href={`/events/${event.id}`} className="group">
          <h3 className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors line-clamp-2">
            {event.title}
          </h3>
        </Link>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{event.description}</p>

        {/* Date */}
        <div className="flex items-center gap-1.5 mt-3 text-sm text-gray-600">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formatDate(event.startDate)}
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 mt-1.5 text-sm text-gray-600">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {event.format === 'VIRTUAL'
            ? 'Virtual'
            : event.city && event.state
              ? `${event.city}, ${event.state}`
              : event.venue || 'Location TBD'}
        </div>

        {/* Interest counts */}
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span>{event.interestedCount} interested</span>
          <span>{event.goingCount} going</span>
        </div>

        {/* Creator + actions */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Avatar name={event.creator.name} src={event.creator.image} size="sm" />
            <span className="text-sm text-gray-600">{event.creator.name}</span>
          </div>
          <div className="flex gap-1.5">
            <Button
              variant={event.userInterest === 'INTERESTED' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => handleInterest('INTERESTED')}
              disabled={markInterest.isPending || removeInterest.isPending}
            >
              Interested
            </Button>
            <Button
              variant={event.userInterest === 'GOING' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handleInterest('GOING')}
              disabled={markInterest.isPending || removeInterest.isPending}
            >
              Going
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function EventCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="w-full h-40 rounded-none" />
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-14" />
        </div>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </Card>
  );
}

export default function EventsPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<EventType | ''>('');
  const [format, setFormat] = useState<EventFormat | ''>('');
  const [page, setPage] = useState(1);
  const limit = 12;

  const { data, isLoading } = useEvents({
    page,
    limit,
    search: search || undefined,
    type: type || undefined,
    format: format || undefined,
  });

  const events = data?.data ?? [];
  const hasMore = data ? page < data.totalPages : false;

  return (
    <CommunityShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Events</h1>
            <p className="text-gray-500 mt-1">Browse and join upcoming community events</p>
          </div>
          <Link href="/events/create">
            <Button>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Event
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                variant="search"
                placeholder="Search events..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={type}
                onValueChange={(val) => {
                  setType(val as EventType | '');
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={format}
                onValueChange={(val) => {
                  setFormat(val as EventFormat | '');
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Formats" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Formats</SelectItem>
                  {EVENT_FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Events Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">No events found</h3>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or create a new event.</p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </CommunityShell>
  );
}
