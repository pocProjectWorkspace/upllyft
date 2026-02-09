'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BookingShell } from '@/components/booking-shell';
import { useMyBookings } from '@/hooks/use-marketplace';
import type { Booking, BookingStatus } from '@/lib/api/marketplace';
import {
  bookingStatusLabels,
  bookingStatusColors,
  formatDateTime,
  formatDuration,
} from '@/lib/utils';
import {
  Card,
  Badge,
  Avatar,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button,
} from '@upllyft/ui';

// ── Inline SVG Icons ──

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  );
}

// ── Tab definitions ──

interface TabDef {
  value: string;
  label: string;
  statuses: BookingStatus[];
}

const TABS: TabDef[] = [
  {
    value: 'upcoming',
    label: 'Upcoming',
    statuses: ['CONFIRMED', 'PENDING_ACCEPTANCE', 'PENDING_PAYMENT'],
  },
  {
    value: 'past',
    label: 'Past',
    statuses: ['COMPLETED', 'NO_SHOW'],
  },
  {
    value: 'pending',
    label: 'Pending',
    statuses: ['PENDING_ACCEPTANCE', 'PENDING_PAYMENT'],
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    statuses: ['CANCELLED', 'REJECTED'],
  },
];

// ── Skeleton ──

function BookingCardSkeleton() {
  return (
    <Card className="rounded-2xl">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
    </Card>
  );
}

// ── Empty state ──

function EmptyState({ tabLabel }: { tabLabel: string }) {
  return (
    <div className="text-center py-16">
      <InboxIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-700">No {tabLabel.toLowerCase()} bookings</h3>
      <p className="text-gray-500 mt-1 max-w-sm mx-auto">
        {tabLabel === 'Upcoming'
          ? 'Book a session with a therapist to get started.'
          : `You don't have any ${tabLabel.toLowerCase()} bookings yet.`}
      </p>
    </div>
  );
}

// ── Booking card ──

function BookingCard({ booking }: { booking: Booking }) {
  const router = useRouter();

  const therapistName = booking.therapist?.user?.name ?? 'Therapist';
  const initials = therapistName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const avatarUrl = booking.therapist?.profileImage || booking.therapist?.user?.image;

  const statusLabel = bookingStatusLabels[booking.status] ?? booking.status;
  const statusColor = bookingStatusColors[booking.status] ?? 'gray';

  const sessionName = booking.sessionType?.name ?? 'Session';
  const duration = booking.sessionType?.duration;

  return (
    <Card className="rounded-2xl hover:shadow-md transition-shadow duration-200">
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Therapist avatar */}
          <Avatar src={avatarUrl || undefined} name={therapistName} size="lg" className="border-2 border-teal-100 flex-shrink-0" />

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900">{therapistName}</h3>
                <p className="text-sm text-gray-500">{sessionName}</p>
              </div>
              <Badge color={statusColor as 'green' | 'blue' | 'yellow' | 'red' | 'gray' | 'purple'}>
                {statusLabel}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5" />
                {formatDateTime(booking.startDateTime)}
              </span>
              {duration && (
                <span className="flex items-center gap-1">
                  <ClockIcon className="w-3.5 h-3.5" />
                  {formatDuration(duration)}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => router.push(`/bookings/${booking.id}`)}
              >
                View Details
              </Button>
              {booking.status === 'CONFIRMED' && booking.meetLink && (
                <Button
                  size="sm"
                  className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white"
                  onClick={() => window.open(booking.meetLink!, '_blank')}
                >
                  <VideoIcon className="w-3.5 h-3.5 mr-1" />
                  Join Session
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Main page ──

export default function BookingsPage() {
  const { data: bookings, isLoading } = useMyBookings();

  // Filter bookings by tab
  const getFilteredBookings = (statuses: BookingStatus[]) => {
    if (!bookings) return [];
    return bookings.filter((b) => statuses.includes(b.status));
  };

  // Count bookings per tab
  const tabCounts = useMemo(() => {
    if (!bookings) return {};
    const counts: Record<string, number> = {};
    TABS.forEach((tab) => {
      counts[tab.value] = bookings.filter((b) => tab.statuses.includes(b.status)).length;
    });
    return counts;
  }, [bookings]);

  return (
    <BookingShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          </div>
          <p className="text-gray-500 ml-13">Manage your therapy sessions</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="w-full sm:w-auto">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                {tab.label}
                {(tabCounts[tab.value] ?? 0) > 0 && (
                  <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5 ml-1">
                    {tabCounts[tab.value]}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-6">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <BookingCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                (() => {
                  const filtered = getFilteredBookings(tab.statuses);
                  return filtered.length === 0 ? (
                    <EmptyState tabLabel={tab.label} />
                  ) : (
                    <div className="space-y-4">
                      {filtered.map((booking) => (
                        <BookingCard key={booking.id} booking={booking} />
                      ))}
                    </div>
                  );
                })()
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </BookingShell>
  );
}
