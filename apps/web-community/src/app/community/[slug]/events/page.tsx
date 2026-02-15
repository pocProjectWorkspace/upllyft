'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, Badge, Skeleton } from '@upllyft/ui';
import { CommunityShell } from '@/components/community-shell';
import { useEvents } from '@/hooks/use-events';

function formatLabel(value: string): string {
  return value.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

export default function CommunityEventsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data, isLoading } = useEvents({ communityId: slug });
  const events = data?.data ?? [];

  return (
    <CommunityShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Community Events</h1>
            <p className="text-sm text-gray-500 mt-1">Events organized by this community</p>
          </div>
          <Link href={`/community/${slug}/events/create`}>
            <Button variant="primary" size="sm">Create Event</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-lg font-semibold text-gray-900">No events yet</h3>
            <p className="text-gray-500 mt-1">Be the first to create an event for this community.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <Link key={event.id} href={`/events/${event.id}`}>
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex flex-col items-center justify-center text-white">
                      <span className="text-xs font-medium">
                        {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-lg font-bold leading-none">
                        {new Date(event.startDate).getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge color="teal">{formatLabel(event.type)}</Badge>
                        <Badge color="blue">{formatLabel(event.format)}</Badge>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{event.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(event.startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>{event.interestedCount} interested</span>
                        <span>{event.goingCount} going</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </CommunityShell>
  );
}
