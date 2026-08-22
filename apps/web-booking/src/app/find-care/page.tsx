'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth, useRegion, APP_URLS } from '@upllyft/api-client';
import { Button, Skeleton } from '@upllyft/ui';
import { BookingShell } from '@/components/booking-shell';
import {
  getMyChildren,
  getChildScreening,
  DOMAIN_LABELS,
  CONCERN_OPTIONS,
} from '@/lib/api/find-care';

const SELECTED_CHILD_KEY = 'upllyft_selected_child';

/**
 * The adaptive Find Care entry, per the design handoff: the screen reads how much is
 * known about the child and changes shape. Screened → flagged domains + confident next
 * steps. Unscreened → a confidence meter and three ranked paths (screening first, the
 * 30-second concern picker second, a quiet browse link last). We nudge toward richer
 * data — never gate on it.
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

  // Where discovery lives depends on the region's service model: India books
  // therapists directly; UAE goes through licensed clinics first.
  const discoveryPath = serviceModel === 'CLINIC_DIRECTORY' ? '/clinics' : '/';

  if (!isParent) {
    // Not a parent surface — send professionals to their own landing.
    if (user) router.replace('/');
    return null;
  }

  if (childrenLoading || (child && screeningLoading)) {
    return (
      <BookingShell>
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </BookingShell>
    );
  }

  const screened = !!screening?.assessmentId && (screening?.flaggedDomains?.length ?? 0) > 0;
  const name = child?.firstName;

  return (
    <BookingShell>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* ── Header ──────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {name ? `Find care for ${name}` : 'Find care'}
          </h1>
          <p className="text-gray-500 mt-1">
            {screened
              ? `Based on ${name}'s screening, here is where we'd start.`
              : 'You don’t need anything prepared — we can start from wherever you are.'}
          </p>
        </div>

        {/* ── Child switcher (only if multiple) ───────────────── */}
        {(children?.length ?? 0) > 1 && (
          <div className="flex gap-2">
            {children!.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedChildId(c.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
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

        {screened ? (
          /* ── SCREENED: flagged domains → confident next steps ── */
          <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-[11px] font-semibold tracking-wide text-gray-400 mb-3">
                WHAT WE KNOW ABOUT {name?.toUpperCase()}
              </p>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full w-full bg-teal-500" />
                </div>
                <span className="text-xs font-semibold text-teal-700">Screening complete</span>
              </div>
              <div className="space-y-2">
                {screening!.flaggedDomains.map((d) => (
                  <div key={d} className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 flex-none" />
                    <span className="text-sm text-gray-800 font-medium">
                      {DOMAIN_LABELS[d] ?? d}
                    </span>
                    <span className="text-xs text-gray-400">flagged — worth support</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-4">
                From the screening on{' '}
                {screening!.completedAt
                  ? new Date(screening!.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
                  : 'file'}
                . Matches below are based on which professionals address these areas — nothing
                more clever than that, on purpose.
              </p>
            </div>

            <Button
              className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white h-12 text-base"
              onClick={() => router.push(`${discoveryPath}?childId=${child!.id}`)}
            >
              See matched {serviceModel === 'CLINIC_DIRECTORY' ? 'clinics' : 'therapists'} →
            </Button>

            <button
              onClick={() => router.push(discoveryPath)}
              className="block mx-auto text-sm text-gray-400 hover:text-gray-600"
            >
              or just browse everyone
            </button>
          </>
        ) : (
          /* ── UNSCREENED: confidence meter + three ranked paths ── */
          <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-[11px] font-semibold tracking-wide text-gray-400 mb-3">
                {name ? `WHAT WE KNOW ABOUT ${name.toUpperCase()}` : 'WHAT WE KNOW SO FAR'}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full w-[20%] bg-teal-300" />
                </div>
                <span className="text-xs font-semibold text-gray-500">Just the basics</span>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                {name
                  ? `We only have ${name}'s age so far. That's a fine place to start — more information simply makes the matches more confident.`
                  : 'Add a child on your profile so we can tailor this to them.'}
              </p>
            </div>

            {/* Path 1 — screening (recommended) */}
            <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-2xl p-6 text-white">
              <span className="inline-block px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-semibold tracking-wide mb-2">
                RECOMMENDED FIRST STEP
              </span>
              <h2 className="text-lg font-bold">Take the free developmental screening</h2>
              <p className="text-sm text-teal-50 mt-1">
                About 5 minutes. It looks at 8 areas of development and tells us exactly which
                professionals fit{name ? ` ${name}` : ' your child'} — no guesswork.
              </p>
              <Button
                className="mt-4 bg-white text-teal-700 hover:bg-teal-50 rounded-xl"
                onClick={() => {
                  window.location.href = APP_URLS.screening;
                }}
              >
                Start the screening
              </Button>
            </div>

            {/* Path 2 — 30-second concern picker */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-gray-900">
                Or tell us what&apos;s on your mind
              </h2>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                Takes about 30 seconds. Pick whatever feels closest — you can&apos;t get this
                wrong.
              </p>
              <div className="flex flex-wrap gap-2">
                {CONCERN_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() =>
                      router.push(
                        `${discoveryPath}?concern=${c.id}${child ? `&childId=${child.id}` : ''}`,
                      )
                    }
                    className="px-4 py-2.5 rounded-full text-sm font-medium bg-slate-50 border border-slate-200 text-slate-700 hover:border-teal-400 hover:bg-teal-50 transition-colors"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Path 3 — quiet browse link */}
            <button
              onClick={() => router.push(discoveryPath)}
              className="block mx-auto text-sm text-gray-400 hover:text-gray-600"
            >
              I&apos;d rather just browse all {serviceModel === 'CLINIC_DIRECTORY' ? 'clinics' : 'therapists'}
            </button>
          </>
        )}
      </div>
    </BookingShell>
  );
}
