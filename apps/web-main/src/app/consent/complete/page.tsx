'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@upllyft/api-client';
import { AppHeader } from '@upllyft/ui';

export default function ConsentCompletePage() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();

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
      <main className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Thank You
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Your consent form has been signed successfully.
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700"
        >
          Return to Dashboard
        </button>
      </main>
    </div>
  );
}
