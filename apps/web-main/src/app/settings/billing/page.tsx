'use client';

import { useAuth, apiClient } from '@upllyft/api-client';
import { AppHeader, Card, Badge, Skeleton } from '@upllyft/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Suspense } from 'react';

function BillingContent() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data } = await apiClient.get('/billing/invoices');
      return data as Array<{
        id: string;
        number: string;
        amount: number;
        currency: string;
        status: string;
        date: string;
        pdfUrl: string;
      }>;
    },
    enabled: isAuthenticated,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    router.replace('/login');
    return null;
  }

  async function handleSubscribe() {
    try {
      const { data } = await apiClient.post('/billing/checkout');
      if (data.url) window.location.href = data.url;
    } catch {
      // handle error
    }
  }

  async function handleManage() {
    try {
      const { data } = await apiClient.post('/billing/portal');
      if (data.url) window.location.href = data.url;
    } catch {
      // handle error
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader currentApp="main" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Billing & Subscription</h1>

        {/* Status Messages */}
        {success && (
          <Card className="p-4 mb-6 bg-teal-50 border-teal-100">
            <p className="text-sm text-teal-700 font-medium">Subscription activated successfully!</p>
          </Card>
        )}
        {canceled && (
          <Card className="p-4 mb-6 bg-amber-50 border-amber-100">
            <p className="text-sm text-amber-700 font-medium">Subscription checkout was canceled.</p>
          </Card>
        )}

        {/* Current Plan */}
        <Card className="p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Current Plan</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-gray-900">Free Plan</p>
              <p className="text-sm text-gray-500">3 AI worksheet generations per month</p>
            </div>
            <button
              onClick={handleSubscribe}
              className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md hover:shadow-lg transition-all"
            >
              Upgrade to Pro
            </button>
          </div>
        </Card>

        {/* Pro Plan Details */}
        <Card className="p-6 mb-6 bg-gradient-to-br from-teal-50 to-blue-50 border-teal-100">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Pro Plan</h3>
              <p className="text-sm text-gray-600 mt-1">20 AI worksheet generations per month + priority support</p>
              <ul className="mt-3 space-y-1.5">
                {[
                  '20 AI-powered worksheets/month',
                  'All worksheet types & data sources',
                  'Priority content generation',
                  'Advanced analytics & recommendations',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-teal-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">$9.99</p>
              <p className="text-xs text-gray-500">/month</p>
            </div>
          </div>
        </Card>

        {/* Invoice History */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Invoice History</h2>
          {invoicesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : invoices && invoices.length > 0 ? (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Invoice #{invoice.number}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(invoice.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium text-gray-900">
                      ${invoice.amount.toFixed(2)}
                    </p>
                    <Badge color={invoice.status === 'paid' ? 'green' : 'yellow'}>
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-6">No invoices yet</p>
          )}
        </Card>
      </main>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <BillingContent />
    </Suspense>
  );
}
