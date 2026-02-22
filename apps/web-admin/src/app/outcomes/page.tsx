'use client';

import { useState, useEffect, useMemo } from 'react';
import { AdminShell } from '@/components/admin-shell';
import {
  getClinicOutcomeSummary,
  getGoalProgress,
  getScreeningTrends,
  getPatientOutcomes,
  getTherapists,
  type ClinicOutcomeSummary,
  type GoalProgressData,
  type ScreeningTrendsData,
  type PatientOutcomeRow,
  type TherapistOption,
} from '@/lib/admin-api';
import {
  Users,
  Calendar,
  Target,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  Printer,
  Filter,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';

const DOMAIN_LABELS: Record<string, string> = {
  motor: 'Motor',
  language: 'Language',
  social: 'Social',
  cognitive: 'Cognitive',
  adaptive: 'Adaptive',
  sensory: 'Sensory',
  MOTOR: 'Motor',
  LANGUAGE: 'Language',
  SOCIAL: 'Social',
  COGNITIVE: 'Cognitive',
  ADAPTIVE: 'Adaptive',
  SENSORY: 'Sensory',
};

const PROGRESS_COLORS = {
  achieved: '#059669',
  progressing: '#0d9488',
  maintaining: '#d97706',
  regression: '#dc2626',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function OutcomesPage() {
  const [summary, setSummary] = useState<ClinicOutcomeSummary | null>(null);
  const [goalData, setGoalData] = useState<GoalProgressData | null>(null);
  const [screeningData, setScreeningData] = useState<ScreeningTrendsData | null>(null);
  const [patients, setPatients] = useState<PatientOutcomeRow[]>([]);
  const [therapists, setTherapists] = useState<TherapistOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [sortBy, setSortBy] = useState('firstName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [therapistFilter, setTherapistFilter] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [sortBy, sortOrder, therapistFilter]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, g, sc, p, t] = await Promise.all([
        getClinicOutcomeSummary(),
        getGoalProgress(),
        getScreeningTrends(),
        getPatientOutcomes({ sortBy, sortOrder, therapistId: therapistFilter || undefined }),
        getTherapists(),
      ]);
      setSummary(s);
      setGoalData(g);
      setScreeningData(sc);
      setPatients(p);
      setTherapists(t);
    } catch {
      // errors handled by empty state
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const p = await getPatientOutcomes({
        sortBy,
        sortOrder,
        therapistId: therapistFilter || undefined,
      });
      setPatients(p);
    } catch {
      // handled
    }
  };

  const toggleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return null;
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 inline ml-0.5" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 inline ml-0.5" />
    );
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

  const gp = summary?.goalProgress;
  const goalsProgressingPct = gp && gp.total > 0
    ? Math.round(((gp.progressing + gp.achieved) / gp.total) * 100)
    : 0;

  const sessionsDelta = summary
    ? summary.sessionsThisMonth - summary.sessionsLastMonth
    : 0;

  return (
    <AdminShell>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Outcomes</h1>
            <p className="text-sm text-gray-500 mt-1">
              Clinical outcome snapshots and progress metrics
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 print:hidden"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            icon={Users}
            label="Active Patients"
            value={summary?.activePatients ?? 0}
          />
          <SummaryCard
            icon={Calendar}
            label="Sessions This Month"
            value={summary?.sessionsThisMonth ?? 0}
            delta={sessionsDelta}
            deltaLabel="vs last month"
          />
          <SummaryCard
            icon={Target}
            label="Goals Progressing"
            value={`${goalsProgressingPct}%`}
            subtitle={gp ? `${gp.progressing + gp.achieved} of ${gp.total} goals` : undefined}
          />
          <SummaryCard
            icon={TrendingUp}
            label="Avg Screening Improvement"
            value={`${summary?.averageScreeningImprovement ?? 0}%`}
            positive={(summary?.averageScreeningImprovement ?? 0) > 0}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Goal Progress Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Goal Progress Overview
            </h3>
            {goalData && goalData.breakdown.total > 0 ? (
              <GoalProgressChart data={goalData.breakdown} />
            ) : (
              <EmptyChart message="No goal data yet. Goals will populate as therapists create IEPs and log session progress." />
            )}
          </div>

          {/* Screening Trends Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Screening Score Trends
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Average domain scores: first screening vs latest
            </p>
            {screeningData && screeningData.trends.length > 0 ? (
              <ScreeningTrendsChart trends={screeningData.trends} />
            ) : (
              <EmptyChart message="No screening data yet. Trends will appear once patients complete screenings." />
            )}
          </div>
        </div>

        {/* Patient Outcome Table */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">
              Patient Outcomes
            </h3>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={therapistFilter}
                onChange={(e) => setTherapistFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All Therapists</option>
                {therapists.map((t) => (
                  <option key={t.id} value={t.therapistProfileId}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {patients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <Th col="firstName" label="Patient" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                    <Th col="age" label="Age" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Therapist</th>
                    <Th col="sessions" label="Sessions" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Goals (P/M/R)</th>
                    <Th col="screeningDelta" label="Screening &Delta;" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                    <Th col="lastSession" label="Last Session" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p) => {
                    const gb = p.goalBreakdown;
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                        onClick={() => window.location.href = `/patients/${p.id}`}
                      >
                        <td className="py-3 px-3 font-medium text-gray-900">{p.firstName}</td>
                        <td className="py-3 px-3 text-gray-600">{p.age}</td>
                        <td className="py-3 px-3 text-gray-600">{p.therapist?.name || '-'}</td>
                        <td className="py-3 px-3 text-gray-600">{p.sessionCount}</td>
                        <td className="py-3 px-3">
                          <span className="text-emerald-600">{gb.progressing + gb.achieved}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-amber-600">{gb.maintaining}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-red-600">{gb.regression}</span>
                        </td>
                        <td className="py-3 px-3">
                          {p.screeningDelta !== null ? (
                            <span className={`inline-flex items-center gap-0.5 font-medium ${
                              p.screeningDelta > 0 ? 'text-emerald-600' : p.screeningDelta < 0 ? 'text-red-600' : 'text-gray-500'
                            }`}>
                              {p.screeningDelta > 0 ? <ArrowUp className="w-3 h-3" /> : p.screeningDelta < 0 ? <ArrowDown className="w-3 h-3" /> : null}
                              {p.screeningDelta > 0 ? '+' : ''}{p.screeningDelta}%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-gray-600">{formatDate(p.lastSessionDate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10">
              <Target className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No active patients with outcome data yet.</p>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

/* --- Sub-components --- */

function SummaryCard({
  icon: Icon,
  label,
  value,
  delta,
  deltaLabel,
  subtitle,
  positive,
}: {
  icon: any;
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  subtitle?: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
          <Icon className="w-5 h-5 text-teal-600" />
        </div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {delta !== undefined && (
        <p className={`text-xs mt-1 flex items-center gap-0.5 ${
          delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-gray-500'
        }`}>
          {delta > 0 ? <ArrowUp className="w-3 h-3" /> : delta < 0 ? <ArrowDown className="w-3 h-3" /> : null}
          {delta > 0 ? '+' : ''}{delta} {deltaLabel}
        </p>
      )}
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      {positive !== undefined && (
        <p className={`text-xs mt-1 ${positive ? 'text-emerald-600' : 'text-gray-500'}`}>
          {positive ? 'Improving' : 'No change yet'}
        </p>
      )}
    </div>
  );
}

function GoalProgressChart({ data }: { data: GoalProgressData['breakdown'] }) {
  const chartData = [
    { name: 'Achieved', value: data.achieved, color: PROGRESS_COLORS.achieved },
    { name: 'Progressing', value: data.progressing, color: PROGRESS_COLORS.progressing },
    { name: 'Maintaining', value: data.maintaining, color: PROGRESS_COLORS.maintaining },
    { name: 'Regression', value: data.regression, color: PROGRESS_COLORS.regression },
  ];

  return (
    <div className="space-y-4">
      {/* Horizontal bars */}
      {chartData.map((item) => {
        const pct = data.total > 0 ? Math.round((item.value / data.total) * 100) : 0;
        return (
          <div key={item.name}>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="font-medium text-gray-700">{item.name}</span>
              <span className="text-gray-500">
                {item.value} ({pct}%)
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        );
      })}
      <p className="text-xs text-gray-400 text-right mt-2">{data.total} total goals</p>
    </div>
  );
}

function ScreeningTrendsChart({ trends }: { trends: ScreeningTrendsData['trends'] }) {
  const chartData = trends.map((t) => ({
    domain: DOMAIN_LABELS[t.domain] || t.domain,
    'First Screening': t.firstAvg,
    'Latest Screening': t.latestAvg,
    change: t.change,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="domain" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 13 }}
          formatter={(value: number) => `${value}%`}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="First Screening" fill="#94a3b8" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Latest Screening" fill="#0d9488" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-center">
      <p className="text-sm text-gray-400 max-w-xs">{message}</p>
    </div>
  );
}

function Th({
  col,
  label,
  sortBy,
  sortOrder,
  onSort,
}: {
  col: string;
  label: string;
  sortBy: string;
  sortOrder: string;
  onSort: (col: string) => void;
}) {
  return (
    <th
      className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700"
      onClick={() => onSort(col)}
    >
      <span dangerouslySetInnerHTML={{ __html: label }} />
      {sortBy === col && (
        sortOrder === 'asc'
          ? <ChevronUp className="w-3.5 h-3.5 inline ml-0.5" />
          : <ChevronDown className="w-3.5 h-3.5 inline ml-0.5" />
      )}
    </th>
  );
}
