'use client';

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@upllyft/api-client';
import { Bell, Check, Loader2 } from 'lucide-react';

/**
 * Backlog #1: when Find Care has nothing for a family, they can ask to be told
 * when a provider joins in their country — instead of a dead end.
 */
export function CareWaitlistCard({
  country,
  countryLabel,
  childId,
  concern,
  domains,
}: {
  country?: string;
  countryLabel?: string;
  childId?: string;
  concern?: string;
  domains?: string[];
}) {
  const join = useMutation({
    mutationFn: () =>
      apiClient.post('/care-waitlist', { country, childId, concern, domains }).then((r) => r.data),
  });

  return (
    <div className="text-center py-12 px-6 bg-white rounded-2xl border border-dashed border-gray-200">
      <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
        <Bell className="w-6 h-6 text-teal-600" />
      </div>
      <p className="text-gray-900 font-semibold">
        No providers on Upllyft{countryLabel ? ` in ${countryLabel}` : ''} yet for this
      </p>
      <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
        We only list therapists and clinics we have verified. Leave your details and we will let you
        know as soon as one joins near you.
      </p>
      {join.isSuccess ? (
        <p className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700">
          <Check className="w-4 h-4" /> You are on the list. We will notify you here.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => join.mutate()}
          disabled={join.isPending}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-60 transition-colors"
        >
          {join.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Notify me when a provider joins
        </button>
      )}
      {join.isError && (
        <p className="mt-3 text-sm text-red-600">Could not save that. Please try again.</p>
      )}
    </div>
  );
}
