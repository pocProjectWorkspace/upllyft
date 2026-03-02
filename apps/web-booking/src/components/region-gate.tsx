'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, useAuth } from '@upllyft/api-client';
import { SUPPORTED_COUNTRIES, REGION_CONFIGS, type SupportedCountry } from '@upllyft/types';
import { Card, Button } from '@upllyft/ui';

const REGION_OPTIONS = SUPPORTED_COUNTRIES.map((code) => ({
  code,
  ...REGION_CONFIGS[code],
  flag: code === 'IN' ? '\uD83C\uDDEE\uD83C\uDDF3' : '\uD83C\uDDE6\uD83C\uDDEA',
}));

export function RegionGate() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [selected, setSelected] = useState<SupportedCountry | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSelect() {
    if (!selected) return;
    setSaving(true);
    try {
      await apiClient.patch('/users/me/region', { preferredRegion: selected });
      await refreshUser();
      const config = REGION_CONFIGS[selected];
      if (config.serviceModel === 'CLINIC_DIRECTORY') {
        router.replace('/clinics');
      } else {
        router.replace('/');
      }
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-teal-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select your region</h2>
        <p className="text-gray-500 mb-8">
          Choose a region to browse therapy services. This helps us show you the right options.
        </p>

        <div className="space-y-3 mb-8">
          {REGION_OPTIONS.map((r) => (
            <Card
              key={r.code}
              className={`p-4 cursor-pointer transition-all rounded-2xl ${
                selected === r.code
                  ? 'ring-2 ring-teal-500 bg-teal-50'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelected(r.code)}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{r.flag}</span>
                <div className="text-left flex-1">
                  <p className={`font-semibold ${selected === r.code ? 'text-teal-700' : 'text-gray-900'}`}>
                    {r.label}
                  </p>
                  <p className="text-sm text-gray-500">
                    {r.serviceModel === 'CLINIC_DIRECTORY'
                      ? 'Browse clinics and book through verified centers'
                      : 'Browse individual therapists and book directly'}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Button
          onClick={handleSelect}
          disabled={!selected || saving}
          className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white py-3 font-semibold"
        >
          {saving ? 'Setting up...' : 'Continue'}
        </Button>

        <p className="text-xs text-gray-400 mt-4">
          Booking is currently available in India and UAE. You can change your region later in settings.
        </p>
      </div>
    </div>
  );
}
