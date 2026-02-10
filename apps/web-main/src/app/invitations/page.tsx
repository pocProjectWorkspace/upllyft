'use client';

import { useAuth } from '@upllyft/api-client';
import { AppHeader } from '@upllyft/ui';
import { useRouter } from 'next/navigation';

export default function InvitationsPage() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    router.replace('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader currentApp="main" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitations</h1>
          <p className="text-gray-500">
            View and manage organization invitations and collaboration requests. Coming soon.
          </p>
        </div>
      </main>
    </div>
  );
}
