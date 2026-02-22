'use client';

import { useState, useEffect } from 'react';
import { AdminShell } from '@/components/admin-shell';
import {
  getClinicRevenue,
  getTherapistRevenue,
  type ClinicRevenueResponse,
  type TherapistRevenueResponse,
  type RevenuePeriod,
} from '@/lib/admin-api';
import {
  DollarSign,
  Calendar,
  TrendingUp,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  X,
  FileText,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Avatar } from '@upllyft/ui';

function formatAED(amount: number): string {
  return `AED ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const PERIOD_LABELS: Record<RevenuePeriod, string> = {
  this_month: 'This Month',
  last_month: 'Last Month',
  this_year: 'This Year',
};

export default function ReportsPage() {
  const [period, setPeriod] = useState<RevenuePeriod>('this_month');
  const [revenue, setRevenue] = useState<ClinicRevenueResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Therapist detail slide-over
  const [selectedTherapistId, setSelectedTherapistId] = useState<string | null>(null);
  const [therapistRevenue, setTherapistRevenue] = useState<TherapistRevenueResponse | null>(null);
  const [therapistLoading, setTherapistLoading] = useState(false);

  // Sort state for therapist table
  const [sortBy, setSortBy] = useState<'invoiced' | 'sessions'>('invoiced');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchRevenue();
  }, [period]);

  useEffect(() => {
    if (selectedTherapistId) {
      fetchTherapistRevenue(selectedTherapistId);
    }
  }, [selectedTherapistId, period]);

  const fetchRevenue = async () => {
    setLoading(true);
    try {
      const data = await getClinicRevenue(period);
      setRevenue(data);
    } catch {
      // handled by empty state
    } finally {
      setLoading(false);
    }
  };

  const fetchTherapistRevenue = async (therapistId: string) => {
    setTherapistLoading(true);
    try {
      const data = await getTherapistRevenue(therapistId, period);
      setTherapistRevenue(data);
    } catch {
      setTherapistRevenue(null);
    } finally {
      setTherapistLoading(false);
    }
  };

  const sortedTherapists = revenue?.byTherapist
    ? [...revenue.byTherapist].sort((a, b) => {
        const diff = sortOrder === 'desc' ? b[sortBy] - a[sortBy] : a[sortBy] - b[sortBy];
        return diff;
      })
    : [];

  const toggleSort = (col: 'invoiced' | 'sessions') => {
    if (sortBy === col) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
  };

  if (loading) {
    return (
      <AdminShell>
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Revenue</h1>
            <p className="text-sm text-gray-500 mt-1">
              Clinic-wide financial overview and therapist breakdown
            </p>
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as RevenuePeriod)}
            className="text-sm border border-gray-200 rounded-xl px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          >
            {Object.entries(PERIOD_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            icon={DollarSign}
            label="Total Invoiced"
            value={formatAED(revenue?.totalInvoiced ?? 0)}
          />
          <SummaryCard
            icon={Calendar}
            label="Total Sessions"
            value={revenue?.totalSessions ?? 0}
          />
          <SummaryCard
            icon={TrendingUp}
            label="Avg per Session"
            value={formatAED(revenue?.avgRevenuePerSession ?? 0)}
          />
          <SummaryCard
            icon={AlertCircle}
            label="Outstanding"
            value={formatAED(revenue?.outstanding?.amount ?? 0)}
            subtitle={`${revenue?.outstanding?.count ?? 0} unpaid invoice${(revenue?.outstanding?.count ?? 0) !== 1 ? 's' : ''}`}
          />
        </div>

        {/* Charts + Table Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Per-therapist table */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Per-Therapist Breakdown
            </h3>
            {sortedTherapists.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">
                        Therapist
                      </th>
                      <th
                        className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700"
                        onClick={() => toggleSort('sessions')}
                      >
                        Sessions
                        {sortBy === 'sessions' && (
                          sortOrder === 'asc'
                            ? <ChevronUp className="w-3.5 h-3.5 inline ml-0.5" />
                            : <ChevronDown className="w-3.5 h-3.5 inline ml-0.5" />
                        )}
                      </th>
                      <th
                        className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700"
                        onClick={() => toggleSort('invoiced')}
                      >
                        Revenue
                        {sortBy === 'invoiced' && (
                          sortOrder === 'asc'
                            ? <ChevronUp className="w-3.5 h-3.5 inline ml-0.5" />
                            : <ChevronDown className="w-3.5 h-3.5 inline ml-0.5" />
                        )}
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">
                        Avg/Session
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTherapists.map((row) => {
                      const avg = row.sessions > 0 ? row.invoiced / row.sessions : 0;
                      return (
                        <tr
                          key={row.therapist.id}
                          className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelectedTherapistId(row.therapist.id)}
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <Avatar
                                src={row.therapist.avatarUrl || undefined}
                                name={row.therapist.name ?? 'T'}
                                size="sm"
                              />
                              <span className="font-medium text-gray-900">
                                {row.therapist.name ?? 'Unknown'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-gray-600">{row.sessions}</td>
                          <td className="py-3 px-3 font-medium text-teal-600">
                            {formatAED(row.invoiced)}
                          </td>
                          <td className="py-3 px-3 text-gray-600">
                            {formatAED(Math.round(avg * 100) / 100)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="No invoice data for this period." />
            )}
          </div>

          {/* Revenue trend chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Revenue Trend
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              {period === 'this_year' ? 'Monthly' : 'Weekly'} revenue breakdown
            </p>
            {revenue?.byWeek && revenue.byWeek.some((b) => b.amount > 0) ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={revenue.byWeek} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e5e7eb',
                      fontSize: 13,
                    }}
                    formatter={(value: number) => formatAED(value)}
                  />
                  <Bar
                    dataKey="amount"
                    fill="#0d9488"
                    radius={[4, 4, 0, 0]}
                    name="Revenue"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No revenue data to chart for this period." />
            )}
          </div>
        </div>
      </div>

      {/* Therapist detail slide-over */}
      {selectedTherapistId && (
        <TherapistSlideOver
          data={therapistRevenue}
          loading={therapistLoading}
          onClose={() => {
            setSelectedTherapistId(null);
            setTherapistRevenue(null);
          }}
        />
      )}
    </AdminShell>
  );
}

/* --- Sub-components --- */

function SummaryCard({
  icon: Icon,
  label,
  value,
  subtitle,
}: {
  icon: any;
  label: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
          <Icon className="w-5 h-5 text-teal-600" />
        </div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-center">
      <p className="text-sm text-gray-400 max-w-xs">{message}</p>
    </div>
  );
}

function TherapistSlideOver({
  data,
  loading,
  onClose,
}: {
  data: TherapistRevenueResponse | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            Therapist Revenue
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Therapist info */}
              <div className="flex items-center gap-3">
                <Avatar
                  src={data.therapist.avatarUrl || undefined}
                  name={data.therapist.name ?? 'T'}
                  size="lg"
                />
                <div>
                  <p className="font-semibold text-gray-900">
                    {data.therapist.name ?? 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-500">{PERIOD_LABELS[data.period as RevenuePeriod] ?? data.period}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-teal-50 rounded-xl p-4">
                  <p className="text-xs text-teal-600 font-medium uppercase">Invoiced</p>
                  <p className="text-xl font-bold text-teal-700 mt-1">
                    {formatAED(data.totalInvoiced)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 font-medium uppercase">Sessions</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {data.totalSessions}
                  </p>
                </div>
              </div>

              {/* Invoice list */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Invoices
                </h4>
                {data.invoices.length > 0 ? (
                  <div className="space-y-3">
                    {data.invoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {inv.patient?.name ?? 'Patient'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {inv.session?.sessionType ?? 'Session'} &middot;{' '}
                              {formatDate(inv.session?.scheduledAt ?? inv.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-teal-600">
                            {formatAED(Number(inv.amount))}
                          </p>
                          <p className="text-xs text-gray-400">{inv.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-6">
                    No invoices this period.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">
              Failed to load therapist data.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
