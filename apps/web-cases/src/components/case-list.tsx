'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCases } from '@/hooks/use-cases';
import type { Case } from '@/lib/api/cases';
import { caseStatusColors, caseStatusLabels, formatDate } from '@/lib/utils';
import { Button, Input, Badge, Card, Skeleton } from '@upllyft/ui';
import { Search, FolderOpen, CalendarDays, FileText, StickyNote } from 'lucide-react';

export function CaseListView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status') || 'ALL';
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useCases({
    search: search || undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    page,
    limit: 12,
  });

  const cases = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 12);

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Cases</h1>
          <p className="text-gray-500 mt-1">
            {total} case{total !== 1 ? 's' : ''}
            {statusFilter !== 'ALL' && (
              <span> &middot; {caseStatusLabels[statusFilter] ?? statusFilter}</span>
            )}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by patient, case number, diagnosis..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
      </div>

      {/* Cases Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-start gap-3 mb-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <div className="flex gap-3">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : cases.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No cases found</h3>
          <p className="text-gray-500 mb-6">
            {search || statusFilter !== 'ALL'
              ? 'Try adjusting your search or filter.'
              : 'Create your first case to get started.'}
          </p>
          {!search && statusFilter === 'ALL' && (
            <Button
              variant="primary"
              onClick={() => router.push('/new')}
              className="bg-teal-600 hover:bg-teal-700"
            >
              New Case
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cases.map((c: Case) => {
              const caseId = c.id;
              const caseNumber = c.caseNumber ?? '';
              const status = c.status ?? '';
              const diagnosis = c.diagnosis ?? '';
              const createdAt = c.createdAt ?? '';
              const childName = c.child?.name ?? 'Unknown';
              const lastSessionDate = c.lastSessionDate ?? null;

              return (
                <div
                  key={caseId}
                  onClick={() => router.push(`/${caseId}`)}
                  className="bg-white rounded-xl border border-gray-100 p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  {/* Patient + Status */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {childName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">
                          {childName}
                        </h3>
                        <p className="text-xs text-gray-400 font-mono">
                          {caseNumber} &middot; Started {formatDate(createdAt)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${caseStatusColors[status] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {caseStatusLabels[status] ?? status}
                    </span>
                  </div>

                  {/* Diagnosis */}
                  {diagnosis && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {diagnosis}
                    </p>
                  )}

                  {/* Session Dates */}
                  <div className="space-y-1 mb-3">
                    {lastSessionDate && (
                      <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <CalendarDays className="h-3 w-3" />
                        Last session: {formatDate(lastSessionDate)}
                      </p>
                    )}
                  </div>

                  {/* Footer Stats */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
                    {(c as any)._count?.sessions != null && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                        <CalendarDays className="h-3 w-3" />
                        {(c as any)._count.sessions} sessions
                      </span>
                    )}
                    {(c as any)._count?.documents != null && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                        <FileText className="h-3 w-3" />
                        {(c as any)._count.documents} docs
                      </span>
                    )}
                    {(c as any)._count?.notes != null && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                        <StickyNote className="h-3 w-3" />
                        {(c as any)._count.notes} notes
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
