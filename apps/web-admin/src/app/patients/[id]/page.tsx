'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { PatientStatusBadge } from '@/components/patient-status-badge';
import { AssignTherapistModal } from '@/components/assign-therapist-modal';
import { Avatar } from '@upllyft/ui';
import { getPatientDetail, updatePatientStatus, type PatientDetail } from '@/lib/admin-api';
import {
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  MapPin,
  User,
  Briefcase,
  FileText,
  Activity,
  Target,
  Brain,
  ChevronDown,
} from 'lucide-react';

function calculateAge(dob: string): string {
  const birth = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) years--;
  return `${years} years old`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const STATUS_OPTIONS = ['INTAKE', 'ACTIVE', 'ON_HOLD', 'DISCHARGED'] as const;
const TABS = [
  { key: 'demographics', label: 'Demographics', icon: User },
  { key: 'screening', label: 'Screening', icon: Brain },
  { key: 'cases', label: 'Cases', icon: Briefcase },
  { key: 'sessions', label: 'Sessions', icon: Calendar },
  { key: 'milestones', label: 'Milestones', icon: Target },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function PatientDetailPage() {
  const params = useParams();
  const childId = params.id as string;
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('demographics');
  const [statusDropdown, setStatusDropdown] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const fetchPatient = async () => {
    setLoading(true);
    try {
      const data = await getPatientDetail(childId);
      setPatient(data);
    } catch {
      setPatient(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (childId) fetchPatient();
  }, [childId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!patient) return;
    try {
      await updatePatientStatus(patient.id, newStatus);
      setPatient((prev) => (prev ? { ...prev, clinicStatus: newStatus as any } : prev));
    } catch {
      // error
    }
    setStatusDropdown(false);
  };

  if (loading) {
    return (
      <AdminShell>
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminShell>
    );
  }

  if (!patient) {
    return (
      <AdminShell>
        <div className="max-w-4xl mx-auto text-center py-24">
          <h2 className="text-xl font-semibold text-gray-900">Patient not found</h2>
          <a href="/patients" className="text-teal-600 text-sm mt-2 inline-block hover:underline">
            Back to patients
          </a>
        </div>
      </AdminShell>
    );
  }

  const allSessions = patient.cases.flatMap((c) =>
    c.sessions.map((s) => ({ ...s, caseNumber: c.caseNumber })),
  );
  allSessions.sort(
    (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
  );

  const allGoals = patient.cases.flatMap((c) =>
    (c as any).ieps?.flatMap((iep: any) =>
      (iep.goals || []).map((g: any) => ({ ...g, caseNumber: c.caseNumber })),
    ) || [],
  );

  return (
    <AdminShell>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back link */}
        <a
          href="/patients"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to patients
        </a>

        {/* Patient Header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <Avatar name={patient.firstName} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{patient.firstName}</h1>
                {patient.nickname && (
                  <span className="text-sm text-gray-500">({patient.nickname})</span>
                )}
                <div className="relative">
                  <button
                    onClick={() => setStatusDropdown(!statusDropdown)}
                    className="inline-flex items-center gap-1"
                  >
                    <PatientStatusBadge status={patient.clinicStatus} />
                    <ChevronDown className="w-3 h-3 text-gray-400" />
                  </button>
                  {statusDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20 w-36">
                      {STATUS_OPTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(s)}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                            patient.clinicStatus === s ? 'text-teal-700 font-medium' : 'text-gray-700'
                          }`}
                        >
                          {s.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-500">
                {calculateAge(patient.dateOfBirth)} &middot; {patient.gender} &middot; Registered{' '}
                {formatDate(patient.createdAt)}
              </p>
              {/* Parent info */}
              {patient.parent && (
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    {patient.parent.name}
                    {patient.parentProfile?.relationshipToChild && (
                      <span className="text-gray-400">
                        ({patient.parentProfile.relationshipToChild})
                      </span>
                    )}
                  </span>
                  {patient.parent.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      {patient.parent.email}
                    </span>
                  )}
                  {patient.parent.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      {patient.parent.phone}
                    </span>
                  )}
                </div>
              )}
            </div>
            {/* Quick actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setAssignOpen(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700"
              >
                Assign Therapist
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          {activeTab === 'demographics' && (
            <DemographicsTab patient={patient} />
          )}
          {activeTab === 'screening' && (
            <ScreeningTab assessments={patient.assessments} />
          )}
          {activeTab === 'cases' && (
            <CasesTab cases={patient.cases} />
          )}
          {activeTab === 'sessions' && (
            <SessionsTab sessions={allSessions} />
          )}
          {activeTab === 'milestones' && (
            <MilestonesTab goals={allGoals} />
          )}
        </div>
      </div>

      <AssignTherapistModal
        childId={patient.id}
        childName={patient.firstName}
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        onAssigned={fetchPatient}
      />
    </AdminShell>
  );
}

/* --- Tab Components --- */

function DemographicsTab({ patient }: { patient: PatientDetail }) {
  const d = patient.demographics;
  const h = patient.health;

  const rows = [
    { label: 'Date of Birth', value: formatDate(patient.dateOfBirth) },
    { label: 'Gender', value: patient.gender },
    { label: 'Nationality', value: d.nationality },
    { label: 'Primary Language', value: d.primaryLanguage },
    { label: 'City', value: d.city },
    { label: 'State', value: d.state },
    { label: 'Address', value: d.address },
    { label: 'School Type', value: d.schoolType },
    { label: 'Grade', value: d.grade },
    { label: 'School', value: d.currentSchool },
  ].filter((r) => r.value);

  const healthRows = [
    { label: 'Diagnosis Status', value: h.diagnosisStatus },
    { label: 'Developmental Concerns', value: h.developmentalConcerns },
    { label: 'Delayed Milestones', value: h.delayedMilestones ? 'Yes' : h.delayedMilestones === false ? 'No' : null },
    { label: 'Delayed Details', value: h.delayedMilestonesDetails },
    { label: 'Taking Medications', value: h.takingMedications ? 'Yes' : h.takingMedications === false ? 'No' : null },
    { label: 'Medication Details', value: h.medicationDetails },
  ].filter((r) => r.value);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-3">Personal Information</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          {rows.map((r) => (
            <div key={r.label}>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">{r.label}</dt>
              <dd className="text-sm text-gray-900 mt-0.5">{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      {(h.conditions?.length > 0 || healthRows.length > 0) && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-3">Health & Development</h3>
          {h.conditions?.length > 0 && (
            <div className="mb-3">
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Conditions</dt>
              <div className="flex flex-wrap gap-2">
                {h.conditions.map((c: any, i: number) => (
                  <span key={i} className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-lg">
                    {c.conditionType}
                    {c.severity ? ` (${c.severity})` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {healthRows.map((r) => (
              <div key={r.label}>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">{r.label}</dt>
                <dd className="text-sm text-gray-900 mt-0.5">{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {/* Parent contact */}
      {patient.parentProfile && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-3">Parent / Guardian</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {[
              { label: 'Name', value: patient.parentProfile.fullName || patient.parent?.name },
              { label: 'Relationship', value: patient.parentProfile.relationshipToChild },
              { label: 'Phone', value: patient.parentProfile.phoneNumber || patient.parent?.phone },
              { label: 'Alt Phone', value: patient.parentProfile.alternatePhone },
              { label: 'Email', value: patient.parentProfile.email || patient.parent?.email },
            ]
              .filter((r) => r.value)
              .map((r) => (
                <div key={r.label}>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">{r.label}</dt>
                  <dd className="text-sm text-gray-900 mt-0.5">{r.value}</dd>
                </div>
              ))}
          </dl>
        </div>
      )}
    </div>
  );
}

function ScreeningTab({ assessments }: { assessments: PatientDetail['assessments'] }) {
  if (assessments.length === 0) {
    return (
      <EmptyState
        icon={Brain}
        title="No screenings yet"
        description="Screening results will appear here once the parent completes a UFMF assessment."
      />
    );
  }

  const domainLabels: Record<string, string> = {
    motor: 'Motor',
    language: 'Language',
    social: 'Social',
    cognitive: 'Cognitive',
    adaptive: 'Adaptive',
    sensory: 'Sensory',
  };

  return (
    <div className="space-y-4">
      {assessments.map((a) => (
        <div key={a.id} className="border border-gray-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">
                Assessment {formatDate(a.createdAt)}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  a.status === 'COMPLETED'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {a.status.replace(/_/g, ' ')}
              </span>
            </div>
            {a.overallScore !== null && (
              <span className="text-lg font-bold text-gray-900">{a.overallScore}%</span>
            )}
          </div>
          {a.domainScores && typeof a.domainScores === 'object' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(a.domainScores as Record<string, number>).map(([domain, score]) => {
                const isFlagged = a.flaggedDomains?.includes(domain);
                return (
                  <div
                    key={domain}
                    className={`p-3 rounded-lg ${isFlagged ? 'bg-red-50 border border-red-100' : 'bg-gray-50'}`}
                  >
                    <p className="text-xs font-medium text-gray-500 uppercase">
                      {domainLabels[domain.toLowerCase()] || domain}
                    </p>
                    <p className={`text-lg font-bold ${isFlagged ? 'text-red-600' : 'text-gray-900'}`}>
                      {score}%
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CasesTab({ cases }: { cases: PatientDetail['cases'] }) {
  if (cases.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="No cases"
        description="Cases will appear here once a therapist is assigned."
      />
    );
  }

  return (
    <div className="space-y-4">
      {cases.map((c) => (
        <div key={c.id} className="border border-gray-100 rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">{c.caseNumber}</p>
              <p className="text-xs text-gray-500">Opened {formatDate(c.openedAt)}</p>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                c.status === 'ACTIVE'
                  ? 'bg-green-50 text-green-700'
                  : c.status === 'ON_HOLD'
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-red-50 text-red-600'
              }`}
            >
              {c.status}
            </span>
          </div>
          {c.diagnosis && (
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-medium">Diagnosis:</span> {c.diagnosis}
            </p>
          )}
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            {c.primaryTherapist && (
              <span className="flex items-center gap-1.5">
                <Avatar name={c.primaryTherapist.name} src={c.primaryTherapist.avatar || undefined} size="sm" />
                {c.primaryTherapist.name}
              </span>
            )}
            <span>{c.goalCount} goal{c.goalCount !== 1 ? 's' : ''}</span>
            <span>{c.sessions.length} session{c.sessions.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SessionsTab({ sessions }: { sessions: any[] }) {
  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No sessions"
        description="Session history will appear here once sessions are logged."
      />
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map((s: any) => (
        <div key={s.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50">
          <div className="w-20 text-sm text-gray-500">{formatDate(s.scheduledAt)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {s.sessionType || 'Session'}
            </p>
            <p className="text-xs text-gray-500">{s.caseNumber}</p>
          </div>
          <div className="text-sm text-gray-600">{s.therapist?.name || '-'}</div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              s.attendanceStatus === 'PRESENT'
                ? 'bg-green-50 text-green-700'
                : s.attendanceStatus === 'NO_SHOW'
                  ? 'bg-red-50 text-red-600'
                  : 'bg-gray-100 text-gray-600'
            }`}
          >
            {s.attendanceStatus?.replace(/_/g, ' ') || 'N/A'}
          </span>
        </div>
      ))}
    </div>
  );
}

function MilestonesTab({ goals }: { goals: any[] }) {
  if (goals.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title="No milestones"
        description="Milestone and goal data will appear here once IEPs are created."
      />
    );
  }

  const statusColors: Record<string, string> = {
    ACHIEVED: 'bg-green-50 text-green-700',
    IN_PROGRESS: 'bg-blue-50 text-blue-700',
    NOT_STARTED: 'bg-gray-100 text-gray-600',
    DISCONTINUED: 'bg-red-50 text-red-600',
  };

  return (
    <div className="space-y-3">
      {goals.map((g: any, i: number) => (
        <div key={i} className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{g.goalText}</p>
            <div className="flex gap-3 text-xs text-gray-500 mt-1">
              <span>{g.domain}</span>
              <span>{g.caseNumber}</span>
              {g.targetDate && <span>Target: {formatDate(g.targetDate)}</span>}
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[g.status] || 'bg-gray-100 text-gray-600'}`}>
            {g.status?.replace(/_/g, ' ')}
          </span>
          {g.currentProgress !== null && g.currentProgress !== undefined && (
            <span className="text-sm font-medium text-gray-900">{g.currentProgress}%</span>
          )}
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center py-10">
      <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6 text-gray-400" />
      </div>
      <h4 className="text-sm font-semibold text-gray-900 mb-1">{title}</h4>
      <p className="text-sm text-gray-500 max-w-sm mx-auto">{description}</p>
    </div>
  );
}
