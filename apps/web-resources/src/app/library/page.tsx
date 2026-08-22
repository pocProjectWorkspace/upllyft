'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@upllyft/api-client';
import { Badge, Skeleton, Input } from '@upllyft/ui';
import { ResourcesShell } from '@/components/resources-shell';

interface LibraryResource {
  id: string;
  title: string;
  description: string | null;
  resourceType: string;
  tags: string[];
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  scope: 'PLATFORM' | 'ORGANIZATION';
  organization?: { id: string; name: string } | null;
  createdAt: string;
}

const TYPE_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Guides', value: 'GUIDE' },
  { label: 'Worksheets', value: 'WORKSHEET' },
  { label: 'Videos', value: 'VIDEO' },
  { label: 'Articles', value: 'ARTICLE' },
  { label: 'Templates', value: 'TEMPLATE' },
];

const TYPE_COLORS: Record<string, string> = {
  GUIDE: 'green',
  WORKSHEET: 'blue',
  VIDEO: 'purple',
  ARTICLE: 'yellow',
  TEMPLATE: 'gray',
  OTHER: 'gray',
};

function typeLabel(t: string) {
  return t.charAt(0) + t.slice(1).toLowerCase();
}

/**
 * The resource library — files published by the Upllyft team (visible to everyone) and
 * by your organisation (visible to its members). Read-only for families; uploading
 * happens in the admin/org workspaces.
 */
export default function ResourceLibraryPage() {
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['resource-library', type, search],
    queryFn: async () => {
      const { data } = await apiClient.get('/library-resources', {
        params: {
          ...(type ? { resourceType: type } : {}),
          ...(search ? { search } : {}),
        },
      });
      return data.resources as LibraryResource[];
    },
  });

  const resources = useMemo(
    () => (data ?? []).filter((r) => !activeTag || r.tags.includes(activeTag)),
    [data, activeTag],
  );
  const allTags = useMemo(
    () => [...new Set((data ?? []).flatMap((r) => r.tags))].slice(0, 12),
    [data],
  );

  return (
    <ResourcesShell>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resource Library</h1>
          <p className="text-gray-500 mt-1">
            Guides and materials from the Upllyft team — and from your organisation, if
            you&apos;re part of one.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search resources…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl sm:max-w-xs"
          />
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {TYPE_FILTERS.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  type === t.value
                    ? 'bg-teal-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-teal-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTag((cur) => (cur === t ? '' : t))}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                  activeTag === t
                    ? 'bg-teal-100 text-teal-800 font-semibold'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                #{t}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
            <p className="text-gray-700 font-medium">Nothing here yet</p>
            <p className="text-sm text-gray-500 mt-1">
              {search || type || activeTag
                ? 'Try clearing the filters.'
                : 'Resources published for you will appear here.'}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((r) => (
              <a
                key={r.id}
                href={r.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="block bg-white rounded-2xl border border-gray-200 p-5 hover:border-teal-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge color={(TYPE_COLORS[r.resourceType] as any) ?? 'gray'}>
                    {typeLabel(r.resourceType)}
                  </Badge>
                  {r.scope === 'ORGANIZATION' && r.organization && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-medium">
                      {r.organization.name}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{r.title}</h3>
                {r.description && (
                  <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{r.description}</p>
                )}
                {r.tags.length > 0 && (
                  <p className="text-[11px] text-gray-400 mt-2">
                    {r.tags.map((t) => `#${t}`).join(' ')}
                  </p>
                )}
                <p className="text-xs text-teal-700 font-medium mt-3">
                  {r.mimeType === 'video/mp4' ? 'Watch' : 'Open'} →
                </p>
              </a>
            ))}
          </div>
        )}
      </div>
    </ResourcesShell>
  );
}
