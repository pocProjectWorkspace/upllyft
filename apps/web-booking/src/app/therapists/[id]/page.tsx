'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookingShell } from '@/components/booking-shell';
import {
  useTherapistProfile,
  useSessionPricing,
  useTherapistRatings,
  useTherapistRatingStats,
} from '@/hooks/use-marketplace';
import { formatCurrency } from '@/lib/utils';
import {
  Card,
  Badge,
  Avatar,
  Skeleton,
  Separator,
  Button,
} from '@upllyft/ui';

// ── Inline SVG Icons ──

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
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

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
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

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

// ── Rating stars ──

function RatingStars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon
          key={star}
          className={`${sizeClass} ${star <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
          filled={star <= Math.round(rating)}
        />
      ))}
    </div>
  );
}

// ── Profile skeleton ──

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6">
        <Skeleton className="w-24 h-24 rounded-full" />
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-5 w-64 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}

// ── Page component ──

export default function TherapistProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [reviewPage, setReviewPage] = useState(1);

  const { data: therapist, isLoading } = useTherapistProfile(id);
  const { data: pricing } = useSessionPricing(id);
  const { data: ratingsData } = useTherapistRatings(id, reviewPage);
  const { data: ratingStats } = useTherapistRatingStats(id);

  const name = therapist?.user?.name ?? 'Therapist';
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const avatarUrl = therapist?.profileImage || therapist?.user?.image;

  // Find lowest price for display
  const lowestPrice = pricing && pricing.length > 0
    ? Math.min(...pricing.map((p) => p.price))
    : null;

  return (
    <BookingShell>
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Search</span>
        </button>

        {isLoading ? (
          <ProfileSkeleton />
        ) : !therapist ? (
          <div className="text-center py-20">
            <UserIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">Therapist not found</h3>
            <p className="text-gray-500 mt-1">This profile may no longer be available.</p>
          </div>
        ) : (
          <>
            {/* Hero Section */}
            <Card className="rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-teal-500 to-teal-600 h-32" />
              <div className="p-6 -mt-16">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <Avatar src={avatarUrl || undefined} name={name} size="xl" className="w-24 h-24 border-4 border-white shadow-lg" />
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
                    <p className="text-gray-600 mt-0.5">{therapist.title}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <RatingStars rating={therapist.overallRating} size="lg" />
                      <span className="ml-1 text-lg font-semibold text-gray-800">
                        {therapist.overallRating.toFixed(1)}
                      </span>
                      <span className="text-sm text-gray-500 ml-1">
                        ({therapist.totalRatings} review{therapist.totalRatings !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1.5">
                        <UsersIcon className="w-4 h-4 text-teal-500" />
                        {therapist.totalSessions} sessions
                      </span>
                      <span className="flex items-center gap-1.5">
                        <BriefcaseIcon className="w-4 h-4 text-teal-500" />
                        {therapist.yearsExperience} years experience
                      </span>
                      <span className="flex items-center gap-1.5">
                        <GlobeIcon className="w-4 h-4 text-teal-500" />
                        {therapist.languages.join(', ')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Main content + Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left column */}
              <div className="lg:col-span-2 space-y-6">
                {/* About */}
                <Card className="rounded-2xl">
                  <div className="p-6 pb-0">
                    <h3 className="text-lg font-semibold">About</h3>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {therapist.bio || 'No bio provided.'}
                    </p>
                  </div>
                </Card>

                {/* Specializations */}
                <Card className="rounded-2xl">
                  <div className="p-6 pb-0">
                    <h3 className="text-lg font-semibold">Specializations</h3>
                  </div>
                  <div className="p-6">
                    <div className="flex flex-wrap gap-2">
                      {therapist.specializations.map((spec) => (
                        <Badge key={spec} color="blue">
                          {spec}
                        </Badge>
                      ))}
                      {therapist.specializations.length === 0 && (
                        <p className="text-sm text-gray-500">No specializations listed.</p>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Credentials */}
                <Card className="rounded-2xl">
                  <div className="p-6 pb-0">
                    <h3 className="flex items-center gap-2 text-lg font-semibold">
                      <ShieldCheckIcon className="w-5 h-5 text-teal-500" />
                      Credentials
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="flex flex-wrap gap-2">
                      {therapist.credentials.map((cred) => (
                        <Badge key={cred} color="green">
                          {cred}
                        </Badge>
                      ))}
                      {therapist.credentials.length === 0 && (
                        <p className="text-sm text-gray-500">No credentials listed.</p>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Reviews */}
                <Card className="rounded-2xl">
                  <div className="p-6 pb-0">
                    <h3 className="text-lg font-semibold">
                      Reviews
                      {ratingStats && (
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          ({ratingStats.totalRatings} total)
                        </span>
                      )}
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {/* Rating distribution */}
                    {ratingStats && ratingStats.totalRatings > 0 && (
                      <div className="space-y-2 mb-6">
                        {[5, 4, 3, 2, 1].map((star) => {
                          const count = ratingStats.distribution[String(star)] ?? 0;
                          const pct = ratingStats.totalRatings > 0
                            ? (count / ratingStats.totalRatings) * 100
                            : 0;
                          return (
                            <div key={star} className="flex items-center gap-2 text-sm">
                              <span className="w-3 text-gray-600">{star}</span>
                              <StarIcon className="w-3.5 h-3.5 text-yellow-400" filled />
                              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-yellow-400 h-full rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="w-8 text-right text-gray-500">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <Separator />

                    {/* Review list */}
                    {ratingsData?.ratings && ratingsData.ratings.length > 0 ? (
                      <div className="space-y-4 pt-2">
                        {ratingsData.ratings.map((rating) => (
                          <div key={rating.id} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <RatingStars rating={rating.rating} />
                              <span className="text-xs text-gray-400">
                                {new Date(rating.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                            {rating.review && (
                              <p className="text-sm text-gray-700">{rating.review}</p>
                            )}
                            <Separator />
                          </div>
                        ))}

                        {/* Review pagination */}
                        {ratingsData.pagination.totalPages > 1 && (
                          <div className="flex items-center justify-center gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl"
                              disabled={reviewPage <= 1}
                              onClick={() => setReviewPage((p) => p - 1)}
                            >
                              Previous
                            </Button>
                            <span className="text-sm text-gray-500">
                              Page {reviewPage} of {ratingsData.pagination.totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl"
                              disabled={reviewPage >= ratingsData.pagination.totalPages}
                              onClick={() => setReviewPage((p) => p + 1)}
                            >
                              Next
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No reviews yet.</p>
                    )}
                  </div>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  <Card className="rounded-2xl">
                    <div className="p-6 pb-0">
                      <h3 className="text-lg font-semibold">Book a Session</h3>
                    </div>
                    <div className="p-6 space-y-4">
                      {/* Pricing */}
                      {pricing && pricing.length > 0 ? (
                        <div className="space-y-3">
                          {pricing.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {p.sessionType?.name ?? 'Session'}
                                </p>
                                {p.sessionType && (
                                  <p className="text-xs text-gray-500">{p.sessionType.duration} min</p>
                                )}
                              </div>
                              <span className="text-lg font-bold text-teal-600">
                                {formatCurrency(p.price, p.currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : lowestPrice !== null ? (
                        <div className="text-center">
                          <span className="text-sm text-gray-500">Starting from</span>
                          <p className="text-2xl font-bold text-teal-600">
                            {formatCurrency(lowestPrice)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center">
                          Contact for pricing information
                        </p>
                      )}

                      <Button
                        className="w-full rounded-xl h-12 text-base bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white"
                        onClick={() => router.push(`/book/${therapist.id}`)}
                        disabled={!therapist.acceptingBookings}
                      >
                        {therapist.acceptingBookings ? 'Book Session' : 'Not Accepting Bookings'}
                      </Button>

                      {!therapist.acceptingBookings && (
                        <p className="text-xs text-center text-gray-500">
                          This therapist is not currently accepting new bookings.
                        </p>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </BookingShell>
  );
}
