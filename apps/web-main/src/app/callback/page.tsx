'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { setAuthToken, setRefreshToken } from '@upllyft/api-client';

function CallbackContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    if (accessToken && refreshToken) {
      setAuthToken(accessToken);
      setRefreshToken(refreshToken);
      // Full page reload so AuthProvider re-initializes with the stored tokens
      window.location.href = '/';
    } else {
      window.location.href = '/login?error=auth_failed';
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600">
      <div className="flex flex-col items-center">
        <svg className="animate-spin h-10 w-10 text-teal-600 mb-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm font-medium">Finalizing your login...</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600">
            <p>Loading...</p>
        </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
