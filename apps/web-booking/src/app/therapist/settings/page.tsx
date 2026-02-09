'use client';

import Link from 'next/link';
import { BookingShell } from '@/components/booking-shell';
import {
  useStripeAccountStatus,
  useCreateStripeOnboarding,
  useStripeDashboardLink,
} from '@/hooks/use-marketplace';
import {
  Button,
  Card,
  Badge,
  Skeleton,
  Separator,
} from '@upllyft/ui';

export default function TherapistSettingsPage() {
  const { data: stripeStatus, isLoading: stripeLoading } = useStripeAccountStatus();
  const createOnboarding = useCreateStripeOnboarding();
  const dashboardLink = useStripeDashboardLink();

  const isConnected = stripeStatus?.hasAccount && stripeStatus.chargesEnabled && stripeStatus.payoutsEnabled;
  const isIncomplete = stripeStatus?.hasAccount && !stripeStatus.chargesEnabled;

  return (
    <BookingShell>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-500 mt-1">Manage your payment and account settings</p>
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

        {/* Stripe Connect */}
        <Card className="rounded-2xl">
          <div className="p-6 pb-0">
            <h3 className="flex items-center gap-2 font-semibold">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              Payment Settings
            </h3>
            <p className="text-sm text-gray-500">
              Connect your Stripe account to receive payouts for completed sessions
            </p>
          </div>
          <div className="p-6 space-y-6">
            {stripeLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-10 w-36" />
              </div>
            ) : isConnected ? (
              /* Connected State */
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-800">Stripe Connected</p>
                    <p className="text-xs text-green-600">
                      Account: {stripeStatus.accountId}
                    </p>
                  </div>
                  <Badge color="green" className="ml-auto">Active</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-gray-50 text-center">
                    <p className="text-xs text-gray-500">Charges</p>
                    <p className="text-sm font-semibold text-green-600">
                      {stripeStatus.chargesEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 text-center">
                    <p className="text-xs text-gray-500">Payouts</p>
                    <p className="text-sm font-semibold text-green-600">
                      {stripeStatus.payoutsEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => dashboardLink.mutate()}
                  disabled={dashboardLink.isPending}
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl w-full"
                >
                  {dashboardLink.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Opening...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open Stripe Dashboard
                    </span>
                  )}
                </Button>
              </div>
            ) : isIncomplete ? (
              /* Incomplete State */
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-50 border border-yellow-200">
                  <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-yellow-800">Setup Incomplete</p>
                    <p className="text-xs text-yellow-600">
                      Your Stripe account needs additional information to process payments
                    </p>
                  </div>
                  <Badge color="yellow" className="ml-auto">Incomplete</Badge>
                </div>

                <Button
                  onClick={() => createOnboarding.mutate()}
                  disabled={createOnboarding.isPending}
                  className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white rounded-xl w-full"
                >
                  {createOnboarding.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Opening...
                    </span>
                  ) : (
                    'Complete Stripe Setup'
                  )}
                </Button>
              </div>
            ) : (
              /* Not Connected State */
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">No Stripe Account</p>
                    <p className="text-xs text-gray-500">
                      Connect a Stripe account to receive payments for sessions
                    </p>
                  </div>
                  <Badge color="gray" className="ml-auto">Not Connected</Badge>
                </div>

                <Button
                  onClick={() => createOnboarding.mutate()}
                  disabled={createOnboarding.isPending}
                  className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-xl w-full"
                >
                  {createOnboarding.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Connecting...
                    </span>
                  ) : (
                    'Connect Stripe Account'
                  )}
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Quick Links */}
        <Card className="rounded-2xl">
          <div className="p-6 pb-0">
            <h3 className="flex items-center gap-2 font-semibold">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Quick Links
            </h3>
          </div>
          <div className="p-6 space-y-1">
            {[
              { label: 'Edit Profile', href: '/therapist/profile', description: 'Update your bio, credentials, and specializations', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
              { label: 'Session Types & Pricing', href: '/therapist/pricing', description: 'Manage your services and set your rates', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
              { label: 'Availability', href: '/therapist/availability', description: 'Set your weekly schedule and time slots', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            ].map((link, idx) => (
              <div key={link.label}>
                {idx > 0 && <Separator className="my-1" />}
                <Link
                  href={link.href}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{link.label}</p>
                    <p className="text-xs text-gray-500">{link.description}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </BookingShell>
  );
}
