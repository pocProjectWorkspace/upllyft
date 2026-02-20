'use client';

import { useAuth } from '@upllyft/api-client';
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
    } else if (!isLoading) {
      setOnboardingChecked(true);
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !onboardingChecked) {
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
