'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookingShell } from '@/components/booking-shell';
import {
  useMyAvailability,
  useSetRecurringAvailability,
  useDeleteAvailability,
  useAddAvailabilityException,
  useDeleteAvailabilityException,
} from '@/hooks/use-marketplace';
import { dayNames } from '@/lib/utils';
import type { TherapistAvailability } from '@/lib/api/marketplace';
import {
  Button,
  Card,
  Badge,
  Input,
  Label,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  toast,
} from '@upllyft/ui';

function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

export default function TherapistAvailabilityPage() {
  const { data: availability, isLoading } = useMyAvailability();
  const setAvailability = useSetRecurringAvailability();
  const deleteAvailability = useDeleteAvailability();
  const addException = useAddAvailabilityException();
  const deleteException = useDeleteAvailabilityException();

  const [addOpen, setAddOpen] = useState(false);
  const [addDay, setAddDay] = useState<number>(0);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');

  // Absence / leave form
  const [leaveFrom, setLeaveFrom] = useState('');
  const [leaveTo, setLeaveTo] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  const recurring = availability?.recurring || [];

  const today = new Date().toISOString().slice(0, 10);
  // Leave = any non-AVAILABLE exception. Each record is a single day; a From→To
  // range is stored as one record per day (the model keys on a single `date`).
  const leaveRecords = (availability?.exceptions || [])
    .filter((e) => e.type !== 'AVAILABLE')
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  const upcomingLeave = leaveRecords.filter((e) => e.date.slice(0, 10) >= today);
  const daysOffThisYear = leaveRecords.filter(
    (e) => e.date.slice(0, 4) === today.slice(0, 4),
  ).length;
  const nextUnavailable = upcomingLeave[0]?.date.slice(0, 10);

  function enumerateDates(from: string, to: string): string[] {
    const out: string[] = [];
    const end = new Date(`${to || from}T00:00:00`);
    for (let d = new Date(`${from}T00:00:00`); d <= end; d.setDate(d.getDate() + 1)) {
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  }

  async function handleAddLeave() {
    if (!leaveFrom) {
      toast({ title: 'Pick a start date', variant: 'destructive' });
      return;
    }
    if (leaveTo && leaveTo < leaveFrom) {
      toast({ title: 'End date must be after the start date', variant: 'destructive' });
      return;
    }
    const dates = enumerateDates(leaveFrom, leaveTo);
    for (const date of dates) {
      await addException.mutateAsync({ date, type: 'BLOCKED', reason: leaveReason || undefined });
    }
    setLeaveFrom('');
    setLeaveTo('');
    setLeaveReason('');
  }

  function getSlotsByDay(day: number): TherapistAvailability[] {
    return recurring.filter((s) => s.dayOfWeek === day && s.isActive).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  function openAddSlot(day: number) {
    setAddDay(day);
    setStartTime('09:00');
    setEndTime('17:00');
    setAddOpen(true);
  }

  function handleAddSlot() {
    if (!startTime || !endTime) {
      toast({ title: 'Please set both start and end times', variant: 'destructive' });
      return;
    }
    if (startTime >= endTime) {
      toast({ title: 'End time must be after start time', variant: 'destructive' });
      return;
    }
    setAvailability.mutate(
      {
        dayOfWeek: addDay,
        startTime,
        endTime,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      {
        onSuccess: () => {
          setAddOpen(false);
        },
      },
    );
  }

  function handleDeleteSlot(id: string) {
    deleteAvailability.mutate(id);
  }

  return (
    <BookingShell>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Weekly Availability</h1>
            <p className="text-gray-500 mt-1">Set your recurring weekly schedule for bookings</p>
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

        {/* Weekly Grid */}
        {isLoading ? (
          <div className="space-y-4">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {dayNames.map((dayName, dayIndex) => {
              const slots = getSlotsByDay(dayIndex);
              return (
                <Card key={dayIndex} className="rounded-2xl">
                  <div className="pt-6 p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shrink-0">
                          <span className="text-white text-sm font-bold">{dayName.slice(0, 2)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-gray-900">{dayName}</h3>
                          {slots.length === 0 ? (
                            <p className="text-sm text-gray-400 mt-1">No slots set</p>
                          ) : (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {slots.map((slot) => (
                                <div
                                  key={slot.id}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200"
                                >
                                  <svg className="w-3.5 h-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="text-sm font-medium text-teal-700">
                                    {formatTimeDisplay(slot.startTime)} - {formatTimeDisplay(slot.endTime)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSlot(slot.id)}
                                    disabled={deleteAvailability.isPending}
                                    className="ml-1 text-teal-400 hover:text-red-500 transition-colors"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openAddSlot(dayIndex)}
                        className="rounded-xl shrink-0"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Slot
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Absence management */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Absence management</h2>
            <p className="text-gray-500 mt-1 text-sm">
              Leave and blackout dates. These block bookings and are visible to your clinic admin.
            </p>
          </div>

          {/* Summary tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="rounded-2xl">
              <div className="p-5">
                <p className="text-sm text-gray-500">Upcoming leave</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{upcomingLeave.length}</p>
              </div>
            </Card>
            <Card className="rounded-2xl">
              <div className="p-5">
                <p className="text-sm text-gray-500">Days off this year</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{daysOffThisYear}</p>
              </div>
            </Card>
            <Card className="rounded-2xl">
              <div className="p-5">
                <p className="text-sm text-gray-500">Next unavailable</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {nextUnavailable ? new Date(`${nextUnavailable}T00:00:00`).toLocaleDateString() : '—'}
                </p>
              </div>
            </Card>
          </div>

          {/* Add record */}
          <Card className="rounded-2xl">
            <div className="p-5 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="leave-from">From</Label>
                <Input id="leave-from" type="date" value={leaveFrom} onChange={(e) => setLeaveFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leave-to">To (optional)</Label>
                <Input id="leave-to" type="date" value={leaveTo} onChange={(e) => setLeaveTo(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leave-reason">Reason (optional)</Label>
                <Input id="leave-reason" value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} placeholder="e.g. Conference" />
              </div>
              <Button
                onClick={handleAddLeave}
                disabled={addException.isPending}
                className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl"
              >
                {addException.isPending ? 'Adding…' : 'Add record'}
              </Button>
            </div>
          </Card>

          {/* Records list */}
          <Card className="rounded-2xl">
            <div className="p-5">
              {leaveRecords.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No leave records yet.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {leaveRecords.map((rec) => {
                    const past = rec.date.slice(0, 10) < today;
                    return (
                      <div key={rec.id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-900">
                            {new Date(`${rec.date.slice(0, 10)}T00:00:00`).toLocaleDateString()}
                          </span>
                          {rec.reason && <span className="text-sm text-gray-500">— {rec.reason}</span>}
                          <Badge color={past ? 'gray' : 'green'}>{past ? 'Past' : 'Upcoming'}</Badge>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteException.mutate(rec.id)}
                          disabled={deleteException.isPending}
                          className="text-sm text-gray-400 hover:text-red-500"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Add Slot Dialog */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Add Time Slot</DialogTitle>
              <DialogDescription>
                Add an availability slot for {dayNames[addDay]}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-teal-50">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{dayNames[addDay]?.slice(0, 2)}</span>
                </div>
                <span className="text-sm font-medium text-teal-700">{dayNames[addDay]}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                onClick={handleAddSlot}
                disabled={setAvailability.isPending}
                className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl"
              >
                {setAvailability.isPending ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Adding...
                  </span>
                ) : (
                  'Add Slot'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </BookingShell>
  );
}
