'use client';

import { useQuery } from '@tanstack/react-query';
import { Badge, Card, Skeleton } from '@upllyft/ui';
import { AlertTriangle, Home, School, CheckCircle2, EyeOff } from 'lucide-react';
import * as api from '@/lib/api/nursery';
import type { Concordance, DomainConcordance } from '@/lib/api/nursery';

/**
 * Parent report vs nursery report, side by side.
 *
 * The ordering is the argument. AGREE_CONCERN first, because a difficulty visible at home
 * AND in a group of twenty is the strongest signal available short of a clinician. Then
 * the two disagreements, which are the ones a single informant would have missed
 * entirely. Then agreement that things are fine. Then — last, and explicitly NOT as
 * reassurance — the domains nobody could compare.
 *
 * NOT_COMPARABLE is rendered as silence, never as a green tick. A keyworker who could not
 * observe a domain has told us nothing about it, and letting that read as "the nursery
 * isn't worried" would fabricate a consensus out of a blind spot — which is precisely the
 * failure this whole feature exists to prevent.
 */

const STYLE: Record<
  Concordance,
  { label: string; color: any; icon: any; ring: string; order: number }
> = {
  AGREE_CONCERN: {
    label: 'Both concerned',
    color: 'red',
    icon: AlertTriangle,
    ring: 'border-red-200 bg-red-50/40',
    order: 0,
  },
  EDUCATOR_ONLY: {
    label: 'Only at nursery',
    color: 'yellow',
    icon: School,
    ring: 'border-amber-200 bg-amber-50/40',
    order: 1,
  },
  PARENT_ONLY: {
    label: 'Only at home',
    color: 'yellow',
    icon: Home,
    ring: 'border-amber-200 bg-amber-50/40',
    order: 2,
  },
  AGREE_TYPICAL: {
    label: 'Both on track',
    color: 'green',
    icon: CheckCircle2,
    ring: 'border-gray-100',
    order: 3,
  },
  NOT_COMPARABLE: {
    label: 'Not comparable',
    color: 'gray',
    icon: EyeOff,
    ring: 'border-gray-100 bg-gray-50/60',
    order: 4,
  },
};

export function ConcordanceView({ childId, childName }: { childId: string; childName: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['concordance', childId],
    queryFn: () => api.getConcordance(childId),
    retry: false,
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!data) return null;

  if (!data.available) {
    return (
      <Card className="p-6">
        <h2 className="font-semibold text-gray-900">Home and nursery, side by side</h2>
        <p className="text-sm text-gray-600 mt-2">{data.reason}</p>
        <div className="flex gap-4 mt-4 text-xs">
          <span className={data.haveParent ? 'text-green-700' : 'text-gray-400'}>
            {data.haveParent ? '✓' : '○'} Parent screening
          </span>
          <span className={data.haveEducator ? 'text-green-700' : 'text-gray-400'}>
            {data.haveEducator ? '✓' : '○'} Nursery screening
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          The comparison is the point of doing both. What a child does at home and what they
          do in a group of twenty are often different — and the difference is usually the
          most useful thing anyone learns.
        </p>
      </Card>
    );
  }

  const sorted = [...data.domains].sort(
    (a, b) => STYLE[a.concordance].order - STYLE[b.concordance].order,
  );

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h2 className="font-semibold text-gray-900">Home and nursery, side by side</h2>
        <p className="text-sm text-gray-700 mt-2">{data.summary?.headline}</p>
        <p className="text-xs text-gray-400 mt-3">
          Parent screening {new Date(data.parentScreening!.completedAt).toLocaleDateString()} ·
          Nursery screening {new Date(data.educatorScreening!.completedAt).toLocaleDateString()}
          {data.gapDays !== undefined && ` · ${data.gapDays} days apart`}
        </p>
      </Card>

      <div className="space-y-2">
        {sorted.map(d => (
          <DomainRow key={d.domainId} d={d} childName={childName} />
        ))}
      </div>
    </div>
  );
}

function DomainRow({ d, childName }: { d: DomainConcordance; childName: string }) {
  const st = STYLE[d.concordance];
  const Icon = st.icon;

  return (
    <Card className={`p-4 border ${st.ring}`}>
      <div className="flex items-start gap-3">
        <Icon
          className={`w-5 h-5 shrink-0 mt-0.5 ${
            d.concordance === 'AGREE_CONCERN'
              ? 'text-red-600'
              : d.concordance === 'AGREE_TYPICAL'
                ? 'text-green-600'
                : d.concordance === 'NOT_COMPARABLE'
                  ? 'text-gray-400'
                  : 'text-amber-600'
          }`}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900">{d.domainName}</span>
            <Badge color={st.color}>{st.label}</Badge>
          </div>

          {/* The two views, always both shown — including when one of them is silence. */}
          <div className="flex gap-6 mt-2 text-xs">
            <span className="text-gray-600">
              <Home className="w-3 h-3 inline mr-1" />
              Home:{' '}
              {d.parent ? (
                <StatusText status={d.parent.status} />
              ) : (
                <span className="text-gray-400">not screened</span>
              )}
            </span>
            <span className="text-gray-600">
              <School className="w-3 h-3 inline mr-1" />
              Nursery:{' '}
              {d.educator ? (
                <StatusText status={d.educator.status} />
              ) : (
                <span className="text-gray-400">not screened</span>
              )}
            </span>
          </div>

          {d.interpretation && (
            <p className="text-xs text-gray-600 mt-2 leading-relaxed">{d.interpretation}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function StatusText({ status }: { status: string }) {
  if (status === 'INSUFFICIENT_DATA') {
    // NOT "on track". NOT "no concerns". They could not see it, and that is all we know.
    return <span className="text-gray-500 italic">couldn’t see enough to say</span>;
  }
  if (status === 'GREEN') return <span className="text-green-700">on track</span>;
  if (status === 'YELLOW') return <span className="text-amber-700">some concern</span>;
  return <span className="text-red-700">concern</span>;
}
