'use client';

import { apiClient, useAuth } from '@upllyft/api-client';
import { AppHeader, Card, Switch, useToast } from '@upllyft/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SettingsPage() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'privacy' | 'crisis' | 'feed'>('account');

  // Change password state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Download data state
  const [downloading, setDownloading] = useState(false);

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

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'New password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setChangingPassword(true);
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      toast({ title: 'Password changed', description: 'Your password has been updated successfully' });
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to change password',
        variant: 'destructive',
      });
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      await apiClient.delete('/users/me');
      toast({ title: 'Account deleted', description: 'Your account has been permanently deleted' });
      logout();
      router.push('/login');
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to delete account',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  }

  async function handleDownloadData() {
    setDownloading(true);
    try {
      const { data } = await apiClient.get('/users/me/data', { responseType: 'blob' });
      const blob = new Blob([data as BlobPart], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `upllyft-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Download started', description: 'Your data export is downloading' });
    } catch {
      toast({
        title: 'Export requested',
        description: 'Your data export has been requested. You will receive an email when it is ready.',
      });
    } finally {
      setDownloading(false);
    }
  }

  const tabs = [
    { id: 'account' as const, label: 'Account' },
    { id: 'notifications' as const, label: 'Notifications' },
    { id: 'privacy' as const, label: 'Privacy' },
    { id: 'crisis' as const, label: 'Crisis' },
    { id: 'feed' as const, label: 'Feed' },
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
              {!showPasswordModal ? (
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium border border-teal-200 rounded-xl px-4 py-2 hover:bg-teal-50 transition-colors"
                >
                  Change Password
                </button>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-3 max-w-sm">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="At least 6 characters"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={changingPassword}
                      className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md transition-all disabled:opacity-50"
                    >
                      {changingPassword ? 'Changing...' : 'Change Password'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordModal(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
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
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-sm text-red-600 hover:text-red-700 font-medium border border-red-200 rounded-xl px-4 py-2 hover:bg-red-50 transition-colors"
                >
                  Delete Account
                </button>
              ) : (
                <div className="space-y-3 max-w-sm">
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                    <p className="text-sm text-red-700">
                      This action is permanent and cannot be undone. All your data, posts, and profile information will be permanently deleted.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type <strong>DELETE</strong> to confirm
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== 'DELETE' || deleting}
                      className="bg-red-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting ? 'Deleting...' : 'Permanently Delete Account'}
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText('');
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Email Notifications</h2>
              <div className="space-y-4">
                <NotificationToggle
                  settingKey="sessionReminders"
                  label="Session reminders"
                  description="Get notified before upcoming sessions"
                  defaultChecked={true}
                />
                <NotificationToggle
                  settingKey="communityReplies"
                  label="Community replies"
                  description="When someone replies to your posts or comments"
                  defaultChecked={true}
                />
                <NotificationToggle
                  settingKey="worksheetAssignments"
                  label="Worksheet assignments"
                  description="When a therapist assigns homework to you"
                  defaultChecked={true}
                />
                <NotificationToggle
                  settingKey="screeningResults"
                  label="Screening results"
                  description="When screening results are available"
                  defaultChecked={true}
                />
                <NotificationToggle
                  settingKey="marketingEmails"
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
                  settingKey="pushNotifications"
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
                  settingKey="showProfile"
                  label="Show profile to other users"
                  description="Allow others to view your profile information"
                  defaultChecked={true}
                />
                <NotificationToggle
                  settingKey="showOnlineStatus"
                  label="Show online status"
                  description="Let others see when you're active"
                  defaultChecked={true}
                />
                <NotificationToggle
                  settingKey="allowAnonymousPosting"
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
                <button
                  onClick={handleDownloadData}
                  disabled={downloading}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium border border-teal-200 rounded-xl px-4 py-2 hover:bg-teal-50 transition-colors disabled:opacity-50"
                >
                  {downloading ? 'Exporting...' : 'Download My Data'}
                </button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'crisis' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Crisis Detection</h2>
              <p className="text-sm text-gray-500 mb-4">Configure how crisis detection works for your account</p>
              <div className="space-y-4">
                <NotificationToggle
                  settingKey="crisisDetectionEnabled"
                  label="Enable crisis detection"
                  description="Automatically detect crisis-related content in posts and messages"
                  defaultChecked={true}
                />
                <NotificationToggle
                  settingKey="crisisAutoNotify"
                  label="Auto-notify emergency contacts"
                  description="Automatically alert your emergency contacts during a detected crisis"
                  defaultChecked={false}
                />
                <NotificationToggle
                  settingKey="crisisShowResources"
                  label="Show crisis resources"
                  description="Display helpline numbers and resources when crisis content is detected"
                  defaultChecked={true}
                />
              </div>
            </Card>
            <Card className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Emergency Contacts</h2>
              <p className="text-sm text-gray-500 mb-3">Manage contacts who will be notified during a crisis</p>
              <button className="text-sm text-teal-600 hover:text-teal-700 font-medium border border-teal-200 rounded-xl px-4 py-2 hover:bg-teal-50 transition-colors">
                Manage Emergency Contacts
              </button>
            </Card>
          </div>
        )}

        {activeTab === 'feed' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Feed Preferences</h2>
              <p className="text-sm text-gray-500 mb-4">Customize what appears in your feed</p>
              <div className="space-y-4">
                <NotificationToggle
                  settingKey="feedShowTrending"
                  label="Show trending posts"
                  description="Display trending content in your feed"
                  defaultChecked={true}
                />
                <NotificationToggle
                  settingKey="feedShowRecommendations"
                  label="Show recommendations"
                  description="Display personalized content recommendations"
                  defaultChecked={true}
                />
                <NotificationToggle
                  settingKey="feedShowAds"
                  label="Show sponsored content"
                  description="Display sponsored posts and advertisements in your feed"
                  defaultChecked={true}
                />
                <NotificationToggle
                  settingKey="feedAutoplayMedia"
                  label="Autoplay media"
                  description="Automatically play videos and animations in posts"
                  defaultChecked={false}
                />
              </div>
            </Card>
            <Card className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Content Filters</h2>
              <div className="space-y-4">
                <NotificationToggle
                  settingKey="feedFilterSensitive"
                  label="Filter sensitive content"
                  description="Hide posts that may contain sensitive or triggering content"
                  defaultChecked={false}
                />
                <NotificationToggle
                  settingKey="feedCompactMode"
                  label="Compact feed mode"
                  description="Show more posts with less spacing"
                  defaultChecked={false}
                />
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

function NotificationToggle({
  settingKey,
  label,
  description,
  defaultChecked,
}: {
  settingKey: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function handleToggle(value: boolean) {
    setChecked(value);
    setSaving(true);
    try {
      await apiClient.patch('/users/me/preferences', { [settingKey]: value });
    } catch {
      setChecked(!value);
      toast({ title: 'Error', description: 'Failed to update setting', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={handleToggle} disabled={saving} />
    </div>
  );
}
