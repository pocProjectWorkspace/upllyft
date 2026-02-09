'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookingShell } from '@/components/booking-shell';
import {
  useMyBookings,
  useAcceptBooking,
  useRejectBooking,
} from '@/hooks/use-marketplace';
import {
  formatCurrency,
  formatDuration,
  formatDateTime,
  formatDate,
  bookingStatusLabels,
  bookingStatusColors,
} from '@/lib/utils';
import type { Booking, BookingStatus } from '@/lib/api/marketplace';
import {
  Button,
  Card,
  Badge,
  Avatar,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Textarea,
  Label,
  toast,
} from '@upllyft/ui';

function BookingCard({
  booking,
  onAccept,
  onRejectOpen,
  isAccepting,
  showActions,
}: {
  booking: Booking;
  onAccept?: (id: string) => void;
  onRejectOpen?: (booking: Booking) => void;
  isAccepting?: boolean;
  showActions?: boolean;
}) {
  const statusColor = bookingStatusColors[booking.status] as 'green' | 'blue' | 'yellow' | 'red' | 'gray';

  return (
    <Card className="rounded-2xl">
      <div className="pt-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <Avatar src={booking.patient?.image || undefined} name={booking.patient?.name || 'Unknown'} size="lg" className="shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-gray-900">
                  {booking.patient?.name || 'Unknown Patient'}
                </h3>
                <Badge color={statusColor}>
                  {bookingStatusLabels[booking.status]}
                </Badge>
              </div>
              <div className="mt-1.5 space-y-1">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{formatDateTime(booking.startDateTime)}</span>
                </div>
                {booking.sessionType && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      {booking.sessionType.name} &middot; {formatDuration(booking.sessionType.duration)}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{formatCurrency(booking.sessionPrice, booking.currency)}</span>
                </div>
              </div>
              {booking.patientNotes && (
                <div className="mt-2 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-xs text-gray-500 font-medium mb-0.5">Patient Notes</p>
                  <p className="text-sm text-gray-700">{booking.patientNotes}</p>
                </div>
              )}
            </div>
          </div>

          {showActions && (
            <div className="flex flex-col gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => onAccept?.(booking.id)}
                disabled={isAccepting}
                className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRejectOpen?.(booking)}
                className="rounded-xl text-red-600 border-red-200 hover:bg-red-50"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reject
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-700 mb-1">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-40 rounded-2xl" />
      ))}
    </div>
  );
}

export default function TherapistBookingsPage() {
  const { data: pendingBookings, isLoading: pendingLoading } = useMyBookings('PENDING_ACCEPTANCE');
  const { data: confirmedBookings, isLoading: confirmedLoading } = useMyBookings('CONFIRMED');
  const { data: completedBookings, isLoading: completedLoading } = useMyBookings('COMPLETED');
  const acceptBooking = useAcceptBooking();
  const rejectBooking = useRejectBooking();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Booking | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  function handleAccept(id: string) {
    acceptBooking.mutate(id);
  }

  function openReject(booking: Booking) {
    setRejectTarget(booking);
    setRejectReason('');
    setRejectOpen(true);
  }

  function handleReject() {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      toast({ title: 'Please provide a reason', variant: 'destructive' });
      return;
    }
    rejectBooking.mutate(
      { id: rejectTarget.id, data: { reason: rejectReason.trim() } },
      {
        onSuccess: () => {
          setRejectOpen(false);
          setRejectTarget(null);
          setRejectReason('');
        },
      },
    );
  }

  const pendingCount = pendingBookings?.length || 0;
  const confirmedCount = confirmedBookings?.length || 0;
  const completedCount = completedBookings?.length || 0;

  return (
    <BookingShell>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
            <p className="text-gray-500 mt-1">Manage your session requests and appointments</p>
          </div>
          <Link href="/therapist/dashboard">
            <Button variant="outline" className="rounded-xl">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="bg-white border rounded-xl p-1">
            <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700">
              <span className="flex items-center gap-2">
                Pending
                {pendingCount > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                    {pendingCount}
                  </span>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger value="confirmed" className="rounded-lg data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700">
              <span className="flex items-center gap-2">
                Confirmed
                {confirmedCount > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                    {confirmedCount}
                  </span>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-lg data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700">
              <span className="flex items-center gap-2">
                Completed
                {completedCount > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                    {completedCount}
                  </span>
                )}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Pending Tab */}
          <TabsContent value="pending" className="space-y-4">
            {pendingLoading ? (
              <LoadingSkeleton />
            ) : pendingCount === 0 ? (
              <EmptyState
                title="No Pending Requests"
                description="New booking requests from patients will appear here"
              />
            ) : (
              <div className="space-y-4">
                {pendingBookings!.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onAccept={handleAccept}
                    onRejectOpen={openReject}
                    isAccepting={acceptBooking.isPending}
                    showActions
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Confirmed Tab */}
          <TabsContent value="confirmed" className="space-y-4">
            {confirmedLoading ? (
              <LoadingSkeleton />
            ) : confirmedCount === 0 ? (
              <EmptyState
                title="No Upcoming Sessions"
                description="Confirmed sessions will appear here"
              />
            ) : (
              <div className="space-y-4">
                {confirmedBookings!.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Completed Tab */}
          <TabsContent value="completed" className="space-y-4">
            {completedLoading ? (
              <LoadingSkeleton />
            ) : completedCount === 0 ? (
              <EmptyState
                title="No Completed Sessions"
                description="Your session history will appear here"
              />
            ) : (
              <div className="space-y-4">
                {completedBookings!.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Reject Dialog */}
        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Reject Booking</DialogTitle>
              <DialogDescription>
                {rejectTarget && (
                  <span>
                    Reject the booking request from{' '}
                    <span className="font-medium text-gray-700">{rejectTarget.patient?.name || 'Unknown'}</span>
                    {' '}on {formatDate(rejectTarget.startDateTime)}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reject-reason">Reason for Rejection *</Label>
                <Textarea
                  id="reject-reason"
                  placeholder="Please provide a reason for rejecting this booking..."
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <p className="text-xs text-gray-400">
                  This reason will be shared with the patient
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={rejectBooking.isPending}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
              >
                {rejectBooking.isPending ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Rejecting...
                  </span>
                ) : (
                  'Reject Booking'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </BookingShell>
  );
}
