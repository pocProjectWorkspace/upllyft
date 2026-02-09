'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Badge, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@upllyft/ui';
import { ResourcesShell } from '@/components/resources-shell';
import { useMyLibrary } from '@/hooks/use-worksheets';
import type { WorksheetType, WorksheetStatus, WorksheetDifficulty, WorksheetFilters } from '@/lib/api/worksheets';
import {
  worksheetTypeLabels,
  worksheetStatusLabels,
  worksheetStatusColors,
  difficultyLabels,
  difficultyColors,
  domainLabels,
  subTypeLabels,
  formatRelativeDate,
} from '@/lib/utils';

const TYPES: WorksheetType[] = ['ACTIVITY', 'VISUAL_SUPPORT', 'STRUCTURED_PLAN'];
const DIFFICULTIES: WorksheetDifficulty[] = ['FOUNDATIONAL', 'DEVELOPING', 'STRENGTHENING'];
const STATUSES: WorksheetStatus[] = ['DRAFT', 'GENERATING', 'PUBLISHED', 'ARCHIVED'];
const DOMAINS = Object.keys(domainLabels);

const typeIcons: Record<WorksheetType, string> = {
  ACTIVITY: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  VISUAL_SUPPORT: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  STRUCTURED_PLAN: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  PROGRESS_TRACKER: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
};

export default function MyLibraryPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string>('all');
  const [difficulty, setDifficulty] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [domain, setDomain] = useState<string>('all');
  const [page, setPage] = useState(1);

  const filters: WorksheetFilters = {
    page,
    limit: 12,
    ...(search && { search }),
    ...(type !== 'all' && { type: type as WorksheetType }),
    ...(difficulty !== 'all' && { difficulty: difficulty as WorksheetDifficulty }),
    ...(status !== 'all' && { status: status as WorksheetStatus }),
    ...(domain !== 'all' && { domain }),
  };

  const { data, isLoading } = useMyLibrary(filters);

  const worksheets = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <ResourcesShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Library</h1>
            <p className="text-gray-500 mt-1">
              {total} worksheet{total !== 1 ? 's' : ''} in your collection
            </p>
          </div>
          <Button onClick={() => router.push('/create')}>Create Worksheet</Button>
        </div>

        {/* Search */}
        <Input
          placeholder="Search worksheets by title or keyword..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-lg"
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {TYPES.map((t) => (
                <SelectItem key={t} value={t}>{worksheetTypeLabels[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={difficulty} onValueChange={(v) => { setDifficulty(v); setPage(1); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Difficulties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulties</SelectItem>
              {DIFFICULTIES.map((d) => (
                <SelectItem key={d} value={d}>{difficultyLabels[d]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{worksheetStatusLabels[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={domain} onValueChange={(v) => { setDomain(v); setPage(1); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Domains" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Domains</SelectItem>
              {DOMAINS.map((d) => (
                <SelectItem key={d} value={d}>{domainLabels[d]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : worksheets.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No worksheets yet</h3>
            <p className="text-gray-500 mt-1 mb-4">Create your first worksheet to get started.</p>
            <Button onClick={() => router.push('/create')}>Create Worksheet</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {worksheets.map((ws) => (
              <Card
                key={ws.id}
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/${ws.id}`)}
              >
                {/* Preview image or fallback */}
                <div className="h-40 bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center relative">
                  {ws.previewUrl ? (
                    <img src={ws.previewUrl} alt={ws.title} className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-10 h-10 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={typeIcons[ws.type] || typeIcons.ACTIVITY} />
                    </svg>
                  )}
                  {ws.status === 'GENERATING' && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <h3 className="font-semibold text-gray-900 line-clamp-1">{ws.title}</h3>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge color={(worksheetStatusColors[ws.status] ?? 'gray') as 'green' | 'blue' | 'yellow' | 'red' | 'gray' | 'purple'}>
                      {worksheetStatusLabels[ws.status]}
                    </Badge>
                    <Badge color="blue">{worksheetTypeLabels[ws.type]}</Badge>
                    <Badge color={(difficultyColors[ws.difficulty] ?? 'gray') as 'green' | 'blue' | 'yellow' | 'red' | 'gray' | 'purple'}>
                      {difficultyLabels[ws.difficulty]}
                    </Badge>
                  </div>

                  {ws.subType && (
                    <p className="text-xs text-gray-500">{subTypeLabels[ws.subType] ?? ws.subType}</p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                    <span>{ws.child ? ws.child.firstName : 'No child linked'}</span>
                    <span>{formatRelativeDate(ws.createdAt)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </ResourcesShell>
  );
}
