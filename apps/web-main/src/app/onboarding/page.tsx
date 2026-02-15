'use client';

import { useAuth } from '@upllyft/api-client';
import { AppHeader, Avatar, Card, useToast } from '@upllyft/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { updateProfile, addChild } from '@/lib/api/profiles';
import { useQueryClient } from '@tanstack/react-query';

type Step = 'welcome' | 'profile' | 'child' | 'preferences' | 'complete';

const STEPS: { id: Step; label: string }[] = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'profile', label: 'Your Details' },
  { id: 'child', label: 'Child Info' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'complete', label: 'Done' },
];

const THERAPIST_STEPS: { id: Step; label: string }[] = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'profile', label: 'Your Details' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'complete', label: 'Done' },
];

const CATEGORIES = [
  'Autism Spectrum', 'ADHD', 'Speech & Language', 'Occupational Therapy',
  'Sensory Processing', 'Behavioral Support', 'Inclusive Education',
  'Motor Development', 'Social Skills', 'Assistive Technology',
];

export default function OnboardingPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [saving, setSaving] = useState(false);

  // Profile form
  const [profileData, setProfileData] = useState({
    fullName: '',
    phoneNumber: '',
    city: '',
    state: '',
    country: '',
    relationshipToChild: '',
  });

  // Child form
  const [childData, setChildData] = useState({
    firstName: '',
    dateOfBirth: '',
    gender: '',
    grade: '',
    hasCondition: false,
  });

  // Preferences
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

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

  const isProfessional = user.role === 'THERAPIST' || user.role === 'EDUCATOR';
  const steps = isProfessional ? THERAPIST_STEPS : STEPS;
  const currentIndex = steps.findIndex((s) => s.id === currentStep);
  const displayName = user.name || user.email?.split('@')[0] || 'User';

  function nextStep() {
    const next = steps[currentIndex + 1];
    if (next) setCurrentStep(next.id);
  }

  function prevStep() {
    const prev = steps[currentIndex - 1];
    if (prev) setCurrentStep(prev.id);
  }

  async function handleSaveProfile() {
    setSaving(true);
    try {
      await updateProfile({
        fullName: profileData.fullName || displayName,
        phoneNumber: profileData.phoneNumber,
        city: profileData.city,
        state: profileData.state,
        country: profileData.country,
        relationshipToChild: profileData.relationshipToChild,
      } as any);
      nextStep();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to save profile',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveChild() {
    if (!childData.firstName || !childData.dateOfBirth) {
      nextStep();
      return;
    }
    setSaving(true);
    try {
      await addChild(childData);
      nextStep();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to save child info',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    setSaving(true);
    try {
      await updateProfile({ onboardingCompleted: true } as any);
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({ title: 'Welcome to Upllyft!', description: 'Your profile has been set up' });
      router.push('/');
    } catch {
      router.push('/');
    } finally {
      setSaving(false);
    }
  }

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader currentApp="main" />

      <main className="max-w-xl mx-auto px-4 sm:px-6 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, i) => (
              <div
                key={step.id}
                className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    i <= currentIndex
                      ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {i < currentIndex ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      i < currentIndex ? 'bg-teal-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 text-center">
            Step {currentIndex + 1} of {steps.length}: {steps[currentIndex].label}
          </p>
        </div>

        {/* Welcome */}
        {currentStep === 'welcome' && (
          <Card className="p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome to Upllyft, {displayName}!
            </h1>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              {isProfessional
                ? "Let's set up your professional profile so families can find you."
                : "Let's set up your profile to personalize your experience and connect you with the right resources."}
            </p>
            <button
              onClick={nextStep}
              className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-8 py-3 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md hover:shadow-lg transition-all"
            >
              Get Started
            </button>
          </Card>
        )}

        {/* Profile Details */}
        {currentStep === 'profile' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Your Details</h2>
            <p className="text-sm text-gray-500 mb-5">Tell us a bit about yourself</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={profileData.fullName}
                  onChange={(e) => setProfileData((d) => ({ ...d, fullName: e.target.value }))}
                  placeholder={displayName}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={profileData.phoneNumber}
                  onChange={(e) => setProfileData((d) => ({ ...d, phoneNumber: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={profileData.city}
                    onChange={(e) => setProfileData((d) => ({ ...d, city: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={profileData.state}
                    onChange={(e) => setProfileData((d) => ({ ...d, state: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={profileData.country}
                    onChange={(e) => setProfileData((d) => ({ ...d, country: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  />
                </div>
              </div>
              {!isProfessional && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relationship to Child</label>
                  <select
                    value={profileData.relationshipToChild}
                    onChange={(e) => setProfileData((d) => ({ ...d, relationshipToChild: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  >
                    <option value="">Select...</option>
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Grandparent">Grandparent</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-6">
              <button onClick={prevStep} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">
                Back
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-6 py-2.5 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </Card>
        )}

        {/* Child Info (Parents only) */}
        {currentStep === 'child' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Child Information</h2>
            <p className="text-sm text-gray-500 mb-5">
              Add your child&apos;s details to get personalized recommendations. You can skip this and add later.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Child&apos;s Name</label>
                  <input
                    type="text"
                    value={childData.firstName}
                    onChange={(e) => setChildData((d) => ({ ...d, firstName: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={childData.dateOfBirth}
                    onChange={(e) => setChildData((d) => ({ ...d, dateOfBirth: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    value={childData.gender}
                    onChange={(e) => setChildData((d) => ({ ...d, gender: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  >
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                  <input
                    type="text"
                    value={childData.grade}
                    onChange={(e) => setChildData((d) => ({ ...d, grade: e.target.value }))}
                    placeholder="e.g., 3rd"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-6">
              <button onClick={prevStep} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">
                Back
              </button>
              <div className="flex gap-2">
                <button
                  onClick={nextStep}
                  className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
                >
                  Skip
                </button>
                <button
                  onClick={handleSaveChild}
                  disabled={saving}
                  className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-6 py-2.5 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Continue'}
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* Preferences */}
        {currentStep === 'preferences' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Your Interests</h2>
            <p className="text-sm text-gray-500 mb-5">
              Select topics you&apos;re interested in to personalize your feed
            </p>

            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    selectedCategories.includes(cat)
                      ? 'bg-teal-100 text-teal-700 border border-teal-300'
                      : 'bg-gray-100 text-gray-700 border border-transparent hover:bg-gray-200'
                  }`}
                >
                  {selectedCategories.includes(cat) && (
                    <svg className="w-4 h-4 inline mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex justify-between pt-6">
              <button onClick={prevStep} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">
                Back
              </button>
              <button
                onClick={nextStep}
                className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-6 py-2.5 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md transition-all"
              >
                Continue
              </button>
            </div>
          </Card>
        )}

        {/* Complete */}
        {currentStep === 'complete' && (
          <Card className="p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re All Set!</h1>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Your profile is ready. Explore the community, book sessions, and access learning resources.
            </p>
            <button
              onClick={handleComplete}
              disabled={saving}
              className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-8 py-3 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              {saving ? 'Finishing...' : 'Go to Dashboard'}
            </button>
          </Card>
        )}
      </main>
    </div>
  );
}
