'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@upllyft/api-client';
import { Badge, Button, Skeleton } from '@upllyft/ui';

export interface LibraryResource {
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
  uploadedBy?: { id: string; name: string } | null;
  createdAt: string;
}

const RESOURCE_TYPES = ['GUIDE', 'WORKSHEET', 'VIDEO', 'ARTICLE', 'TEMPLATE', 'OTHER'];

const TYPE_COLORS: Record<string, string> = {
  GUIDE: 'green',
  WORKSHEET: 'blue',
  VIDEO: 'purple',
  ARTICLE: 'yellow',
  TEMPLATE: 'gray',
  OTHER: 'gray',
};

function formatSize(bytes: number) {
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

interface ResourceManagerProps {
  scope: 'PLATFORM' | 'ORGANIZATION';
  organizationId?: string;
  /** Shown above the list, e.g. "visible to everyone on Upllyft". */
  audienceNote: string;
}

/**
 * Upload + manage library resources — shared by the platform admin panel
 * (scope PLATFORM) and the org workspace (scope ORGANIZATION). Tagging happens at
 * upload time: a resource type (required) plus free-form comma tags.
 */
export function ResourceManager({ scope, organizationId, audienceNote }: ResourceManagerProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resourceType, setResourceType] = useState('GUIDE');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const listKey = ['library-resources', scope, organizationId];
  const { data, isLoading } = useQuery({
    queryKey: listKey,
    queryFn: async () => {
      const { data } = await apiClient.get('/library-resources', {
        params: scope === 'ORGANIZATION' ? { organizationId } : {},
      });
      // The platform manage view shows platform-scoped rows only.
      return (data.resources as LibraryResource[]).filter((r) =>
        scope === 'PLATFORM' ? r.scope === 'PLATFORM' : true,
      );
    },
    enabled: scope === 'PLATFORM' || !!organizationId,
  });

  const upload = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('file', file!);
      fd.append('title', title.trim());
      if (description.trim()) fd.append('description', description.trim());
      fd.append('resourceType', resourceType);
      fd.append('tags', tags);
      fd.append('scope', scope);
      if (organizationId) fd.append('organizationId', organizationId);
      await apiClient.post('/library-resources', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-resources'] });
      setFormOpen(false);
      setTitle('');
      setDescription('');
      setTags('');
      setFile(null);
      setError(null);
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Upload failed — please try again.'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/library-resources/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['library-resources'] }),
  });

  const canSubmit = !!file && !!title.trim() && !upload.isPending;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-500">{audienceNote}</p>
        <Button variant="primary" onClick={() => setFormOpen((v) => !v)}>
          {formOpen ? 'Close' : '+ Upload resource'}
        </Button>
      </div>

      {/* ── Upload form ─────────────────────────────────────── */}
      {formOpen && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Getting ready for a sensory-friendly haircut"
              className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Resource type</label>
              <div className="flex flex-wrap gap-1.5">
                {RESOURCE_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setResourceType(t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      resourceType === t
                        ? 'bg-teal-600 border-teal-600 text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-teal-300'
                    }`}
                  >
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tags (comma-separated)
              </label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="sensory, routines, school"
                className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">File</label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.pptx,.mp4"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-600 file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-teal-50 file:text-teal-700 file:font-semibold file:text-sm hover:file:bg-teal-100"
            />
            <p className="text-xs text-gray-400 mt-1">PDF, images, Word, PowerPoint or MP4 — up to 50 MB.</p>
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          <Button variant="primary" disabled={!canSubmit} onClick={() => upload.mutate()}>
            {upload.isPending ? 'Uploading…' : 'Publish resource'}
          </Button>
        </div>
      )}

      {/* ── List ────────────────────────────────────────────── */}
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (data?.length ?? 0) === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
          <p className="text-sm text-gray-500">No resources yet — upload the first one.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {data!.map((r) => (
            <div key={r.id} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={r.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-gray-900 hover:text-teal-700 truncate"
                  >
                    {r.title}
                  </a>
                  <Badge color={(TYPE_COLORS[r.resourceType] as any) ?? 'gray'}>
                    {r.resourceType.charAt(0) + r.resourceType.slice(1).toLowerCase()}
                  </Badge>
                  {r.tags.map((t) => (
                    <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {t}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {r.fileName} · {formatSize(r.fileSize)}
                  {r.uploadedBy?.name ? ` · by ${r.uploadedBy.name}` : ''} ·{' '}
                  {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <a
                href={r.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap"
              >
                Open
              </a>
              <button
                onClick={() => remove.mutate(r.id)}
                aria-label="Delete resource"
                className="text-gray-300 hover:text-red-400 transition-colors p-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
