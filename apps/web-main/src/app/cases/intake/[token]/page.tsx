'use client';

// Parent Intake Form — public, unauthenticated, no clinic chrome. A parent opens a
// secure link (…/intake/[token]) and fills the intake themselves. Field groups mirror
// the clinician Intake Sections A–E; the submission lands as a pending draft the
// clinician later reviews. Access is the per-case token + a captcha.

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type Access = { childFirstName: string | null; captcha: { image: string; captchaToken: string } };

const input =
  'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

export default function ParentIntakePage() {
  const params = useParams();
  const token = params.token as string;

  const [access, setAccess] = useState<Access | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Form fields (grouped by intake section).
  const [childName, setChildName] = useState('');
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
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function loadAccess() {
    setLoadError(null);
    try {
      const res = await fetch(`/api/public/intake/${token}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'This link is invalid or expired.');
      }
      const data: Access = await res.json();
      setAccess(data);
      if (data.childFirstName) setChildName(data.childFirstName);
    } catch (e: any) {
      setLoadError(e.message);
    }
  }

  useEffect(() => {
    loadAccess();
  }, [token]);

  async function handleSubmit() {
    if (!access) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/intake/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captchaToken: access.captcha.captchaToken,
          captchaAnswer,
          presentingConcern: presentingConcern || undefined,
          referralQuestions: referralQuestion ? [referralQuestion] : [],
          consentAssessment,
          consentTherapy,
          consentSharing,
          consentAi,
          data: {
            child: { name: childName, dateOfBirth: childDob, gender: childGender },
            parent: { name: parentName, email: parentEmail, phone: parentPhone, language },
            developmentalHistory,
            routine,
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Submission failed. Please try again.');
      }
      setDone(true);
    } catch (e: any) {
      setError(e.message);
      // Captcha is single-use — refresh the challenge for a retry.
      loadAccess();
      setCaptchaAnswer('');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-gray-900">Intake link unavailable</h1>
          <p className="text-sm text-gray-500 mt-2">{loadError}</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
          <h1 className="text-lg font-semibold text-gray-900">Thank you</h1>
          <p className="text-sm text-gray-500 mt-2">
            Your intake has been submitted. Your clinician will review it before your first appointment.
          </p>
        </div>
      </div>
    );
  }

  if (!access) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 gap-2">
        <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Client Intake Form</h1>
          <p className="text-sm text-gray-500">
            Please complete this form{access.childFirstName ? ` for ${access.childFirstName}` : ''}. It takes about 10 minutes and helps your clinician prepare.
          </p>
        </div>

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

        <Section title="E. Consent & data-sharing">
          {[
            ['consentAssessment', 'I consent to my child being assessed', consentAssessment, setConsentAssessment],
            ['consentTherapy', 'I consent to therapy services', consentTherapy, setConsentTherapy],
            ['consentSharing', 'I consent to sharing reports with named recipients', consentSharing, setConsentSharing],
            ['consentAi', 'I consent to AI-assisted drafting of documentation', consentAi, setConsentAi],
          ].map(([key, label, val, set]: any) => (
            <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} />
              {label}
            </label>
          ))}
        </Section>

        <Section title="Verify you're human">
          <div className="flex items-center gap-4">
            <img src={access.captcha.image} alt="captcha" className="rounded-lg border border-gray-200" />
            <input className={input + ' max-w-[180px]'} placeholder="Enter the characters" value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value)} />
          </div>
        </Section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting || !captchaAnswer}
          className="w-full px-4 py-3 text-sm rounded-xl text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 disabled:opacity-40"
        >
          {submitting ? 'Submitting…' : 'Submit intake'}
        </button>
        <p className="text-center text-xs text-gray-400">Your information is shared only with your care team.</p>
      </div>
    </div>
  );
}
