'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@upllyft/ui';
import { useAuth } from '@upllyft/api-client';
import { getMyOrganizations, getOrganization, myOrganizationsKey } from '@/lib/api/organizations';
import { ResourceManager } from '@/components/library-resources/resource-manager';

export default function OrgResourcesPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: org, isLoading } = useQuery({
    queryKey: ['org', slug],
    queryFn: () => getOrganization(slug),
  });
  // Same cache entry OrgProtect already filled, so this costs no extra request.
  const { user } = useAuth();
  const { data: memberships } = useQuery({
    queryKey: myOrganizationsKey(user?.id),
    queryFn: getMyOrganizations,
    enabled: !!user,
  });

  // Mirrors the API: org admins and platform admins may publish; members only read.
  // Only platform admins may share a resource beyond this organisation.
  const isPlatformAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  const canUpload =
    isPlatformAdmin ||
    !!memberships?.some(
      (m) => m.organization.slug === slug && m.status === 'ACTIVE' && m.role === 'ADMIN',
    );

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!org) return null;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900">Resources</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        Guides, worksheets and materials for your families.
      </p>
      <ResourceManager
        scope="ORGANIZATION"
        organizationId={org.id}
        organizationName={org.name}
        audienceNote={`Visible to every member of ${org.name} in the Resources app.`}
        canUpload={canUpload}
        canShareWidely={isPlatformAdmin}
      />
    </div>
  );
}
