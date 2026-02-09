'use client';

import { useState, useEffect } from 'react';
import { BookingShell } from '@/components/booking-shell';
import {
  Card,
  Button,
  Input,
  Label,
  Skeleton,
  Separator,
} from '@upllyft/ui';
import {
  usePlatformSettings,
  useUpdatePlatformSettings,
} from '@/hooks/use-marketplace-admin';

export default function AdminSettingsPage() {
  const { data: settings, isLoading } = usePlatformSettings();
  const updateSettings = useUpdatePlatformSettings();

  const [commission, setCommission] = useState(15);
  const [escrowHours, setEscrowHours] = useState(24);
  const [marketplaceEnabled, setMarketplaceEnabled] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setCommission(settings.platformCommissionPercentage);
      setEscrowHours(settings.escrowHoldHours);
      setMarketplaceEnabled(settings.enableMarketplace);
      setHasChanges(false);
    }
  }, [settings]);

  function handleCommissionChange(value: string) {
    const num = Math.min(100, Math.max(0, Number(value) || 0));
    setCommission(num);
    setHasChanges(true);
  }

  function handleEscrowChange(value: string) {
    const num = Math.min(72, Math.max(1, Number(value) || 1));
    setEscrowHours(num);
    setHasChanges(true);
  }

  function toggleMarketplace() {
    setMarketplaceEnabled((prev) => !prev);
    setHasChanges(true);
  }

  function handleReset() {
    if (settings) {
      setCommission(settings.platformCommissionPercentage);
      setEscrowHours(settings.escrowHoldHours);
      setMarketplaceEnabled(settings.enableMarketplace);
      setHasChanges(false);
    }
  }

  function handleSave() {
    updateSettings.mutate({
      platformCommissionPercentage: commission,
      escrowHoldHours: escrowHours,
      enableMarketplace: marketplaceEnabled,
    });
  }

  const exampleSession = 100;
  const platformEarnings = (exampleSession * commission) / 100;
  const therapistReceives = exampleSession - platformEarnings;

  return (
    <BookingShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Marketplace Settings
            </h1>
            <p className="text-gray-500 text-sm">
              Configure platform-wide marketplace parameters
            </p>
          </div>
        </div>

        {/* Settings Form */}
        {isLoading ? (
          <Card className="rounded-2xl">
            <div className="p-6 pb-0">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72 mt-1" />
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
            <div className="p-6 pt-0">
              <Skeleton className="h-10 w-24" />
            </div>
          </Card>
        ) : (
          <Card className="rounded-2xl">
            <div className="p-6 pb-0">
              <h3 className="text-lg font-semibold">Platform Configuration</h3>
              <p className="text-sm text-gray-500">
                Adjust commission rates, escrow timing, and marketplace
                availability. Changes apply to all future bookings.
              </p>
            </div>
            <div className="p-6 space-y-6">
              {/* Commission */}
              <div className="space-y-2">
                <Label htmlFor="commission">
                  Platform Commission Percentage
                </Label>
                <div className="relative">
                  <Input
                    id="commission"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={commission}
                    onChange={(e) => handleCommissionChange(e.target.value)}
                    className="pr-10 rounded-xl"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                    %
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  Percentage of each booking retained by the platform (0-100)
                </p>
              </div>

              {/* Escrow Hours */}
              <div className="space-y-2">
                <Label htmlFor="escrow">Escrow Hold Hours</Label>
                <div className="relative">
                  <Input
                    id="escrow"
                    type="number"
                    min={1}
                    max={72}
                    step={1}
                    value={escrowHours}
                    onChange={(e) => handleEscrowChange(e.target.value)}
                    className="pr-12 rounded-xl"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                    hrs
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  How long funds are held in escrow after session completion
                  (1-72 hours)
                </p>
              </div>

              {/* Marketplace Toggle */}
              <div className="space-y-2">
                <Label>Enable Marketplace</Label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={marketplaceEnabled}
                  onClick={toggleMarketplace}
                  className={`
                    relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200
                    ${marketplaceEnabled ? 'bg-teal-500' : 'bg-gray-300'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200
                      ${marketplaceEnabled ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
                <p className="text-xs text-gray-400">
                  {marketplaceEnabled
                    ? 'Marketplace is active. Therapists can receive bookings.'
                    : 'Marketplace is disabled. No new bookings can be made.'}
                </p>
              </div>

              <Separator />

              {/* Live Example Calculation */}
              <div className="rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 p-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-4 h-4 text-teal-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-teal-900">
                      Example Calculation
                    </p>
                    <p className="text-sm text-teal-700 mt-1">
                      For a{' '}
                      <span className="font-semibold">
                        ${exampleSession.toFixed(2)}
                      </span>{' '}
                      session with{' '}
                      <span className="font-semibold">{commission}%</span>{' '}
                      commission, the platform earns{' '}
                      <span className="font-semibold text-teal-800">
                        ${platformEarnings.toFixed(2)}
                      </span>
                      , therapist receives{' '}
                      <span className="font-semibold text-teal-800">
                        ${therapistReceives.toFixed(2)}
                      </span>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 pt-0 flex justify-between">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={!hasChanges}
                className="rounded-xl"
              >
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || updateSettings.isPending}
                className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white"
              >
                {updateSettings.isPending ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </BookingShell>
  );
}
