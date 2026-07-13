'use client';

import { useRequireAuth } from '@upllyft/api-client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { getMyOrganizations } from '@/lib/api/organizations';

interface OrgProtectProps {
  slug: string;
  children: ReactNode;
}

type Membership = 'checking' | 'member' | 'denied';

/**
 * Gates the /org/[slug] workspace. Being authenticated is not enough — the user
 * must hold an ACTIVE membership of *this* org. The API enforces the same rule;
 * this only avoids rendering a shell the user has no data for.
 */
export function OrgProtect({ slug, children }: OrgProtectProps) {
  const { user, isReady } = useRequireAuth();
  const router = useRouter();
  const [membership, setMembership] = useState<Membership>('checking');

  useEffect(() => {
    if (!isReady || !user) return;

    let cancelled = false;

    getMyOrganizations()
      .then((orgs) => {
        if (cancelled) return;
        const isMember = orgs.some(
          (m) => m.organization.slug === slug && m.status === 'ACTIVE',
        );
        setMembership(isMember ? 'member' : 'denied');
      })
      .catch(() => {
        if (!cancelled) setMembership('denied');
      });

    return () => {
      cancelled = true;
    };
  }, [isReady, user, slug]);

  useEffect(() => {
    if (membership === 'denied') router.replace('/');
  }, [membership, router]);

  if (!isReady || membership !== 'member') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
