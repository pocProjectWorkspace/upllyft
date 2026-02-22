'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { Avatar } from '@upllyft/ui';
import {
  getTherapistDetail,
  getTherapistSchedule,
  type TherapistDetail,
  type ScheduleAppointment,
  type CredentialStatus,
} from '@/lib/admin-api';
import {
  ArrowLeft,
  Mail,
  Phone,
  Star,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Calendar,
  FolderOpen,
  Activity,
  ChevronLeft,
  ChevronRight,
  Globe,
  Briefcase,
  Users,
  Upload,
  Download,
  Trash2,
  X,
  AlertCircle,
  FileText,
} from 'lucide-react';
import {
  getTherapistCredentials,
  uploadCredential,
  getCredentialDownloadUrl,
  deleteCredential,
  type Credential,
} from '@/lib/api/credentials';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function CredentialBadge({ status }: { status: CredentialStatus }) {
  const config: Record<CredentialStatus, { label: string; className: string; icon: typeof ShieldCheck }> = {
    VERIFIED: { label: 'Verified', className: 'bg-green-50 text-green-700 border-green-200', icon: ShieldCheck },
    PENDING: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    EXPIRED: { label: 'Expired', className: 'bg-red-50 text-red-700 border-red-200', icon: ShieldAlert },
  };
  const c = config[status];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border ${c.className}`}>
      <Icon className="w-3.5 h-3.5" />
      {c.label}
    </span>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
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

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function getWeekDates(refDate: Date): Date[] {
  const day = refDate.getDay();
  const start = new Date(refDate);
  start.setDate(start.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
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

type Tab = 'caseload' | 'schedule' | 'credentials';

export default function TherapistDetailPage() {
  const params = useParams();
  const therapistId = params.id as string;

  const [therapist, setTherapist] = useState<TherapistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('caseload');

  // Schedule state
  const [weekRef, setWeekRef] = useState(new Date());
  const [weekAppointments, setWeekAppointments] = useState<ScheduleAppointment[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const fetchTherapist = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTherapistDetail(therapistId);
      setTherapist(data);
    } catch {
      setTherapist(null);
    } finally {
      setLoading(false);
    }
  }, [therapistId]);

  useEffect(() => {
    fetchTherapist();
  }, [fetchTherapist]);

  // Fetch week appointments when schedule tab is active or week changes
  const fetchWeekSchedule = useCallback(async () => {
    if (!therapistId) return;
    setLoadingSchedule(true);
    const weekDates = getWeekDates(weekRef);
    const startDate = weekDates[0].toISOString().split('T')[0];
    const endDate = weekDates[6].toISOString().split('T')[0];
    try {
      const data = await getTherapistSchedule(therapistId, { startDate, endDate });
      setWeekAppointments(data);
    } catch {
      setWeekAppointments([]);
    } finally {
      setLoadingSchedule(false);
    }
  }, [therapistId, weekRef]);

  useEffect(() => {
    if (activeTab === 'schedule') {
      fetchWeekSchedule();
    }
  }, [activeTab, fetchWeekSchedule]);

  const weekDates = getWeekDates(weekRef);

  if (loading) {
    return (
      <AdminShell>
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminShell>
    );
  }

  if (!therapist) {
    return (
      <AdminShell>
        <div className="max-w-7xl mx-auto py-12 text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Therapist not found</h2>
          <a href="/therapists" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
            Back to directory
          </a>
        </div>
      </AdminShell>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof FolderOpen }[] = [
    { key: 'caseload', label: 'Caseload', icon: FolderOpen },
    { key: 'schedule', label: 'Schedule', icon: Calendar },
    { key: 'credentials', label: 'Credentials', icon: ShieldCheck },
  ];

  return (
    <AdminShell>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Back link */}
        <a
          href="/therapists"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to therapists
        </a>

        {/* Profile Header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-start gap-5">
            <Avatar
              name={therapist.name || 'Therapist'}
              src={therapist.avatar || undefined}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-gray-900">
                  {therapist.name || 'Unnamed Therapist'}
                </h1>
                <CredentialBadge status={therapist.credentialStatus} />
              </div>
              <p className="text-sm text-gray-500 mb-3">{therapist.title || 'Therapist'}</p>

              {/* Specializations */}
              {therapist.specializations.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {therapist.specializations.map((s) => (
                    <span key={s} className="px-2 py-0.5 bg-teal-50 text-teal-700 text-xs font-medium rounded-md">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {/* Contact & Info */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                {therapist.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    {therapist.email}
                  </span>
                )}
                {therapist.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    {therapist.phone}
                  </span>
                )}
                {therapist.yearsExperience != null && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" />
                    {therapist.yearsExperience}y experience
                  </span>
                )}
                {therapist.languages.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    {therapist.languages.join(', ')}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Joined {formatDate(therapist.joinedAt)}
                </span>
              </div>
            </div>

            {/* Rating */}
            <div className="text-center">
              <div className="flex items-center gap-1 text-lg font-bold text-gray-900">
                <Star className="w-5 h-5 text-amber-400" />
                {therapist.overallRating > 0 ? therapist.overallRating.toFixed(1) : '-'}
              </div>
              <p className="text-xs text-gray-500">{therapist.totalRatings} reviews</p>
            </div>
          </div>
        </div>

        {/* Performance Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{therapist.performance.sessionsThisMonth}</p>
                <p className="text-xs text-gray-500">Sessions this month</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{therapist.performance.avgSessionsPerWeek}</p>
                <p className="text-xs text-gray-500">Avg sessions / week</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{therapist.performance.activeCases}</p>
                <p className="text-xs text-gray-500">Active cases</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex gap-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'text-teal-600 border-teal-600'
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'caseload' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {therapist.caseload.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <FolderOpen className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">No active cases</h3>
                <p className="text-xs text-gray-500">This therapist has no active cases assigned.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Case #</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Diagnosis</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Last Session</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Opened</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {therapist.caseload.map((c) => (
                      <tr key={c.caseId} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3">
                          <a href={`/patients/${c.patient.id}`} className="group">
                            <p className="text-sm font-medium text-gray-900 group-hover:text-teal-700">
                              {c.patient.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {calculateAge(c.patient.dateOfBirth)}y old
                            </p>
                          </a>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-600 font-mono">{c.caseNumber}</td>
                        <td className="px-5 py-3 text-sm text-gray-600">{c.diagnosis || '-'}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md border ${
                            c.patient.clinicStatus === 'ACTIVE'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-gray-50 text-gray-600 border-gray-200'
                          }`}>
                            {c.patient.clinicStatus}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-500">
                          {c.lastSession ? formatDate(c.lastSession.scheduledAt) : 'None'}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-500">{formatDate(c.openedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-4">
            {/* Week Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  const d = new Date(weekRef);
                  d.setDate(d.getDate() - 7);
                  setWeekRef(d);
                }}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium text-gray-700">
                {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' - '}
                {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <button
                onClick={() => {
                  const d = new Date(weekRef);
                  d.setDate(d.getDate() + 7);
                  setWeekRef(d);
                }}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Weekly Calendar */}
            {loadingSchedule ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="grid grid-cols-7 border-b border-gray-100">
                  {weekDates.map((date, i) => {
                    const isToday = date.toDateString() === new Date().toDateString();
                    const dayAppointments = weekAppointments.filter((a) => {
                      const aDate = new Date(a.startDateTime);
                      return aDate.toDateString() === date.toDateString();
                    });
                    return (
                      <div key={i} className={`p-3 text-center border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-teal-50/50' : ''}`}>
                        <p className="text-xs font-medium text-gray-500">{SHORT_DAY_NAMES[i]}</p>
                        <p className={`text-lg font-semibold ${isToday ? 'text-teal-600' : 'text-gray-900'}`}>
                          {date.getDate()}
                        </p>
                        {dayAppointments.length > 0 && (
                          <p className="text-xs text-teal-600 font-medium mt-1">
                            {dayAppointments.length} appt{dayAppointments.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Appointment list for the week */}
                <div className="divide-y divide-gray-50">
                  {weekAppointments.length === 0 ? (
                    <div className="p-8 text-center">
                      <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No appointments this week</p>
                    </div>
                  ) : (
                    weekAppointments.map((a) => (
                      <a
                        key={a.id}
                        href={`http://localhost:3004/bookings/${a.id}`}
                        className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/50 transition-colors"
                      >
                        <div className="w-16 text-center">
                          <p className="text-xs text-gray-500">
                            {new Date(a.startDateTime).toLocaleDateString('en-US', { weekday: 'short' })}
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {formatTime(a.startDateTime)}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{a.patient?.name || 'Unknown Patient'}</p>
                          <p className="text-xs text-gray-500">{a.sessionType || 'Session'}</p>
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${statusColor(a.status)}`}>
                          {a.status.replace(/_/g, ' ')}
                        </span>
                      </a>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'credentials' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <h3 className="text-base font-semibold text-gray-900">Credential Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Credential Status</label>
                <CredentialBadge status={therapist.credentialStatus} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Licence Number</label>
                <p className="text-sm text-gray-900 font-mono">
                  {therapist.licenceNumber || 'Not provided'}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Licence Expiry</label>
                <p className="text-sm text-gray-900">
                  {therapist.licenceExpiry ? formatDate(therapist.licenceExpiry) : 'Not provided'}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Professional Credentials</label>
                {therapist.credentials.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {therapist.credentials.map((c) => (
                      <span key={c} className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-md">
                        {c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">None listed</p>
                )}
              </div>
            </div>

            {/* Availability Schedule */}
            <div className="pt-5 border-t border-gray-100">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Weekly Availability</h3>
              {therapist.availability.length === 0 ? (
                <p className="text-sm text-gray-500">No availability set</p>
              ) : (
                <div className="space-y-2">
                  {therapist.availability.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="w-24 font-medium text-gray-700">{DAY_NAMES[a.dayOfWeek]}</span>
                      <span className="text-gray-500">{a.startTime} - {a.endTime}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Uploaded Documents */}
            <div className="pt-5 border-t border-gray-100">
              <CredentialDocuments therapistId={therapist.id} />
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

/* ── Credential Documents Section ────────────────────────────── */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png';

function CredentialDocuments({ therapistId }: { therapistId: string }) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const fetchCredentials = async () => {
    try {
      const data = await getTherapistCredentials(therapistId);
      setCredentials(data);
    } catch {
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, [therapistId]);

  const resetForm = () => {
    setFile(null);
    setLabel('');
    setExpiresAt('');
    setError(null);
  };

  const handleUpload = async () => {
    if (!file || !label.trim()) return;

    if (file.size > MAX_FILE_SIZE) {
      setError('File size must be under 10MB.');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('label', label.trim());
      if (expiresAt) formData.append('expiresAt', new Date(expiresAt).toISOString());

      await uploadCredential(therapistId, formData);
      setModalOpen(false);
      resetForm();
      await fetchCredentials();
    } catch (err: any) {
      setError(
        err?.response?.data?.message || 'Upload failed. Please try again.',
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (credId: string) => {
    try {
      const { url } = await getCredentialDownloadUrl(therapistId, credId);
      window.open(url, '_blank');
    } catch {
      // silently fail
    }
  };

  const handleDelete = async (credId: string) => {
    setDeleting(credId);
    try {
      await deleteCredential(therapistId, credId);
      setCredentials((prev) => prev.filter((c) => c.id !== credId));
    } catch {
      // silently fail
    } finally {
      setDeleting(null);
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900">Documents</h3>
        <button
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700"
        >
          <Upload className="w-3.5 h-3.5" />
          Upload Credential
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : credentials.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-6 text-center border border-dashed border-gray-200">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 uppercase">Label</th>
                <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 uppercase">Uploaded</th>
                <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 uppercase">Expiry</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {credentials.map((cred) => (
                <tr key={cred.id}>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-900">{cred.label || cred.fileName}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-sm text-gray-500">{formatDate(cred.createdAt)}</td>
                  <td className="py-3 pr-4">
                    {cred.expiresAt ? (
                      <span className="flex items-center gap-1.5">
                        <span className="text-sm text-gray-500">{formatDate(cred.expiresAt)}</span>
                        {isExpired(cred.expiresAt) && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-50 text-red-600 rounded">
                            Expired
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleDownload(cred.id)}
                        className="p-1.5 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-teal-50"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cred.id)}
                        disabled={deleting === cred.id}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                        title="Delete"
                      >
                        {deleting === cred.id ? (
                          <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !uploading && setModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Upload Credential</h3>
              <button
                onClick={() => !uploading && setModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* File picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept={ACCEPTED_TYPES}
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setFile(f);
                    if (f && f.size > MAX_FILE_SIZE) {
                      setError('File size must be under 10MB.');
                    } else {
                      setError(null);
                    }
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                />
                <p className="text-xs text-gray-400 mt-1">PDF, JPG, or PNG. Max 10MB.</p>
              </div>

              {/* Label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. HAAD Licence, DHA Registration"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {/* Expiry date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 mt-4 bg-red-50 border border-red-100 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setModalOpen(false)}
                disabled={uploading}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !file || !label.trim()}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
