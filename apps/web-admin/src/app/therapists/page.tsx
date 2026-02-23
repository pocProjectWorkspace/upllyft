'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminShell } from '@/components/admin-shell';
import { AddTherapistModal } from '@/components/add-therapist-modal';
import { Avatar } from '@upllyft/ui';
import {
  getTherapistDirectory,
  type TherapistListItem,
  type CredentialStatus,
  type AvailabilityStatus,
} from '@/lib/admin-api';
import {
  Search,
  Filter,
  Stethoscope,
  Calendar,
  FolderOpen,
  Star,
  ShieldCheck,
  ShieldAlert,
  Clock,
  X,
  CalendarDays,
} from 'lucide-react';

const CREDENTIAL_OPTIONS: { value: CredentialStatus; label: string }[] = [
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'EXPIRED', label: 'Expired' },
];

const AVAILABILITY_OPTIONS: { value: AvailabilityStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'busy', label: 'Busy' },
  { value: 'off', label: 'Off Today' },
];

function CredentialBadge({ status }: { status: CredentialStatus }) {
  const config: Record<CredentialStatus, { label: string; className: string; icon: typeof ShieldCheck }> = {
    VERIFIED: {
      label: 'Verified',
      className: 'bg-green-50 text-green-700 border-green-200',
      icon: ShieldCheck,
    },
    PENDING: {
      label: 'Pending',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Clock,
    },
    EXPIRED: {
      label: 'Expired',
      className: 'bg-red-50 text-red-700 border-red-200',
      icon: ShieldAlert,
    },
  };
  const c = config[status];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border ${c.className}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

function AvailabilityBadge({ status }: { status: AvailabilityStatus }) {
  const config: Record<AvailabilityStatus, { label: string; dot: string }> = {
    available: { label: 'Available', dot: 'bg-green-500' },
    busy: { label: 'Busy', dot: 'bg-amber-500' },
    off: { label: 'Off Today', dot: 'bg-gray-400' },
  };
  const c = config[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

export default function TherapistsPage() {
  const [therapists, setTherapists] = useState<TherapistListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addTherapistOpen, setAddTherapistOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [credentialFilter, setCredentialFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Extract unique specialties from therapists
  const allSpecialties = Array.from(
    new Set(therapists.flatMap((t) => t.specializations)),
  ).sort();

  const fetchTherapists = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTherapistDirectory({
        search: search || undefined,
        specialty: specialtyFilter || undefined,
        availability: (availabilityFilter as AvailabilityStatus) || undefined,
        credentialStatus: (credentialFilter as CredentialStatus) || undefined,
      });
      setTherapists(data);
    } catch {
      setTherapists([]);
    } finally {
      setLoading(false);
    }
  }, [search, specialtyFilter, availabilityFilter, credentialFilter]);

  useEffect(() => {
    fetchTherapists();
  }, [fetchTherapists]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const clearFilters = () => {
    setSpecialtyFilter('');
    setAvailabilityFilter('');
    setCredentialFilter('');
    setSearchInput('');
    setSearch('');
  };

  const hasActiveFilters = specialtyFilter || availabilityFilter || credentialFilter || search;

  return (
    <AdminShell>
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Therapists</h1>
            <p className="text-sm text-gray-500 mt-1">
              {therapists.length} therapist{therapists.length !== 1 ? 's' : ''} registered
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAddTherapistOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
            >
              + Add Therapist
            </button>
            <a
              href="/therapists/schedule"
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors shadow-sm"
            >
              <CalendarDays className="w-4 h-4" />
              View Schedule
            </a>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search therapists by name or email..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-colors ${showFilters || hasActiveFilters
                ? 'bg-teal-50 text-teal-700 border-teal-200'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Filters</span>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                    Clear all
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Specialty</label>
                  <select
                    value={specialtyFilter}
                    onChange={(e) => setSpecialtyFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="">All specialties</option>
                    {allSpecialties.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Availability</label>
                  <select
                    value={availabilityFilter}
                    onChange={(e) => setAvailabilityFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="">All statuses</option>
                    {AVAILABILITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Credential Status</label>
                  <select
                    value={credentialFilter}
                    onChange={(e) => setCredentialFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="">All credentials</option>
                    {CREDENTIAL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Active filter chips */}
          {hasActiveFilters && !showFilters && (
            <div className="flex flex-wrap gap-2">
              {specialtyFilter && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-lg">
                  {specialtyFilter}
                  <button onClick={() => setSpecialtyFilter('')} className="hover:text-teal-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {availabilityFilter && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-lg">
                  {AVAILABILITY_OPTIONS.find((o) => o.value === availabilityFilter)?.label}
                  <button onClick={() => setAvailabilityFilter('')} className="hover:text-teal-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {credentialFilter && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-lg">
                  {CREDENTIAL_OPTIONS.find((o) => o.value === credentialFilter)?.label}
                  <button onClick={() => setCredentialFilter('')} className="hover:text-teal-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {search && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg">
                  &ldquo;{search}&rdquo;
                  <button onClick={() => { setSearchInput(''); setSearch(''); }} className="hover:text-gray-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : therapists.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Stethoscope className="w-8 h-8 text-teal-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {hasActiveFilters ? 'No therapists match your filters' : 'No therapists yet'}
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              {hasActiveFilters
                ? 'Try adjusting your search or filters.'
                : 'Therapists will appear here once they create their profiles.'}
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-4 text-sm text-teal-600 hover:text-teal-700 font-medium">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {therapists.map((t) => (
              <a
                key={t.id}
                href={`/therapists/${t.id}`}
                className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow group"
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <Avatar
                    name={t.name || 'Therapist'}
                    src={t.avatar || undefined}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-gray-900 group-hover:text-teal-700 truncate">
                      {t.name || 'Unnamed Therapist'}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{t.title || t.email}</p>
                    <AvailabilityBadge status={t.availabilityStatus} />
                  </div>
                  <CredentialBadge status={t.credentialStatus} />
                </div>

                {/* Specializations */}
                {t.specializations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {t.specializations.slice(0, 3).map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 bg-teal-50 text-teal-700 text-xs font-medium rounded-md"
                      >
                        {s}
                      </span>
                    ))}
                    {t.specializations.length > 3 && (
                      <span className="px-2 py-0.5 bg-gray-50 text-gray-500 text-xs rounded-md">
                        +{t.specializations.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-sm font-semibold text-gray-900">
                      <FolderOpen className="w-3.5 h-3.5 text-gray-400" />
                      {t.activeCaseCount}
                    </div>
                    <p className="text-xs text-gray-500">Cases</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-sm font-semibold text-gray-900">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {t.todayAppointments}
                    </div>
                    <p className="text-xs text-gray-500">Today</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-sm font-semibold text-gray-900">
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                      {t.overallRating > 0 ? t.overallRating.toFixed(1) : '-'}
                    </div>
                    <p className="text-xs text-gray-500">Rating</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
      <AddTherapistModal
        open={addTherapistOpen}
        onClose={() => setAddTherapistOpen(false)}
        onCreated={fetchTherapists}
      />
    </AdminShell>
  );
}
