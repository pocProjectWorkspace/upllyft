'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@upllyft/api-client';
import { ListSkeleton } from '@/components/skeletons';
import { CONCERN_LABELS } from '@/booking/lib/api/find-care';

interface DemandRow {
  country: string | null;
  concern: string | null;
  waiting: number;
}

const COUNTRY_LABELS: Record<string, string> = { IN: 'India', AE: 'UAE', SA: 'Saudi Arabia' };

/**
 * Backlog #1: families who found no provider and asked to be notified. This is the
 * recruitment signal — where to onboard therapists and clinics next. Everyone on it
 * is notified automatically when a therapist is verified or a clinic is approved
 * in their country.
 */
export default function CareWaitlistPage() {
  const { data, isPending } = useQuery({
    queryKey: ['admin', 'care-waitlist', 'demand'],
    queryFn: () => apiClient.get<DemandRow[]>('/care-waitlist/demand').then((r) => r.data),
  });

  if (isPending) return <ListSkeleton bare rows={5} />;

  const rows = data ?? [];
  const total = rows.reduce((sum, r) => sum + r.waiting, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Care waitlist</h1>
        <p className="text-sm text-gray-500 mt-1">
          {total} famil{total === 1 ? 'y is' : 'ies are'} waiting for a provider. They are notified
          automatically when a therapist is verified or a clinic is approved in their country.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <p className="text-gray-700 font-medium">Nobody is waiting</p>
          <p className="text-sm text-gray-500 mt-1">Every family who searched found a provider.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left font-medium px-5 py-3">Country</th>
                <th className="text-left font-medium px-5 py-3">Looking for</th>
                <th className="text-right font-medium px-5 py-3">Families waiting</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={`${r.country}-${r.concern}`}>
                  <td className="px-5 py-3 text-gray-900">
                    {r.country ? COUNTRY_LABELS[r.country] ?? r.country : 'Unknown'}
                  </td>
                  <td className="px-5 py-3 text-gray-700">
                    {r.concern ? CONCERN_LABELS[r.concern] ?? r.concern : 'Any / from screening'}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900">{r.waiting}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
