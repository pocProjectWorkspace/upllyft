'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth, useRegion, APP_URLS } from '@upllyft/api-client';
import { Skeleton } from '@upllyft/ui';
import { BookingShell } from '@/components/booking-shell';
import { useSearchTherapists } from '@/hooks/use-marketplace';
import { useSearchClinics } from '@/hooks/use-clinics';
import {
  getMyChildren,
  getChildScreening,
  DOMAIN_LABELS,
  CONCERN_OPTIONS,
} from '@/lib/api/find-care';

const SELECTED_CHILD_KEY = 'upllyft_selected_child';

/**
 * The Find Care start screen ("post-screening handoff" in the design mockup). The screen
 * reads how much is known about the child and changes shape:
 *
 *   New child  — dark-teal hero with the confidence meter, then two doors side by side
 *                (screening, RECOMMENDED · 5 MINUTES / concern picker · 30 SECONDS) and
 *                a quiet browse link underneath.
 *   Screened   — teal-gradient hero (completion pill, headline, matched-providers CTA +
 *                child identity card), then "What the screening flagged" beside
 *                "Suggested first steps", and an Ask-Mira strip.
 *
 * Layout and hierarchy follow the mockup; only real data is shown (no invented
 * distances, counts or preferences).
 */
export default function FindCarePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { serviceModel } = useRegion();

  const isParent = user?.role === 'USER';
  const { data: children, isLoading: childrenLoading } = useQuery({
    queryKey: ['find-care', 'children'],
    queryFn: getMyChildren,
    enabled: !!isParent,
  });

  const [selectedChildId, setSelectedChildId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(SELECTED_CHILD_KEY) : null,
  );
  const child = selectedChildId
    ? children?.find((c) => c.id === selectedChildId) || children?.[0]
    : children?.[0];

  useEffect(() => {
    if (child) localStorage.setItem(SELECTED_CHILD_KEY, child.id);
  }, [child]);

  const { data: screening, isLoading: screeningLoading } = useQuery({
    queryKey: ['find-care', 'screening', child?.id],
    queryFn: () => getChildScreening(child!.id),
    enabled: !!child,
  });

  const screened = !!screening?.assessmentId && (screening?.flaggedDomains?.length ?? 0) > 0;

  // Matched-provider counts for the hero CTA and pathway lines (real counts, cheap).
  const { data: matchedTherapists } = useSearchTherapists(
    screened && child ? { childId: child.id, limit: 50 } : undefined,
  );
  const { data: matchedClinics } = useSearchClinics(
    screened && child ? { childId: child.id, limit: 50 } : undefined,
  );
  const strongTherapists = (matchedTherapists?.therapists ?? []).filter(
    (t) => t.match?.tier === 'strong',
  ).length;
  const strongClinics = (matchedClinics?.clinics ?? []).filter(
    (c) => c.match?.tier === 'strong',
  ).length;
  const matchedCount = strongTherapists + strongClinics;

  if (!isParent) {
    if (user) router.replace('/');
    return null;
  }

  if (childrenLoading || (child && screeningLoading)) {
    return (
      <BookingShell>
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </BookingShell>
    );
  }

  const name = child?.firstName;
  const age = child ? Math.max(0, Math.floor((Date.now() - new Date(child.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))) : null;

  const goDiscovery = (params: string) => router.push(`/discovery${params}`);

  return (
    <BookingShell>
      <div className="max-w-4xl mx-auto pb-10">
        {/* ── Child switcher (only if multiple) ───────────────── */}
        {(children?.length ?? 0) > 1 && (
          <div className="flex gap-2 mb-5">
            {children!.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedChildId(c.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                  c.id === child?.id
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-teal-300'
                }`}
              >
                {c.firstName}
              </button>
            ))}
          </div>
        )}

        {!screened ? (
          /* ══ NEW CHILD — welcome hero + two doors + quiet browse link ══ */
          <>
            <div className="relative overflow-hidden rounded-[20px] bg-[#0e3a3a] text-white px-7 py-8 sm:px-10 sm:py-9 mb-[18px]">
              <div className="absolute -right-16 -top-20 w-64 h-64 rounded-full bg-teal-400/15" aria-hidden />
              <div className="relative max-w-2xl">
                <div className="text-[11px] font-extrabold tracking-[0.09em] text-teal-200">FIND CARE</div>
                <h1 className="mt-3 mb-2.5 text-[26px] sm:text-[32px] leading-[1.15] font-extrabold tracking-tight">
                  Let&apos;s find the right help{name ? ` for ${name}` : ''}
                </h1>
                <p className="text-[15px] leading-relaxed text-white/80">
                  The more you share, the better we can match — but start with whatever feels
                  easiest right now.
                </p>

                {/* Confidence meter */}
                <div className="mt-5 rounded-[14px] border border-white/15 bg-white/10 px-4.5 py-4 px-5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-white/85">
                      What we know{name ? ` about ${name}` : ''}
                    </span>
                    <span className="flex-1" />
                    <span className="text-xs font-bold text-teal-200">Just the basics</span>
                  </div>
                  <div className="mt-2.5 h-[7px] rounded overflow-hidden bg-white/15">
                    <div className="h-full w-[20%] rounded bg-teal-300" />
                  </div>
                  <p className="mt-2 text-[12.5px] leading-normal text-white/70">
                    {name
                      ? `We only have ${name}'s age${child?.primaryLanguage ? ` and the languages you speak at home` : ''}.`
                      : 'Add a child on your profile so we can tailor this to them.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Door 1 — screening (recommended) */}
              <div className="relative rounded-2xl border-2 border-teal-600 bg-white p-6">
                <span className="absolute top-4 right-4 text-[10.5px] font-extrabold tracking-[0.06em] text-teal-700 bg-teal-50 px-2 py-1 rounded-md">
                  RECOMMENDED
                </span>
                <div className="text-[11px] font-extrabold tracking-[0.07em] text-teal-600">5 MINUTES</div>
                <h2 className="mt-2.5 mb-1.5 text-[19px] font-extrabold tracking-tight text-gray-900">
                  Take the quick screening
                </h2>
                <p className="mb-4 text-[13.5px] leading-relaxed text-slate-500">
                  The clearest picture. We&apos;ll turn it into a care plan and match therapists
                  to exactly what it finds.
                </p>
                <button
                  onClick={() => { window.location.href = APP_URLS.screening; }}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-[11px] text-[14.5px] font-bold transition-colors"
                >
                  Start screening
                </button>
              </div>

              {/* Door 2 — concern picker */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="text-[11px] font-extrabold tracking-[0.07em] text-slate-400">30 SECONDS</div>
                <h2 className="mt-2.5 mb-1.5 text-[19px] font-extrabold tracking-tight text-gray-900">
                  Tell us what&apos;s on your mind
                </h2>
                <p className="mb-4 text-[13.5px] leading-relaxed text-slate-500">
                  Pick what you&apos;ve noticed and we&apos;ll show therapists who often help —
                  no screening needed yet.
                </p>
                <div className="flex flex-wrap gap-2">
                  {CONCERN_OPTIONS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => goDiscovery(`?concern=${c.id}${child ? `&childId=${child.id}` : ''}`)}
                      className="px-3.5 py-2 rounded-full text-[13px] font-semibold bg-slate-50 border border-slate-200 text-slate-700 hover:border-teal-500 hover:bg-teal-50 transition-colors"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-center mt-[18px]">
              <button
                onClick={() => goDiscovery('')}
                className="text-[13.5px] font-bold text-slate-500 hover:text-slate-700"
              >
                Or just browse all {serviceModel === 'CLINIC_DIRECTORY' ? 'clinics' : 'therapists'} →
              </button>
            </div>
          </>
        ) : (
          /* ══ SCREENED — gradient hero + flagged domains + first steps ══ */
          <>
            <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#0f9e8e] via-[#0d8f8a] to-[#0b7f86] text-white px-7 py-8 sm:px-10 sm:py-9">
              <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/[0.07]" aria-hidden />
              <div className="absolute right-16 -bottom-28 w-52 h-52 rounded-full bg-white/[0.05]" aria-hidden />
              <div className="relative flex flex-col lg:flex-row gap-8 items-start">
                <div className="flex-1 min-w-0">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">
                    Screening complete
                    {screening?.completedAt &&
                      ` · ${new Date(screening.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  </span>
                  <h1 className="mt-4 mb-2.5 text-[26px] sm:text-[34px] leading-[1.15] font-extrabold tracking-tight text-pretty">
                    Here&apos;s what {name}&apos;s screening tells us — and who can help.
                  </h1>
                  <p className="text-[15.5px] leading-relaxed text-white/85 max-w-xl text-pretty">
                    We&apos;ve matched the results against verified{' '}
                    {serviceModel === 'CLINIC_DIRECTORY' ? 'clinics and specialists' : 'therapists and clinics'}.
                    You choose who to meet — nothing is booked until you say so.
                  </p>
                  <div className="flex gap-3 mt-6 flex-wrap">
                    <button
                      onClick={() => goDiscovery(`?childId=${child!.id}`)}
                      className="bg-white text-[#0d7d76] px-5 py-3.5 rounded-xl text-[15px] font-bold hover:bg-teal-50 transition-colors"
                    >
                      See {matchedCount > 0 ? `${matchedCount} matched` : 'matched'} providers
                    </button>
                    <a
                      href={`${APP_URLS.screening}/${screening!.assessmentId}/report`}
                      className="bg-white/15 border border-white/30 text-white px-5 py-3.5 rounded-xl text-[15px] font-semibold hover:bg-white/25 transition-colors"
                    >
                      Read the full report
                    </a>
                  </div>
                </div>

                {/* Child identity card */}
                <div className="w-full lg:w-[280px] flex-none rounded-2xl border border-white/20 bg-white/10 p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-[14px] bg-white text-[#0d7d76] grid place-items-center text-base font-extrabold">
                      {name?.slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-base font-bold">{name}</div>
                      <div className="text-[13px] text-white/80">
                        {age !== null ? `${age} yrs` : ''}
                        {child?.primaryLanguage ? ` · ${child.primaryLanguage} at home` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="h-px bg-white/20 my-4" />
                  <div className="text-[11px] font-bold tracking-[0.08em] text-white/75 mb-2.5">
                    FLAGGED AT SCREENING
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {screening!.flaggedDomains.map((d) => (
                      <span key={d} className="text-xs px-2.5 py-1 rounded-full bg-white/[0.18]">
                        {DOMAIN_LABELS[d] ?? d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-[1.15fr_1fr] gap-5 mt-5">
              {/* What the screening flagged */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="flex items-baseline justify-between mb-1">
                  <h2 className="text-lg font-bold tracking-tight text-gray-900">
                    What the screening flagged
                  </h2>
                  <span className="text-[12.5px] text-slate-500">
                    {screening!.flaggedDomains.length} of 8 domains
                  </span>
                </div>
                <p className="mb-4 text-[13.5px] leading-relaxed text-slate-500">
                  These are the needs we match providers against — a professional whose
                  discipline covers one of these shows as a strong fit.
                </p>
                {screening!.flaggedDomains.map((d) => {
                  const level = screening!.domainLevels[d];
                  const tone = level === 'RED' ? 'bg-rose-500' : 'bg-amber-500';
                  const chip =
                    level === 'RED'
                      ? { label: 'Needs attention', cls: 'bg-rose-50 text-rose-700' }
                      : level === 'YELLOW'
                        ? { label: 'Monitor', cls: 'bg-amber-50 text-amber-700' }
                        : { label: 'Flagged', cls: 'bg-slate-100 text-slate-600' };
                  return (
                    <div key={d} className="flex items-center gap-3.5 py-3.5 border-t border-slate-100">
                      <div className={`w-2 h-9 rounded ${tone}`} />
                      <div className="flex-1 min-w-0 text-[14.5px] font-bold text-gray-900">
                        {DOMAIN_LABELS[d] ?? d}
                      </div>
                      <span className={`text-[11.5px] font-bold px-2.5 py-1 rounded-[7px] whitespace-nowrap ${chip.cls}`}>
                        {chip.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Suggested first steps */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="mb-1 text-lg font-bold tracking-tight text-gray-900">
                  Suggested first steps
                </h2>
                <p className="mb-4 text-[13.5px] leading-relaxed text-slate-500">
                  Most families with a similar profile start here. Pick one to see matched
                  providers.
                </p>
                <div className="flex flex-col gap-3">
                  {[
                    {
                      n: '1',
                      title: `${DOMAIN_LABELS[screening!.flaggedDomains[0]] ?? 'Specialist'} support first`,
                      body: 'The clearest flag. An initial assessment sets the plan for everything else.',
                      count:
                        strongTherapists > 0
                          ? `${strongTherapists} matched ${strongTherapists === 1 ? 'therapist' : 'therapists'}`
                          : 'See matched therapists',
                      go: () => goDiscovery(`?childId=${child!.id}&tab=therapists`),
                    },
                    {
                      n: '2',
                      title: 'One clinic for everything',
                      body: 'Multi-disciplinary centres coordinate the different therapies in one schedule.',
                      count:
                        strongClinics > 0
                          ? `${strongClinics} matched ${strongClinics === 1 ? 'clinic' : 'clinics'}`
                          : 'See matched clinics',
                      go: () => goDiscovery(`?childId=${child!.id}&tab=clinics`),
                    },
                  ].map((p) => (
                    <button
                      key={p.n}
                      onClick={p.go}
                      className="text-left flex gap-3.5 items-start bg-[#fbfdfd] border border-gray-200 rounded-[13px] p-4 hover:border-teal-500 hover:bg-teal-50/50 transition-colors"
                    >
                      <div className="w-[30px] h-[30px] rounded-[9px] bg-teal-50 text-teal-600 grid place-items-center text-[13px] font-extrabold flex-none">
                        {p.n}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14.5px] font-bold text-gray-900">{p.title}</div>
                        <div className="text-[12.5px] text-slate-500 mt-0.5 leading-normal">{p.body}</div>
                        <div className="text-xs text-teal-600 font-bold mt-2">{p.count}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Ask Mira strip */}
            <div className="mt-5 rounded-2xl border border-gray-200 bg-white px-6 py-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-teal-50 border border-teal-100 flex-none overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/Mira.png" alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="text-[14.5px] font-bold text-gray-900">
                  Not sure what any of this means?
                </div>
                <div className="text-[13px] text-slate-500 mt-0.5">
                  Mira can walk you through the report in plain language, or help you shortlist
                  together.
                </div>
              </div>
              <a
                href={`${APP_URLS.main}?openMira=true&message=${encodeURIComponent(`Can you help me understand ${name}'s screening results and find the right therapist?`)}`}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4.5 py-2.5 px-5 rounded-[10px] text-[13.5px] font-semibold whitespace-nowrap transition-colors"
              >
                Ask Mira
              </a>
            </div>
          </>
        )}
      </div>
    </BookingShell>
  );
}
