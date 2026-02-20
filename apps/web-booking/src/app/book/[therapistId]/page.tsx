'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookingShell } from '@/components/booking-shell';
import { InlineCalendar } from '@/components/inline-calendar';
import {
  useTherapistProfile,
  useTherapistSessionTypes,
  useSessionPricing,
  useAvailableSlots,
  useCreateBooking,
} from '@/hooks/use-marketplace';
import { formatCurrency, formatDuration } from '@/lib/utils';
import type { SessionType, SessionPricing as SessionPricingType } from '@/lib/api/marketplace';
import { format } from 'date-fns';
import {
  Card,
  Avatar,
  Skeleton,
  Separator,
  Textarea,
  Button,
} from '@upllyft/ui';

// ── Inline SVG Icons ──

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CurrencyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

// ── Constants ──

const STEPS = [
  { id: 1, label: 'Session Type' },
  { id: 2, label: 'Date' },
  { id: 3, label: 'Time' },
  { id: 4, label: 'Confirm' },
];

const PLATFORM_FEE_RATE = 0.15;

// ── Step Indicator ──

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                step.id < currentStep
                  ? 'bg-teal-500 text-white'
                  : step.id === currentStep
                    ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step.id < currentStep ? (
                <CheckIcon className="w-4 h-4" />
              ) : (
                step.id
              )}
            </div>
            <span
              className={`text-sm font-medium hidden sm:inline ${
                step.id === currentStep ? 'text-teal-600' : 'text-gray-500'
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`w-8 sm:w-12 h-0.5 ${
                step.id < currentStep ? 'bg-teal-500' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Loading skeleton ──

function WizardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full max-w-lg mx-auto rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}

// ── Main page ──

export default function BookingWizardPage({ params }: { params: Promise<{ therapistId: string }> }) {
  const { therapistId } = use(params);
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [selectedSessionType, setSelectedSessionType] = useState<SessionType | null>(null);
  const [selectedPricing, setSelectedPricing] = useState<SessionPricingType | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const { data: therapist, isLoading: loadingProfile } = useTherapistProfile(therapistId);
  const { data: sessionTypes, isLoading: loadingTypes } = useTherapistSessionTypes(therapistId);
  const { data: pricing } = useSessionPricing(therapistId);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';

  const { data: slots, isLoading: loadingSlots } = useAvailableSlots(
    therapistId,
    dateStr,
    selectedSessionType?.id ?? '',
    timezone,
  );

  const createBooking = useCreateBooking();

  const name = therapist?.user?.name ?? 'Therapist';
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const avatarUrl = therapist?.profileImage || therapist?.user?.image;

  // Find pricing for a session type
  const findPricing = (sessionTypeId: string) => {
    return pricing?.find((p) => p.sessionTypeId === sessionTypeId) ?? null;
  };

  // Price calculations
  const sessionPrice = selectedPricing?.price ?? 0;
  const platformFee = Math.round(sessionPrice * PLATFORM_FEE_RATE * 100) / 100;
  const totalPrice = sessionPrice + platformFee;
  const currency = selectedPricing?.currency ?? 'USD';

  // Format selected time
  const formattedTime = selectedSlot
    ? new Date(selectedSlot).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '';

  const formattedDate = selectedDate
    ? format(selectedDate, 'EEEE, MMMM d, yyyy')
    : '';

  // Handlers
  const handleSelectSessionType = (st: SessionType) => {
    setSelectedSessionType(st);
    setSelectedPricing(findPricing(st.id));
    setSelectedSlot(null);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleBook = () => {
    if (!selectedSessionType || !selectedSlot) return;
    createBooking.mutate(
      {
        therapistId,
        sessionTypeId: selectedSessionType.id,
        startDateTime: selectedSlot,
        timezone,
        patientNotes: notes || undefined,
      },
      {
        onSuccess: () => {
          router.push('/bookings');
        },
      },
    );
  };

  const canProceed = () => {
    switch (step) {
      case 1: return !!selectedSessionType;
      case 2: return !!selectedDate;
      case 3: return !!selectedSlot;
      case 4: return true;
      default: return false;
    }
  };

  if (loadingProfile || loadingTypes) {
    return (
      <BookingShell>
        <WizardSkeleton />
      </BookingShell>
    );
  }

  return (
    <BookingShell>
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => router.push(`/therapists/${therapistId}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Profile</span>
        </button>

        {/* Step Indicator */}
        <StepIndicator currentStep={step} />

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Step content */}
          <div className="lg:col-span-2">
            {/* Step 1: Session Type */}
            {step === 1 && (
              <Card className="rounded-2xl">
                <div className="p-6 pb-0">
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <ClockIcon className="w-5 h-5 text-teal-500" />
                    Select Session Type
                  </h3>
                </div>
                <div className="p-6 space-y-3">
                  {sessionTypes && sessionTypes.length > 0 ? (
                    sessionTypes
                      .filter((st) => st.isActive)
                      .map((st) => {
                        const stPricing = findPricing(st.id);
                        const isSelected = selectedSessionType?.id === st.id;

                        return (
                          <button
                            key={st.id}
                            onClick={() => handleSelectSessionType(st)}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                              isSelected
                                ? 'border-teal-500 bg-teal-50'
                                : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-gray-900">{st.name}</h4>
                                {st.description && (
                                  <p className="text-sm text-gray-500 mt-0.5">{st.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-1.5">
                                  <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="text-sm text-gray-600">{formatDuration(st.duration)}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                {stPricing ? (
                                  <span className="text-xl font-bold text-teal-600">
                                    {formatCurrency(stPricing.price, stPricing.currency)}
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-400">Price TBD</span>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="mt-2 flex justify-end">
                                <CheckIcon className="w-5 h-5 text-teal-500" />
                              </div>
                            )}
                          </button>
                        );
                      })
                  ) : (
                    <p className="text-center text-gray-500 py-8">
                      This therapist hasn&rsquo;t set up session types yet. Check back soon!
                    </p>
                  )}
                </div>
              </Card>
            )}

            {/* Step 2: Date */}
            {step === 2 && (
              <Card className="rounded-2xl">
                <div className="p-6 pb-0">
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <CalendarIcon className="w-5 h-5 text-teal-500" />
                    Select Date
                  </h3>
                </div>
                <div className="p-6">
                  <div className="max-w-sm mx-auto">
                    <InlineCalendar
                      selectedDate={selectedDate}
                      onSelectDate={handleDateSelect}
                    />
                  </div>
                  {selectedDate && (
                    <p className="text-center text-sm text-teal-600 font-medium mt-4">
                      Selected: {formattedDate}
                    </p>
                  )}
                </div>
              </Card>
            )}

            {/* Step 3: Time */}
            {step === 3 && (
              <Card className="rounded-2xl">
                <div className="p-6 pb-0">
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <ClockIcon className="w-5 h-5 text-teal-500" />
                    Select Time
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {formattedDate} &middot; {timezone}
                  </p>
                </div>
                <div className="p-6">
                  {loadingSlots ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 rounded-xl" />
                      ))}
                    </div>
                  ) : slots && slots.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {slots.map((slot) => {
                        const timeLabel = new Date(slot.startTime).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        });
                        const isSelected = selectedSlot === slot.startTime;

                        return (
                          <button
                            key={slot.startTime}
                            onClick={() => slot.available && setSelectedSlot(slot.startTime)}
                            disabled={!slot.available}
                            className={`
                              h-12 rounded-xl text-sm font-medium transition-all
                              ${isSelected ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-sm' : ''}
                              ${slot.available && !isSelected ? 'border border-gray-200 text-gray-700 hover:border-teal-400 hover:bg-teal-50' : ''}
                              ${!slot.available ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through' : ''}
                            `}
                          >
                            {timeLabel}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CalendarIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No openings on this day.</p>
                      <p className="text-sm text-gray-400 mt-1">Try picking a different date &mdash; more times might be available.</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Step 4: Confirm */}
            {step === 4 && (
              <Card className="rounded-2xl">
                <div className="p-6 pb-0">
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <CheckIcon className="w-5 h-5 text-teal-500" />
                    Review and Confirm
                  </h3>
                </div>
                <div className="p-6 space-y-6">
                  {/* Summary details */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm text-gray-600">Session Type</span>
                      <span className="text-sm font-medium text-gray-900">{selectedSessionType?.name}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm text-gray-600">Duration</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedSessionType ? formatDuration(selectedSessionType.duration) : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm text-gray-600">Date</span>
                      <span className="text-sm font-medium text-gray-900">{formattedDate}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm text-gray-600">Time</span>
                      <span className="text-sm font-medium text-gray-900">{formattedTime}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm text-gray-600">Timezone</span>
                      <span className="text-sm font-medium text-gray-900">{timezone}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional notes (optional)
                    </label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Share anything you'd like your therapist to know before the session..."
                      rows={4}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </Card>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setStep((s) => s - 1)}
                disabled={step === 1}
              >
                <ChevronLeftIcon className="w-4 h-4 mr-1" />
                Back
              </Button>

              {step < 4 ? (
                <Button
                  className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canProceed()}
                >
                  Next
                  <ChevronRightIcon className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white px-8"
                  onClick={handleBook}
                  disabled={createBooking.isPending}
                >
                  {createBooking.isPending ? 'Booking...' : 'Book Session'}
                </Button>
              )}
            </div>
          </div>

          {/* Sidebar: Booking Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card className="rounded-2xl">
                <div className="p-6 pb-0">
                  <h3 className="text-lg font-semibold">Your Booking</h3>
                </div>
                <div className="p-6 space-y-4">
                  {/* Therapist info */}
                  <div className="flex items-center gap-3">
                    <Avatar src={avatarUrl || undefined} name={name} size="lg" className="border-2 border-teal-100" />
                    <div>
                      <p className="font-semibold text-gray-900">{name}</p>
                      <p className="text-sm text-gray-500">{therapist?.title}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Selected details */}
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Session</span>
                      <span className="font-medium text-gray-900">
                        {selectedSessionType?.name ?? '--'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Date</span>
                      <span className="font-medium text-gray-900">
                        {selectedDate ? format(selectedDate, 'MMM d, yyyy') : '--'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Time</span>
                      <span className="font-medium text-gray-900">
                        {formattedTime || '--'}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  {/* Price breakdown */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Session fee</span>
                      <span className="text-gray-900">
                        {selectedPricing ? formatCurrency(sessionPrice, currency) : '--'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Platform fee (15%)</span>
                      <span className="text-gray-900">
                        {selectedPricing ? formatCurrency(platformFee, currency) : '--'}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-base">
                      <span className="text-gray-900">Total</span>
                      <span className="text-teal-600">
                        {selectedPricing ? formatCurrency(totalPrice, currency) : '--'}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </BookingShell>
  );
}
