'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Badge,
  Input,
  Avatar,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@upllyft/ui';
import { ResourcesShell } from '@/components/resources-shell';
import { useBrowseCommunity, useCloneWorksheet } from '@/hooks/use-worksheets';
import type { WorksheetType, WorksheetDifficulty, CommunityFilters } from '@/lib/api/worksheets';
import {
  worksheetTypeLabels,
  difficultyLabels,
  difficultyColors,
  domainLabels,
  renderStars,
} from '@/lib/utils';

const TYPES: WorksheetType[] = ['ACTIVITY', 'VISUAL_SUPPORT', 'STRUCTURED_PLAN'];
const DIFFICULTIES: WorksheetDifficulty[] = ['FOUNDATIONAL', 'DEVELOPING', 'STRENGTHENING'];
const DOMAINS = Object.keys(domainLabels);
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'highest_rated', label: 'Highest Rated' },
  { value: 'most_cloned', label: 'Most Cloned' },
  { value: 'title', label: 'Title A-Z' },
] as const;

export default function CommunityLibraryPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string>('all');
  const [difficulty, setDifficulty] = useState<string>('all');
  const [domain, setDomain] = useState<string>('all');
  const [condition, setCondition] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [page, setPage] = useState(1);

  const filters: CommunityFilters = {
    page,
    limit: 12,
    sortBy: sortBy as CommunityFilters['sortBy'],
    ...(search && { search }),
    ...(type !== 'all' && { type: type as WorksheetType }),
    ...(difficulty !== 'all' && { difficulty: difficulty as WorksheetDifficulty }),
    ...(domain !== 'all' && { domain }),
    ...(condition && { condition }),
    ...(ageMin && { ageMin: Number(ageMin) }),
    ...(ageMax && { ageMax: Number(ageMax) }),
  };

  const { data, isLoading } = useBrowseCommunity(filters);
  const cloneMutation = useCloneWorksheet();

  const worksheets = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <ResourcesShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Community Library</h1>
          <p className="text-gray-500 mt-1">
            Browse {total} worksheet{total !== 1 ? 's' : ''} shared by the community
          </p>
        </div>

        {/* Search */}
        <Input
          placeholder="Search community worksheets..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-lg"
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
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

          <Input
            placeholder="Condition tag"
            value={condition}
            onChange={(e) => { setCondition(e.target.value); setPage(1); }}
            className="w-40"
          />

          <Input
            placeholder="Age min"
            type="number"
            value={ageMin}
            onChange={(e) => { setAgeMin(e.target.value); setPage(1); }}
            className="w-24"
          />
          <Input
            placeholder="Age max"
            type="number"
            value={ageMax}
            onChange={(e) => { setAgeMax(e.target.value); setPage(1); }}
            className="w-24"
          />

          <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
            <h3 className="text-lg font-semibold text-gray-900">No community worksheets found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {worksheets.map((ws) => (
              <Card key={ws.id} className="overflow-hidden hover:shadow-md transition-shadow">
                {/* Preview image */}
                <div
                  className="h-40 bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center cursor-pointer"
                  onClick={() => router.push(`/${ws.id}`)}
                >
                  {ws.previewUrl ? (
                    <img src={ws.previewUrl} alt={ws.title} className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-10 h-10 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <h3
                    className="font-semibold text-gray-900 line-clamp-1 cursor-pointer hover:text-teal-700"
                    onClick={() => router.push(`/${ws.id}`)}
                  >
                    {ws.title}
                  </h3>

                  {/* Creator */}
                  {ws.createdBy && (
                    <div className="flex items-center gap-2">
                      <Avatar src={ws.createdBy.image || undefined} name={ws.createdBy.name} size="sm" />
                      <span className="text-sm text-gray-600">{ws.createdBy.name}</span>
                      {ws.createdBy.isVerifiedContributor && (
                        <svg className="w-4 h-4 text-teal-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    <Badge color="blue">{worksheetTypeLabels[ws.type]}</Badge>
                    <Badge color={(difficultyColors[ws.difficulty] ?? 'gray') as 'green' | 'blue' | 'yellow' | 'red' | 'gray' | 'purple'}>
                      {difficultyLabels[ws.difficulty]}
                    </Badge>
                  </div>

                  {/* Rating + Clone count */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-yellow-500" title={`${ws.averageRating.toFixed(1)} / 5`}>
                      {renderStars(ws.averageRating)}{' '}
                      <span className="text-gray-400 text-xs">({ws.reviewCount})</span>
                    </span>
                    <span className="text-gray-400 text-xs">{ws.cloneCount} clone{ws.cloneCount !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Clone button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={cloneMutation.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      cloneMutation.mutate(ws.id);
                    }}
                  >
                    Clone to My Library
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>
    </ResourcesShell>
  );
}
