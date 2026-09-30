'use client';

import { useRequireAuth } from '@upllyft/api-client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { getMyOrganizations, myOrganizationsKey } from '@/lib/api/organizations';

import { DashboardSkeleton } from '@/components/skeletons';
interface OrgProtectProps {
  slug: string;
  children: ReactNode;
}

/**
 * Gates the /org/[slug] workspace. Being authenticated is not enough — the user
 * must hold an ACTIVE membership of *this* org. The API enforces the same rule;
 * this only avoids rendering a shell the user has no data for.
 *
 * Shares its query with the "/" redirect for org accounts, so arriving from
 * login reuses the membership list that was just fetched.
 */
export function OrgProtect({ slug, children }: OrgProtectProps) {
  const { user, isReady } = useRequireAuth();
  const router = useRouter();

  const { data: orgs, isError } = useQuery({
    queryKey: myOrganizationsKey(user?.id),
    queryFn: getMyOrganizations,
    enabled: isReady && !!user,
  });

  const isMember = orgs?.some((m) => m.organization.slug === slug && m.status === 'ACTIVE');
  const denied = isError || (orgs !== undefined && !isMember);

  useEffect(() => {
    if (denied) router.replace('/');
  }, [denied, router]);

  if (!isReady || !isMember) {
    return (
      <DashboardSkeleton />
    );
  }

  return <>{children}</>;
}
