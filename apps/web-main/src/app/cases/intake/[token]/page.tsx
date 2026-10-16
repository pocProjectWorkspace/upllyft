'use client';

// Parent Intake Form — public, unauthenticated, no clinic chrome. A parent opens a
// secure link (…/intake/[token]) and fills the intake themselves. Field groups mirror
// the clinician Intake Sections A–E; the submission lands as a pending draft the
// clinician later reviews. Access is the per-case token + a captcha. A parent with an
// account can fill the same form from the Clinic Portal instead.

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import { FormSkeleton } from '@/components/skeletons';
import { ParentIntakeForm, type IntakePayload } from '@/components/intake/parent-intake-form';
type Access = { childFirstName: string | null; captcha: { image: string; captchaToken: string } };

const input =
  'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none';

export default function ParentIntakePage() {
  const params = useParams();
  const token = params.token as string;

  const [access, setAccess] = useState<Access | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
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
    } catch (e: any) {
      setLoadError(e.message);
    }
  }

  useEffect(() => {
    loadAccess();
  }, [token]);

  async function handleSubmit(payload: IntakePayload) {
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
          ...payload,
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
      <FormSkeleton fields={4} />
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

        <ParentIntakeForm
          childFirstName={access.childFirstName}
          submitting={submitting}
          canSubmit={!!captchaAnswer}
          error={error}
          onSubmit={handleSubmit}
          footer={
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900">Verify you&apos;re human</h2>
              <div className="flex items-center gap-4">
                <img src={access.captcha.image} alt="captcha" className="rounded-lg border border-gray-200" />
                <input className={input + ' max-w-[180px]'} placeholder="Enter the characters" value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value)} />
              </div>
            </div>
          }
        />
        <p className="text-center text-xs text-gray-400">Your information is shared only with your care team.</p>
      </div>
    </div>
  );
}
