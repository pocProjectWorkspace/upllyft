'use client';

import { useAuth } from '@upllyft/api-client';
import { AppHeader, Card, Avatar, Skeleton, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@upllyft/ui';
import { useRouter } from 'next/navigation';
import { useMyProfile } from '@/hooks/use-dashboard';
import { updateProfile } from '@/lib/api/profiles';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

export default function EditProfilePage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    city: '',
    state: '',
    country: '',
    occupation: '',
    educationLevel: '',
    relationshipToChild: '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || user?.name || '',
        phoneNumber: profile.phoneNumber || '',
        city: profile.city || '',
        state: profile.state || '',
        country: profile.country || '',
        occupation: profile.occupation || '',
        educationLevel: profile.educationLevel || '',
        relationshipToChild: profile.relationshipToChild || '',
      });
    }
  }, [profile, user?.name]);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="max-w-2xl mx-auto px-4 py-20">
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    router.replace('/login');
    return null;
  }

  const displayName = user.name || user.email?.split('@')[0] || 'User';

  function handleChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      await updateProfile(formData as any);
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader currentApp="main" />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Edit Profile</h1>
          <a href="/profile" className="text-sm text-gray-500 hover:text-gray-700">
            Cancel
          </a>
        </div>

        {/* Avatar */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4">
            <Avatar name={displayName} src={user.image || undefined} size="xl" />
            <div>
              <p className="text-sm font-medium text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
        </Card>

        {/* Form */}
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 border border-red-100">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-teal-50 text-teal-600 text-sm rounded-xl px-4 py-3 border border-teal-100">
                Profile updated successfully!
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => handleChange('phoneNumber', e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                />
              </div>

              {user.role === 'USER' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relationship to Child</label>
                  <Select value={formData.relationshipToChild} onValueChange={(v) => handleChange('relationshipToChild', v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mother">Mother</SelectItem>
                      <SelectItem value="Father">Father</SelectItem>
                      <SelectItem value="Guardian">Guardian</SelectItem>
                      <SelectItem value="Grandparent">Grandparent</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                <input
                  type="text"
                  value={formData.occupation}
                  onChange={(e) => handleChange('occupation', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Education Level</label>
                <Select value={formData.educationLevel} onValueChange={(v) => handleChange('educationLevel', v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High School">High School</SelectItem>
                    <SelectItem value="Bachelor's">Bachelor&apos;s</SelectItem>
                    <SelectItem value="Master's">Master&apos;s</SelectItem>
                    <SelectItem value="Doctorate">Doctorate</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-6 py-2.5 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
