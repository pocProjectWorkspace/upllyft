'use client';

import { useAuth } from '@upllyft/api-client';
import { AppHeader, Skeleton } from '@upllyft/ui';
import { useRouter } from 'next/navigation';
import { ChildFormWizard } from '@/components/child-form-wizard';

export default function AddChildPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  if (isLoading) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader currentApp="main" />
      <ChildFormWizard mode="add" />
    </div>
  );
}
