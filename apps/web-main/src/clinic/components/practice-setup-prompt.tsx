'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getStoredTokens, refreshToken, useAuth } from '@upllyft/api-client';
import { Button, Input } from '@upllyft/ui';
import { Building2, Check, Loader2 } from 'lucide-react';
import { setupPractice } from '@/clinic/lib/admin-api';
import { clinicKeys } from '@/clinic/lib/query-keys';

const WHAT_YOU_GET = [
  'Your own clinic dashboard, patient directory and today’s board',
  'Add therapists to your practice and manage their schedules, fees and session types',
  'Revenue reports and practice settings',
  'An organisation workspace for members, events and resources',
];

/**
 * Shown to a therapist who signed up on their own and has no clinic. Setting up a
 * practice makes them its owner, with the same clinic-admin screens a clinic's
 * admin has, scoped to their practice.
 */
export function PracticeSetupPrompt() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState(user?.name ? `${user.name} Therapy` : '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const result = await setupPractice({
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        country: country.trim() || undefined,
      });
      // The clinic scope lives in the access token, which is minted on refresh —
      // without this every clinic screen would 403 until the token next rotated.
      const { refreshToken: stored } = getStoredTokens();
      if (stored) await refreshToken(stored);
      return result;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clinicKeys.all });
      await queryClient.invalidateQueries({ queryKey: ['organizations', 'my'] });
      router.replace('/clinic');
    },
  });

  const error =
    (mutation.error as { response?: { data?: { message?: string } } } | null)?.response?.data
      ?.message ?? (mutation.error ? 'Could not set up your practice. Please try again.' : null);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center mb-5">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Set up your practice</h1>
        <p className="text-sm text-gray-500 mt-1.5">
          You’re not part of a clinic on Upllyft yet. Set up your own practice and you become
          its administrator.
        </p>

        <ul className="mt-5 space-y-2">
          {WHAT_YOU_GET.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
              <Check className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) mutation.mutate();
          }}
        >
          <div>
            <label htmlFor="practice-name" className="block text-sm font-medium text-gray-700 mb-1">
              Practice name
            </label>
            <Input
              id="practice-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bright Steps Therapy"
              required
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="practice-phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <Input id="practice-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label htmlFor="practice-country" className="block text-sm font-medium text-gray-700 mb-1">
                Country <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <Input id="practice-country" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
          </div>
          <div>
            <label htmlFor="practice-address" className="block text-sm font-medium text-gray-700 mb-1">
              Address <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <Input id="practice-address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <p className="text-xs text-gray-500">
            Your practice goes live for new cases once your licence is verified by Upllyft.
            You can change these details later in Settings.
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={!name.trim() || mutation.isPending}>
            {mutation.isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Setting up…
              </span>
            ) : (
              'Set up my practice'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
