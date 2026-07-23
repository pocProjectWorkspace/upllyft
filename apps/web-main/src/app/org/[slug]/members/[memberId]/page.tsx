'use client';

// Add Therapist Journey — 5-step member setup wizard.
// Basic Info → Credentials → Fees → Schedule → Review. The Department picked in
// Basic Info drives the specializations, services and licensing sub-fields shown
// in later steps (single shared DEPARTMENTS taxonomy from @upllyft/types).
//
// Backend wiring: fields/steps that already have an endpoint save through it;
// the rest carry a `TODO(backend)` marker naming the endpoint still to build.
// See handoff/IMPLEMENTATION-PLAN.md → Priority 1 for the full contract.

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge, useToast } from '@upllyft/ui';
import {
  DEPARTMENTS,
  DEPARTMENT_OPTIONS,
  DURATION_PRESETS,
  LICENSE_AUTHORITIES_UAE,
  type DepartmentKey,
} from '@upllyft/types';
import {
  getOrgMember,
  approveOrgMember,
  getMemberTherapistProfile,
  saveMemberTherapistProfile,
  type OrgMember,
} from '@/lib/api/organizations';

type Country = 'India' | 'UAE';
type Mode = 'in-person' | 'online';

interface FeeRow {
  service: string;
  durations: number[];
  prices: Record<number, string>;
}

interface WizardForm {
  // Basic Info
  name: string;
  displayTitle: string;
  department: DepartmentKey | '';
  email: string;
  phone: string;
  country: Country;
  branch: string;
  bio: string;
  // Credentials
  qualification: string;
  university: string;
  yearsExperience: string;
  specializations: string[];
  // India licensing
  rciNumber: string;
  councilNumber: string;
  bcbaNumber: string;
  // UAE licensing
  licenseAuthority: string;
  licenseNumber: string;
  licenseExpiry: string;
  emiratesId: string;
  visaStatus: string;
  // Insurance (always)
  insuranceProvider: string;
  insurancePolicy: string;
  insuranceExpiry: string;
  // Fees
  fees: FeeRow[];
  slidingScale: boolean;
  // Schedule
  sessionDuration: number;
  buffer: number;
  mode: Mode;
  // grid: `${day}-${hour}` set of enabled cells
  availability: Record<string, boolean>;
}

const STEPS = ['Basic Info', 'Credentials', 'Fees', 'Schedule', 'Review'] as const;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 11 }, (_, i) => 9 + i); // 09:00 … 19:00 (→ 20:00)

function currencyFor(country: Country) {
  return country === 'UAE' ? 'AED' : 'INR';
}

function emptyFee(): FeeRow {
  return { service: '', durations: [], prices: {} };
}

function initialForm(member?: OrgMember): WizardForm {
  return {
    name: member?.user?.name ?? '',
    displayTitle: '',
    department: '',
    email: member?.user?.email ?? '',
    phone: '',
    country: 'India',
    branch: '',
    bio: '',
    qualification: '',
    university: '',
    yearsExperience: '',
    specializations: [],
    rciNumber: '',
    councilNumber: '',
    bcbaNumber: '',
    licenseAuthority: '',
    licenseNumber: '',
    licenseExpiry: '',
    emiratesId: '',
    visaStatus: '',
    insuranceProvider: '',
    insurancePolicy: '',
    insuranceExpiry: '',
    fees: [emptyFee()],
    slidingScale: false,
    sessionDuration: 60,
    buffer: 15,
    mode: 'in-person',
    availability: {},
  };
}

// ── Small field helpers (kept local to match the members page's plain-Tailwind style) ──

const inputCls =
  'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none';

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'px-3 py-1.5 rounded-full text-sm border transition ' +
        (active
          ? 'bg-teal-50 border-teal-500 text-teal-700'
          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300')
      }
    >
      {children}
    </button>
  );
}

export default function AddTherapistWizard() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const slug = params.slug as string;
  const memberId = params.memberId as string;

  const [member, setMember] = useState<OrgMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<WizardForm>(initialForm());

  // Review checklist
  const [checks, setChecks] = useState({
    profile: false,
    licence: false,
    insurance: false,
    fees: false,
    availability: false,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [m, detail] = await Promise.all([
          getOrgMember(slug, memberId),
          getMemberTherapistProfile(slug, memberId).catch(() => null),
        ]);
        if (!active) return;
        setMember(m ?? null);
        const base = initialForm(m);
        const p = detail?.profile;
        setForm(
          p
            ? {
                ...base,
                name: detail?.user?.name ?? base.name,
                displayTitle: p.title ?? '',
                bio: p.bio ?? '',
                department: (p.department as DepartmentKey) || '',
                phone: p.phone ?? '',
                branch: p.branch ?? '',
                country: (p.country as Country) || 'India',
                qualification: p.qualification ?? '',
                university: p.university ?? '',
                yearsExperience: p.yearsExperience != null ? String(p.yearsExperience) : '',
                specializations: p.specializations ?? [],
                rciNumber: p.rciNumber ?? '',
                councilNumber: p.councilNumber ?? '',
                bcbaNumber: p.bcbaNumber ?? '',
                licenseAuthority: p.licenseAuthority ?? '',
                licenseNumber: p.licenceNumber ?? '',
                licenseExpiry: p.licenceExpiry ? p.licenceExpiry.slice(0, 10) : '',
                emiratesId: p.emiratesId ?? '',
                visaStatus: p.visaStatus ?? '',
                insuranceProvider: p.insuranceProvider ?? '',
                insurancePolicy: p.insurancePolicyNumber ?? '',
                insuranceExpiry: p.insuranceExpiry ? p.insuranceExpiry.slice(0, 10) : '',
              }
            : base,
        );
      } catch {
        toast({ title: 'Error', description: 'Failed to load member', variant: 'destructive' });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug, memberId]);

  async function saveProfile() {
    await saveMemberTherapistProfile(slug, memberId, {
      name: form.name || undefined,
      title: form.displayTitle || undefined,
      bio: form.bio || undefined,
      department: form.department || undefined,
      phone: form.phone || undefined,
      branch: form.branch || undefined,
      country: form.country,
      qualification: form.qualification || undefined,
      university: form.university || undefined,
      yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : undefined,
      specializations: form.specializations,
      rciNumber: form.rciNumber || undefined,
      councilNumber: form.councilNumber || undefined,
      bcbaNumber: form.bcbaNumber || undefined,
      emiratesId: form.emiratesId || undefined,
      visaStatus: form.visaStatus || undefined,
      licenseAuthority: form.country === 'UAE' ? form.licenseAuthority || undefined : undefined,
      licenceNumber: form.country === 'UAE' ? form.licenseNumber || undefined : undefined,
      licenceExpiry: form.country === 'UAE' ? form.licenseExpiry || undefined : undefined,
      insuranceProvider: form.insuranceProvider || undefined,
      insurancePolicyNumber: form.insurancePolicy || undefined,
      insuranceExpiry: form.insuranceExpiry || undefined,
    });
  }

  const dept = form.department ? DEPARTMENTS[form.department] : null;
  const durations = DURATION_PRESETS.extended; // wizard uses the extended set (incl. 90/120)
  const currency = currencyFor(form.country);

  const councilLabel =
    form.department === 'physio'
      ? 'State Physiotherapy Council reg. no.'
      : 'State Medical Council / MHA reg. no.';

  const weeklyHours = useMemo(
    () => Object.values(form.availability).filter(Boolean).length,
    [form.availability],
  );

  function set<K extends keyof WizardForm>(key: K, value: WizardForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleSpecialization(s: string) {
    setForm((f) => ({
      ...f,
      specializations: f.specializations.includes(s)
        ? f.specializations.filter((x) => x !== s)
        : [...f.specializations, s],
    }));
  }

  // ── Fees helpers ──
  function updateFee(i: number, patch: Partial<FeeRow>) {
    setForm((f) => ({
      ...f,
      fees: f.fees.map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
    }));
  }
  function toggleFeeDuration(i: number, d: number) {
    setForm((f) => ({
      ...f,
      fees: f.fees.map((row, idx) => {
        if (idx !== i) return row;
        const has = row.durations.includes(d);
        const nextDurations = has
          ? row.durations.filter((x) => x !== d)
          : [...row.durations, d].sort((a, b) => a - b);
        const nextPrices = { ...row.prices };
        if (has) delete nextPrices[d];
        return { ...row, durations: nextDurations, prices: nextPrices };
      }),
    }));
  }
  function addFeeRow() {
    setForm((f) => ({ ...f, fees: [...f.fees, emptyFee()] }));
  }
  function removeFeeRow(i: number) {
    setForm((f) => ({ ...f, fees: f.fees.filter((_, idx) => idx !== i) }));
  }

  // ── Schedule grid helpers ──
  function toggleCell(day: string, hour: number) {
    const key = `${day}-${hour}`;
    setForm((f) => ({ ...f, availability: { ...f.availability, [key]: !f.availability[key] } }));
  }
  function toggleDayColumn(day: string) {
    const keys = HOURS.map((h) => `${day}-${h}`);
    const allOn = keys.every((k) => form.availability[k]);
    setForm((f) => {
      const next = { ...f.availability };
      keys.forEach((k) => (next[k] = !allOn));
      return { ...f, availability: next };
    });
  }

  async function next() {
    // Basic Info (0) and Credentials (1) persist to the therapist profile on Continue.
    if (step === 0 || step === 1) {
      setSaving(true);
      try {
        await saveProfile();
      } catch (err: any) {
        toast({
          title: 'Error',
          description: err?.response?.data?.message || 'Failed to save',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }
      setSaving(false);
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleApprove() {
    setSaving(true);
    try {
      await approveOrgMember(slug, memberId, true);
      toast({ title: 'Approved', description: `${form.name || 'Member'} is now active.` });
      router.push(`/org/${slug}/members`);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to approve',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestChanges() {
    setSaving(true);
    try {
      await approveOrgMember(slug, memberId, false);
      toast({ title: 'Changes requested', description: 'The member has been moved back to pending.' });
      router.push(`/org/${slug}/members`);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to request changes',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  const allChecked = Object.values(checks).every(Boolean);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 gap-2">
        <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        Loading member…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push(`/org/${slug}/members`)}
            className="text-sm text-gray-500 hover:text-gray-700 mb-1"
          >
            ← Back to Members
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {form.name || member?.user?.email || 'Member'}
          </h1>
          <p className="text-sm text-gray-500">{member?.user?.email}</p>
        </div>
        {member && <Badge color={member.status === 'ACTIVE' ? 'green' : 'yellow'}>{member.status}</Badge>}
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            onClick={() => setStep(i)}
            className="flex items-center gap-2 flex-1"
          >
            <span
              className={
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ' +
                (i === step
                  ? 'bg-teal-600 text-white'
                  : i < step
                    ? 'bg-teal-100 text-teal-700'
                    : 'bg-gray-100 text-gray-400')
              }
            >
              {i + 1}
            </span>
            <span
              className={
                'text-sm truncate ' + (i === step ? 'font-semibold text-gray-900' : 'text-gray-500')
              }
            >
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="hidden sm:block flex-1 h-px bg-gray-200" />}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        {/* ── Step 1: Basic Info ── */}
        {step === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full name">
              <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label="Display title" hint="e.g. Senior Speech-Language Pathologist">
              <input className={inputCls} value={form.displayTitle} onChange={(e) => set('displayTitle', e.target.value)} />
            </Field>
            <Field label="Department / Specialisation area" hint="Drives credentials, services & licensing below">
              <select
                className={inputCls}
                value={form.department}
                onChange={(e) => set('department', e.target.value as DepartmentKey)}
              >
                <option value="">Select department…</option>
                {DEPARTMENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Email">
              <input className={inputCls} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </Field>
            <Field label="Phone">
              <input className={inputCls} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="Country">
              <select className={inputCls} value={form.country} onChange={(e) => set('country', e.target.value as Country)}>
                <option value="India">India</option>
                <option value="UAE">UAE</option>
              </select>
            </Field>
            <Field label="Branch / Location">
              <input className={inputCls} value={form.branch} onChange={(e) => set('branch', e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Bio">
                <textarea
                  className={inputCls + ' resize-none'}
                  rows={3}
                  value={form.bio}
                  onChange={(e) => set('bio', e.target.value)}
                />
              </Field>
            </div>
          </div>
        )}

        {/* ── Step 2: Credentials ── */}
        {step === 1 && (
          <div className="space-y-6">
            {!dept && (
              <p className="text-sm text-amber-600 bg-amber-50 rounded-xl px-4 py-3">
                Pick a department in Basic Info to see specialization & licensing fields.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Qualification">
                <input className={inputCls} value={form.qualification} onChange={(e) => set('qualification', e.target.value)} />
              </Field>
              <Field label="University">
                <input className={inputCls} value={form.university} onChange={(e) => set('university', e.target.value)} />
              </Field>
              <Field label="Years of experience">
                <input
                  className={inputCls}
                  type="number"
                  value={form.yearsExperience}
                  onChange={(e) => set('yearsExperience', e.target.value)}
                />
              </Field>
            </div>

            {dept && (
              <Field label="Specializations">
                <div className="flex flex-wrap gap-2">
                  {dept.specializations.map((s) => (
                    <Chip key={s} active={form.specializations.includes(s)} onClick={() => toggleSpecialization(s)}>
                      {s}
                    </Chip>
                  ))}
                </div>
              </Field>
            )}

            {/* Country-adaptive licensing */}
            {form.country === 'India' ? (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Licensing (India)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label={`RCI registration number (${dept?.licenseNoun ?? 'department'})`}>
                    <input className={inputCls} value={form.rciNumber} onChange={(e) => set('rciNumber', e.target.value)} />
                  </Field>
                  <Field label={councilLabel}>
                    <input className={inputCls} value={form.councilNumber} onChange={(e) => set('councilNumber', e.target.value)} />
                  </Field>
                  {form.department === 'aba' && (
                    <Field label="BCBA / RBT certification number">
                      <input className={inputCls} value={form.bcbaNumber} onChange={(e) => set('bcbaNumber', e.target.value)} />
                    </Field>
                  )}
                </div>
                {/* TODO(backend): certificate upload → asset pipeline */}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Licensing (UAE)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Issuing authority">
                    <select className={inputCls} value={form.licenseAuthority} onChange={(e) => set('licenseAuthority', e.target.value)}>
                      <option value="">Select…</option>
                      {LICENSE_AUTHORITIES_UAE.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="License number">
                    <input className={inputCls} value={form.licenseNumber} onChange={(e) => set('licenseNumber', e.target.value)} />
                  </Field>
                  <Field label="License expiry">
                    <input className={inputCls} type="date" value={form.licenseExpiry} onChange={(e) => set('licenseExpiry', e.target.value)} />
                  </Field>
                  <Field label="Emirates ID number">
                    <input className={inputCls} value={form.emiratesId} onChange={(e) => set('emiratesId', e.target.value)} />
                  </Field>
                  <Field label="Visa status">
                    <input className={inputCls} value={form.visaStatus} onChange={(e) => set('visaStatus', e.target.value)} />
                  </Field>
                </div>
                {/* TODO(backend): document upload → asset pipeline */}
              </div>
            )}

            {/* Insurance — always shown */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Malpractice / indemnity insurance</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Provider">
                  <input className={inputCls} value={form.insuranceProvider} onChange={(e) => set('insuranceProvider', e.target.value)} />
                </Field>
                <Field label="Policy number">
                  <input className={inputCls} value={form.insurancePolicy} onChange={(e) => set('insurancePolicy', e.target.value)} />
                </Field>
                <Field label="Expiry">
                  <input className={inputCls} type="date" value={form.insuranceExpiry} onChange={(e) => set('insuranceExpiry', e.target.value)} />
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Fees ── */}
        {step === 2 && (
          <div className="space-y-5">
            {!dept && (
              <p className="text-sm text-amber-600 bg-amber-50 rounded-xl px-4 py-3">
                Pick a department in Basic Info to choose services.
              </p>
            )}
            {form.fees.map((row, i) => (
              <div key={i} className="rounded-xl border border-gray-200 p-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Field label="Service">
                      <select className={inputCls} value={row.service} onChange={(e) => updateFee(i, { service: e.target.value })} disabled={!dept}>
                        <option value="">Select service…</option>
                        {dept?.services.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  {form.fees.length > 1 && (
                    <button onClick={() => removeFeeRow(i)} className="text-sm text-red-500 hover:text-red-600 mt-7">
                      Remove
                    </button>
                  )}
                </div>
                <Field label="Durations offered">
                  <div className="flex flex-wrap gap-2">
                    {durations.map((d) => (
                      <Chip key={d} active={row.durations.includes(d)} onClick={() => toggleFeeDuration(i, d)}>
                        {d} min
                      </Chip>
                    ))}
                  </div>
                </Field>
                {row.durations.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {row.durations.map((d) => (
                      <Field key={d} label={`${d} min price (${currency})`}>
                        <input
                          className={inputCls}
                          type="number"
                          value={row.prices[d] ?? ''}
                          onChange={(e) => updateFee(i, { prices: { ...row.prices, [d]: e.target.value } })}
                        />
                      </Field>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <button onClick={addFeeRow} className="text-sm font-medium text-teal-600 hover:text-teal-700">
              + Add another service
            </button>
            <label className="flex items-center gap-2 text-sm text-gray-700 pt-2">
              <input type="checkbox" checked={form.slidingScale} onChange={(e) => set('slidingScale', e.target.checked)} />
              Offer a sliding-scale / insurance-covered rate
            </label>
          </div>
        )}

        {/* ── Step 4: Schedule ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Field label="Session duration">
                <select className={inputCls} value={form.sessionDuration} onChange={(e) => set('sessionDuration', Number(e.target.value))}>
                  {durations.map((d) => (
                    <option key={d} value={d}>
                      {d} min
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Buffer (min)">
                <input className={inputCls} type="number" value={form.buffer} onChange={(e) => set('buffer', Number(e.target.value))} />
              </Field>
              <Field label="Timezone" hint="Read-only">
                <input className={inputCls + ' bg-gray-50 text-gray-500'} readOnly value="Asia/Kolkata" />
              </Field>
              <Field label="Mode">
                <select className={inputCls} value={form.mode} onChange={(e) => set('mode', e.target.value as Mode)}>
                  <option value="in-person">In-person</option>
                  <option value="online">Online</option>
                </select>
              </Field>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Weekly availability</label>
                <span className="text-sm text-gray-500">{weeklyHours} hours/week selected</span>
              </div>
              <div className="overflow-x-auto">
                <table className="border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="p-1"></th>
                      {DAYS.map((d) => (
                        <th key={d} className="p-1">
                          <button onClick={() => toggleDayColumn(d)} className="px-2 py-1 rounded hover:bg-gray-100 font-medium text-gray-600">
                            {d}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {HOURS.map((h) => (
                      <tr key={h}>
                        <td className="p-1 pr-2 text-right text-gray-400 whitespace-nowrap">
                          {String(h).padStart(2, '0')}:00
                        </td>
                        {DAYS.map((d) => {
                          const on = form.availability[`${d}-${h}`];
                          return (
                            <td key={d} className="p-0.5">
                              <button
                                onClick={() => toggleCell(d, h)}
                                className={
                                  'h-7 w-10 rounded ' +
                                  (on ? 'bg-teal-500 hover:bg-teal-600' : 'bg-gray-100 hover:bg-gray-200')
                                }
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Leave lives on its own screen (Priority 2). */}
            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm">
              <span className="text-gray-600">Leave / blackout dates — managed separately</span>
              <a href={`/org/${slug}/members/${memberId}/holidays`} className="font-medium text-teal-600 hover:text-teal-700">
                View Holidays →
              </a>
            </div>
          </div>
        )}

        {/* ── Step 5: Review ── */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Confirm each item before activating. All must be checked to enable Approve & Activate.
            </p>
            {(
              [
                ['profile', 'Profile complete'],
                ['licence', 'Licence verified'],
                ['insurance', 'Insurance on file'],
                ['fees', 'Fees confirmed'],
                ['availability', 'Availability published'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={checks[key]}
                  onChange={(e) => setChecks((c) => ({ ...c, [key]: e.target.checked }))}
                />
                {label}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={back}
          disabled={step === 0}
          className="px-4 py-2 text-sm text-gray-600 disabled:opacity-40"
        >
          ← Back
        </button>
        <div className="flex gap-2">
          {step === STEPS.length - 1 ? (
            <>
              <button
                onClick={handleRequestChanges}
                disabled={saving}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                Request Changes
              </button>
              <button
                onClick={handleApprove}
                disabled={!allChecked || saving}
                className="px-4 py-2 text-sm rounded-xl text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 disabled:opacity-40"
              >
                {saving ? 'Working…' : 'Approve & Activate'}
              </button>
            </>
          ) : (
            <button
              onClick={next}
              disabled={saving}
              className="px-4 py-2 text-sm rounded-xl text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Continue →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
