'use client';

import { useAuth } from '@upllyft/api-client';
import { AppHeader } from '@upllyft/ui';
import { useRouter } from 'next/navigation';
import { ParentDashboard } from '@/components/dashboard/parent-dashboard';
import { TherapistDashboard } from '@/components/dashboard/therapist-dashboard';

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  if (isLoading) {
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
