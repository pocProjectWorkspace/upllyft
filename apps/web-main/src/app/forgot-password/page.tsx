'use client';

import { apiClient } from '@upllyft/api-client';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await apiClient.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h1>
          <p className="text-gray-500 mb-6">
            We&apos;ve sent a password reset link to <strong className="text-gray-700">{email}</strong>
          </p>
          <a
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="Upllyft" className="h-12 w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Forgot Password</h1>
          <p className="text-gray-500 mt-1">Enter your email and we&apos;ll send you a reset link</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 border border-red-100">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Remember your password?{' '}
            <a href="/login" className="text-teal-600 hover:text-teal-700 font-medium">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
