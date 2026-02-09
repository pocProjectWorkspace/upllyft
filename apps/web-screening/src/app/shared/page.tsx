'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Badge,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@upllyft/ui';
import { ScreeningShell } from '@/components/screening-shell';
import { useSharedAssessments } from '@/hooks/use-assessments';
import { formatDate, calculateZone } from '@/lib/utils';
import type { AssessmentShare, AccessLevel } from '@/lib/api/assessments';

// ── Status badge config ──

const statusConfig: Record<
  string,
  { label: string; color: 'blue' | 'yellow' | 'green' | 'gray' }
> = {
  IN_PROGRESS: { label: 'In Progress', color: 'blue' },
  TIER1_COMPLETE: { label: 'In Progress', color: 'blue' },
  TIER2_REQUIRED: { label: 'Tier 2 Required', color: 'yellow' },
  COMPLETED: { label: 'Completed', color: 'green' },
  EXPIRED: { label: 'Expired', color: 'gray' },
};

const zoneConfig: Record<string, { label: string; color: 'green' | 'yellow' | 'red' }> = {
  green: { label: 'Green Zone', color: 'green' },
  yellow: { label: 'Yellow Zone', color: 'yellow' },
  red: { label: 'Red Zone', color: 'red' },
};

// ── Inline SVG Icons ──

function UsersIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}

function ChartIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}

function EyeIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function PencilIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function InboxIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  );
}

function CalendarIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function UserIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

// ── Shared Assessment Card ──

function SharedAssessmentCard({ share }: { share: AssessmentShare }) {
  const router = useRouter();
  const assessment = share.assessment;
  if (!assessment) return null;

  const child = assessment.child;
  const status = statusConfig[assessment.status] || statusConfig.IN_PROGRESS;
  const isCompleted = assessment.status === 'COMPLETED';

  // Calculate zone from overall score
  const zone =
    isCompleted && assessment.overallScore != null
      ? calculateZone(1 - assessment.overallScore / 100) // Convert score to risk index
      : null;

  const zoneInfo = zone ? zoneConfig[zone] : null;

  return (
    <Card hover className="p-5">
      {/* Child and parent info */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{child.firstName}</h3>
          <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
            <UserIcon className="w-3.5 h-3.5" />
            <span>Shared by {share.parent?.name || 'Parent'}</span>
          </div>
        </div>
        <Badge color={status.color}>{status.label}</Badge>
      </div>

      {/* Share date */}
      <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-3">
        <CalendarIcon className="w-3.5 h-3.5" />
        <span>Shared {formatDate(share.sharedAt)}</span>
      </div>

      {/* Score and zone */}
      {isCompleted && assessment.overallScore != null && (
        <div className="bg-gray-50 rounded-xl p-3 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Overall Score</span>
            <span className="text-lg font-bold text-teal-600">
              {Math.round(assessment.overallScore)}%
            </span>
          </div>
          {zoneInfo && (
            <div className="mt-2">
              <Badge color={zoneInfo.color}>{zoneInfo.label}</Badge>
            </div>
          )}
        </div>
      )}

      {/* Access level */}
      <div className="flex items-center gap-2 mb-4">
        <Badge color={share.accessLevel === 'ANNOTATE' ? 'purple' : 'gray'}>
          {share.accessLevel === 'ANNOTATE' ? (
            <span className="flex items-center gap-1">
              <PencilIcon className="w-3 h-3" />
              Can Annotate
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <EyeIcon className="w-3 h-3" />
              View Only
            </span>
          )}
        </Badge>
      </div>

      {/* Action button */}
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        disabled={!isCompleted}
        onClick={() => router.push(`/${assessment.id}/report`)}
      >
        <ChartIcon className="w-4 h-4 mr-2" />
        {isCompleted ? 'View Report' : 'Report Pending'}
      </Button>
    </Card>
  );
}

// ── Loading Skeletons ──

function LoadingSkeletons() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <Skeleton className="h-5 w-28 mb-2" />
              <Skeleton className="h-4 w-36" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-32 mb-3" />
          <Skeleton className="h-16 w-full rounded-xl mb-3" />
          <Skeleton className="h-5 w-24 rounded-full mb-4" />
          <Skeleton className="h-9 w-full rounded-xl" />
        </Card>
      ))}
    </div>
  );
}

// ── Empty State ──

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-4">
        <InboxIcon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No shared assessments</h3>
      <p className="text-gray-500 max-w-sm mx-auto">{message}</p>
    </Card>
  );
}

// ── Main Page ──

export default function SharedAssessmentsPage() {
  const { data: shares, isLoading } = useSharedAssessments();
  const [activeTab, setActiveTab] = useState('all');

  // Filter by access level
  const filtered = useMemo(() => {
    if (!shares) return [];
    if (activeTab === 'all') return shares;
    const level = activeTab.toUpperCase() as AccessLevel;
    return shares.filter((s) => s.accessLevel === level);
  }, [shares, activeTab]);

  // Count badges
  const counts = useMemo(() => {
    if (!shares) return { all: 0, view: 0, annotate: 0 };
    return {
      all: shares.length,
      view: shares.filter((s) => s.accessLevel === 'VIEW').length,
      annotate: shares.filter((s) => s.accessLevel === 'ANNOTATE').length,
    };
  }, [shares]);

  return (
    <ScreeningShell>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
            <UsersIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Shared Assessments</h1>
        </div>
        <p className="text-gray-500 mt-1 ml-[52px]">
          Review developmental screenings shared with you by parents.
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">
            All
            {counts.all > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-600">
                {counts.all}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="view">
            View Only
            {counts.view > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-600">
                {counts.view}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="annotate">
            Can Annotate
            {counts.annotate > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-600">
                {counts.annotate}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {isLoading ? (
            <LoadingSkeletons />
          ) : filtered.length === 0 ? (
            <EmptyState message="No assessments have been shared with you yet. When a parent shares a screening, it will appear here." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((share) => (
                <SharedAssessmentCard key={share.id} share={share} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="view">
          {isLoading ? (
            <LoadingSkeletons />
          ) : filtered.length === 0 ? (
            <EmptyState message="No view-only assessments shared with you. These are assessments where you can review the report but not add annotations." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((share) => (
                <SharedAssessmentCard key={share.id} share={share} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="annotate">
          {isLoading ? (
            <LoadingSkeletons />
          ) : filtered.length === 0 ? (
            <EmptyState message="No annotatable assessments shared with you. These are assessments where you can add clinical notes and annotations." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((share) => (
                <SharedAssessmentCard key={share.id} share={share} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </ScreeningShell>
  );
}
