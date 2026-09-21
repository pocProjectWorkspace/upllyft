'use client';

import { useAuth, APP_URLS } from '@upllyft/api-client';
import { PageSkeleton } from '@upllyft/ui';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ParentDashboard } from '@/components/dashboard/parent-dashboard';
import { TherapistDashboard } from '@/components/dashboard/therapist-dashboard';
import { getOnboardingStatus } from '@/lib/api/profiles';
import { getMyOrganizations } from '@/lib/api/organizations';

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const isParent = user?.role === 'USER';

  // Onboarding status runs in parallel with the dashboard queries instead of
  // gating them, and is cached so returning to "/" does not refetch it.
  const { data: onboarding, isFetched: onboardingFetched } = useQuery({
    queryKey: ['onboarding', 'status'],
    queryFn: getOnboardingStatus,
    enabled: !isLoading && isAuthenticated && isParent,
    staleTime: 30 * 60 * 1000,
    retry: 0,
  });
  const onboardingChecked = !isParent || onboardingFetched;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Brand-new parents go to onboarding first.
  useEffect(() => {
    if (onboarding?.onboardingEnabled && !onboarding.onboardingCompleted) {
      router.replace('/onboarding');
    }
  }, [onboarding, router]);

  // OneVoice SSO users land on the community feed rather than the main hub.
  // Runs after the onboarding check so the flow for brand-new OneVoice users
  // is: SSO → onboarding → community feed.
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

  // Org admins (role ORGANIZATION) land on their org Hub, not the parent dashboard.
  useEffect(() => {
    if (!isLoading && isAuthenticated && user && user.role === 'ORGANIZATION') {
      getMyOrganizations()
        .then((orgs) => {
          const primary = orgs.find((o) => o.role === 'ADMIN') ?? orgs[0];
          if (primary) router.replace(`/org/${primary.organization.slug}/hub`);
        })
        .catch(() => {
          /* no org membership resolved — fall through to the default dashboard */
        });
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !user) {
    return <PageSkeleton />;
  }

  const isProfessional = user.role === 'THERAPIST' || user.role === 'EDUCATOR';

  return (
    <div className="min-h-screen bg-gray-50/50">
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
