'use client';

import { useAuth } from '@upllyft/api-client';
import { AppHeader } from '@upllyft/ui';
import { useRouter } from 'next/navigation';

export default function BookmarksPage() {
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Bookmarks</h1>
          <p className="text-gray-500">
            Save posts, resources, and therapist profiles for quick access. Coming soon.
          </p>
        </div>
      </main>
    </div>
  );
}
