'use client';

import { useAuth } from '@upllyft/api-client';
import { AppHeader, Card, Avatar, Skeleton, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Badge, useToast } from '@upllyft/ui';
import { useRouter } from 'next/navigation';
import { useMyProfile } from '@/hooks/use-dashboard';
import { updateProfile, updateAvatar, addChild, updateChild, deleteChild, calculateAge, type Child } from '@/lib/api/profiles';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useRef } from 'react';

export default function EditProfilePage() {
  const { user, isLoading: authLoading, isAuthenticated, refreshUser } = useAuth();
  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Children management state
  const [showAddChild, setShowAddChild] = useState(false);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [childForm, setChildForm] = useState({
    firstName: '',
    dateOfBirth: '',
    gender: '',
    grade: '',
    schoolType: '',
    hasCondition: false,
    diagnosisStatus: '',
  });
  const [savingChild, setSavingChild] = useState(false);

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

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please select an image file', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image must be less than 5MB', variant: 'destructive' });
      return;
    }

    setUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          await updateAvatar(reader.result as string);
          await queryClient.invalidateQueries({ queryKey: ['profile'] });
          if (refreshUser) await refreshUser();
          toast({ title: 'Avatar updated', description: 'Your profile picture has been changed' });
        } catch (err: any) {
          toast({
            title: 'Error',
            description: err?.response?.data?.message || 'Failed to upload avatar',
            variant: 'destructive',
          });
        } finally {
          setUploadingAvatar(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingAvatar(false);
    }
  }

  function resetChildForm() {
    setChildForm({
      firstName: '',
      dateOfBirth: '',
      gender: '',
      grade: '',
      schoolType: '',
      hasCondition: false,
      diagnosisStatus: '',
    });
  }

  function startEditChild(child: Child) {
    setEditingChildId(child.id);
    setChildForm({
      firstName: child.firstName,
      dateOfBirth: child.dateOfBirth?.split('T')[0] || '',
      gender: child.gender || '',
      grade: child.grade || '',
      schoolType: child.schoolType || '',
      hasCondition: child.hasCondition,
      diagnosisStatus: child.diagnosisStatus || '',
    });
    setShowAddChild(false);
  }

  async function handleSaveChild(e: React.FormEvent) {
    e.preventDefault();
    if (!childForm.firstName || !childForm.dateOfBirth) return;
    setSavingChild(true);
    try {
      if (editingChildId) {
        await updateChild(editingChildId, childForm);
        toast({ title: 'Child updated', description: `${childForm.firstName}'s information has been updated` });
        setEditingChildId(null);
      } else {
        await addChild(childForm);
        toast({ title: 'Child added', description: `${childForm.firstName} has been added to your profile` });
        setShowAddChild(false);
      }
      resetChildForm();
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to save child information',
        variant: 'destructive',
      });
    } finally {
      setSavingChild(false);
    }
  }

  async function handleDeleteChild(childId: string, childName: string) {
    if (!confirm(`Remove ${childName} from your profile?`)) return;
    try {
      await deleteChild(childId);
      toast({ title: 'Child removed', description: `${childName} has been removed from your profile` });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to remove child',
        variant: 'destructive',
      });
    }
  }

  const childFormJsx = (
    <form onSubmit={handleSaveChild} className="space-y-3 p-4 bg-gray-50 rounded-xl">
      <h3 className="text-sm font-semibold text-gray-900">
        {editingChildId ? 'Edit Child' : 'Add a Child'}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={childForm.firstName}
            onChange={(e) => setChildForm((f) => ({ ...f, firstName: e.target.value }))}
            required
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
          <input
            type="date"
            value={childForm.dateOfBirth}
            onChange={(e) => setChildForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
            required
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
          <Select value={childForm.gender} onValueChange={(v) => setChildForm((f) => ({ ...f, gender: v }))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Non-binary">Non-binary</SelectItem>
              <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
          <input
            type="text"
            value={childForm.grade}
            onChange={(e) => setChildForm((f) => ({ ...f, grade: e.target.value }))}
            placeholder="e.g., 3rd"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">School Type</label>
          <Select value={childForm.schoolType} onValueChange={(v) => setChildForm((f) => ({ ...f, schoolType: v }))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Public">Public</SelectItem>
              <SelectItem value="Private">Private</SelectItem>
              <SelectItem value="Homeschool">Homeschool</SelectItem>
              <SelectItem value="Special Education">Special Education</SelectItem>
              <SelectItem value="Not in school">Not in school</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis Status</label>
          <Select value={childForm.diagnosisStatus} onValueChange={(v) => setChildForm((f) => ({ ...f, diagnosisStatus: v }))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Diagnosed">Diagnosed</SelectItem>
              <SelectItem value="Suspected">Suspected</SelectItem>
              <SelectItem value="Under evaluation">Under evaluation</SelectItem>
              <SelectItem value="None">None</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={savingChild}
          className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md transition-all disabled:opacity-50"
        >
          {savingChild ? 'Saving...' : editingChildId ? 'Update' : 'Add Child'}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowAddChild(false);
            setEditingChildId(null);
            resetChildForm();
          }}
          className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );

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
            <div className="relative group">
              <Avatar name={displayName} src={user.avatar || undefined} size="xl" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {uploadingAvatar ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium mt-1"
              >
                {uploadingAvatar ? 'Uploading...' : 'Change photo'}
              </button>
            </div>
          </div>
        </Card>

        {/* Form */}
        <Card className="p-6 mb-6">
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

        {/* Children Management (Parents only) */}
        {user.role === 'USER' && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Children</h2>
              {!showAddChild && !editingChildId && (
                <button
                  onClick={() => { setShowAddChild(true); resetChildForm(); }}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Child
                </button>
              )}
            </div>

            {profile?.children && profile.children.length > 0 && (
              <div className="space-y-3 mb-4">
                {profile.children.map((child) => (
                  <div key={child.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <Avatar name={child.firstName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{child.firstName}</p>
                      <p className="text-xs text-gray-500">
                        {calculateAge(child.dateOfBirth)} years old
                        {child.gender && ` · ${child.gender}`}
                        {child.grade && ` · Grade ${child.grade}`}
                      </p>
                      {child.conditions?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {child.conditions.map((c) => (
                            <Badge key={c.id} color="teal">{c.conditionType}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEditChild(child)}
                        className="text-gray-400 hover:text-teal-600 p-1"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteChild(child.id, child.firstName)}
                        className="text-gray-400 hover:text-red-600 p-1"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(showAddChild || editingChildId) && childFormJsx}

            {!showAddChild && !editingChildId && (!profile?.children || profile.children.length === 0) && (
              <div className="text-center py-6">
                <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="text-sm text-gray-500 mb-2">No children added yet</p>
                <button
                  onClick={() => { setShowAddChild(true); resetChildForm(); }}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  Add your first child
                </button>
              </div>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}
