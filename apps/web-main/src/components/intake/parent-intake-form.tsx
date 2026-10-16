'use client';

// Parent Intake Form fields, shared by the public intake link (/cases/intake/[token])
// and the Clinic Portal (/clinic-portal/intake/[caseId]). Field groups mirror the
// clinician Intake Sections A–E, so both land in the same CaseIntake shape.

import { useEffect, useState, type ReactNode } from 'react';

export interface IntakePayload {
  presentingConcern?: string;
  referralQuestions: string[];
  consentAssessment: boolean;
  consentTherapy: boolean;
  consentSharing: boolean;
  consentAi: boolean;
  consentTelehealth: boolean;
  consentMedia: boolean;
  data: {
    child: { name: string; dateOfBirth: string; gender: string };
    parent: { name: string; email: string; phone: string; language: string };
    developmentalHistory: string;
    routine: string;
  };
}

/** What a saved intake (or another clinic's, for pre-fill) looks like coming back. */
export interface IntakeSeed {
  presentingConcern?: string | null;
  referralQuestions?: string[];
  data?: Record<string, any> | null;
  consentAssessment?: boolean;
  consentTherapy?: boolean;
  consentSharing?: boolean;
  consentAi?: boolean;
  consentTelehealth?: boolean;
  consentMedia?: boolean;
}

const input =
  'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

export function ParentIntakeForm({
  childFirstName,
  seed,
  seedVersion = 0,
  includeConsent = true,
  footer,
  submitLabel = 'Submit intake',
  submitting,
  canSubmit = true,
  error,
  onSubmit,
}: {
  childFirstName?: string | null;
  /** Values to start from: the saved draft, or an accepted pre-fill. */
  seed?: IntakeSeed | null;
  /** Bump to re-apply `seed` (e.g. after the parent accepts a pre-fill). */
  seedVersion?: number;
  /** Section E. The portal manages consent per clinic, but intake still records it. */
  includeConsent?: boolean;
  /** Rendered after Section E — the public page puts its captcha here. */
  footer?: ReactNode;
  submitLabel?: string;
  submitting: boolean;
  canSubmit?: boolean;
  error?: string | null;
  onSubmit: (payload: IntakePayload) => void;
}) {
  const [childName, setChildName] = useState(childFirstName ?? '');
  const [childDob, setChildDob] = useState('');
  const [childGender, setChildGender] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [language, setLanguage] = useState('');
  const [presentingConcern, setPresentingConcern] = useState('');
  const [referralQuestion, setReferralQuestion] = useState('');
  const [developmentalHistory, setDevelopmentalHistory] = useState('');
  const [routine, setRoutine] = useState('');
  const [consentAssessment, setConsentAssessment] = useState(false);
  const [consentTherapy, setConsentTherapy] = useState(false);
  const [consentSharing, setConsentSharing] = useState(false);
  const [consentAi, setConsentAi] = useState(false);
  const [consentTelehealth, setConsentTelehealth] = useState(false);
  const [consentMedia, setConsentMedia] = useState(false);

  useEffect(() => {
    if (childFirstName && !childName) setChildName(childFirstName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childFirstName]);

  useEffect(() => {
    if (!seed) return;
    const d = (seed.data ?? {}) as Record<string, any>;
    if (d.child?.name) setChildName(d.child.name);
    setChildDob(d.child?.dateOfBirth ?? '');
    setChildGender(d.child?.gender ?? '');
    setParentName(d.parent?.name ?? '');
    setParentEmail(d.parent?.email ?? '');
    setParentPhone(d.parent?.phone ?? '');
    setLanguage(d.parent?.language ?? '');
    setDevelopmentalHistory(d.developmentalHistory ?? '');
    setRoutine(d.routine ?? '');
    setPresentingConcern(seed.presentingConcern ?? '');
    setReferralQuestion(seed.referralQuestions?.[0] ?? '');
    setConsentAssessment(!!seed.consentAssessment);
    setConsentTherapy(!!seed.consentTherapy);
    setConsentSharing(!!seed.consentSharing);
    setConsentAi(!!seed.consentAi);
    setConsentTelehealth(!!seed.consentTelehealth);
    setConsentMedia(!!seed.consentMedia);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedVersion]);

  function submit() {
    onSubmit({
      presentingConcern: presentingConcern || undefined,
      referralQuestions: referralQuestion ? [referralQuestion] : [],
      consentAssessment,
      consentTherapy,
      consentSharing,
      consentAi,
      consentTelehealth,
      consentMedia,
      data: {
        child: { name: childName, dateOfBirth: childDob, gender: childGender },
        parent: { name: parentName, email: parentEmail, phone: parentPhone, language },
        developmentalHistory,
        routine,
      },
    });
  }

  return (
    <>
      <Section title="A. Child & family">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Child&apos;s name</label><input className={input} value={childName} onChange={(e) => setChildName(e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Date of birth</label><input type="date" className={input} value={childDob} onChange={(e) => setChildDob(e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Gender</label><input className={input} value={childGender} onChange={(e) => setChildGender(e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Preferred language</label><input className={input} value={language} onChange={(e) => setLanguage(e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Parent / guardian name</label><input className={input} value={parentName} onChange={(e) => setParentName(e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" className={input} value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input className={input} value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} /></div>
        </div>
      </Section>

      <Section title="B. Referral & presenting concerns">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Primary concern</label><textarea rows={3} className={input + ' resize-none'} value={presentingConcern} onChange={(e) => setPresentingConcern(e.target.value)} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">What would you like help with?</label><input className={input} value={referralQuestion} onChange={(e) => setReferralQuestion(e.target.value)} /></div>
      </Section>

      <Section title="C. Developmental & medical history">
        <textarea rows={3} className={input + ' resize-none'} placeholder="Milestones, diagnoses, medications, allergies, sleep/feeding…" value={developmentalHistory} onChange={(e) => setDevelopmentalHistory(e.target.value)} />
      </Section>

      <Section title="D. Family, education & routine">
        <textarea rows={3} className={input + ' resize-none'} placeholder="Daily routine, school, strengths & interests, your goals…" value={routine} onChange={(e) => setRoutine(e.target.value)} />
      </Section>

      {includeConsent && (
        <Section title="E. Consent & data-sharing">
          {[
            ['consentAssessment', 'I consent to my child being assessed', consentAssessment, setConsentAssessment],
            ['consentTherapy', 'I consent to therapy services', consentTherapy, setConsentTherapy],
            ['consentSharing', 'I consent to sharing reports with named recipients', consentSharing, setConsentSharing],
            ['consentTelehealth', 'I consent to online / video sessions', consentTelehealth, setConsentTelehealth],
            ['consentMedia', 'I consent to photos & video being taken to track progress', consentMedia, setConsentMedia],
            ['consentAi', 'I consent to AI-assisted drafting of documentation', consentAi, setConsentAi],
          ].map(([key, label, val, set]: any) => (
            <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} />
              {label}
            </label>
          ))}
        </Section>
      )}

      {footer}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={submit}
        disabled={submitting || !canSubmit}
        className="w-full px-4 py-3 text-sm rounded-xl text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 disabled:opacity-40"
      >
        {submitting ? 'Submitting…' : submitLabel}
      </button>
    </>
  );
}
