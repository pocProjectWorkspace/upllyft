'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookingShell } from '@/components/booking-shell';
import {
  useMyTherapistProfile,
  useTherapistAnalytics,
  useMyBookings,
  useStripeDashboardLink,
} from '@/hooks/use-marketplace';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Card,
  Badge,
  Avatar,
  Skeleton,
  Separator,
  Button,
} from '@upllyft/ui';
import type { Booking } from '@/lib/api/marketplace';

// ── Inline SVG Icons ──

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

function TrendUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
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

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

// ── Monthly earnings aggregation ──

function aggregateMonthlyEarnings(bookings: Booking[]): { month: string; earnings: number; count: number }[] {
  const now = new Date();
  const months: { month: string; earnings: number; count: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    months.push({ month: label, earnings: 0, count: 0 });
  }

  for (const booking of bookings) {
    if (booking.status !== 'COMPLETED') continue;
    const d = new Date(booking.completedAt || booking.endDateTime);
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const entry = months.find((m) => m.month === label);
    if (entry) {
      entry.earnings += booking.therapistPayout;
      entry.count += 1;
    }
  }

  return months;
}

// ── Page ──

export default function TherapistEarningsPage() {
  const router = useRouter();
  const { data: profile, isLoading: profileLoading, isError: profileError } = useMyTherapistProfile();
  const { data: analytics, isLoading: analyticsLoading } = useTherapistAnalytics();
  const { data: completedBookings, isLoading: bookingsLoading } = useMyBookings('COMPLETED');
  const stripeDashboard = useStripeDashboardLink();

  useEffect(() => {
    if (!profileLoading && (profileError || !profile)) {
      router.replace('/therapist/setup');
    }
  }, [profileLoading, profileError, profile, router]);

  const monthlyData = useMemo(
    () => aggregateMonthlyEarnings(completedBookings ?? []),
    [completedBookings],
  );

  const maxEarnings = useMemo(
    () => Math.max(...monthlyData.map((m) => m.earnings), 1),
    [monthlyData],
  );

  const thisMonthEarnings = monthlyData[monthlyData.length - 1]?.earnings ?? 0;
  const lastMonthEarnings = monthlyData[monthlyData.length - 2]?.earnings ?? 0;
  const monthOverMonth = lastMonthEarnings > 0
    ? ((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings * 100).toFixed(0)
    : null;

  const avgPerSession = analytics && analytics.totalBookings > 0
    ? analytics.totalRevenue / analytics.totalBookings
    : 0;

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
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </BookingShell>
    );
  }

  if (!profile) return null;

  const statCards = [
    {
      label: 'Total Earnings',
      value: formatCurrency(analytics?.totalRevenue ?? 0),
      icon: <CurrencyIcon className="w-6 h-6 text-green-600" />,
      gradient: 'from-green-50 to-green-100',
    },
    {
      label: 'This Month',
      value: formatCurrency(thisMonthEarnings),
      subtext: monthOverMonth !== null ? `${Number(monthOverMonth) >= 0 ? '+' : ''}${monthOverMonth}% vs last month` : undefined,
      icon: <TrendUpIcon className="w-6 h-6 text-teal-600" />,
      gradient: 'from-teal-50 to-teal-100',
    },
    {
      label: 'Avg Per Session',
      value: formatCurrency(avgPerSession),
      icon: <ChartIcon className="w-6 h-6 text-blue-600" />,
      gradient: 'from-blue-50 to-blue-100',
    },
    {
      label: 'Completed Sessions',
      value: analytics?.totalBookings ?? 0,
      subtext: analytics?.completionRate ? `${(analytics.completionRate * 100).toFixed(0)}% completion rate` : undefined,
      icon: <CalendarIcon className="w-6 h-6 text-purple-600" />,
      gradient: 'from-purple-50 to-purple-100',
    },
  ];

  return (
    <BookingShell>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Earnings & Payouts</h1>
            <p className="text-gray-500 mt-1">Track your revenue and payout history</p>
          </div>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => stripeDashboard.mutate()}
            disabled={stripeDashboard.isPending}
          >
            <ExternalLinkIcon className="w-4 h-4 mr-2" />
            Stripe Dashboard
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className={`rounded-2xl bg-gradient-to-br ${stat.gradient} border-0`}>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {analyticsLoading ? <Skeleton className="h-8 w-20" /> : stat.value}
                    </p>
                    {stat.subtext && (
                      <p className="text-xs text-gray-500 mt-1">{stat.subtext}</p>
                    )}
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-white/60 flex items-center justify-center">
                    {stat.icon}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Monthly Earnings Chart */}
        <Card className="rounded-2xl">
          <div className="p-6 pb-0">
            <h3 className="flex items-center gap-2 font-semibold">
              <ChartIcon className="w-5 h-5 text-teal-600" />
              Monthly Earnings
            </h3>
            <p className="text-sm text-gray-500">Last 6 months</p>
          </div>
          <div className="p-6">
            {bookingsLoading ? (
              <div className="flex items-end gap-4 h-48">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="flex-1 rounded-t-lg" style={{ height: `${20 + Math.random() * 60}%` }} />
                ))}
              </div>
            ) : (
              <div className="flex items-end gap-4 h-48">
                {monthlyData.map((m) => {
                  const height = maxEarnings > 0 ? (m.earnings / maxEarnings) * 100 : 0;
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-xs font-medium text-gray-700">
                        {m.earnings > 0 ? formatCurrency(m.earnings) : ''}
                      </span>
                      <div className="w-full relative" style={{ height: '160px' }}>
                        <div
                          className="absolute bottom-0 w-full rounded-t-lg bg-gradient-to-t from-teal-500 to-teal-400 transition-all duration-500"
                          style={{ height: `${Math.max(height, 2)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{m.month}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Payout History */}
        <Card className="rounded-2xl">
          <div className="p-6 pb-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 font-semibold">
                  <CurrencyIcon className="w-5 h-5 text-green-600" />
                  Payout History
                </h3>
                <p className="text-sm text-gray-500">Completed sessions and earnings</p>
              </div>
              <Link href="/therapist/bookings">
                <Button variant="outline" size="sm" className="rounded-xl">
                  All Bookings
                </Button>
              </Link>
            </div>
          </div>
          <div className="p-6">
            {bookingsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : !completedBookings || completedBookings.length === 0 ? (
              <div className="text-center py-12">
                <CurrencyIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No completed sessions yet</p>
                <p className="text-sm text-gray-400 mt-1">Earnings will appear here after your first completed session</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedBookings.slice(0, 20).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={booking.patient?.image || undefined}
                        name={booking.patient?.name || 'Patient'}
                        size="md"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {booking.patient?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {booking.sessionType?.name} &middot; {formatDate(booking.completedAt || booking.endDateTime)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">
                        +{formatCurrency(booking.therapistPayout, booking.currency)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Fee: {formatCurrency(booking.platformFee, booking.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Stripe info footer */}
        <Card className="rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border-0">
          <div className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Need detailed payout reports?</p>
              <p className="text-xs text-gray-500 mt-0.5">
                View transaction details, payout schedules, and tax documents in your Stripe dashboard.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl shrink-0"
              onClick={() => stripeDashboard.mutate()}
              disabled={stripeDashboard.isPending}
            >
              Open Stripe
            </Button>
          </div>
        </Card>
      </div>
    </BookingShell>
  );
}
