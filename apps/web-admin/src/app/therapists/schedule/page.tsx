'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminShell } from '@/components/admin-shell';
import { Avatar } from '@upllyft/ui';
import {
  getConsolidatedSchedule,
  type ConsolidatedSchedule,
  type ScheduleTherapist,
  type ScheduleAppointment,
} from '@/lib/admin-api';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Calendar,
  LayoutGrid,
  List,
  Columns3,
  CalendarDays,
} from 'lucide-react';

// Therapist color palette for visual distinction
const THERAPIST_COLORS = [
  { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-700', dot: 'bg-teal-500' },
  { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', dot: 'bg-blue-500' },
  { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700', dot: 'bg-purple-500' },
  { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', dot: 'bg-amber-500' },
  { bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-700', dot: 'bg-rose-500' },
  { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', dot: 'bg-orange-500' },
];

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8; // 8 AM to 7 PM (in half-hour increments we use hourly for readability)
  if (hour > 19) return null;
  return `${hour.toString().padStart(2, '0')}:00`;
}).filter(Boolean) as string[];

// Generate 30-min time slots from 8 AM to 7 PM
const HALF_HOUR_SLOTS = Array.from({ length: 22 }, (_, i) => {
  const totalMinutes = 8 * 60 + i * 30; // start at 8:00 AM
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
});

type ViewMode = 'day' | 'week' | 'list';

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatTimeFromSlot(slot: string): string {
  const [h, m] = slot.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusColor(status: string): string {
  switch (status) {
    case 'CONFIRMED': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'IN_PROGRESS': return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'COMPLETED': return 'bg-green-50 text-green-700 border-green-200';
    case 'PENDING_PAYMENT':
    case 'PENDING_ACCEPTANCE': return 'bg-amber-50 text-amber-700 border-amber-200';
    default: return 'bg-gray-50 text-gray-600 border-gray-200';
  }
}

function getAppointmentForSlot(
  appointments: ScheduleAppointment[],
  slot: string,
  date: Date,
): ScheduleAppointment | null {
  return appointments.find((a) => {
    const start = new Date(a.startDateTime);
    if (start.toDateString() !== date.toDateString()) return false;
    const startHour = start.getHours();
    const startMin = start.getMinutes();
    const slotParts = slot.split(':').map(Number);
    return startHour === slotParts[0] && startMin === slotParts[1];
  }) || null;
}

function isSlotOccupied(
  appointments: ScheduleAppointment[],
  slot: string,
  date: Date,
): boolean {
  const slotParts = slot.split(':').map(Number);
  const slotTime = new Date(date);
  slotTime.setHours(slotParts[0], slotParts[1], 0, 0);

  return appointments.some((a) => {
    const start = new Date(a.startDateTime);
    const end = new Date(a.endDateTime);
    if (start.toDateString() !== date.toDateString()) return false;
    return slotTime >= start && slotTime < end;
  });
}

function getSpanningAppointment(
  appointments: ScheduleAppointment[],
  slot: string,
  date: Date,
): ScheduleAppointment | null {
  const slotParts = slot.split(':').map(Number);
  const slotTime = new Date(date);
  slotTime.setHours(slotParts[0], slotParts[1], 0, 0);

  return appointments.find((a) => {
    const start = new Date(a.startDateTime);
    const end = new Date(a.endDateTime);
    if (start.toDateString() !== date.toDateString()) return false;
    return slotTime > start && slotTime < end;
  }) || null;
}

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<ConsolidatedSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const dateString = useMemo(() => {
    return currentDate.toISOString().split('T')[0];
  }, [currentDate]);

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      if (viewMode === 'week') {
        // Get the week range
        const day = currentDate.getDay();
        const start = new Date(currentDate);
        start.setDate(start.getDate() - day);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        const data = await getConsolidatedSchedule({
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
        });
        setSchedule(data);
      } else {
        const data = await getConsolidatedSchedule({ date: dateString });
        setSchedule(data);
      }
    } catch {
      setSchedule(null);
    } finally {
      setLoading(false);
    }
  }, [dateString, viewMode, currentDate]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const prevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - (viewMode === 'week' ? 7 : 1));
    setCurrentDate(d);
  };

  const nextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + (viewMode === 'week' ? 7 : 1));
    setCurrentDate(d);
  };

  const goToToday = () => setCurrentDate(new Date());

  const therapists = schedule?.therapists || [];
  const colorMap = useMemo(() => {
    const map = new Map<string, (typeof THERAPIST_COLORS)[0]>();
    therapists.forEach((t, i) => {
      map.set(t.id, THERAPIST_COLORS[i % THERAPIST_COLORS.length]);
    });
    return map;
  }, [therapists]);

  // Total appointments for today across all therapists
  const totalAppointments = therapists.reduce((sum, t) => sum + t.appointments.length, 0);

  // Week dates for week view
  const weekDates = useMemo(() => {
    const day = currentDate.getDay();
    const start = new Date(currentDate);
    start.setDate(start.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate]);

  // All appointments flattened for list view
  const allAppointments = useMemo(() => {
    return therapists
      .flatMap((t) =>
        t.appointments.map((a) => ({
          ...a,
          therapistName: t.name,
          therapistId: t.id,
          therapistAvatar: t.avatar,
        })),
      )
      .sort(
        (a, b) =>
          new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
      );
  }, [therapists]);

  const views: { key: ViewMode; label: string; icon: typeof LayoutGrid }[] = [
    { key: 'day', label: 'Day', icon: Columns3 },
    { key: 'week', label: 'Week', icon: LayoutGrid },
    { key: 'list', label: 'List', icon: List },
  ];

  return (
    <AdminShell>
      <div className="max-w-[1400px] mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/therapists"
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </a>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {totalAppointments} appointment{totalAppointments !== 1 ? 's' : ''}
                {' · '}
                {therapists.length} therapist{therapists.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-xl p-0.5">
            {views.map((v) => {
              const Icon = v.icon;
              return (
                <button
                  key={v.key}
                  onClick={() => setViewMode(v.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    viewMode === v.key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={prevDay}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextDay}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-gray-900 ml-2">
              {viewMode === 'week'
                ? `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                : formatDate(currentDate)}
            </span>
            {currentDate.toDateString() !== new Date().toDateString() && (
              <button
                onClick={goToToday}
                className="ml-2 px-2.5 py-1 text-xs font-medium text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
              >
                Today
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type="date"
              value={dateString}
              onChange={(e) => {
                if (e.target.value) setCurrentDate(new Date(e.target.value + 'T12:00:00'));
              }}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : viewMode === 'day' ? (
          /* ===== DAY VIEW — Grid: Therapists on X, Time on Y ===== */
          therapists.length === 0 ? (
            <EmptyState message="No therapists to display" />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Therapist header row */}
                  <div
                    className="grid border-b border-gray-100 sticky top-0 bg-white z-10"
                    style={{ gridTemplateColumns: `80px repeat(${therapists.length}, 1fr)` }}
                  >
                    <div className="px-3 py-3 text-xs font-medium text-gray-500 uppercase border-r border-gray-100">
                      Time
                    </div>
                    {therapists.map((t) => {
                      const color = colorMap.get(t.id)!;
                      return (
                        <div
                          key={t.id}
                          className="px-3 py-3 text-center border-r border-gray-100 last:border-r-0"
                        >
                          <a href={`/therapists/${t.id}`} className="inline-flex flex-col items-center gap-1 group">
                            <div className="relative">
                              <Avatar
                                name={t.name}
                                src={t.avatar || undefined}
                                size="sm"
                              />
                              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${color.dot}`} />
                            </div>
                            <span className="text-xs font-medium text-gray-900 group-hover:text-teal-700 truncate max-w-[100px]">
                              {t.name}
                            </span>
                          </a>
                        </div>
                      );
                    })}
                  </div>

                  {/* Time slots */}
                  {HALF_HOUR_SLOTS.map((slot) => (
                    <div
                      key={slot}
                      className="grid border-b border-gray-50 min-h-[48px]"
                      style={{ gridTemplateColumns: `80px repeat(${therapists.length}, 1fr)` }}
                    >
                      <div className="px-3 py-1.5 text-xs text-gray-400 border-r border-gray-100 flex items-start pt-2">
                        {formatTimeFromSlot(slot)}
                      </div>
                      {therapists.map((t) => {
                        const appt = getAppointmentForSlot(t.appointments, slot, currentDate);
                        const spanning = !appt ? getSpanningAppointment(t.appointments, slot, currentDate) : null;
                        const color = colorMap.get(t.id)!;

                        if (spanning) {
                          // This slot is covered by a multi-slot appointment — render empty (the appointment is rendered from its start slot)
                          return (
                            <div
                              key={t.id}
                              className={`border-r border-gray-50 last:border-r-0 ${color.bg} border-l-2 ${color.border}`}
                            />
                          );
                        }

                        if (appt) {
                          const start = new Date(appt.startDateTime);
                          const end = new Date(appt.endDateTime);
                          const durationMin = (end.getTime() - start.getTime()) / (1000 * 60);
                          const slots = Math.max(1, Math.round(durationMin / 30));

                          return (
                            <div
                              key={t.id}
                              className={`border-r border-gray-50 last:border-r-0 ${color.bg} border-l-2 ${color.border} px-2 py-1.5 cursor-pointer hover:opacity-80 transition-opacity`}
                              style={slots > 1 ? { gridRow: `span ${slots}` } : undefined}
                              onClick={() => {
                                window.location.href = `http://localhost:3004/bookings/${appt.id}`;
                              }}
                            >
                              <p className={`text-xs font-medium ${color.text} truncate`}>
                                {appt.patient?.name || 'Patient'}
                              </p>
                              <p className="text-[10px] text-gray-500 truncate">
                                {appt.sessionType || 'Session'}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                {formatTime(appt.startDateTime)} - {formatTime(appt.endDateTime)}
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={t.id}
                            className="border-r border-gray-50 last:border-r-0"
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        ) : viewMode === 'week' ? (
          /* ===== WEEK VIEW — Mini calendar per therapist ===== */
          therapists.length === 0 ? (
            <EmptyState message="No therapists to display" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {therapists.map((t) => {
                const color = colorMap.get(t.id)!;
                return (
                  <div
                    key={t.id}
                    className="bg-white rounded-xl border border-gray-100 overflow-hidden"
                  >
                    {/* Therapist header */}
                    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100">
                      <div className="relative">
                        <Avatar name={t.name} src={t.avatar || undefined} size="sm" />
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${color.dot}`} />
                      </div>
                      <div className="min-w-0">
                        <a href={`/therapists/${t.id}`} className="text-sm font-medium text-gray-900 hover:text-teal-700 truncate block">
                          {t.name}
                        </a>
                        <p className="text-xs text-gray-500">
                          {t.appointments.length} appointment{t.appointments.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Week grid */}
                    <div className="grid grid-cols-7">
                      {weekDates.map((date, i) => {
                        const dayAppts = t.appointments.filter((a) => {
                          const d = new Date(a.startDateTime);
                          return d.toDateString() === date.toDateString();
                        });
                        const isToday = date.toDateString() === new Date().toDateString();
                        return (
                          <div
                            key={i}
                            className={`p-2 text-center border-r border-b border-gray-50 last:border-r-0 ${
                              isToday ? 'bg-teal-50/50' : ''
                            }`}
                          >
                            <p className="text-[10px] font-medium text-gray-400">
                              {['S', 'M', 'T', 'W', 'T', 'F', 'S'][i]}
                            </p>
                            <p className={`text-xs font-medium ${isToday ? 'text-teal-600' : 'text-gray-700'}`}>
                              {date.getDate()}
                            </p>
                            {dayAppts.length > 0 && (
                              <div className="mt-1 flex justify-center gap-0.5">
                                {dayAppts.slice(0, 3).map((a, j) => (
                                  <span key={j} className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
                                ))}
                                {dayAppts.length > 3 && (
                                  <span className="text-[8px] text-gray-400">+{dayAppts.length - 3}</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Day appointments list */}
                    {t.appointments.length > 0 && (
                      <div className="max-h-40 overflow-y-auto divide-y divide-gray-50">
                        {t.appointments.slice(0, 5).map((a) => (
                          <a
                            key={a.id}
                            href={`http://localhost:3004/bookings/${a.id}`}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color.dot}`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-gray-900 truncate">{a.patient?.name || 'Patient'}</p>
                              <p className="text-[10px] text-gray-500">{formatTime(a.startDateTime)}</p>
                            </div>
                            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${statusColor(a.status)}`}>
                              {statusLabel(a.status)}
                            </span>
                          </a>
                        ))}
                        {t.appointments.length > 5 && (
                          <p className="px-3 py-2 text-xs text-gray-400 text-center">
                            +{t.appointments.length - 5} more
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* ===== LIST VIEW — Chronological list ===== */
          allAppointments.length === 0 ? (
            <EmptyState message="No appointments scheduled" />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
              {allAppointments.map((a) => {
                const color = colorMap.get(a.therapistId)!;
                return (
                  <a
                    key={a.id}
                    href={`http://localhost:3004/bookings/${a.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition-colors"
                  >
                    {/* Time */}
                    <div className="w-20 flex-shrink-0 text-center">
                      <p className="text-sm font-medium text-gray-900">
                        {formatTime(a.startDateTime)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTime(a.endDateTime)}
                      </p>
                    </div>

                    {/* Color dot */}
                    <span className={`w-2 h-8 rounded-full flex-shrink-0 ${color.dot}`} />

                    {/* Therapist */}
                    <div className="flex items-center gap-2 w-40 flex-shrink-0">
                      <Avatar
                        name={a.therapistName}
                        src={a.therapistAvatar || undefined}
                        size="sm"
                      />
                      <span className="text-sm text-gray-700 truncate">{a.therapistName}</span>
                    </div>

                    {/* Patient & Session */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{a.patient?.name || 'Unknown Patient'}</p>
                      <p className="text-xs text-gray-500">{a.sessionType || 'Session'}</p>
                    </div>

                    {/* Status */}
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-lg border ${statusColor(a.status)}`}>
                      {statusLabel(a.status)}
                    </span>
                  </a>
                );
              })}
            </div>
          )
        )}

        {/* Therapist color legend */}
        {therapists.length > 0 && viewMode === 'day' && (
          <div className="flex flex-wrap items-center gap-3 px-1">
            <span className="text-xs text-gray-500">Therapists:</span>
            {therapists.map((t) => {
              const color = colorMap.get(t.id)!;
              return (
                <span key={t.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
                  {t.name}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
      <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <CalendarDays className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{message}</h3>
      <p className="text-sm text-gray-500 max-w-md mx-auto">
        No appointments are scheduled for this time period. Check a different date or view.
      </p>
    </div>
  );
}
