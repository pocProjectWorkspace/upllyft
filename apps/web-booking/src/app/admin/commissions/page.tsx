'use client';

import { useState, useRef, useEffect } from 'react';
import { BookingShell } from '@/components/booking-shell';
import {
  Card,
  Badge,
  Button,
  Input,
  Avatar,
  Skeleton,
  Separator,
} from '@upllyft/ui';
import {
  usePlatformSettings,
  useTherapistsWithCommission,
  useUpdateTherapistCommission,
} from '@/hooks/use-marketplace-admin';
import { formatCurrency } from '@/lib/utils';

function CommissionCell({
  therapist,
  globalDefault,
}: {
  therapist: {
    id: string;
    customCommission?: number;
    effectiveCommission: number;
  };
  globalDefault: number;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const updateCommission = useUpdateTherapistCommission();

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function startEditing() {
    setValue(
      therapist.customCommission != null
        ? String(therapist.customCommission)
        : String(therapist.effectiveCommission),
    );
    setEditing(true);
  }

  function save() {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      updateCommission.mutate(
        { therapistId: therapist.id, commission: num },
        { onSuccess: () => setEditing(false) },
      );
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') setEditing(false);
  }

  function resetToDefault() {
    updateCommission.mutate(
      { therapistId: therapist.id, commission: globalDefault },
      { onSuccess: () => setEditing(false) },
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="relative w-20">
          <Input
            ref={inputRef}
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (!updateCommission.isPending) setEditing(false);
            }}
            className="h-8 pr-6 text-sm rounded-lg"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
            %
          </span>
        </div>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={save}
          disabled={updateCommission.isPending}
          className="p-1 rounded-md hover:bg-teal-50 text-teal-600 transition-colors"
          title="Save"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </button>
      </div>
    );
  }

  const hasCustom = therapist.customCommission != null;

  return (
    <button
      type="button"
      onClick={startEditing}
      className="group flex items-center gap-1.5 rounded-lg px-2 py-1 -mx-2 -my-1 hover:bg-gray-100 transition-colors text-left"
      title="Click to edit"
    >
      <span className="text-sm font-medium text-gray-900">
        {therapist.effectiveCommission}%
      </span>
      {hasCustom && (
        <Badge color="purple" className="text-xs">
          Custom
        </Badge>
      )}
      <svg
        className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
      </svg>
    </button>
  );
}

function TherapistRowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-4 w-12" />
      <Skeleton className="h-4 w-12" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

export default function AdminCommissionsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { data: settings, isLoading: settingsLoading } = usePlatformSettings();
  const { data, isLoading: therapistsLoading } =
    useTherapistsWithCommission(debouncedSearch || undefined);
  const updateCommission = useUpdateTherapistCommission();

  const globalDefault = settings?.platformCommissionPercentage ?? 15;
  const therapists = data?.therapists ?? [];

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  function resetTherapist(therapistId: string) {
    updateCommission.mutate({ therapistId, commission: globalDefault });
  }

  return (
    <BookingShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Therapist Commissions
            </h1>
            <p className="text-gray-500 text-sm">
              Manage individual and global commission rates
            </p>
          </div>
        </div>

        {/* Global Commission Card */}
        {settingsLoading ? (
          <Card className="rounded-2xl">
            <div className="py-6 px-6">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-4 w-72 mt-2" />
            </div>
          </Card>
        ) : (
          <Card className="rounded-2xl border-teal-100 bg-gradient-to-r from-teal-50/50 to-emerald-50/50">
            <div className="py-6 px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-teal-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Global Default Commission
                    </p>
                    <p className="text-2xl font-bold text-teal-700">
                      {globalDefault}%
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 max-w-xs text-right">
                  Therapists without a custom commission rate use this default.
                  Change it in{' '}
                  <a
                    href="/admin/settings"
                    className="text-teal-600 hover:underline"
                  >
                    Settings
                  </a>
                  .
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Therapist List */}
        <Card className="rounded-2xl">
          <div className="p-6 pb-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Therapists</h3>
                <p className="text-sm text-gray-500">
                  {data
                    ? `${data.total} therapist${data.total !== 1 ? 's' : ''} registered`
                    : 'Loading therapists...'}
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>
            </div>
          </div>
          <div className="p-6">
            {therapistsLoading ? (
              <div className="divide-y divide-gray-100">
                {Array.from({ length: 5 }).map((_, i) => (
                  <TherapistRowSkeleton key={i} />
                ))}
              </div>
            ) : therapists.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-gray-500">
                  {debouncedSearch
                    ? `No therapists found matching "${debouncedSearch}"`
                    : 'No therapists registered yet'}
                </p>
              </div>
            ) : (
              <>
                {/* Table Header */}
                <div className="hidden md:grid md:grid-cols-[1fr_120px_120px_100px_120px_80px] gap-4 px-2 pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <span>Therapist</span>
                  <span>Commission</span>
                  <span>Effective</span>
                  <span>Bookings</span>
                  <span>Revenue</span>
                  <span />
                </div>
                <Separator className="hidden md:block mb-1" />

                <div className="divide-y divide-gray-100">
                  {therapists.map((therapist) => (
                    <div
                      key={therapist.id}
                      className="py-4 md:grid md:grid-cols-[1fr_120px_120px_100px_120px_80px] md:items-center md:gap-4 flex flex-col gap-3"
                    >
                      {/* Therapist Info */}
                      <div className="flex items-center gap-3">
                        <Avatar src={therapist.image || undefined} name={therapist.name} size="md" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {therapist.name}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {therapist.email}
                          </p>
                        </div>
                      </div>

                      {/* Mobile labels + values row */}
                      <div className="md:contents flex flex-wrap gap-x-6 gap-y-2 pl-[52px]">
                        {/* Custom Commission */}
                        <div className="md:contents">
                          <span className="text-xs text-gray-400 md:hidden">
                            Commission:{' '}
                          </span>
                          <CommissionCell
                            therapist={therapist}
                            globalDefault={globalDefault}
                          />
                        </div>

                        {/* Effective */}
                        <div className="md:contents">
                          <span className="text-xs text-gray-400 md:hidden">
                            Effective:{' '}
                          </span>
                          <span className="text-sm text-gray-600">
                            {therapist.effectiveCommission}%
                          </span>
                        </div>

                        {/* Bookings */}
                        <div className="md:contents">
                          <span className="text-xs text-gray-400 md:hidden">
                            Bookings:{' '}
                          </span>
                          <span className="text-sm text-gray-600">
                            {therapist.totalBookings}
                          </span>
                        </div>

                        {/* Revenue */}
                        <div className="md:contents">
                          <span className="text-xs text-gray-400 md:hidden">
                            Revenue:{' '}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(therapist.totalRevenue)}
                          </span>
                        </div>

                        {/* Reset */}
                        <div className="md:contents">
                          {therapist.customCommission != null && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resetTherapist(therapist.id)}
                              disabled={updateCommission.isPending}
                              className="text-xs text-gray-400 hover:text-red-500 rounded-lg h-7 px-2"
                              title="Reset to global default"
                            >
                              <svg
                                className="w-3.5 h-3.5 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                              Reset
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </BookingShell>
  );
}
