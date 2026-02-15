'use client';

import { useAuth } from '@upllyft/api-client';
import { AppHeader, Card } from '@upllyft/ui';
import { useRouter } from 'next/navigation';

export default function AccountStatusPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  if (authLoading) {
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

  const status = (user as any).status as string | undefined;
  const isSuspended = status === 'SUSPENDED';
  const isDeactivated = status === 'DEACTIVATED';
  const hasIssue = isSuspended || isDeactivated;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader currentApp="main" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Account Status</h1>

        {hasIssue ? (
          <Card className="p-8 text-center">
            {/* Status Icon */}
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
              isSuspended ? 'bg-red-100' : 'bg-yellow-100'
            }`}>
              {isSuspended ? (
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              )}
            </div>

            {/* Status Message */}
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {isSuspended ? 'Account Suspended' : 'Account Deactivated'}
            </h2>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              {isSuspended
                ? 'Your account has been suspended due to a violation of our community guidelines. During this period, you will not be able to post, comment, or interact with other members.'
                : 'Your account has been deactivated. Your profile and content are no longer visible to other members. You can reactivate your account at any time by contacting support.'}
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="mailto:support@upllyft.com"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-6 py-2.5 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact Support
              </a>
              <a
                href="/"
                className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
              </a>
            </div>
          </Card>
        ) : (
          <Card className="p-8 text-center">
            {/* Active Status Icon */}
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h2 className="text-lg font-semibold text-gray-900 mb-2">Account Active</h2>
            <p className="text-sm text-gray-500 mb-6">
              Your account is in good standing. You have full access to all Upllyft features.
            </p>

            <a
              href="/"
              className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </a>
          </Card>
        )}

        {/* Additional Info */}
        {hasIssue && (
          <Card className="p-6 mt-6">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Frequently Asked Questions</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Why was my account affected?</p>
                <p className="text-sm text-gray-500 mt-1">
                  Accounts may be suspended or deactivated for violations of our community guidelines, terms of service, or at the request of the account holder.
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">How can I appeal?</p>
                <p className="text-sm text-gray-500 mt-1">
                  You can contact our support team at{' '}
                  <a href="mailto:support@upllyft.com" className="text-teal-600 hover:text-teal-700">
                    support@upllyft.com
                  </a>{' '}
                  to appeal the decision or request more information.
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">What happens to my data?</p>
                <p className="text-sm text-gray-500 mt-1">
                  Your data is preserved while your account is suspended or deactivated. If your account is reactivated, all your content will be restored.
                </p>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
