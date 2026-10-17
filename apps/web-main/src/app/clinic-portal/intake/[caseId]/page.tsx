'use client';

import { Suspense, use, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PageSkeleton } from '@upllyft/ui';
import { PortalShell } from '@/clinic-portal/components/portal-shell';
import { ParentIntakeForm, type IntakePayload, type IntakeSeed } from '@/components/intake/parent-intake-form';
import { useIntake, useSubmitIntake } from '@/clinic-portal/hooks';
import { errorMessage } from '@/clinic-portal/lib/api';

/**
 * The clinic's intake form, filled from the Clinic Portal. It submits to the same
 * CaseIntake the public intake link writes, so it lands in the clinic's Intake /
 * Triage queue exactly as today. For a second clinic we OFFER to pre-fill from the
 * most recent intake — nothing is copied until the parent says so.
 */
function PortalIntake({ caseId }: { caseId: string }) {
  const params = useSearchParams();
  const childId = params.get('child') ?? '';
  const intake = useIntake(childId, caseId);
  const submit = useSubmitIntake(childId, caseId);
  const [seed, setSeed] = useState<{ value: IntakeSeed | null; version: number } | null>(null);
  const [done, setDone] = useState(false);
  const back = `/clinic-portal?child=${childId}&tab=forms`;

  if (intake.isLoading) return <PageSkeleton />;
  if (intake.isError || !intake.data) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <h1 className="text-lg font-semibold text-gray-900">Intake form unavailable</h1>
        <p className="mt-2 text-sm text-gray-500">{errorMessage(intake.error, 'This form could not be opened.')}</p>
        <Link href={back} className="mt-4 inline-block text-sm font-semibold text-teal-700">Back to Clinic portal</Link>
      </div>
    );
  }

  const d = intake.data;
  const reviewed = d.intake?.state === 'SUMMARISED';
  const saved = d.intake as IntakeSeed | null;
  // Saved draft first; an accepted pre-fill replaces it.
  const active = seed ?? (saved ? { value: saved, version: 1 } : null);

  if (done) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
        <h1 className="text-lg font-semibold text-gray-900">Thank you</h1>
        <p className="mt-2 text-sm text-gray-500">
          {d.clinicName ?? 'The clinic'} has your intake form and will review it before the first appointment.
        </p>
        <Link href={back} className="mt-5 inline-flex rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white">
          Back to Clinic portal
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <Link href={back} className="text-sm font-semibold text-teal-700">← Clinic portal</Link>
        <h1 className="mt-2 text-xl font-bold text-gray-900">Intake form{d.clinicName ? ` · ${d.clinicName}` : ''}</h1>
        <p className="text-sm text-gray-500">
          For {d.child.firstName}. It takes about 10 minutes and helps your clinician prepare.
          {d.intake && !reviewed ? ' You can update it until the clinic reviews it.' : ''}
        </p>
      </div>

      {reviewed ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
          {d.clinicName ?? 'The clinic'} has reviewed this intake. To change anything, please contact them.
        </div>
      ) : (
        <>
          {d.prefill && !seed && !saved && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#D6EBE3] bg-[#EFF6F3] p-4">
              <p className="flex-1 text-sm text-[#3A5A52]">
                Use what you shared with <b>{d.prefill.fromClinic}</b> to fill this in? You can change anything before you submit.
              </p>
              <button
                onClick={() =>
                  setSeed({
                    version: 2,
                    value: {
                      data: d.prefill!.data,
                      presentingConcern: d.prefill!.presentingConcern,
                      referralQuestions: d.prefill!.referralQuestions,
                    },
                  })
                }
                className="rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-teal-700 border-[1.5px] border-teal-500"
              >
                Pre-fill the form
              </button>
            </div>
          )}
          <ParentIntakeForm
            childFirstName={d.child.firstName}
            seed={active?.value}
            seedVersion={active?.version ?? 0}
            submitLabel={d.intake ? 'Update intake' : 'Submit intake'}
            submitting={submit.isPending}
            error={submit.isError ? errorMessage(submit.error) : null}
            onSubmit={(payload: IntakePayload) =>
              submit.mutate(payload as unknown as Record<string, unknown>, { onSuccess: () => setDone(true) })
            }
          />
          <p className="text-center text-xs text-gray-400">Shared only with {d.clinicName ?? 'this clinic'}, never with your other clinics.</p>
        </>
      )}
    </div>
  );
}

export default function PortalIntakePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = use(params);
  return (
    <PortalShell>
      <Suspense fallback={<PageSkeleton />}>
        <PortalIntake caseId={caseId} />
      </Suspense>
    </PortalShell>
  );
}
