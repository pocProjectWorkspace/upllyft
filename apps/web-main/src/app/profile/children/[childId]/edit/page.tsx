'use client';

import { useAuth } from '@upllyft/api-client';
import { AppHeader, Skeleton } from '@upllyft/ui';
import { useRouter, useParams } from 'next/navigation';
import { useMyProfile } from '@/hooks/use-dashboard';
import { ChildFormWizard } from '@/components/child-form-wizard';

export default function EditChildPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const router = useRouter();
  const params = useParams();
  const childId = params.childId as string;

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-20">
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    router.replace('/login');
    return null;
  }

  const child = profile?.children?.find((c) => c.id === childId);

  if (!child) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader currentApp="main" />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <p className="text-gray-500">Child not found</p>
          <a href="/profile/edit" className="text-teal-600 hover:text-teal-700 text-sm font-medium mt-2 inline-block">
            Back to profile
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader currentApp="main" />
      <ChildFormWizard mode="edit" childId={childId} child={child} />
    </div>
  );
}
