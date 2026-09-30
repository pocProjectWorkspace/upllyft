'use client';

import { Suspense, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { BookingShell } from '@/booking/components/booking-shell';
import { Card } from '@upllyft/ui';
import { getPatientInvoices, useRegion } from '@upllyft/api-client';
import { formatMoney } from '@/lib/money';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Receipt, Search, FileText } from 'lucide-react';
import { InvoiceCard } from './components/invoice-card';

import { RowsSkeleton } from '@/components/skeletons';
function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-100 text-center">
      <h3 className="font-semibold mb-2">Could not load invoices</h3>
      <p className="text-sm mb-4">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-white text-red-700 font-medium rounded-lg border border-red-200 hover:bg-red-50"
      >
        Try again
      </button>
    </div>
  );
}

function InvoicesList() {
  const { currency: regionCurrency } = useRegion();
  const { data, isLoading, error } = useQuery({
    queryKey: ['patient-invoices', { limit: 50 }],
    queryFn: () => getPatientInvoices({ limit: 50 }),
  });

  if (isLoading) {
    return (
      <RowsSkeleton rows={4} />
    );
  }

  if (error) {
    throw error;
  }

  const invoices = data?.invoices || [];
  const summary = data?.summary;
  const totalsByCurrency = summary?.byCurrency?.length
    ? summary.byCurrency
    : [
        {
          // Older API without per-currency totals: label with the invoices' own currency.
          currency: summary?.currency ?? invoices[0]?.currency ?? regionCurrency,
          totalBilled: summary?.totalBilled ?? 0,
          totalPaid: summary?.totalPaid ?? 0,
          totalOutstanding: summary?.totalOutstanding ?? 0,
        },
      ];

  if (invoices.length === 0) {
    return (
      <Card className="p-12 text-center flex flex-col items-center justify-center border-dashed border-2 border-gray-200 bg-gray-50/50">
        <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 mb-4">
          <Receipt className="h-8 w-8 text-gray-300" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">No Invoices Yet</h3>
        <p className="text-gray-500 max-w-sm mx-auto text-sm">
          Once your child completes a session, the clinical invoice record will appear here for your records.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* One row of totals per currency: rupee and dirham invoices are never added up. */}
      {totalsByCurrency.map((t) => (
        <div key={t.currency} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="p-5 border-teal-100 bg-teal-50/30">
            <div className="text-sm font-medium text-teal-800 mb-1">Total Billed</div>
            <div className="text-2xl font-bold text-teal-900">
              {formatMoney(t.totalBilled, t.currency)}
            </div>
          </Card>
          <Card className="p-5">
            <div className="text-sm font-medium text-gray-500 mb-1">Paid</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatMoney(t.totalPaid, t.currency)}
            </div>
          </Card>
          <Card className="p-5">
            <div className="text-sm font-medium text-gray-500 mb-1">Outstanding</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatMoney(t.totalOutstanding, t.currency)}
            </div>
          </Card>
        </div>
      ))}

      <div className="space-y-4">
        {invoices.map((inv) => (
          <InvoiceCard key={inv.id} invoice={inv} />
        ))}
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <BookingShell>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Billing &amp; Invoices</h1>
          <p className="text-gray-600 mt-2">
            View and download clinical invoice records for your sessions. These receipts can be submitted to your insurance provider.
          </p>
        </div>

        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Suspense fallback={<RowsSkeleton rows={4} />}>
            <InvoicesList />
          </Suspense>
        </ErrorBoundary>
      </div>
    </BookingShell>
  );
}
