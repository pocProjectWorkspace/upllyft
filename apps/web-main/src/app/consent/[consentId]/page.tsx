'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@upllyft/api-client';
import { apiClient } from '@upllyft/api-client';
import { AppHeader } from '@upllyft/ui';

export default function ConsentSignPage() {
  const params = useParams();
  const consentId = params.consentId as string;
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }

    const fetchSigningUrl = async () => {
      try {
        const { data } = await apiClient.get(
          `/api/consent/sign/${consentId}`,
        );

        if (data.alreadySigned) {
          setAlreadySigned(true);
          setLoading(false);
          return;
        }

        if (data.signingUrl) {
          window.location.href = data.signingUrl;
          return;
        }

        setError('Unable to retrieve signing URL.');
        setLoading(false);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            'Failed to load consent form. Please try again later.',
        );
        setLoading(false);
      }
    };

    fetchSigningUrl();
  }, [authLoading, isAuthenticated, user, consentId, router]);

  if (authLoading || (loading && !error && !alreadySigned)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading consent form...</p>
        </div>
      </div>
    );
  }

  if (alreadySigned) {
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
            Already Signed
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            You have already signed this consent form. Thank you.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700"
          >
            Back to Dashboard
          </button>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <AppHeader currentApp="main" />
        <main className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">!</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700"
          >
            Back to Dashboard
          </button>
        </main>
      </div>
    );
  }

  return null;
}
