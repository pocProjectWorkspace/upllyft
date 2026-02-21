'use client';

import { useAuth } from '@upllyft/api-client';
import { AdminShell } from '@/components/admin-shell';
import {
  CalendarDays,
  UserPlus,
  Briefcase,
  Users,
  ArrowRight,
  Clock,
} from 'lucide-react';

const stats = [
  {
    label: "Today's Appointments",
    value: 12,
    icon: <CalendarDays className="w-5 h-5" />,
    color: 'bg-teal-50 text-teal-600',
    href: '/tracking',
  },
  {
    label: 'Pending Intake',
    value: 4,
    icon: <UserPlus className="w-5 h-5" />,
    color: 'bg-amber-50 text-amber-600',
    href: '/patients',
  },
  {
    label: 'Active Cases',
    value: 38,
    icon: <Briefcase className="w-5 h-5" />,
    color: 'bg-blue-50 text-blue-600',
    href: '/patients',
  },
  {
    label: 'Total Patients',
    value: 156,
    icon: <Users className="w-5 h-5" />,
    color: 'bg-purple-50 text-purple-600',
    href: '/patients',
  },
];

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

const upcomingSessions = [
  { time: '9:00 AM', patient: 'Ahmed K.', therapist: 'Dr. Sarah M.', type: 'Speech Therapy' },
  { time: '9:30 AM', patient: 'Fatima R.', therapist: 'Dr. Layla H.', type: 'OT Assessment' },
  { time: '10:00 AM', patient: 'Omar S.', therapist: 'Dr. Sarah M.', type: 'Follow-up' },
  { time: '10:30 AM', patient: 'Noor A.', therapist: 'Dr. Khalid B.', type: 'ABA Session' },
  { time: '11:00 AM', patient: 'Yusuf T.', therapist: 'Dr. Layla H.', type: 'Speech Therapy' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

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
              <p className="mt-4 text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
            </a>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Sessions */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Upcoming Sessions</h2>
              <a
                href="/tracking"
                className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="space-y-3">
              {upcomingSessions.map((session, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2 text-sm text-gray-500 w-20 flex-shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    {session.time}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{session.patient}</p>
                    <p className="text-xs text-gray-500">{session.type}</p>
                  </div>
                  <div className="text-sm text-gray-500 hidden sm:block">{session.therapist}</div>
                  <span className="text-xs bg-teal-50 text-teal-700 px-2 py-1 rounded-full font-medium">
                    Scheduled
                  </span>
                </div>
              ))}
            </div>
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
