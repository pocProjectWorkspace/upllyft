'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@upllyft/ui';
import {
  getOnboardingSettings,
  updateOnboardingSettings,
  type OnboardingSettings,
} from '@/lib/api/organizations';

export default function OnboardingSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<OnboardingSettings>({
    parentOnboardingEnabled: true,
    therapistOnboardingEnabled: true,
  });

  useEffect(() => {
    getOnboardingSettings()
      .then(setSettings)
      .catch(() => toast({ title: 'Error', description: 'Failed to load settings', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateOnboardingSettings(settings);
      setSettings(updated);
      toast({ title: 'Success', description: 'Onboarding settings saved' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Onboarding Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Control the onboarding experience for parents and therapists. When enabled, onboarding appears on every login until disabled.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
        <div>
          <h2 className="font-semibold text-gray-900 mb-1">Onboarding Toggles</h2>
          <p className="text-sm text-gray-500">
            Enable or disable onboarding flows by role. Changes take effect immediately for all users.
          </p>
        </div>

        {/* Parent toggle */}
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium text-gray-900">Parent Onboarding</p>
            <p className="text-sm text-gray-500">Show onboarding flow to all parent/user accounts on login</p>
          </div>
          <button
            onClick={() => setSettings({ ...settings, parentOnboardingEnabled: !settings.parentOnboardingEnabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.parentOnboardingEnabled ? 'bg-teal-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.parentOnboardingEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="border-t border-gray-100" />

        {/* Therapist toggle */}
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium text-gray-900">Therapist Onboarding</p>
            <p className="text-sm text-gray-500">Show onboarding flow to all therapist/educator accounts on login</p>
          </div>
          <button
            onClick={() => setSettings({ ...settings, therapistOnboardingEnabled: !settings.therapistOnboardingEnabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.therapistOnboardingEnabled ? 'bg-teal-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.therapistOnboardingEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-6 py-2 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md disabled:opacity-50"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
