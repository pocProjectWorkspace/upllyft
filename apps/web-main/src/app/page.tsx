'use client';

import { useAuth, APP_URLS } from '@upllyft/api-client';
import { AppHeader } from '@upllyft/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ParentDashboard } from '@/components/dashboard/parent-dashboard';
import { TherapistDashboard } from '@/components/dashboard/therapist-dashboard';
import { getOnboardingStatus } from '@/lib/api/profiles';

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // OneVoice SSO users land on the community feed rather than the main hub.
  // This redirect fires once onboarding has been checked and the user has
  // ssoSource === 'onevoice'. Runs AFTER the onboarding check so the flow
  // for brand-new OneVoice users is: SSO → onboarding → community feed.
  useEffect(() => {
    if (
      !isLoading &&
      isAuthenticated &&
      user &&
      (user as any).ssoSource === 'onevoice' &&
      onboardingChecked
    ) {
      window.location.href = APP_URLS.community;
    }
  }, [isLoading, isAuthenticated, user, onboardingChecked]);

  // Check onboarding status for parent users
  useEffect(() => {
    if (!isLoading && isAuthenticated && user && user.role === 'USER') {
      getOnboardingStatus()
        .then((status) => {
          if (
            status.onboardingEnabled &&
            !status.onboardingCompleted
          ) {
            router.replace('/onboarding');
            return;
          }
          setOnboardingChecked(true);
        })
        .catch(() => {
          // If the check fails, just show the dashboard
          setOnboardingChecked(true);
        });
    } else if (!isLoading && isAuthenticated) {
      setOnboardingChecked(true);
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !isAuthenticated || !onboardingChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isProfessional = user.role === 'THERAPIST' || user.role === 'EDUCATOR';

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader currentApp="main" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {isProfessional ? (
          <TherapistDashboard user={user} />
        ) : (
          <ParentDashboard user={user} />
        )}
      </main>
    </div>
  );
}
