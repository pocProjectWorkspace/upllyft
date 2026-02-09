'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookingShell } from '@/components/booking-shell';
import {
  useBooking,
  useCancelBooking,
  useRateSession,
} from '@/hooks/use-marketplace';
import {
  bookingStatusLabels,
  bookingStatusColors,
  formatDate,
  formatTime,
  formatCurrency,
  formatDuration,
} from '@/lib/utils';
import {
  Card,
  Badge,
  Avatar,
  Skeleton,
  Separator,
  Textarea,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@upllyft/ui';

// ── Inline SVG Icons ──

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

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

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
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

function CurrencyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function StarIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={filled ? 0 : 1.5}
        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

// ── Rating Stars Component ──

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon
          key={star}
          className={`w-4 h-4 ${star <= Math.round(rating) ? 'text-amber-400' : 'text-gray-300'}`}
          filled={star <= Math.round(rating)}
        />
      ))}
    </div>
  );
}

// ── Interactive Star Rating ──

function StarRatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) {
  const [hoverValue, setHoverValue] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHoverValue(star)}
          onMouseLeave={() => setHoverValue(0)}
          onClick={() => onChange(star)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <StarIcon
            className={`w-8 h-8 ${
              star <= (hoverValue || value) ? 'text-amber-400' : 'text-gray-300'
            }`}
            filled={star <= (hoverValue || value)}
          />
        </button>
      ))}
    </div>
  );
}

// ── Detail skeleton ──

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </div>
  );
}

// ── Main page ──

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: booking, isLoading } = useBooking(id);
  const cancelBooking = useCancelBooking();
  const rateSession = useRateSession();

  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  if (isLoading) {
    return (
      <BookingShell>
        <DetailSkeleton />
      </BookingShell>
    );
  }

  if (!booking) {
    return (
      <BookingShell>
        <div className="text-center py-20">
          <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">Booking not found</h3>
          <p className="text-gray-500 mt-1">This booking may have been removed.</p>
          <Button
            variant="outline"
            className="mt-4 rounded-xl"
            onClick={() => router.push('/bookings')}
          >
            Back to Bookings
          </Button>
        </div>
      </BookingShell>
    );
  }

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
  const hasRating = booking.ratings && booking.ratings.length > 0;

  const handleCancel = () => {
    cancelBooking.mutate(
      { id: booking.id, data: cancelReason ? { reason: cancelReason } : undefined },
      {
        onSuccess: () => {
          setCancelReason('');
        },
      },
    );
  };

  const handleSubmitRating = () => {
    if (ratingValue === 0) return;
    rateSession.mutate(
      {
        bookingId: booking.id,
        data: {
          rating: ratingValue,
          reviewText: reviewText || undefined,
        },
      },
      {
        onSuccess: () => {
          setShowRatingDialog(false);
          setRatingValue(0);
          setReviewText('');
        },
      },
    );
  };

  return (
    <BookingShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.push('/bookings')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Bookings</span>
        </button>

        {/* Header card */}
        <Card className="rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar src={avatarUrl || undefined} name={therapistName} size="xl" className="w-14 h-14 border-2 border-white/30" />
                <div>
                  <h1 className="text-xl font-bold text-white">{therapistName}</h1>
                  <p className="text-teal-100">{sessionName}</p>
                </div>
              </div>
              <Badge color={statusColor as 'green' | 'blue' | 'yellow' | 'red' | 'gray' | 'purple'}>
                {statusLabel}
              </Badge>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Session Details */}
          <Card className="rounded-2xl">
            <div className="p-6 pb-0">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <CalendarIcon className="w-5 h-5 text-teal-500" />
                Session Details
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Date
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(booking.startDateTime)}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <ClockIcon className="w-4 h-4" />
                  Time
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {formatTime(booking.startDateTime)} - {formatTime(booking.endDateTime)}
                </span>
              </div>
              <Separator />
              {duration && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 flex items-center gap-2">
                      <ClockIcon className="w-4 h-4" />
                      Duration
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatDuration(duration)}
                    </span>
                  </div>
                  <Separator />
                </>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <GlobeIcon className="w-4 h-4" />
                  Timezone
                </span>
                <span className="text-sm font-medium text-gray-900">{booking.timezone}</span>
              </div>
              {booking.patientNotes && (
                <>
                  <Separator />
                  <div>
                    <span className="text-sm text-gray-500 flex items-center gap-2 mb-2">
                      <ChatIcon className="w-4 h-4" />
                      Your Notes
                    </span>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">
                      {booking.patientNotes}
                    </p>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Payment Section */}
          <Card className="rounded-2xl">
            <div className="p-6 pb-0">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <CurrencyIcon className="w-5 h-5 text-teal-500" />
                Payment
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Session fee</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(booking.sessionPrice, booking.currency)}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Platform fee</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(booking.platformFee, booking.currency)}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-gray-900">Total</span>
                <span className="text-lg font-bold text-teal-600">
                  {formatCurrency(booking.sessionPrice + booking.platformFee, booking.currency)}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Actions */}
        <Card className="rounded-2xl">
          <div className="p-6">
            <div className="flex flex-wrap items-center gap-3">
              {/* CONFIRMED: Join Session + Cancel */}
              {booking.status === 'CONFIRMED' && (
                <>
                  {booking.meetLink && (
                    <Button
                      className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white"
                      onClick={() => window.open(booking.meetLink!, '_blank')}
                    >
                      <VideoIcon className="w-4 h-4 mr-2" />
                      Join Session
                    </Button>
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="rounded-xl text-red-600 border-red-200 hover:bg-red-50">
                        <XIcon className="w-4 h-4 mr-2" />
                        Cancel Booking
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. The therapist will be notified of the cancellation.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="py-2">
                        <Textarea
                          placeholder="Reason for cancellation (optional)"
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          className="rounded-xl"
                          rows={3}
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Keep Booking</AlertDialogCancel>
                        <AlertDialogAction
                          className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
                          onClick={handleCancel}
                          disabled={cancelBooking.isPending}
                        >
                          {cancelBooking.isPending ? 'Cancelling...' : 'Yes, Cancel'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}

              {/* COMPLETED: Rate */}
              {booking.status === 'COMPLETED' && !hasRating && (
                <Button
                  className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white"
                  onClick={() => setShowRatingDialog(true)}
                >
                  <StarIcon className="w-4 h-4 mr-2" filled />
                  Rate Session
                </Button>
              )}

              {/* PENDING_ACCEPTANCE: Cancel */}
              {booking.status === 'PENDING_ACCEPTANCE' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="rounded-xl text-red-600 border-red-200 hover:bg-red-50">
                      <XIcon className="w-4 h-4 mr-2" />
                      Cancel Request
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel this booking request?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Your booking request will be cancelled. You can book again anytime.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Keep Request</AlertDialogCancel>
                      <AlertDialogAction
                        className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => cancelBooking.mutate({ id: booking.id })}
                        disabled={cancelBooking.isPending}
                      >
                        {cancelBooking.isPending ? 'Cancelling...' : 'Yes, Cancel'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {/* Cancelled info */}
              {booking.status === 'CANCELLED' && booking.cancellationReason && (
                <div className="w-full p-4 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-sm font-medium text-red-800 mb-1">Cancellation Reason</p>
                  <p className="text-sm text-red-700">{booking.cancellationReason}</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Existing ratings */}
        {hasRating && (
          <Card className="rounded-2xl">
            <div className="p-6 pb-0">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <StarIcon className="w-5 h-5 text-amber-400" filled />
                Your Review
              </h3>
            </div>
            <div className="p-6">
              {booking.ratings!.map((rating) => (
                <div key={rating.id} className="space-y-2">
                  <RatingStars rating={rating.rating} />
                  {rating.review && (
                    <p className="text-sm text-gray-700 mt-2">{rating.review}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {new Date(rating.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Rating dialog */}
        <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
          <DialogContent className="rounded-2xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Rate Your Session</DialogTitle>
              <DialogDescription>
                Share your experience with {therapistName}. Your feedback helps others find the right therapist.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-medium text-gray-700">How was your session?</p>
                <StarRatingInput value={ratingValue} onChange={setRatingValue} />
                {ratingValue > 0 && (
                  <p className="text-sm text-gray-500">
                    {ratingValue === 1 && 'Poor'}
                    {ratingValue === 2 && 'Fair'}
                    {ratingValue === 3 && 'Good'}
                    {ratingValue === 4 && 'Very Good'}
                    {ratingValue === 5 && 'Excellent'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Write a review (optional)
                </label>
                <Textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Tell us about your experience..."
                  rows={4}
                  className="rounded-xl"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setShowRatingDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white"
                onClick={handleSubmitRating}
                disabled={ratingValue === 0 || rateSession.isPending}
              >
                {rateSession.isPending ? 'Submitting...' : 'Submit Review'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </BookingShell>
  );
}
