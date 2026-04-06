'use client';

import { useRequireAuth } from '@upllyft/api-client';
import { AppHeader, Skeleton } from '@upllyft/ui';
import { ChildFormWizard } from '@/components/child-form-wizard';

export default function AddChildPage() {
  const { user, isReady } = useRequireAuth();

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-20">
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader currentApp="main" />
      <ChildFormWizard mode="add" />
    </div>
  );
}
