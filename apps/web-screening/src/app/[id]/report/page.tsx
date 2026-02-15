'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Button,
  Card,
  Badge,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  RadioGroup,
  RadioGroupItem,
  Label,
  Input,
  Textarea,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@upllyft/ui';
import { ScreeningShell } from '@/components/screening-shell';
import {
  useReportData,
  useReportV2Data,
  useDeleteAssessment,
  useShareAssessment,
  useSearchTherapists,
} from '@/hooks/use-assessments';
import {
  domainTitles,
  domainIcons,
  zoneColors,
  calculateZone,
  statusToZone,
  formatDate,
  formatAge,
  formatAgeGroup,
  getAnswerLabel,
  getAnswerColor,
} from '@/lib/utils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import type { DomainScoreResult, AccessLevel } from '@/lib/api/assessments';

// ── Helpers ──

function getStatusBadgeColor(status: string): 'green' | 'blue' | 'yellow' | 'gray' | 'red' {
  switch (status) {
    case 'COMPLETED':
      return 'green';
    case 'IN_PROGRESS':
    case 'TIER1_COMPLETE':
      return 'blue';
    case 'TIER2_REQUIRED':
      return 'yellow';
    case 'EXPIRED':
      return 'gray';
    default:
      return 'blue';
  }
}

function getBarColor(riskIndex: number): string {
  if (riskIndex <= 0.29) return '#22c55e';
  if (riskIndex <= 0.45) return '#eab308';
  return '#ef4444';
}

function getConfidenceBadge(confidence: 'HIGH' | 'MEDIUM' | 'LOW') {
  switch (confidence) {
    case 'HIGH':
      return { bg: 'bg-green-100', text: 'text-green-700', label: 'High Confidence' };
    case 'MEDIUM':
      return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Medium Confidence' };
    case 'LOW':
      return { bg: 'bg-red-100', text: 'text-red-700', label: 'Low Confidence' };
  }
}

function getDomainStatusColor(status: string): string {
  switch (status) {
    case 'GREEN':
      return 'border-green-400';
    case 'YELLOW':
      return 'border-yellow-400';
    case 'RED':
      return 'border-red-400';
    default:
      return 'border-gray-300';
  }
}

function getDomainStatusBadge(status: string) {
  switch (status) {
    case 'GREEN':
      return { bg: 'bg-green-100', text: 'text-green-700', label: 'On Track' };
    case 'YELLOW':
      return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Monitor' };
    case 'RED':
      return { bg: 'bg-red-100', text: 'text-red-700', label: 'Concern' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
  }
}

// ── Main Component ──

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [viewMode, setViewMode] = useState<'v1' | 'v2'>('v1');
  const [showResponses, setShowResponses] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareTherapistId, setShareTherapistId] = useState('');
  const [shareAccessLevel, setShareAccessLevel] = useState<AccessLevel>('VIEW');
  const [shareMessage, setShareMessage] = useState('');
  const [therapistSearch, setTherapistSearch] = useState('');

  const { data: reportData, isLoading: reportLoading, error: reportError } = useReportData(id);
  const { data: reportV2Data, isLoading: v2Loading } = useReportV2Data(id);
  const deleteAssessment = useDeleteAssessment();
  const shareAssessment = useShareAssessment();
  const { data: therapists } = useSearchTherapists(therapistSearch || undefined);

  // ── Loading State ──
  if (reportLoading) {
    return (
      <ScreeningShell>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>
      </ScreeningShell>
    );
  }

  // ── Error State ──
  if (reportError || !reportData) {
    return (
      <ScreeningShell>
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Report</h2>
          <p className="text-gray-500 mb-6">The assessment report could not be loaded. Please try again.</p>
          <Link href="/">
            <Button variant="outline">Back to Screenings</Button>
          </Link>
        </div>
      </ScreeningShell>
    );
  }

  const { assessment, child, domainScores, recommendations, responses, developmentalAgeEquivalent, overallInterpretation } = reportData;
  const flaggedCount = domainScores.filter((d) => d.zone === 'red' || d.zone === 'yellow').length;

  // ── Chart Data ──
  const chartData = domainScores.map((d) => ({
    domain: domainTitles[d.domainId] || d.domainName,
    riskIndex: Number((d.riskIndex * 100).toFixed(1)),
    rawRisk: d.riskIndex,
  }));

  // ── Group responses by domain ──
  const responsesByDomain: Record<string, typeof responses> = {};
  responses.forEach((r) => {
    if (!responsesByDomain[r.domain]) {
      responsesByDomain[r.domain] = [];
    }
    responsesByDomain[r.domain].push(r);
  });

  // ── Delete Handler ──
  function handleDelete() {
    deleteAssessment.mutate(id, {
      onSuccess: () => router.push('/'),
    });
  }

  // ── Share Handler ──
  function handleShare() {
    if (!shareTherapistId) return;
    shareAssessment.mutate(
      {
        id,
        data: {
          therapistId: shareTherapistId,
          accessLevel: shareAccessLevel,
          message: shareMessage || undefined,
        },
      },
      {
        onSuccess: () => {
          setShowShareDialog(false);
          setShareTherapistId('');
          setShareAccessLevel('VIEW');
          setShareMessage('');
        },
      },
    );
  }

  // ── Download Report Handler ──
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownloadReport(type: 'summary' | 'detailed' = 'summary') {
    setIsDownloading(true);
    try {
      const { downloadReport } = await import('@/lib/api/assessments');
      const blob = await downloadReport(id, type);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `screening-report-${type}-${id.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback to window.print() if API download fails
      window.print();
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <ScreeningShell>
      <div className="space-y-6">
        {/* ── Header Section ── */}
        <div className="space-y-6">
          {/* Back Button */}
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Screenings
          </Link>

          {/* Child Info + Overall Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Child Info Card */}
            <Card className="p-6 rounded-2xl border-0 shadow-sm bg-gradient-to-br from-teal-50 to-white">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
                  {child.firstName?.charAt(0) || 'C'}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-gray-900 truncate">
                    {child.nickname || child.firstName}
                  </h1>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <p>
                      <span className="font-medium text-gray-700">Date of Birth:</span>{' '}
                      {formatDate(child.dateOfBirth)}
                    </p>
                    <p>
                      <span className="font-medium text-gray-700">Age:</span>{' '}
                      {formatAge(child.dateOfBirth)}
                    </p>
                    <p>
                      <span className="font-medium text-gray-700">Age Group:</span>{' '}
                      {formatAgeGroup(assessment.ageGroup)}
                    </p>
                  </div>
                  <div className="mt-3">
                    <Badge color={getStatusBadgeColor(assessment.status)}>
                      {assessment.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>

            {/* Overall Results Card */}
            <Card className="p-6 rounded-2xl border-0 shadow-sm bg-gradient-to-br from-purple-50 to-white">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Overall Results
              </h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-gray-900">
                    {assessment.overallScore != null ? `${Math.round(assessment.overallScore)}%` : '--'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Overall Score</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">{developmentalAgeEquivalent || '--'}</div>
                  <div className="text-xs text-gray-500 mt-1">Dev. Age Equivalent</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900">{flaggedCount}</div>
                  <div className="text-xs text-gray-500 mt-1">Flagged Domains</div>
                </div>
              </div>
            </Card>
          </div>

          {/* View Toggle + Action Buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* View Toggle */}
            <div className="inline-flex rounded-xl bg-gray-100 p-1">
              <button
                onClick={() => setViewMode('v1')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'v1'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Summary
              </button>
              <button
                onClick={() => setViewMode('v2')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'v2'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Deep Insight
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Download Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem onClick={() => handleDownloadReport('summary')} disabled={isDownloading} className="cursor-pointer">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {isDownloading ? 'Downloading...' : 'Summary Report (PDF)'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownloadReport('detailed')} disabled={isDownloading} className="cursor-pointer">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {isDownloading ? 'Downloading...' : 'Detailed Report (PDF)'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Share Button */}
              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-xl"
                onClick={() => setShowShareDialog(true)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </Button>

              {/* Delete Button */}
              <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Assessment</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this assessment for{' '}
                      <span className="font-medium text-gray-900">{child.nickname || child.firstName}</span>?
                      This action cannot be undone. All responses, reports, and shared access will be permanently removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700 from-red-600 to-red-700"
                    >
                      {deleteAssessment.isPending ? 'Deleting...' : 'Delete Assessment'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        {/* ── V1 View: Summary Report ── */}
        {viewMode === 'v1' && (
          <div className="space-y-8">
            {/* Domain Score Cards */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Domain Scores</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {domainScores.map((domain) => {
                  const zone = domain.zone || statusToZone(domain.status);
                  const colors = zoneColors[zone];
                  const percentage = Math.round(domain.riskIndex * 100);

                  return (
                    <Card
                      key={domain.domainId}
                      className={`p-4 rounded-xl border ${colors.border} ${colors.bg} transition-shadow hover:shadow-md`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">{domainIcons[domain.domainId] || '?'}</span>
                        <h3 className="font-semibold text-gray-900 text-sm truncate">
                          {domainTitles[domain.domainId] || domain.domainName}
                        </h3>
                      </div>

                      {/* Risk Index */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Risk Index</span>
                          <span className={`font-bold ${colors.text}`}>{percentage}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${colors.progress}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Zone Badge + Tier 2 */}
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
                        >
                          {zone.toUpperCase()}
                        </span>
                        {domain.tier2Required && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                            Tier 2
                          </span>
                        )}
                      </div>

                      {/* Interpretation */}
                      <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                        {domain.interpretation}
                      </p>
                    </Card>
                  );
                })}
              </div>
            </section>

            {/* Bar Chart */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Risk Index by Domain</h2>
              <Card className="p-6 rounded-2xl border-0 shadow-sm">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <YAxis type="category" dataKey="domain" width={110} tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: number) => [`${value}%`, 'Risk Index']}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Bar dataKey="riskIndex" radius={[0, 6, 6, 0]} barSize={24}>
                        {chartData.map((entry, index) => (
                          <Cell key={index} fill={getBarColor(entry.rawRisk)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-[#22c55e]" />
                    <span className="text-gray-600">Green (0-29%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-[#eab308]" />
                    <span className="text-gray-600">Yellow (30-45%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-[#ef4444]" />
                    <span className="text-gray-600">Red (46%+)</span>
                  </div>
                </div>
              </Card>
            </section>

            {/* Overall Interpretation */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Overall Interpretation</h2>
              <Card className="p-6 rounded-2xl border-0 shadow-sm">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{overallInterpretation}</p>
              </Card>
            </section>

            {/* Recommendations */}
            {recommendations && recommendations.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h2>
                <div className="space-y-3">
                  {domainScores.map((domain) => {
                    if (!domain.recommendations || domain.recommendations.length === 0) return null;
                    return domain.recommendations.map((rec, idx) => (
                      <Card key={`${domain.domainId}-${idx}`} className="p-4 rounded-xl border-0 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                rec.severity === 'Severe'
                                  ? 'bg-red-100 text-red-700'
                                  : rec.severity === 'Moderate'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {rec.severity}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-700">{rec.intervention}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {domainTitles[domain.domainId] || domain.domainName}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ));
                  })}
                </div>
              </section>
            )}

            {/* Show All Responses */}
            <section>
              <button
                onClick={() => setShowResponses(!showResponses)}
                className="flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showResponses ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {showResponses ? 'Hide All Responses' : 'Show All Responses'}
              </button>

              {showResponses && (
                <div className="mt-4 space-y-6">
                  {Object.entries(responsesByDomain).map(([domain, domainResponses]) => (
                    <Card key={domain} className="p-5 rounded-xl border-0 shadow-sm">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <span>{domainIcons[domain] || '?'}</span>
                        {domainTitles[domain] || domain}
                      </h3>
                      <div className="space-y-3">
                        {domainResponses.map((r) => (
                          <div key={r.id} className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
                            <div className="flex-1">
                              <p className="text-sm text-gray-700">{r.questionId}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                Tier {r.tier} | Score: {r.score}
                              </p>
                            </div>
                            <span className={`text-sm font-medium ${getAnswerColor(r.answer)}`}>
                              {getAnswerLabel(r.answer)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── V2 View: Deep Insight ── */}
        {viewMode === 'v2' && (
          <div className="space-y-8">
            {/* Loading State */}
            {(v2Loading || reportV2Data?.status === 'PROCESSING') && (
              <Card className="p-12 rounded-2xl border-0 shadow-sm text-center">
                <div className="w-12 h-12 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyzing Clinical Patterns...</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Our AI is performing a deep analysis of the assessment data. This usually takes 30-60 seconds.
                </p>
              </Card>
            )}

            {/* Failed State */}
            {reportV2Data?.status === 'FAILED' && (
              <Card className="p-12 rounded-2xl border-0 shadow-sm text-center">
                <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Analysis Failed</h3>
                <p className="text-sm text-gray-500 mb-4">
                  The deep insight analysis could not be completed. Please try again.
                </p>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => window.location.reload()}
                >
                  Retry Analysis
                </Button>
              </Card>
            )}

            {/* Completed V2 Report */}
            {reportV2Data?.status === 'COMPLETED' && (
              <div className="space-y-8">
                {/* Report Title */}
                {reportV2Data.reportTitle && (
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900">{reportV2Data.reportTitle}</h2>
                    <div className="w-16 h-1 bg-gradient-to-r from-teal-400 to-teal-600 rounded-full mx-auto mt-3" />
                  </div>
                )}

                {/* Executive Summary */}
                {reportV2Data.executiveSummary && (
                  <section>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      Executive Summary
                    </h2>
                    <Card className="p-6 rounded-2xl border-0 shadow-sm">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                        {reportV2Data.executiveSummary}
                      </p>
                    </Card>
                  </section>
                )}

                {/* Developmental Narrative */}
                {reportV2Data.developmentalNarrative && (
                  <section>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      Developmental Narrative
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Biological Foundation */}
                      <Card className="p-5 rounded-xl border-0 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-2 text-sm flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-400" />
                          Biological Foundation
                        </h3>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                          {reportV2Data.developmentalNarrative.biologicalFoundation}
                        </p>
                      </Card>

                      {/* Environmental Interface */}
                      <Card className="p-5 rounded-xl border-0 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-2 text-sm flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-400" />
                          Environmental Interface
                        </h3>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                          {reportV2Data.developmentalNarrative.environmentalInterface}
                        </p>
                      </Card>
                    </div>

                    {/* Strengths Profile */}
                    <Card className="p-5 rounded-xl border-0 shadow-sm mt-4">
                      <h3 className="font-semibold text-gray-900 mb-2 text-sm flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        Strengths Profile
                      </h3>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                        {reportV2Data.developmentalNarrative.strengthsProfile}
                      </p>
                    </Card>
                  </section>
                )}

                {/* Clinical Correlations */}
                {reportV2Data.clinicalCorrelations && reportV2Data.clinicalCorrelations.length > 0 && (
                  <section>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      Clinical Correlations
                    </h2>
                    <div className="relative pl-6 border-l-2 border-teal-200 space-y-6">
                      {reportV2Data.clinicalCorrelations.map((correlation, idx) => {
                        const conf = getConfidenceBadge(correlation.confidence);
                        return (
                          <div key={idx} className="relative">
                            {/* Timeline dot */}
                            <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-teal-400 border-2 border-white" />

                            <Card className="p-5 rounded-xl border-0 shadow-sm">
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <h3 className="font-semibold text-gray-900 text-sm">{correlation.observation}</h3>
                                <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${conf.bg} ${conf.text}`}>
                                  {conf.label}
                                </span>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="font-medium text-gray-500">Related History: </span>
                                  <span className="text-gray-700">{correlation.relatedHistory}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-500">Insight: </span>
                                  <span className="text-gray-700">{correlation.insight}</span>
                                </div>
                              </div>
                            </Card>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Domain Deep Dives */}
                {reportV2Data.domainDeepDives && reportV2Data.domainDeepDives.length > 0 && (
                  <section>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      Domain Deep Dives
                    </h2>
                    <div className="space-y-4">
                      {reportV2Data.domainDeepDives.map((domain) => {
                        const statusBadge = getDomainStatusBadge(domain.status);
                        const borderColor = getDomainStatusColor(domain.status);
                        const scorePercent = Math.round(domain.score * 100);

                        return (
                          <Card
                            key={domain.domainId}
                            className={`p-5 rounded-xl border-0 shadow-sm border-l-4 ${borderColor}`}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{domainIcons[domain.domainId] || '?'}</span>
                                <h3 className="font-semibold text-gray-900">
                                  {domainTitles[domain.domainId] || domain.domainName}
                                </h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-700">{scorePercent}%</span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                                  {statusBadge.label}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                  Clinical Analysis
                                </h4>
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                                  {domain.clinicalAnalysis}
                                </p>
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                  Impact & Trajectory
                                </h4>
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                                  {domain.impactTrajectory}
                                </p>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Strategic Roadmap */}
                {reportV2Data.strategicRoadmap && (
                  <section>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                      </div>
                      Strategic Roadmap
                    </h2>

                    {/* Immediate Priorities */}
                    {reportV2Data.strategicRoadmap.immediatePriorities && reportV2Data.strategicRoadmap.immediatePriorities.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
                          Immediate Priorities
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {reportV2Data.strategicRoadmap.immediatePriorities.map((priority, idx) => (
                            <Card key={idx} className="p-4 rounded-xl border-0 shadow-sm border-l-4 border-orange-400 bg-orange-50/50">
                              <h4 className="font-semibold text-gray-900 text-sm mb-1">{priority.action}</h4>
                              <p className="text-xs text-orange-700 font-medium mb-2">{priority.area}</p>
                              <p className="text-xs text-gray-600">{priority.reason}</p>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Environmental Modifications */}
                    {reportV2Data.strategicRoadmap.environmentalModifications && reportV2Data.strategicRoadmap.environmentalModifications.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
                          Environmental Modifications
                        </h3>
                        <Card className="p-5 rounded-xl border-0 shadow-sm">
                          <ul className="space-y-2">
                            {reportV2Data.strategicRoadmap.environmentalModifications.map((mod, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                <svg className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {mod}
                              </li>
                            ))}
                          </ul>
                        </Card>
                      </div>
                    )}

                    {/* Long Term Goals */}
                    {reportV2Data.strategicRoadmap.longTermGoals && reportV2Data.strategicRoadmap.longTermGoals.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
                          Long-Term Goals
                        </h3>
                        <Card className="p-5 rounded-xl border-0 shadow-sm">
                          <ul className="space-y-2">
                            {reportV2Data.strategicRoadmap.longTermGoals.map((goal, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                <svg className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                                {goal}
                              </li>
                            ))}
                          </ul>
                        </Card>
                      </div>
                    )}
                  </section>
                )}

                {/* Professional Questions */}
                {reportV2Data.professionalQuestions && reportV2Data.professionalQuestions.length > 0 && (
                  <section>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      Questions to Ask Your Professional
                    </h2>
                    <Card className="p-5 rounded-xl border-0 shadow-sm">
                      <ol className="space-y-3">
                        {reportV2Data.professionalQuestions.map((question, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm text-gray-700">
                            <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            {question}
                          </li>
                        ))}
                      </ol>
                    </Card>
                  </section>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Share Dialog ── */}
        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DialogContent className="rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle>Share Assessment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Therapist Search */}
              <div className="space-y-2">
                <Label htmlFor="therapist-search">Search Therapist</Label>
                <Input
                  id="therapist-search"
                  placeholder="Search by name or email..."
                  value={therapistSearch}
                  onChange={(e) => setTherapistSearch(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              {/* Therapist Selection */}
              {therapists && therapists.length > 0 && (
                <div className="space-y-2">
                  <Label>Select Therapist</Label>
                  <Select value={shareTherapistId} onValueChange={setShareTherapistId}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Choose a therapist..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {therapists.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{t.name}</span>
                            <span className="text-xs text-gray-400">{t.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {therapists && therapists.length === 0 && therapistSearch && (
                <p className="text-sm text-gray-500 text-center py-2">No therapists found</p>
              )}

              {/* Access Level */}
              <div className="space-y-2">
                <Label>Access Level</Label>
                <RadioGroup
                  value={shareAccessLevel}
                  onValueChange={(v) => setShareAccessLevel(v as AccessLevel)}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="VIEW" id="access-view" />
                    <Label htmlFor="access-view" className="text-sm font-normal cursor-pointer">
                      View Only
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="ANNOTATE" id="access-annotate" />
                    <Label htmlFor="access-annotate" className="text-sm font-normal cursor-pointer">
                      View & Annotate
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="share-message">Message (optional)</Label>
                <Textarea
                  id="share-message"
                  placeholder="Add a note for the therapist..."
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  rows={3}
                  className="rounded-xl resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowShareDialog(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                onClick={handleShare}
                disabled={!shareTherapistId || shareAssessment.isPending}
                className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700"
              >
                {shareAssessment.isPending ? 'Sharing...' : 'Share Assessment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Disclaimer ── */}
        <div className="text-center py-4 border-t border-gray-100 mt-8">
          <p className="text-xs text-gray-400 max-w-2xl mx-auto leading-relaxed">
            This screening tool is designed to identify potential developmental concerns and is not a diagnostic instrument.
            Results should be interpreted by a qualified healthcare professional. If you have concerns about your child&apos;s development,
            please consult with your pediatrician or a developmental specialist.
          </p>
        </div>
      </div>
    </ScreeningShell>
  );
}
