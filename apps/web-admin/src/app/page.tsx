'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@upllyft/api-client';
import { AdminShell } from '@/components/admin-shell';
import {
  CalendarDays,
  UserPlus,
  Briefcase,
  Users,
  ArrowRight,
  Clock,
  Loader2,
} from 'lucide-react';
import { Skeleton } from '@upllyft/ui';
import {
  getDashboardSummary,
  getTodaySessions,
  type DashboardSummary,
  type DashboardSession,
} from '@/lib/admin-api';

const quickLinks = [
  {
    title: 'Patient Directory',
    description: 'View and manage all registered patients',
    href: '/patients',
    icon: <Users className="w-5 h-5" />,
  },
  {
    title: "Today's Tracking Board",
    description: "See today's schedule and session statuses",
    href: '/tracking',
    icon: <CalendarDays className="w-5 h-5" />,
  },
  {
    title: 'Outcome Reports',
    description: 'Review clinical outcomes and progress metrics',
    href: '/outcomes',
    icon: <Briefcase className="w-5 h-5" />,
  },
];

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-AE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Dubai',
    });
  } catch {
    return iso;
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [sessions, setSessions] = useState<DashboardSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [sumData, sessData] = await Promise.all([
          getDashboardSummary(),
          getTodaySessions(),
        ]);
        setSummary(sumData);
        setSessions(sessData);
      } catch (e) {
        console.error('Dashboard load failed', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const stats = [
    {
      label: "Today's Sessions",
      value: summary?.sessionsToday ?? '—',
      icon: <CalendarDays className="w-5 h-5" />,
      color: 'bg-teal-50 text-teal-600',
      href: '/tracking',
    },
    {
      label: 'Pending Intake',
      value: summary?.intakeCount ?? '—',
      icon: <UserPlus className="w-5 h-5" />,
      color: 'bg-amber-50 text-amber-600',
      href: '/patients?status=INTAKE',
    },
    {
      label: 'Active Cases',
      value: summary?.activeCount ?? '—',
      icon: <Briefcase className="w-5 h-5" />,
      color: 'bg-blue-50 text-blue-600',
      href: '/patients?status=ACTIVE',
    },
    {
      label: 'Total Patients',
      value: summary?.totalPatients ?? '—',
      icon: <Users className="w-5 h-5" />,
      color: 'bg-purple-50 text-purple-600',
      href: '/patients',
    },
  ];

  return (
    <AdminShell>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin ? 'Clinic overview and daily operations' : 'Your daily overview'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <a
              key={stat.label}
              href={stat.href}
              className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-xl ${stat.color}`}>{stat.icon}</div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-teal-500 transition-colors" />
              </div>
              {loading ? (
                <Skeleton className="h-9 w-16 mt-4 rounded-lg" />
              ) : (
                <p className="mt-4 text-3xl font-bold text-gray-900">{stat.value}</p>
              )}
              <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
            </a>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Sessions */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Today's Sessions</h2>
              <a
                href="/tracking"
                className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarDays className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No sessions scheduled today</p>
                <p className="text-sm text-gray-400 mt-1">
                  Sessions booked for today will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-sm text-gray-500 w-24 flex-shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTime(session.scheduledTime)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {session.child?.nickname ?? session.child?.firstName ?? 'Unknown patient'}
                      </p>
                      <p className="text-xs text-gray-500">{session.sessionType ?? 'Session'}</p>
                    </div>
                    <div className="text-sm text-gray-500 hidden sm:block">
                      {session.therapistName ?? '—'}
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${session.status === 'IN_PROGRESS'
                          ? 'bg-green-100 text-green-700'
                          : session.status === 'COMPLETED'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-teal-50 text-teal-700'
                        }`}
                    >
                      {session.status === 'IN_PROGRESS'
                        ? 'In Session'
                        : session.status === 'COMPLETED'
                          ? 'Done'
                          : 'Scheduled'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h2>
            <div className="space-y-3">
              {quickLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <div className="p-2 bg-teal-50 text-teal-600 rounded-lg flex-shrink-0">
                    {link.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-teal-700 transition-colors">
                      {link.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{link.description}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
