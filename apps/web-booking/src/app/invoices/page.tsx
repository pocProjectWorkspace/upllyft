'use client';

import { BookingShell } from '@/components/booking-shell';
import { useMyInvoices, useDownloadInvoicePdf } from '@/hooks/use-invoices';
import type { Invoice, InvoiceStatus } from '@/lib/api/invoices';
import {
  invoiceStatusLabels,
  invoiceStatusColors,
  formatCurrency,
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

function ReceiptIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"
      />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3"
      />
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
  statuses: InvoiceStatus[] | null; // null = all
}

const TABS: TabDef[] = [
  { value: 'all', label: 'All', statuses: null },
  { value: 'draft', label: 'Draft', statuses: ['DRAFT'] },
  { value: 'issued', label: 'Issued', statuses: ['ISSUED'] },
  { value: 'paid', label: 'Paid', statuses: ['PAID'] },
  { value: 'void', label: 'Void', statuses: ['VOID'] },
];

// ── Summary Card ──

function SummaryCard({
  label,
  amount,
  currency,
  color,
}: {
  label: string;
  amount: number;
  currency?: string;
  color: string;
}) {
  return (
    <Card className="rounded-2xl">
      <div className="p-5">
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${color}`}>
          {formatCurrency(amount, currency)}
        </p>
      </div>
    </Card>
  );
}

// ── Skeleton ──

function InvoiceCardSkeleton() {
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
      <h3 className="text-lg font-semibold text-gray-700">No {tabLabel.toLowerCase()} invoices</h3>
      <p className="text-gray-500 mt-1 max-w-sm mx-auto">
        Invoices are generated automatically when your therapist signs a session note.
      </p>
    </div>
  );
}

// ── Invoice card ──

function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const { mutate: downloadPdf, isPending: isDownloading } = useDownloadInvoicePdf();

  const therapistName = invoice.therapist?.name ?? 'Therapist';
  const avatarUrl = invoice.therapist?.image;
  const statusLabel = invoiceStatusLabels[invoice.status] ?? invoice.status;
  const statusColor = invoiceStatusColors[invoice.status] ?? 'gray';
  const amount = Number(invoice.amount);

  return (
    <Card className="rounded-2xl hover:shadow-md transition-shadow duration-200">
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Therapist avatar */}
          <Avatar
            src={avatarUrl || undefined}
            name={therapistName}
            size="lg"
            className="border-2 border-teal-100 flex-shrink-0"
          />

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900">{therapistName}</h3>
                <p className="text-sm text-gray-500">
                  {invoice.session?.sessionType ?? 'Therapy Session'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-teal-600">
                  {formatCurrency(amount, invoice.currency)}
                </span>
                <Badge color={statusColor as 'green' | 'blue' | 'yellow' | 'red' | 'gray'}>
                  {statusLabel}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
              {invoice.session?.scheduledAt && (
                <span className="flex items-center gap-1">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {formatDateTime(invoice.session.scheduledAt)}
                </span>
              )}
              {invoice.session?.actualDuration && (
                <span className="flex items-center gap-1">
                  <ClockIcon className="w-3.5 h-3.5" />
                  {formatDuration(invoice.session.actualDuration)}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => downloadPdf(invoice.id)}
                disabled={isDownloading}
              >
                <DownloadIcon className="w-3.5 h-3.5 mr-1" />
                {isDownloading ? 'Downloading...' : 'Download PDF'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Main page ──

export default function InvoicesPage() {
  const { data, isLoading } = useMyInvoices();

  const invoices = data?.invoices ?? [];
  const summary = data?.summary;

  const getFilteredInvoices = (statuses: InvoiceStatus[] | null) => {
    if (!statuses) return invoices;
    return invoices.filter((inv) => statuses.includes(inv.status));
  };

  return (
    <BookingShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
              <ReceiptIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">My Invoices</h1>
          </div>
          <p className="text-gray-500 ml-13">View and download your session invoices</p>
        </div>

        {/* Summary row */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              label="Total Billed"
              amount={summary.totalBilled}
              color="text-gray-900"
            />
            <SummaryCard
              label="Total Paid"
              amount={summary.totalPaid}
              color="text-green-600"
            />
            <SummaryCard
              label="Outstanding"
              amount={summary.totalOutstanding}
              color="text-amber-600"
            />
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full sm:w-auto">
            {TABS.map((tab) => {
              const count = getFilteredInvoices(tab.statuses).length;
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                  {tab.label}
                  {count > 0 && (
                    <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5 ml-1">
                      {count}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-6">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <InvoiceCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                (() => {
                  const filtered = getFilteredInvoices(tab.statuses);
                  return filtered.length === 0 ? (
                    <EmptyState tabLabel={tab.label} />
                  ) : (
                    <div className="space-y-4">
                      {filtered.map((invoice) => (
                        <InvoiceCard key={invoice.id} invoice={invoice} />
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
