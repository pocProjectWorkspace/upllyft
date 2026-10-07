'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient, useAuth } from '@upllyft/api-client';
import { Skeleton } from '@upllyft/ui';

interface Verified {
  invitation: { email: string; organization: { name: string } | null; invitedBy: { name: string | null } | null };
  userExists: boolean;
}

/**
 * Where an organisation invitation email lands (`/accept-invitation?token=…`). Signed-in
 * users go straight to their invitations; others sign in or register with the invited
 * email, then come back to accept.
 */
function AcceptInvitation() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<{ data?: Verified; error?: string }>({});

  useEffect(() => {
    if (!token) {
      setState({ error: 'This invitation link is incomplete.' });
      return;
    }
    apiClient
      .get(`/organizations/invitations/verify/${encodeURIComponent(token)}`)
      .then(({ data }) => setState({ data }))
      .catch((e) => setState({ error: e?.response?.data?.message ?? 'This invitation is no longer valid.' }));
  }, [token]);

  useEffect(() => {
    if (!isLoading && user && state.data) router.replace('/invitations');
  }, [isLoading, user, state.data, router]);

  const next = encodeURIComponent('/invitations');
  const email = state.data?.invitation.email ?? '';

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        {!state.data && !state.error ? (
          <Skeleton className="mx-auto h-24 w-full rounded-xl" />
        ) : state.error ? (
          <>
            <h1 className="text-xl font-semibold text-gray-900">Invitation not available</h1>
            <p className="mt-2 text-sm text-gray-500">{state.error}</p>
            <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-teal-700 hover:underline">
              Go to sign in
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-gray-900">
              Join {state.data!.invitation.organization?.name ?? 'the organization'} on Upllyft
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {state.data!.invitation.invitedBy?.name ? `${state.data!.invitation.invitedBy.name} invited ` : 'You were invited as '}
              <strong>{email}</strong>.{' '}
              {state.data!.userExists ? 'Sign in with this email to accept.' : 'Create your account with this email to accept.'}
            </p>
            <Link
              href={
                state.data!.userExists
                  ? `/login?next=${next}`
                  : `/register?email=${encodeURIComponent(email)}&next=${next}`
              }
              className="mt-6 inline-flex rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white"
            >
              {state.data!.userExists ? 'Sign in to accept' : 'Create account'}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={null}>
      <AcceptInvitation />
    </Suspense>
  );
}
