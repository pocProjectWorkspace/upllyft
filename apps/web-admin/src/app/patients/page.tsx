'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminShell } from '@/components/admin-shell';
import { PatientStatusBadge } from '@/components/patient-status-badge';
import { AssignTherapistModal } from '@/components/assign-therapist-modal';
import { Avatar } from '@upllyft/ui';
import {
  getPatients,
  getTherapists,
  type PatientListItem,
  type TherapistOption,
  type PaginatedResponse,
} from '@/lib/admin-api';
import {
  Search,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  Users,
  UserPlus,
  CalendarDays,
  X,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'INTAKE', label: 'Intake' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'DISCHARGED', label: 'Discharged' },
];

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return formatDate(dateStr);
}

export default function PatientsPage() {
  const [result, setResult] = useState<PaginatedResponse<PatientListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [therapistFilter, setTherapistFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [therapists, setTherapists] = useState<TherapistOption[]>([]);

  // Assign modal state
  const [assignChild, setAssignChild] = useState<{ id: string; name: string } | null>(null);

  // View mode: table or intake cards
  const isIntakeView = statusFilter.length === 1 && statusFilter[0] === 'INTAKE';

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPatients({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter.length > 0 ? statusFilter as any : undefined,
        therapistId: therapistFilter || undefined,
      });
      setResult(data);
    } catch {
      setResult({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, therapistFilter, page]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    getTherapists().then(setTherapists).catch(() => {});
  }, []);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const patients = result?.data || [];
  const meta = result?.meta || { total: 0, page: 1, limit: 20, totalPages: 0 };

  const toggleStatus = (status: string) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
    setPage(1);
  };

  const clearFilters = () => {
    setStatusFilter([]);
    setTherapistFilter('');
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const hasActiveFilters = statusFilter.length > 0 || therapistFilter || search;

  return (
    <AdminShell>
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
            <p className="text-sm text-gray-500 mt-1">
              {meta.total} patient{meta.total !== 1 ? 's' : ''} registered
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setStatusFilter(['INTAKE']);
                setPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                isIntakeView
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Intake Queue
            </button>
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
                placeholder="Search patients by name, parent, or email..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-teal-50 text-teal-700 border-teal-200'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="w-5 h-5 bg-teal-600 text-white text-xs rounded-full flex items-center justify-center">
                  {statusFilter.length + (therapistFilter ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {/* Filter bar */}
          {showFilters && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Status</span>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                    Clear all
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => toggleStatus(opt.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      statusFilter.includes(opt.value)
                        ? 'bg-teal-50 text-teal-700 border-teal-300'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {therapists.length > 0 && (
                <>
                  <span className="text-sm font-medium text-gray-700 block">Therapist</span>
                  <select
                    value={therapistFilter}
                    onChange={(e) => {
                      setTherapistFilter(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="">All therapists</option>
                    {therapists.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          )}

          {/* Active filter chips */}
          {hasActiveFilters && !showFilters && (
            <div className="flex flex-wrap gap-2">
              {statusFilter.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-lg"
                >
                  {STATUS_OPTIONS.find((o) => o.value === s)?.label}
                  <button onClick={() => toggleStatus(s)} className="hover:text-teal-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
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
        ) : patients.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-teal-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {hasActiveFilters ? 'No patients match your filters' : 'No patients yet'}
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              {hasActiveFilters
                ? 'Try adjusting your search or filters.'
                : 'Patients will appear here once parents register and add their children.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : isIntakeView ? (
          /* Intake Queue — Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patients.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <a
                      href={`/patients/${p.id}`}
                      className="text-base font-semibold text-gray-900 hover:text-teal-700"
                    >
                      {p.firstName}
                    </a>
                    <p className="text-sm text-gray-500">{calculateAge(p.dateOfBirth)} years old</p>
                  </div>
                  <PatientStatusBadge status={p.clinicStatus} />
                </div>
                <div className="space-y-2 mb-4">
                  {p.parent && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium">Parent:</span>
                      <span>{p.parent.name}</span>
                    </div>
                  )}
                  {p.parent?.email && (
                    <div className="text-sm text-gray-500 truncate">{p.parent.email}</div>
                  )}
                  {p.parent?.phone && (
                    <div className="text-sm text-gray-500">{p.parent.phone}</div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <CalendarDays className="w-3.5 h-3.5" />
                    Registered {formatDate(p.createdAt)}
                  </div>
                  <div className="text-sm text-gray-500">
                    Screening: {p.latestScreening ? p.latestScreening.status.replace(/_/g, ' ').toLowerCase() : 'Not started'}
                  </div>
                </div>
                <button
                  onClick={() => setAssignChild({ id: p.id, name: p.firstName })}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Assign & Create Case
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Age
                    </th>
                    <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Parent / Guardian
                    </th>
                    <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Therapist
                    </th>
                    <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Activity
                    </th>
                    <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {patients.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <a href={`/patients/${p.id}`} className="flex items-center gap-3 group">
                          <Avatar name={p.firstName} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 group-hover:text-teal-700">
                              {p.firstName}
                            </p>
                            {p.conditions.length > 0 && (
                              <p className="text-xs text-gray-500 truncate max-w-[180px]">
                                {p.conditions.map((c) => c.type).join(', ')}
                              </p>
                            )}
                          </div>
                        </a>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">
                        {calculateAge(p.dateOfBirth)}y
                      </td>
                      <td className="px-5 py-3.5">
                        <div>
                          <p className="text-sm text-gray-900">{p.parent?.name || '-'}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[180px]">
                            {p.parent?.email || ''}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <PatientStatusBadge status={p.clinicStatus} />
                      </td>
                      <td className="px-5 py-3.5">
                        {p.assignedTherapist ? (
                          <div className="flex items-center gap-2">
                            <Avatar
                              name={p.assignedTherapist.name}
                              src={p.assignedTherapist.avatar || undefined}
                              size="sm"
                            />
                            <span className="text-sm text-gray-700">{p.assignedTherapist.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-500">
                        {timeAgo(p.lastActivity)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <a
                            href={`/patients/${p.id}`}
                            className="px-3 py-1.5 text-xs font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                          >
                            View
                          </a>
                          {!p.assignedTherapist && (
                            <button
                              onClick={() => setAssignChild({ id: p.id, name: p.firstName })}
                              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                              Assign
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={meta.page <= 1}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          meta.page === pageNum
                            ? 'bg-teal-600 text-white'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                    disabled={meta.page >= meta.totalPages}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Assign Therapist Modal */}
      {assignChild && (
        <AssignTherapistModal
          childId={assignChild.id}
          childName={assignChild.name}
          open={!!assignChild}
          onClose={() => setAssignChild(null)}
          onAssigned={fetchPatients}
        />
      )}
    </AdminShell>
  );
}
