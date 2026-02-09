'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookingShell } from '@/components/booking-shell';
import {
  useMyTherapistProfile,
  useTherapistAnalytics,
  useMyBookings,
  useAcceptBooking,
  useRejectBooking,
  useMySessionTypes,
  useMyAvailability,
} from '@/hooks/use-marketplace';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  Button,
  Card,
  Badge,
  Avatar,
  Skeleton,
} from '@upllyft/ui';

export default function TherapistDashboardPage() {
  const router = useRouter();
  const { data: profile, isLoading: profileLoading, isError: profileError } = useMyTherapistProfile();
  const { data: analytics, isLoading: analyticsLoading } = useTherapistAnalytics();
  const { data: pendingBookings, isLoading: pendingLoading } = useMyBookings('PENDING_ACCEPTANCE');
  const { data: upcomingBookings } = useMyBookings('CONFIRMED');
  const { data: sessionTypes } = useMySessionTypes();
  const { data: availability } = useMyAvailability();
  const acceptBooking = useAcceptBooking();
  const rejectBooking = useRejectBooking();

  useEffect(() => {
    if (!profileLoading && (profileError || !profile)) {
      router.replace('/therapist/setup');
    }
  }, [profileLoading, profileError, profile, router]);

  if (profileLoading) {
    return (
      <BookingShell>
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </BookingShell>
    );
  }

  if (!profile) return null;

  const hasSessionTypes = sessionTypes && sessionTypes.length > 0;
  const hasAvailability = availability && availability.recurring && availability.recurring.length > 0;

  const statCards = [
    {
      label: 'Total Sessions',
      value: analytics?.totalBookings ?? 0,
      icon: (
        <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      gradient: 'from-teal-50 to-teal-100',
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(analytics?.totalRevenue ?? 0),
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: 'from-green-50 to-green-100',
    },
    {
      label: 'Average Rating',
      value: analytics?.averageRating ? `${analytics.averageRating.toFixed(1)} / 5` : 'N/A',
      icon: (
        <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ),
      gradient: 'from-amber-50 to-amber-100',
    },
    {
      label: 'Pending Requests',
      value: analytics?.pendingRequests ?? 0,
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: 'from-blue-50 to-blue-100',
    },
  ];

  return (
    <BookingShell>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {profile.user?.name?.split(' ')[0] || 'Therapist'}
          </h1>
          <p className="text-gray-500 mt-1">Here is an overview of your practice</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className={`rounded-2xl bg-gradient-to-br ${stat.gradient} border-0`}>
              <div className="pt-6 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {analyticsLoading ? <Skeleton className="h-8 w-20" /> : stat.value}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-white/60 flex items-center justify-center">
                    {stat.icon}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Onboarding Checklist */}
        <Card className="rounded-2xl">
          <div className="p-6 pb-0">
            <h3 className="flex items-center gap-2 font-semibold">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Getting Started
            </h3>
            <p className="text-sm text-gray-500">Complete these steps to start receiving bookings</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-green-700">Profile created</span>
              </div>

              <Link
                href="/therapist/pricing"
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  hasSessionTypes ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    hasSessionTypes ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  {hasSessionTypes ? (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-white text-xs font-bold">2</span>
                  )}
                </div>
                <span className={`text-sm font-medium ${hasSessionTypes ? 'text-green-700' : 'text-gray-700'}`}>
                  Set up session types & pricing
                </span>
                {!hasSessionTypes && (
                  <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </Link>

              <Link
                href="/therapist/availability"
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  hasAvailability ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    hasAvailability ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  {hasAvailability ? (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-white text-xs font-bold">3</span>
                  )}
                </div>
                <span className={`text-sm font-medium ${hasAvailability ? 'text-green-700' : 'text-gray-700'}`}>
                  Set your availability
                </span>
                {!hasAvailability && (
                  <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </Link>
            </div>
          </div>
        </Card>

        {/* Pending Requests */}
        <Card className="rounded-2xl">
          <div className="p-6 pb-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 font-semibold">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Pending Requests
                  {pendingBookings && pendingBookings.length > 0 && (
                    <Badge color="blue" className="ml-2">{pendingBookings.length}</Badge>
                  )}
                </h3>
              </div>
              <Link href="/therapist/bookings">
                <Button variant="outline" size="sm" className="rounded-xl">
                  View All
                </Button>
              </Link>
            </div>
          </div>
          <div className="p-6">
            {pendingLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : !pendingBookings || pendingBookings.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-sm">No pending requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingBookings.slice(0, 5).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar src={booking.patient?.image || undefined} name={booking.patient?.name || 'Unknown'} size="md" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{booking.patient?.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">
                          {booking.sessionType?.name} &middot; {formatDateTime(booking.startDateTime)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => acceptBooking.mutate(booking.id)}
                        disabled={acceptBooking.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectBooking.mutate({ id: booking.id, data: { reason: 'Declined from dashboard' } })}
                        disabled={rejectBooking.isPending}
                        className="rounded-xl text-red-600 border-red-200 hover:bg-red-50"
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Upcoming Sessions */}
        {upcomingBookings && upcomingBookings.length > 0 && (
          <Card className="rounded-2xl">
            <div className="p-6 pb-0">
              <h3 className="flex items-center gap-2 font-semibold">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Upcoming Sessions
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {upcomingBookings.slice(0, 3).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar src={booking.patient?.image || undefined} name={booking.patient?.name || 'Unknown'} size="md" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{booking.patient?.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">
                          {booking.sessionType?.name} &middot; {formatDateTime(booking.startDateTime)}
                        </p>
                      </div>
                    </div>
                    <Badge color="green">Confirmed</Badge>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-8">
          {[
            { label: 'Profile', href: '/therapist/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
            { label: 'Pricing', href: '/therapist/pricing', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Availability', href: '/therapist/availability', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Settings', href: '/therapist/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
          ].map((action) => (
            <Link key={action.label} href={action.href}>
              <Card className="rounded-2xl hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className="pt-6 p-6 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{action.label}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </BookingShell>
  );
}
