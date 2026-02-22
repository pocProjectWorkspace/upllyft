'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@upllyft/api-client';
import {
  Button,
  Card,
  Badge,
  Avatar,
  Skeleton,
  Label,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  RadioGroup,
  RadioGroupItem,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@upllyft/ui';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { ScreeningShell } from '@/components/screening-shell';
import {
  useUserChildren,
  useChildAssessments,
  useCreateAssessment,
  useDeleteAssessment,
  useShareAssessment,
  useSearchTherapists,
  useScreeningHistory,
} from '@/hooks/use-assessments';
import {
  formatAge,
  getAgeGroup,
  formatAgeGroup,
  formatDate,
  calculateZone,
  zoneColors,
} from '@/lib/utils';
import type { Assessment, Child, AccessLevel, DomainScore, ScreeningHistoryResponse } from '@/lib/api/assessments';

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

// ── Inline SVG Icons ──

function PlusIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function ClipboardIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  );
}

function DotsVerticalIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
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

function ShareIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
      />
    </svg>
  );
}

function TrashIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function DocumentIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function ClockIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function SearchIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function WarningIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
      />
    </svg>
  );
}

function ArrowRightIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

// ── Progress Ring SVG ──

const RING_RADIUS = 40;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const OVERVIEW_DOMAINS = [
  { key: 'grossMotor', label: 'Motor', color: '#0d9488' },
  { key: 'speechLanguage', label: 'Language', color: '#7c3aed' },
  { key: 'socialEmotional', label: 'Social', color: '#2563eb' },
  { key: 'cognitiveLearning', label: 'Cognitive', color: '#d97706' },
  { key: 'adaptiveSelfCare', label: 'Adaptive', color: '#059669' },
];

function ProgressRing({
  percentage,
  color,
  label,
  zone,
}: {
  percentage: number;
  color: string;
  label: string;
  zone: 'green' | 'yellow' | 'red';
}) {
  const offset = RING_CIRCUMFERENCE * (1 - percentage / 100);
  const zoneBadge = {
    green: { label: 'On Track', bg: 'bg-green-100', text: 'text-green-700' },
    yellow: { label: 'Monitor', bg: 'bg-yellow-100', text: 'text-yellow-700' },
    red: { label: 'Concern', bg: 'bg-red-100', text: 'text-red-700' },
  }[zone];

  return (
    <div className="flex flex-col items-center gap-2">
      <svg className="progress-ring w-24 h-24" viewBox="0 0 96 96">
        <circle className="progress-ring__circle-bg" cx="48" cy="48" r={RING_RADIUS} />
        <circle
          className="progress-ring__circle"
          cx="48"
          cy="48"
          r={RING_RADIUS}
          stroke={color}
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
        <text
          x="48"
          y="48"
          textAnchor="middle"
          dominantBaseline="central"
          className="text-xl font-bold"
          fill="#111827"
          style={{ transform: 'rotate(90deg)', transformOrigin: '48px 48px' }}
        >
          {Math.round(percentage)}%
        </text>
      </svg>
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span className={`text-xs px-2 py-0.5 rounded-full ${zoneBadge.bg} ${zoneBadge.text}`}>
        {zoneBadge.label}
      </span>
    </div>
  );
}

function LightbulbIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

// ── Helper: get latest completed assessment scores ──

function getLatestScores(
  childAssessments: Assessment[] | undefined,
): { childName: string; scores: Record<string, DomainScore> } | null {
  if (!childAssessments) return null;
  const completed = childAssessments
    .filter((a) => a.status === 'COMPLETED' && a.domainScores)
    .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime());
  if (completed.length === 0) return null;
  return {
    childName: completed[0].child.firstName,
    scores: completed[0].domainScores!,
  };
}

// ── Assessment Card ──

function AssessmentCard({
  assessment,
  onShare,
  onDelete,
}: {
  assessment: Assessment;
  onShare: (assessment: Assessment) => void;
  onDelete: (assessment: Assessment) => void;
}) {
  const router = useRouter();
  const child = assessment.child;
  const status = statusConfig[assessment.status] || statusConfig.IN_PROGRESS;
  const isCompleted = assessment.status === 'COMPLETED';
  const isInProgress = assessment.status === 'IN_PROGRESS' || assessment.status === 'TIER1_COMPLETE';
  const isTier2Required = assessment.status === 'TIER2_REQUIRED';

  return (
    <Card hover className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={child.firstName} size="md" />
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{child.firstName}</h3>
            <p className="text-sm text-gray-500">{formatAge(child.dateOfBirth)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge color={status.color}>{status.label}</Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <DotsVerticalIcon className="w-4 h-4 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isCompleted && (
                <DropdownMenuItem onClick={() => router.push(`/${assessment.id}/report`)}>
                  <DocumentIcon className="w-4 h-4 mr-2" />
                  View Report
                </DropdownMenuItem>
              )}
              {isCompleted && (
                <DropdownMenuItem onClick={() => onShare(assessment)}>
                  <ShareIcon className="w-4 h-4 mr-2" />
                  Share
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onDelete(assessment)}
                className="text-red-600 focus:text-red-600"
              >
                <TrashIcon className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
        <ClipboardIcon className="w-4 h-4 text-gray-400" />
        <span>{formatAgeGroup(assessment.ageGroup)}</span>
      </div>

      {isCompleted && assessment.overallScore != null && (
        <div className="mt-3 bg-gray-50 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Overall Score</span>
            <span className="text-lg font-bold text-teal-600">
              {Math.round(assessment.overallScore)}%
            </span>
          </div>
          {assessment.completedAt && (
            <p className="text-xs text-gray-400 mt-1">
              Completed {formatDate(assessment.completedAt)}
            </p>
          )}
        </div>
      )}

      <div className="mt-4">
        {isCompleted && (
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => router.push(`/${assessment.id}/report`)}
          >
            <ChartIcon className="w-4 h-4 mr-2" />
            View Report
          </Button>
        )}
        {(isInProgress || isTier2Required) && (
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={() =>
              router.push(
                `/${assessment.id}/questionnaire?tier=${isTier2Required ? '2' : '1'}`,
              )
            }
          >
            Continue Screening
            <ArrowRightIcon className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </Card>
  );
}

// ── Child Section ──

function ChildSection({
  child,
  onShare,
  onDelete,
}: {
  child: Child;
  onShare: (assessment: Assessment) => void;
  onDelete: (assessment: Assessment) => void;
}) {
  const { data: assessments, isLoading } = useChildAssessments(child.id);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Avatar name={child.firstName} size="lg" />
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{child.firstName}</h2>
          <p className="text-sm text-gray-500">{formatAge(child.dateOfBirth)}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-3 w-32 mt-4" />
              <Skeleton className="h-10 w-full mt-4 rounded-xl" />
            </Card>
          ))}
        </div>
      ) : !assessments || assessments.length === 0 ? (
        <Card className="p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <ClipboardIcon className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">No screenings yet for {child.firstName} — and that&apos;s okay!</p>
          <p className="text-xs text-gray-400 mt-1">
            Start a screening to see how they&apos;re doing. It only takes about 15 minutes.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assessments.map((assessment) => (
            <AssessmentCard
              key={assessment.id}
              assessment={assessment}
              onShare={onShare}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Progress Overview Component ──

function ProgressOverview({ childrenList }: { childrenList: Child[] | undefined }) {
  // For each child, fetch their assessments and find the latest completed one
  const firstChild = childrenList?.[0];
  const { data: assessments } = useChildAssessments(firstChild?.id || '');

  if (!firstChild || !assessments) return null;

  const completed = assessments
    .filter((a) => a.status === 'COMPLETED' && a.domainScores)
    .sort(
      (a, b) =>
        new Date(b.completedAt || b.createdAt).getTime() -
        new Date(a.completedAt || a.createdAt).getTime(),
    );

  if (completed.length === 0) return null;

  const latest = completed[0];
  const scores = latest.domainScores!;

  return (
    <Card className="p-6 rounded-2xl border border-gray-200 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">How They&apos;re Doing</h2>
          <p className="text-sm text-gray-600">{latest.child.firstName}&apos;s latest screening results</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        {OVERVIEW_DOMAINS.map((domain) => {
          const score = scores[domain.key];
          if (!score) return null;
          // Convert risk index to progress (inverted: low risk = high progress)
          const progressPct = Math.round((1 - score.riskIndex) * 100);
          const zone = calculateZone(score.riskIndex);
          return (
            <ProgressRing
              key={domain.key}
              percentage={progressPct}
              color={domain.color}
              label={domain.label}
              zone={zone}
            />
          );
        })}
      </div>
    </Card>
  );
}

// ── Domain chart colors (matching OVERVIEW_DOMAINS) ──

const DOMAIN_CHART_COLORS: Record<string, string> = {
  grossMotor: '#0d9488',
  fineMotor: '#06b6d4',
  speechLanguage: '#7c3aed',
  socialEmotional: '#2563eb',
  cognitiveLearning: '#d97706',
  adaptiveSelfCare: '#059669',
  sensoryProcessing: '#ec4899',
  visionHearing: '#6366f1',
};

// ── Custom Tooltip for chart ──

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 text-sm">
      <p className="font-semibold text-gray-900 mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-medium text-gray-900">{entry.value}%</span>
        </div>
      ))}
    </div>
  );
}

// ── Progress History (Longitudinal Chart) ──

function ProgressHistory({ childId }: { childId: string }) {
  const { data: history, isLoading } = useScreeningHistory(childId);

  if (isLoading || !history) return null;

  const { results, childName } = history;

  // Need at least 1 completed screening to show anything
  if (results.length === 0) return null;

  // If only 1 screening, show a prompt
  if (results.length === 1) {
    return (
      <Card className="p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
            <ChartIcon className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Progress Over Time</h2>
            <p className="text-sm text-gray-500">{childName}&apos;s developmental trend</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <ChartIcon className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-900">
            Complete another screening to see progress over time
          </p>
          <p className="text-xs text-gray-500 mt-1 max-w-sm">
            We&apos;ll show {childName}&apos;s developmental trend once there are at least two completed screenings.
          </p>
        </div>
      </Card>
    );
  }

  // Build chart data: each data point = one screening date
  const allDomainIds = new Set<string>();
  results.forEach((r) => r.domains.forEach((d) => allDomainIds.add(d.domainId)));

  const chartData = results.map((r) => {
    const date = new Date(r.completedAt);
    const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    const point: Record<string, any> = { date: label, totalScore: Math.round(r.totalScore) };
    r.domains.forEach((d) => {
      point[d.domainId] = d.score;
    });
    return point;
  });

  // Build domain name map
  const domainNameMap: Record<string, string> = {};
  results[0]?.domains.forEach((d) => {
    domainNameMap[d.domainId] = d.name;
  });

  // Score delta
  const firstTotal = Math.round(results[0].totalScore);
  const latestTotal = Math.round(results[results.length - 1].totalScore);
  const delta = latestTotal - firstTotal;
  const firstDate = new Date(results[0].completedAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  let deltaText: string;
  if (delta > 0) {
    deltaText = `improved by ${delta} points`;
  } else if (delta < 0) {
    deltaText = `declined by ${Math.abs(delta)} points`;
  } else {
    deltaText = 'stayed the same';
  }

  // Domain breakdown table
  const domainChanges = Array.from(allDomainIds).map((domainId) => {
    const firstResult = results[0].domains.find((d) => d.domainId === domainId);
    const latestResult = results[results.length - 1].domains.find((d) => d.domainId === domainId);
    const firstScore = firstResult?.score ?? 0;
    const latestScore = latestResult?.score ?? 0;
    const change = latestScore - firstScore;
    return {
      domainId,
      name: domainNameMap[domainId] || domainId,
      firstScore,
      latestScore,
      change,
    };
  });

  return (
    <Card className="p-6 mb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
          <ChartIcon className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Progress Over Time</h2>
          <p className="text-sm text-gray-500">{childName}&apos;s developmental trend across {results.length} screenings</p>
        </div>
      </div>

      {/* Line Chart */}
      <div className="h-72 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <RechartsTooltip content={<ChartTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
              iconType="circle"
              iconSize={8}
            />
            {/* Total Score line — bolder and dashed */}
            <Line
              type="monotone"
              dataKey="totalScore"
              name="Total Score"
              stroke="#111827"
              strokeWidth={3}
              strokeDasharray="6 3"
              dot={{ r: 4, fill: '#111827' }}
              activeDot={{ r: 6 }}
            />
            {/* Domain lines */}
            {Array.from(allDomainIds).map((domainId) => (
              <Line
                key={domainId}
                type="monotone"
                dataKey={domainId}
                name={domainNameMap[domainId] || domainId}
                stroke={DOMAIN_CHART_COLORS[domainId] || '#9ca3af'}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Score Delta Callout */}
      <div className={`rounded-xl p-3 mb-6 ${
        delta > 0 ? 'bg-green-50 border border-green-200' :
        delta < 0 ? 'bg-red-50 border border-red-200' :
        'bg-gray-50 border border-gray-200'
      }`}>
        <p className={`text-sm font-medium ${
          delta > 0 ? 'text-green-700' :
          delta < 0 ? 'text-red-700' :
          'text-gray-700'
        }`}>
          Since {firstDate}, {childName}&apos;s total score has {deltaText}.
        </p>
      </div>

      {/* Domain Breakdown Table */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Domain Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-medium text-gray-500">Domain</th>
                <th className="text-right py-2 px-4 font-medium text-gray-500">First</th>
                <th className="text-right py-2 px-4 font-medium text-gray-500">Latest</th>
                <th className="text-right py-2 pl-4 font-medium text-gray-500">Change</th>
              </tr>
            </thead>
            <tbody>
              {domainChanges.map((d) => (
                <tr key={d.domainId} className="border-b border-gray-50">
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: DOMAIN_CHART_COLORS[d.domainId] || '#9ca3af' }}
                      />
                      <span className="font-medium text-gray-900">{d.name}</span>
                    </div>
                  </td>
                  <td className="text-right py-2.5 px-4 text-gray-600">{d.firstScore}%</td>
                  <td className="text-right py-2.5 px-4 text-gray-600">{d.latestScore}%</td>
                  <td className="text-right py-2.5 pl-4">
                    <span className={`font-medium ${
                      d.change > 0 ? 'text-green-600' :
                      d.change < 0 ? 'text-red-600' :
                      'text-gray-500'
                    }`}>
                      {d.change > 0 ? '↑' : d.change < 0 ? '↓' : '–'} {Math.abs(d.change)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

// ── Main Page ──

export default function ScreeningLibraryPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Redirect therapists to the shared page
  useEffect(() => {
    if (user?.role === 'THERAPIST') {
      router.replace('/shared');
    }
  }, [user?.role, router]);

  const { data: children, isLoading: childrenLoading } = useUserChildren();

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);

  // Create assessment state
  const [selectedChildId, setSelectedChildId] = useState('');
  const selectedChild = children?.find((c) => c.id === selectedChildId);
  const ageGroup = selectedChild ? getAgeGroup(selectedChild.dateOfBirth) : null;
  const isOutOfRange = selectedChild && !ageGroup;

  const createMutation = useCreateAssessment();
  const deleteMutation = useDeleteAssessment();

  // Share state
  const [therapistSearch, setTherapistSearch] = useState('');
  const [selectedTherapistId, setSelectedTherapistId] = useState('');
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('VIEW');
  const [shareMessage, setShareMessage] = useState('');
  const { data: therapists } = useSearchTherapists(therapistSearch || undefined);
  const shareMutation = useShareAssessment();

  function handleOpenCreate() {
    setSelectedChildId('');
    setCreateOpen(true);
  }

  function handleStartScreening() {
    if (!selectedChildId || !ageGroup) return;
    createMutation.mutate(
      { childId: selectedChildId, ageGroup },
      {
        onSuccess: (assessment) => {
          setCreateOpen(false);
          router.push(`/${assessment.id}/questionnaire?tier=1`);
        },
      },
    );
  }

  function handleOpenShare(assessment: Assessment) {
    setSelectedAssessment(assessment);
    setTherapistSearch('');
    setSelectedTherapistId('');
    setAccessLevel('VIEW');
    setShareMessage('');
    setShareOpen(true);
  }

  function handleShare() {
    if (!selectedAssessment || !selectedTherapistId) return;
    shareMutation.mutate(
      {
        id: selectedAssessment.id,
        data: {
          therapistId: selectedTherapistId,
          accessLevel,
          message: shareMessage || undefined,
        },
      },
      {
        onSuccess: () => {
          setShareOpen(false);
          setSelectedAssessment(null);
        },
      },
    );
  }

  function handleOpenDelete(assessment: Assessment) {
    setSelectedAssessment(assessment);
    setDeleteOpen(true);
  }

  function handleDelete() {
    if (!selectedAssessment) return;
    deleteMutation.mutate(selectedAssessment.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        setSelectedAssessment(null);
      },
    });
  }

  if (user?.role === 'THERAPIST') {
    return null;
  }

  return (
    <ScreeningShell>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
              <ClipboardIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Milestone Map</h1>
          </div>
          <p className="text-gray-500 mt-1 ml-[52px]">
            See how your child is growing with simple, guided screenings.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="shrink-0">
          <PlusIcon className="w-4 h-4 mr-2" />
          Screen Your Child
        </Button>
      </div>

      {/* ── Progress Overview ── */}
      <ProgressOverview childrenList={children} />

      {/* ── Longitudinal Progress Chart ── */}
      {children && children.length > 0 && (
        <ProgressHistory childId={children[0].id} />
      )}

      {/* ── AI Insights Card + Next Steps ── */}
      {children && children.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* AI Insights Card */}
          <Card className="p-6 bg-gradient-to-br from-gray-800 to-gray-900 text-white border-0 rounded-2xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <LightbulbIcon className="w-6 h-6 text-teal-300" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-teal-300 text-sm font-semibold uppercase tracking-wider mb-1">
                  AI Insights
                </h3>
                <p className="text-white font-semibold mb-2">
                  Insights About Your Child
                </p>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                  Get personalized insights, helpful recommendations, and developmental observations based on your child&apos;s screening results.
                </p>
                <a href="/insights">
                  <Button
                    size="sm"
                    className="bg-teal-500 hover:bg-teal-400 text-white border-0 rounded-xl"
                  >
                    View Detailed Analysis
                    <ArrowRightIcon className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </div>
            </div>
          </Card>

          {/* Next Steps Card */}
          <Card className="p-6 rounded-2xl">
            <h3 className="font-semibold text-gray-900 mb-4">Next Steps</h3>
            <div className="space-y-4">
              {[
                { num: 1, color: 'bg-yellow-400', title: 'Review Your Results', detail: 'See how your child is doing across different areas' },
                { num: 2, color: 'bg-teal-500', title: 'Share with a Professional', detail: 'We\u2019ll help you find the right specialist to review the results' },
                { num: 3, color: 'bg-teal-500', title: 'Explore AI Insights', detail: 'Get personalized tips and guidance for your child' },
                { num: 4, color: 'bg-teal-500', title: 'Plan a Check-in', detail: 'Schedule another screening in a few months to track progress' },
              ].map((step) => (
                <div key={step.num} className="flex items-start gap-3">
                  <span className={`w-7 h-7 rounded-full ${step.color} text-white text-sm font-bold flex items-center justify-center shrink-0`}>
                    {step.num}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{step.title}</p>
                    <p className="text-xs text-gray-500">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Children sections */}
      {childrenLoading ? (
        <div className="space-y-10">
          {[1, 2].map((i) => (
            <div key={i}>
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div>
                  <Skeleton className="h-5 w-28 mb-2" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((j) => (
                  <Card key={j} className="p-5">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-3 w-32 mt-4" />
                    <Skeleton className="h-10 w-full mt-4 rounded-xl" />
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : !children || children.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center mx-auto mb-4">
            <ClipboardIcon className="w-8 h-8 text-teal-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Add your child to get started</h2>
          <p className="text-gray-500 max-w-sm mx-auto">
            Add a child profile from your main dashboard to start with personalized screenings.
          </p>
        </Card>
      ) : (
        <div className="space-y-10">
          {children.map((child) => (
            <ChildSection
              key={child.id}
              child={child}
              onShare={handleOpenShare}
              onDelete={handleOpenDelete}
            />
          ))}
        </div>
      )}

      {/* ── Create Assessment Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Screen Your Child</DialogTitle>
            <DialogDescription>
              Choose a child to begin — it&apos;s quick and easy.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="child-select">Select Child</Label>
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger id="child-select">
                  <SelectValue placeholder="Choose a child..." />
                </SelectTrigger>
                <SelectContent>
                  {children?.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.firstName} -- {formatAge(child.dateOfBirth)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedChild && ageGroup && (
              <Card className="p-4 bg-teal-50/50 border-teal-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                    <ClipboardIcon className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatAgeGroup(ageGroup)}
                    </p>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <ClockIcon className="w-3.5 h-3.5" />
                      <span>Estimated time: 8-10 minutes</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {isOutOfRange && (
              <Card className="p-4 bg-yellow-50/50 border-yellow-200">
                <div className="flex items-start gap-3">
                  <WarningIcon className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">Age out of supported range</p>
                    <p className="text-sm text-yellow-700 mt-0.5">
                      Milestone Map screenings are designed for children between 12 months and 10
                      years of age.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStartScreening}
              disabled={!selectedChildId || !ageGroup || createMutation.isPending}
            >
              {createMutation.isPending ? 'Starting...' : 'Start Screening'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Share Assessment Dialog ── */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Assessment</DialogTitle>
            <DialogDescription>
              Share this screening result with a therapist for professional review.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Therapist search */}
            <div className="space-y-2">
              <Label>Search Therapist</Label>
              <div className="relative">
                <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={therapistSearch}
                  onChange={(e) => setTherapistSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Therapist list */}
            {therapists && therapists.length > 0 && (
              <div className="max-h-40 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                {therapists.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTherapistId(t.id)}
                    className={`w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-gray-50 ${
                      selectedTherapistId === t.id ? 'bg-teal-50 border-l-2 border-l-teal-500' : ''
                    }`}
                  >
                    <Avatar name={t.name} src={t.image} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
                      <p className="text-xs text-gray-500 truncate">{t.email}</p>
                    </div>
                    {selectedTherapistId === t.id && (
                      <svg className="w-5 h-5 text-teal-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}

            {therapists && therapists.length === 0 && therapistSearch && (
              <p className="text-sm text-gray-500 text-center py-3">No therapists found.</p>
            )}

            {/* Access level */}
            <div className="space-y-2">
              <Label>Access Level</Label>
              <RadioGroup
                value={accessLevel}
                onValueChange={(v) => setAccessLevel(v as AccessLevel)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="VIEW" id="access-view" />
                  <Label htmlFor="access-view" className="font-normal cursor-pointer">
                    View Only -- Therapist can view the report
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ANNOTATE" id="access-annotate" />
                  <Label htmlFor="access-annotate" className="font-normal cursor-pointer">
                    Can Annotate -- Therapist can add notes and annotations
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="share-message">Message (optional)</Label>
              <Textarea
                id="share-message"
                placeholder="Add a message for the therapist..."
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShareOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleShare}
              disabled={!selectedTherapistId || shareMutation.isPending}
            >
              {shareMutation.isPending ? 'Sharing...' : 'Share Assessment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Screening</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this screening
              {selectedAssessment?.child?.firstName
                ? ` for ${selectedAssessment.child.firstName}`
                : ''}
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 from-red-600 to-red-700"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScreeningShell>
  );
}
