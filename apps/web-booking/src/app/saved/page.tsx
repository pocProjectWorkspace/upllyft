'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, Button, Card, Skeleton } from '@upllyft/ui';
import { BookingShell } from '@/components/booking-shell';
import { useShortlist, useToggleShortlist } from '@/hooks/use-shortlist';
import { formatCurrency } from '@/lib/utils';
import type { ShortlistEntry } from '@/lib/api/shortlist';

const MAX_COMPARE = 3;

/**
 * Shortlist + side-by-side compare, per the handoff: compare is reached from the
 * shortlist (not from result cards) and covers the essentials only — no factor
 * matrices.
 */
export default function SavedPage() {
  const router = useRouter();
  const { data: entries, isLoading } = useShortlist();
  const toggle = useToggleShortlist();
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const list = entries ?? [];
  const comparing = list.filter((e) => compareIds.includes(e.id));

  function toggleCompare(id: string) {
    setCompareIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : ids.length < MAX_COMPARE ? [...ids, id] : ids,
    );
  }

  function providerName(e: ShortlistEntry) {
    return e.therapist?.user.name ?? e.clinic?.name ?? 'Provider';
  }

  return (
    <BookingShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Saved providers</h1>
            <p className="text-gray-500 mt-1">
              Your shortlist. Pick two or three to compare side by side.
            </p>
          </div>
          {comparing.length >= 2 && (
            <span className="text-sm font-medium text-teal-700">
              Comparing {comparing.length}
            </span>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : list.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
            <p className="text-gray-700 font-medium">Nothing saved yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Tap the heart on any therapist or clinic to keep them here.
            </p>
            <Button className="mt-5 rounded-xl" onClick={() => router.push('/find-care')}>
              Find care
            </Button>
          </div>
        ) : (
          <>
            {/* ── Shortlist rows ─────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {list.map((e) => {
                const isTherapist = !!e.therapist;
                const name = providerName(e);
                const inCompare = compareIds.includes(e.id);
                return (
                  <div key={e.id} className="flex items-center gap-4 px-5 py-4">
                    <Avatar
                      src={e.therapist?.profileImage || e.therapist?.user.image || e.clinic?.logoUrl || undefined}
                      name={name}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {isTherapist
                          ? e.therapist?.title ?? 'Therapist'
                          : `Clinic · ${e.clinic?._count.therapists ?? 0} therapists`}
                        {' · '}★ {(e.therapist?.overallRating ?? e.clinic?.rating ?? 0).toFixed(1)}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleCompare(e.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        inCompare
                          ? 'bg-teal-600 border-teal-600 text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-teal-300'
                      }`}
                    >
                      {inCompare ? 'Comparing ✓' : 'Compare'}
                    </button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() =>
                        router.push(isTherapist ? `/therapists/${e.therapistId}` : `/clinics/${e.clinicId}`)
                      }
                    >
                      View
                    </Button>
                    <button
                      onClick={() =>
                        toggle.mutate(
                          isTherapist ? { therapistId: e.therapistId! } : { clinicId: e.clinicId! },
                        )
                      }
                      aria-label="Remove from shortlist"
                      className="text-gray-300 hover:text-red-400 transition-colors p-1"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* ── Compare table ──────────────────────────────── */}
            {comparing.length >= 2 && (
              <Card className="rounded-2xl overflow-hidden">
                <div className="p-5 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 pr-4 w-32" />
                        {comparing.map((e) => (
                          <th key={e.id} className="text-left pb-3 pr-4 min-w-[150px]">
                            <span className="block font-bold text-gray-900">{providerName(e)}</span>
                            <span className="block text-xs font-normal text-gray-500">
                              {e.therapist ? e.therapist.title ?? 'Therapist' : 'Clinic'}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="[&_td]:py-2.5 [&_td]:pr-4 [&_tr]:border-t [&_tr]:border-gray-50">
                      <tr>
                        <td className="text-xs font-semibold text-gray-400">RATING</td>
                        {comparing.map((e) => (
                          <td key={e.id} className="text-gray-800">
                            ★ {(e.therapist?.overallRating ?? e.clinic?.rating ?? 0).toFixed(1)}
                            {e.clinic ? ` (${e.clinic.totalReviews})` : ''}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="text-xs font-semibold text-gray-400">FOCUS</td>
                        {comparing.map((e) => (
                          <td key={e.id} className="text-gray-800">
                            {(e.therapist?.specializations ?? e.clinic?.specializations ?? [])
                              .slice(0, 3)
                              .join(', ') || '—'}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="text-xs font-semibold text-gray-400">LANGUAGES</td>
                        {comparing.map((e) => (
                          <td key={e.id} className="text-gray-800">
                            {e.therapist?.languages?.slice(0, 3).join(', ') ?? '—'}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="text-xs font-semibold text-gray-400">EXPERIENCE</td>
                        {comparing.map((e) => (
                          <td key={e.id} className="text-gray-800">
                            {e.therapist?.yearsExperience != null
                              ? `${e.therapist.yearsExperience} yrs`
                              : e.clinic
                                ? `${e.clinic._count.therapists} therapists`
                                : '—'}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="text-xs font-semibold text-gray-400">FROM</td>
                        {comparing.map((e) => (
                          <td key={e.id} className="text-gray-800">
                            {e.therapist?.startingPrice
                              ? formatCurrency(e.therapist.startingPrice)
                              : '—'}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td />
                        {comparing.map((e) => (
                          <td key={e.id}>
                            <Button
                              size="sm"
                              className="rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 text-white"
                              onClick={() =>
                                router.push(
                                  e.therapist ? `/book/${e.therapistId}` : `/clinics/${e.clinicId}`,
                                )
                              }
                            >
                              {e.therapist ? 'Book' : 'View clinic'}
                            </Button>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </BookingShell>
  );
}
