'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminShell } from '@/components/admin-shell';
import {
  getTrackingAppointments,
  updateTrackingStatus,
  type TrackingAppointment,
  type TrackingStatusType,
} from '@/lib/admin-api';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Play,
  CheckCircle2,
  XCircle,
  UserX,
  LogIn,
  Timer,
  Phone,
  FileText,
  X,
  RefreshCw,
  ClipboardList,
} from 'lucide-react';

// --- Constants ---

const COLUMNS: { key: TrackingStatusType; label: string; color: string; bgColor: string; borderColor: string }[] = [
  { key: 'WAITING', label: 'Checked In', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  { key: 'IN_SESSION', label: 'In Session', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  { key: 'COMPLETED', label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  { key: 'CANCELLED', label: 'Cancelled / No-Show', color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
];

// Distinct colors for therapists
const THERAPIST_COLORS = [
  'border-l-teal-500',
  'border-l-violet-500',
  'border-l-rose-500',
  'border-l-sky-500',
  'border-l-amber-500',
  'border-l-emerald-500',
  'border-l-fuchsia-500',
  'border-l-orange-500',
];

const POLL_INTERVAL = 30_000; // 30 seconds

// --- Helpers ---

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateParam(date: Date): string {
  return date.toISOString().split('T')[0];
}

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

function elapsedMinutes(since: string): number {
  return Math.floor((Date.now() - new Date(since).getTime()) / 60000);
}

function formatElapsed(minutes: number): string {
  if (minutes < 1) return 'Just started';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getPatientName(appt: TrackingAppointment): string {
  if (appt.child) {
    return appt.child.nickname || appt.child.firstName;
  }
  return appt.parent.name;
}

// --- Summary Bar ---

function TrackingSummaryBar({
  appointments,
  selectedDate,
}: {
  appointments: TrackingAppointment[];
  selectedDate: Date;
}) {
  const counts = useMemo(() => {
    const c = { total: appointments.length, waiting: 0, inSession: 0, completed: 0, cancelled: 0, noShow: 0, scheduled: 0 };
    for (const a of appointments) {
      switch (a.status) {
        case 'SCHEDULED': c.scheduled++; break;
        case 'WAITING': c.waiting++; break;
        case 'IN_SESSION': c.inSession++; break;
        case 'COMPLETED': c.completed++; break;
        case 'CANCELLED': c.cancelled++; break;
        case 'NO_SHOW': c.noShow++; break;
      }
    }
    return c;
  }, [appointments]);

  const stats = [
    { label: 'Total', value: counts.total, icon: Users, color: 'text-gray-700', bg: 'bg-gray-100' },
    { label: 'Waiting', value: counts.scheduled + counts.waiting, icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50' },
    { label: 'In Session', value: counts.inSession, icon: Play, color: 'text-blue-700', bg: 'bg-blue-50' },
    { label: 'Completed', value: counts.completed, icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-50' },
    { label: 'No-Shows', value: counts.noShow, icon: UserX, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Cancelled', value: counts.cancelled, icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-50' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">
          {isToday(selectedDate) ? "Today's Summary" : formatDateDisplay(selectedDate)}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => (
          <div key={s.label} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${s.bg}`}>
            <s.icon className={`w-4 h-4 ${s.color}`} />
            <div>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Status Action Buttons ---

function StatusActions({
  appointment,
  onStatusChange,
  updating,
}: {
  appointment: TrackingAppointment;
  onStatusChange: (id: string, status: TrackingStatusType, notes?: string) => void;
  updating: string | null;
}) {
  const isUpdating = updating === appointment.id;
  const status = appointment.status;

  const btnClass = (color: string) =>
    `flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${color}`;

  switch (status) {
    case 'SCHEDULED':
      return (
        <div className="flex flex-wrap gap-1.5 mt-2">
          <button
            onClick={() => onStatusChange(appointment.id, 'WAITING')}
            disabled={isUpdating}
            className={btnClass('bg-amber-100 text-amber-800 hover:bg-amber-200')}
          >
            <LogIn className="w-3 h-3" /> Check In
          </button>
          <button
            onClick={() => onStatusChange(appointment.id, 'NO_SHOW')}
            disabled={isUpdating}
            className={btnClass('bg-gray-100 text-gray-600 hover:bg-gray-200')}
          >
            <UserX className="w-3 h-3" /> No-Show
          </button>
        </div>
      );
    case 'WAITING':
      return (
        <div className="flex flex-wrap gap-1.5 mt-2">
          <button
            onClick={() => onStatusChange(appointment.id, 'IN_SESSION')}
            disabled={isUpdating}
            className={btnClass('bg-blue-100 text-blue-800 hover:bg-blue-200')}
          >
            <Play className="w-3 h-3" /> Start Session
          </button>
          <button
            onClick={() => onStatusChange(appointment.id, 'NO_SHOW')}
            disabled={isUpdating}
            className={btnClass('bg-gray-100 text-gray-600 hover:bg-gray-200')}
          >
            <UserX className="w-3 h-3" /> No-Show
          </button>
        </div>
      );
    case 'IN_SESSION':
      return (
        <div className="flex flex-wrap gap-1.5 mt-2">
          <button
            onClick={() => onStatusChange(appointment.id, 'COMPLETED')}
            disabled={isUpdating}
            className={btnClass('bg-green-100 text-green-800 hover:bg-green-200')}
          >
            <CheckCircle2 className="w-3 h-3" /> Complete
          </button>
          <button
            onClick={() => onStatusChange(appointment.id, 'CANCELLED')}
            disabled={isUpdating}
            className={btnClass('bg-gray-100 text-gray-600 hover:bg-gray-200')}
          >
            <XCircle className="w-3 h-3" /> Cancel
          </button>
        </div>
      );
    default:
      return null;
  }
}

// --- Expanded Card Detail ---

function TrackingCardExpanded({
  appointment,
  onClose,
  onStatusChange,
  updating,
}: {
  appointment: TrackingAppointment;
  onClose: () => void;
  onStatusChange: (id: string, status: TrackingStatusType, notes?: string) => void;
  updating: string | null;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{getPatientName(appointment)}</h3>
            {appointment.child && (
              <p className="text-sm text-gray-500">{appointment.child.age} years old</p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-3 text-sm">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">
              {formatTime(appointment.scheduledTime)} - {formatTime(appointment.endTime)}
            </span>
            <span className="text-gray-400">({appointment.duration} min)</span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">Therapist: {appointment.therapist.name}</span>
          </div>

          {appointment.sessionType && (
            <div className="flex items-center gap-3 text-sm">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700">{appointment.sessionType}</span>
            </div>
          )}

          <div className="flex items-center gap-3 text-sm">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">Parent: {appointment.parent.name}</span>
          </div>

          {appointment.parent.phone && (
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-gray-400" />
              <a href={`tel:${appointment.parent.phone}`} className="text-teal-600 hover:text-teal-700">
                {appointment.parent.phone}
              </a>
            </div>
          )}

          {appointment.checkedInAt && (
            <div className="flex items-center gap-3 text-sm">
              <LogIn className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700">Checked in at {formatTime(appointment.checkedInAt)}</span>
            </div>
          )}

          {appointment.sessionStartedAt && (
            <div className="flex items-center gap-3 text-sm">
              <Play className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700">Session started at {formatTime(appointment.sessionStartedAt)}</span>
            </div>
          )}

          {appointment.sessionEndedAt && (
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700">Completed at {formatTime(appointment.sessionEndedAt)}</span>
            </div>
          )}

          {appointment.notes && (
            <div className="mt-2 p-3 bg-gray-50 rounded-xl">
              <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700">{appointment.notes}</p>
            </div>
          )}
        </div>

        <StatusActions
          appointment={appointment}
          onStatusChange={onStatusChange}
          updating={updating}
        />
      </div>
    </div>
  );
}

// --- Tracking Card ---

function TrackingCard({
  appointment,
  therapistColorIndex,
  onCardClick,
  onStatusChange,
  updating,
}: {
  appointment: TrackingAppointment;
  therapistColorIndex: number;
  onCardClick: (appt: TrackingAppointment) => void;
  onStatusChange: (id: string, status: TrackingStatusType, notes?: string) => void;
  updating: string | null;
}) {
  const borderColor = THERAPIST_COLORS[therapistColorIndex % THERAPIST_COLORS.length];
  const isInSession = appointment.status === 'IN_SESSION' && appointment.sessionStartedAt;
  const elapsed = isInSession ? elapsedMinutes(appointment.sessionStartedAt!) : 0;

  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-4 ${borderColor}`}
      onClick={() => onCardClick(appointment)}
    >
      {/* Patient Name + Time */}
      <div className="flex items-start justify-between mb-1.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {getPatientName(appointment)}
          </p>
          {appointment.child && (
            <p className="text-xs text-gray-400">{appointment.child.age}y</p>
          )}
        </div>
        <span className="text-xs font-medium text-gray-500 whitespace-nowrap ml-2">
          {formatTime(appointment.scheduledTime)}
        </span>
      </div>

      {/* Therapist */}
      <p className="text-xs text-gray-500 mb-1">
        w/ {appointment.therapist.name}
      </p>

      {/* Session Type */}
      {appointment.sessionType && (
        <span className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md mb-1.5">
          {appointment.sessionType}
        </span>
      )}

      {/* In-session timer */}
      {isInSession && (
        <div className="flex items-center gap-1.5 text-xs text-blue-600 mt-1">
          <Timer className="w-3 h-3 animate-pulse" />
          <span className="font-medium">{formatElapsed(elapsed)}</span>
          <span className="text-blue-400">/ {appointment.duration}m</span>
        </div>
      )}

      {/* Completed duration */}
      {appointment.status === 'COMPLETED' && appointment.sessionStartedAt && appointment.sessionEndedAt && (
        <div className="flex items-center gap-1.5 text-xs text-green-600 mt-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>{formatElapsed(
            Math.floor((new Date(appointment.sessionEndedAt).getTime() - new Date(appointment.sessionStartedAt).getTime()) / 60000)
          )}</span>
        </div>
      )}

      {/* No-show / Cancel label */}
      {appointment.status === 'NO_SHOW' && (
        <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
          <UserX className="w-3 h-3" />
          <span>No-show</span>
        </div>
      )}
      {appointment.status === 'CANCELLED' && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
          <XCircle className="w-3 h-3" />
          <span>Cancelled</span>
        </div>
      )}

      {/* Action buttons - stop propagation so card click doesn't fire */}
      <div onClick={(e) => e.stopPropagation()}>
        <StatusActions
          appointment={appointment}
          onStatusChange={onStatusChange}
          updating={updating}
        />
      </div>
    </div>
  );
}

// --- Tracking Column ---

function TrackingColumn({
  column,
  appointments,
  therapistColorMap,
  onCardClick,
  onStatusChange,
  updating,
}: {
  column: (typeof COLUMNS)[number];
  appointments: TrackingAppointment[];
  therapistColorMap: Map<string, number>;
  onCardClick: (appt: TrackingAppointment) => void;
  onStatusChange: (id: string, status: TrackingStatusType, notes?: string) => void;
  updating: string | null;
}) {
  // For the "WAITING" column, also include SCHEDULED items
  const columnAppointments = appointments.filter((a) => {
    if (column.key === 'WAITING') return a.status === 'WAITING' || a.status === 'SCHEDULED';
    if (column.key === 'CANCELLED') return a.status === 'CANCELLED' || a.status === 'NO_SHOW';
    return a.status === column.key;
  });

  return (
    <div className="flex-1 min-w-[260px]">
      {/* Column header */}
      <div className={`flex items-center justify-between px-3 py-2 rounded-xl mb-3 ${column.bgColor} border ${column.borderColor}`}>
        <span className={`text-sm font-semibold ${column.color}`}>
          {column.label}
        </span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${column.bgColor} ${column.color}`}>
          {columnAppointments.length}
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-2.5 min-h-[200px]">
        {columnAppointments.length === 0 ? (
          <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-100 rounded-xl">
            <p className="text-xs text-gray-300">No appointments</p>
          </div>
        ) : (
          columnAppointments.map((appt) => (
            <TrackingCard
              key={appt.id}
              appointment={appt}
              therapistColorIndex={therapistColorMap.get(appt.therapist.id) || 0}
              onCardClick={onCardClick}
              onStatusChange={onStatusChange}
              updating={updating}
            />
          ))
        )}
      </div>
    </div>
  );
}

// --- Date Selector ---

function DateSelector({
  selectedDate,
  onDateChange,
}: {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}) {
  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    onDateChange(d);
  };

  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    onDateChange(d);
  };

  const goToToday = () => onDateChange(new Date());

  return (
    <div className="flex items-center gap-2">
      {!isToday(selectedDate) && (
        <button
          onClick={goToToday}
          className="px-3 py-2 text-xs font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors"
        >
          Today
        </button>
      )}
      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl">
        <button
          onClick={prevDay}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-l-xl hover:bg-gray-50"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 min-w-[200px] justify-center">
          <CalendarDays className="w-4 h-4 text-gray-400" />
          <span className="font-medium">{formatDateDisplay(selectedDate)}</span>
        </div>
        <button
          onClick={nextDay}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-r-xl hover:bg-gray-50"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// --- Main Page ---

export default function TrackingPage() {
  const [appointments, setAppointments] = useState<TrackingAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedCard, setExpandedCard] = useState<TrackingAppointment | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Build therapist → color index map
  const therapistColorMap = useMemo(() => {
    const map = new Map<string, number>();
    const unique = [...new Set(appointments.map((a) => a.therapist.id))];
    unique.forEach((id, i) => map.set(id, i));
    return map;
  }, [appointments]);

  // Fetch appointments
  const fetchAppointments = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const data = await getTrackingAppointments(formatDateParam(selectedDate));
      setAppointments(data);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err?.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // Initial load + date change
  useEffect(() => {
    fetchAppointments(true);
  }, [fetchAppointments]);

  // Polling every 30s
  useEffect(() => {
    const interval = setInterval(() => fetchAppointments(false), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAppointments]);

  // Handle status change with optimistic update
  const handleStatusChange = useCallback(
    async (bookingId: string, status: TrackingStatusType, notes?: string) => {
      setUpdating(bookingId);

      // Optimistic update
      setAppointments((prev) =>
        prev.map((a) => (a.id === bookingId ? { ...a, status } : a)),
      );

      try {
        const updated = await updateTrackingStatus(bookingId, status, notes);
        // Replace with server response
        setAppointments((prev) =>
          prev.map((a) => (a.id === bookingId ? updated : a)),
        );
        // Also update expanded card if open
        if (expandedCard?.id === bookingId) {
          setExpandedCard(updated);
        }
      } catch {
        // Revert — refetch
        fetchAppointments(false);
      } finally {
        setUpdating(null);
      }
    },
    [expandedCard, fetchAppointments],
  );

  return (
    <AdminShell>
      <div className="max-w-[1600px] mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Today&apos;s Board</h1>
            <p className="text-sm text-gray-500 mt-1">
              Live tracking of today&apos;s sessions and appointments
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAppointments(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                Updated {lastRefresh.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </span>
            </button>
            <DateSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />
          </div>
        </div>

        {/* Summary Bar */}
        <TrackingSummaryBar appointments={appointments} selectedDate={selectedDate} />

        {/* Therapist Color Legend */}
        {therapistColorMap.size > 0 && (
          <div className="flex flex-wrap gap-3 px-1">
            {[...therapistColorMap.entries()].map(([therapistId, colorIdx]) => {
              const therapist = appointments.find((a) => a.therapist.id === therapistId)?.therapist;
              if (!therapist) return null;
              const colorClass = THERAPIST_COLORS[colorIdx % THERAPIST_COLORS.length].replace('border-l-', 'bg-');
              return (
                <div key={therapistId} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-full ${colorClass}`} />
                  <span className="text-xs text-gray-500">{therapist.name}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Board Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-red-100 p-12 text-center">
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button
              onClick={() => fetchAppointments(true)}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              Try again
            </button>
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-8 h-8 text-teal-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No appointments {isToday(selectedDate) ? 'today' : 'on this day'}
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              {isToday(selectedDate)
                ? 'No confirmed appointments are scheduled for today. Appointments will appear here once they are confirmed.'
                : 'No confirmed appointments were scheduled for this date.'}
            </p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {COLUMNS.map((col) => (
              <TrackingColumn
                key={col.key}
                column={col}
                appointments={appointments}
                therapistColorMap={therapistColorMap}
                onCardClick={setExpandedCard}
                onStatusChange={handleStatusChange}
                updating={updating}
              />
            ))}
          </div>
        )}
      </div>

      {/* Expanded Card Modal */}
      {expandedCard && (
        <TrackingCardExpanded
          appointment={expandedCard}
          onClose={() => setExpandedCard(null)}
          onStatusChange={handleStatusChange}
          updating={updating}
        />
      )}
    </AdminShell>
  );
}
