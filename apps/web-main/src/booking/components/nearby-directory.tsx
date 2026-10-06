'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@upllyft/api-client';
import { Card } from '@upllyft/ui';

interface DirectoryEntry {
  id: string;
  organizationName: string;
  organizationType: string;
  city: string;
  state: string;
  contactNumber?: string | null;
  websiteLinkedin?: string | null;
}

/**
 * Shown when no bookable therapist matches: centres from the India provider directory
 * in the parent's city (else state). These are NOT on Upllyft and cannot be booked
 * here — the card says so plainly.
 */
export function NearbyDirectory({ city, state }: { city?: string | null; state?: string | null }) {
  const place = city?.trim() || state?.trim() || '';
  const { data } = useQuery({
    queryKey: ['booking', 'nearby-directory', city ?? '', state ?? ''],
    queryFn: async () => {
      const params: Record<string, string> = { limit: '5' };
      if (city?.trim()) params.city = city.trim();
      else if (state?.trim()) params.state = state.trim();
      const res = await apiClient.get('/providers', { params });
      return (res.data?.providers ?? []) as DirectoryEntry[];
    },
    enabled: !!place,
  });

  if (!place || !data?.length) return null;

  return (
    <div className="max-w-2xl mx-auto mt-8 text-left">
      <h4 className="text-sm font-semibold text-gray-900">Other centres near {place}</h4>
      <p className="text-xs text-gray-500 mt-0.5 mb-3">
        From a public directory. These centres are not on Upllyft, so they can&rsquo;t be booked here —
        contact them directly.
      </p>
      <div className="space-y-2">
        {data.map((p) => (
          <Card key={p.id} className="rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{p.organizationName}</p>
              <p className="text-xs text-gray-500">
                {p.organizationType} · {p.city}, {p.state}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Not bookable on Upllyft</span>
              {p.contactNumber && (
                <a href={`tel:${p.contactNumber}`} className="text-teal-700 font-medium hover:underline">
                  Call
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
