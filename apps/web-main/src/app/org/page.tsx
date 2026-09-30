'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@upllyft/api-client';
import { getMyOrganizations, type MyOrgMembership } from '@/lib/api/organizations';
import { Loader2, Building2, ArrowRight } from 'lucide-react';
import { SignOutButton } from '@/components/sign-out-button';

/**
 * The "My Organisation" resolver.
 *
 * The profile-menu link points here rather than at a specific slug, because the header
 * is a shared component and doesn't know which org the user belongs to. This page asks
 * (`GET /organizations/my`) and forwards:
 *
 *   one org   → straight into its workspace (/org/<slug>)
 *   several   → a small picker (a nursery/clinic group with more than one account)
 *   none      → an honest empty state, not a dead redirect
 *
 * The org workspace is where a nursery admin reaches their nursery.
 */
export default function OrgResolverPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<MyOrgMembership[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getMyOrganizations()
      .then((list) => {
        const active = list.filter((m) => m.status === 'ACTIVE');
        if (active.length === 1) {
          router.replace(`/org/${active[0].organization.slug}`);
        } else {
          setOrgs(active);
        }
      })
      .catch(() => setError(true));
  }, [router]);

  if (error) {
    return (
      <Centered>
        <div className="text-center">
          <p className="text-sm text-gray-600">
            We couldn’t load your organisation. Please try again in a moment.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm font-medium text-teal-700 hover:text-teal-800">
            Back to dashboard
          </Link>
        </div>
      </Centered>
    );
  }

  // Still resolving, or about to redirect on the single-org path.
  if (orgs === null || orgs.length === 1) {
    return (
      <Centered>
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </Centered>
    );
  }

  if (orgs.length === 0) {
    const isTherapist = user?.role === 'THERAPIST';
    return (
      <Centered>
        <div className="max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-5">
            <Building2 className="w-7 h-7 text-teal-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            You’re not part of an organisation yet
          </h1>
          {isTherapist ? (
            // A self-registered therapist's way in is their own practice, not an invite.
            <p className="text-sm text-gray-600">
              Run your own practice? Set it up and you become its administrator, with a
              clinic dashboard, team, revenue and settings. If a clinic has invited you
              instead, accept the invitation from your email.
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              If your nursery, school or clinic has invited you, accept the invitation from
              your email and you’ll appear here. Otherwise, ask whoever runs your setting to
              add you.
            </p>
          )}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            {isTherapist && (
              <Link
                href="/clinic/setup"
                className="inline-flex items-center px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
              >
                Set up my practice
              </Link>
            )}
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-teal-300 transition-colors"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </Centered>
    );
  }

  // More than one — let them choose.
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Your organisations</h1>
          <SignOutButton variant="compact" />
        </div>
        <p className="text-sm text-gray-600 mt-1.5 mb-6">Choose one to open its workspace.</p>
        <div className="space-y-2">
          {orgs.map((m) => (
            <a
              key={m.organization.id}
              href={`/org/${m.organization.slug}`}
              className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-4 hover:border-teal-300 transition-colors"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold shrink-0"
                style={{ background: m.organization.primaryColor || '#0d9488' }}
              >
                {m.organization.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{m.organization.name}</p>
                <p className="text-xs text-gray-500">
                  {m.role === 'ADMIN' ? 'Administrator' : 'Member'}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-gray-50 flex items-center justify-center px-4">
      {/* /org hides the shared header, so this is the only way out of the error/empty states. */}
      <div className="absolute top-4 right-4">
        <SignOutButton variant="compact" />
      </div>
      {children}
    </div>
  );
}
