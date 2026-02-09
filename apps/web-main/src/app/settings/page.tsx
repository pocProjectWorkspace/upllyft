'use client';

import { useAuth } from '@upllyft/api-client';
import { AppHeader, Card, Switch, Skeleton } from '@upllyft/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SettingsPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'privacy'>('account');

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    router.replace('/login');
    return null;
  }

  const tabs = [
    { id: 'account' as const, label: 'Account' },
    { id: 'notifications' as const, label: 'Notifications' },
    { id: 'privacy' as const, label: 'Privacy' },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader currentApp="main" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Settings</h1>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'account' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Account Details</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="text-sm font-medium text-gray-900">{user.role}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Member since</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Password</h2>
              <p className="text-sm text-gray-500 mb-3">Change your account password</p>
              <button className="text-sm text-teal-600 hover:text-teal-700 font-medium border border-teal-200 rounded-xl px-4 py-2 hover:bg-teal-50 transition-colors">
                Change Password
              </button>
            </Card>

            <Card className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-2">Billing</h2>
              <p className="text-sm text-gray-500 mb-3">Manage your subscription and payment methods</p>
              <a
                href="/settings/billing"
                className="text-sm text-teal-600 hover:text-teal-700 font-medium border border-teal-200 rounded-xl px-4 py-2 hover:bg-teal-50 transition-colors inline-block"
              >
                Manage Billing
              </a>
            </Card>

            <Card className="p-6 border-red-100">
              <h2 className="text-base font-semibold text-red-600 mb-2">Danger Zone</h2>
              <p className="text-sm text-gray-500 mb-3">Permanently delete your account and all data</p>
              <button className="text-sm text-red-600 hover:text-red-700 font-medium border border-red-200 rounded-xl px-4 py-2 hover:bg-red-50 transition-colors">
                Delete Account
              </button>
            </Card>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Email Notifications</h2>
              <div className="space-y-4">
                <NotificationToggle
                  label="Session reminders"
                  description="Get notified before upcoming sessions"
                  defaultChecked={true}
                />
                <NotificationToggle
                  label="Community replies"
                  description="When someone replies to your posts or comments"
                  defaultChecked={true}
                />
                <NotificationToggle
                  label="Worksheet assignments"
                  description="When a therapist assigns homework to you"
                  defaultChecked={true}
                />
                <NotificationToggle
                  label="Screening results"
                  description="When screening results are available"
                  defaultChecked={true}
                />
                <NotificationToggle
                  label="Marketing emails"
                  description="Tips, product updates, and newsletter"
                  defaultChecked={false}
                />
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Push Notifications</h2>
              <div className="space-y-4">
                <NotificationToggle
                  label="Enable push notifications"
                  description="Receive real-time notifications in your browser"
                  defaultChecked={false}
                />
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Privacy Settings</h2>
              <div className="space-y-4">
                <NotificationToggle
                  label="Show profile to other users"
                  description="Allow others to view your profile information"
                  defaultChecked={true}
                />
                <NotificationToggle
                  label="Show online status"
                  description="Let others see when you're active"
                  defaultChecked={true}
                />
                <NotificationToggle
                  label="Allow anonymous posting"
                  description="Enable posting without showing your name"
                  defaultChecked={false}
                />
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Data Management</h2>
              <p className="text-sm text-gray-500 mb-3">Download or request deletion of your data</p>
              <div className="flex gap-3">
                <button className="text-sm text-teal-600 hover:text-teal-700 font-medium border border-teal-200 rounded-xl px-4 py-2 hover:bg-teal-50 transition-colors">
                  Download My Data
                </button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

function NotificationToggle({
  label,
  description,
  defaultChecked,
}: {
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={setChecked} />
    </div>
  );
}
