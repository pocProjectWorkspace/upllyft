'use client';

import { Suspense, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@upllyft/ui';
import { ResourcesShell } from '@/resources/components/resources-shell';
import { journeyApi } from '@/resources/journey/api';
import { journeyKeys } from '@/resources/journey/hooks';
import { ProgressView } from '@/resources/journey/progress-view';

/**
 * Therapists: progress families have chosen to share. Read-only and live until the
 * parent stops sharing — a revoked share simply disappears from this list.
 */
function SharedWithMe() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const list = useQuery({ queryKey: journeyKeys.sharedWithMe(), queryFn: journeyApi.sharedWithMe });
  const shareId = params.get('share') ?? list.data?.shares[0]?.id ?? '';
  const [domain, setDomain] = useState<string | null>(null);
  const progress = useQuery({
    queryKey: journeyKeys.sharedProgress(shareId, domain ?? undefined),
    queryFn: () => journeyApi.sharedProgress(shareId, domain ?? undefined),
    enabled: !!shareId,
    retry: false,
  });

  const shares = list.data?.shares ?? [];
  const selected = shares.find((s) => s.id === shareId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shared with me</h1>
        <p className="mt-1 text-sm text-gray-500">Home progress that families have chosen to share with you. They can stop sharing at any time.</p>
      </div>

      {list.isLoading ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : shares.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
          <p className="font-semibold text-gray-900">Nothing shared yet</p>
          <p className="mt-1 text-sm text-gray-500">When a family shares their child’s progress with you, it appears here.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <ul className="space-y-2">
            {shares.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => router.replace(`${pathname}?share=${s.id}`, { scroll: false })}
                  className={`w-full rounded-xl border p-3 text-left ${s.id === shareId ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-white hover:border-teal-300'}`}
                >
                  <p className="text-sm font-semibold text-gray-900">
                    {s.child.firstName}
                    {s.child.age != null && <span className="font-normal text-gray-500"> · {s.child.age}y</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    From {s.parent.name ?? 'a parent'} · {s.periodDays ? `last ${s.periodDays} days` : 'everything'}
                    {s.includeNotes ? ' · with notes' : ''}
                  </p>
                </button>
              </li>
            ))}
          </ul>
          <div>
            {progress.isLoading || !progress.data ? (
              progress.isError ? (
                <p className="text-sm text-gray-500">This share is no longer available.</p>
              ) : (
                <Skeleton className="h-64 rounded-2xl" />
              )
            ) : (
              <ProgressView
                data={progress.data}
                childName={selected?.child.firstName ?? progress.data.child.firstName}
                readOnly
                domainFilter={domain}
                onDomainFilter={setDomain}
                banner={
                  <p className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    Shared by {progress.data.share?.parentName ?? 'the family'} ·{' '}
                    {progress.data.share?.periodDays ? `last ${progress.data.share.periodDays} days` : 'everything logged'}
                    {progress.data.share?.includeNotes ? ' · notes included' : ' · notes not shared'}
                  </p>
                }
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SharedWithMePage() {
  return (
    <ResourcesShell>
      <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
        <SharedWithMe />
      </Suspense>
    </ResourcesShell>
  );
}
