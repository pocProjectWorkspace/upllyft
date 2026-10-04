'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@upllyft/api-client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Skeleton,
} from '@upllyft/ui';
import { getOrganizations } from '@/lib/api/admin';
import { isViewable } from '@/resources/lib/api/library-resources';

type Audience = 'EVERYONE' | 'ALL_ORGS' | 'ORGS';
type AudienceSegment = 'ALL' | 'FAMILIES' | 'STAFF';

export interface LibraryResource {
  id: string;
  title: string;
  description: string | null;
  resourceType: string;
  tags: string[];
  fileUrl: string | null;
  downloadUrl: string | null;
  downloadable: boolean;
  fileName: string;
  mimeType: string;
  fileSize: number;
  scope: 'PLATFORM' | 'ORGANIZATION';
  audience: Audience;
  audienceSegment: AudienceSegment;
  /** Returned on management views only. */
  audienceOrgs?: { id: string; name: string }[];
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

const PLATFORM_AUDIENCES: { value: Audience; label: string; hint: string }[] = [
  { value: 'EVERYONE', label: 'Everyone on Upllyft', hint: 'Every signed-in user' },
  { value: 'ALL_ORGS', label: 'All organisations', hint: 'Anyone in an organisation, incl. its clinic and nursery families' },
  { value: 'ORGS', label: 'Selected organisations', hint: 'Only the organisations you pick' },
];

function orgShareAudiences(orgName?: string): { value: AudienceChoice; label: string; hint: string }[] {
  const name = orgName ?? 'this organisation';
  return [
    { value: 'OWN', label: `Only ${name}`, hint: 'Its members and the families linked to it' },
    { value: 'ORGS', label: `${name} and selected organisations`, hint: 'Pick the organisations to share it with' },
    { value: 'ALL_ORGS', label: 'All organisations', hint: 'Anyone in an organisation, incl. its clinic and nursery families' },
    { value: 'EVERYONE', label: 'Everyone on Upllyft', hint: 'Every signed-in user' },
  ];
}

function segmentOptions(everyoneLabel: string): { value: AudienceSegment; label: string }[] {
  return [
    { value: 'ALL', label: everyoneLabel },
    { value: 'FAMILIES', label: 'Families only' },
    { value: 'STAFF', label: 'Staff only' },
  ];
}

function formatSize(bytes: number) {
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** An org resource still aimed at its own organisation only (not shared wider by Upllyft). */
function isOwnOrgOnly(r: LibraryResource) {
  return r.scope === 'ORGANIZATION' && r.audience === 'ORGS' && (r.audienceOrgs?.length ?? 0) <= 1;
}

/** "Everyone · families", "Sunrise, Little Steps +2 · staff" … */
function audienceSummary(r: LibraryResource) {
  if (isOwnOrgOnly(r)) {
    if (r.audienceSegment === 'FAMILIES') return 'Families only';
    if (r.audienceSegment === 'STAFF') return 'Staff only';
    return 'Everyone in the organisation';
  }
  let who: string;
  if (r.audience === 'EVERYONE') who = 'Everyone';
  else if (r.audience === 'ALL_ORGS') who = 'All organisations';
  else {
    const names = (r.audienceOrgs ?? []).map((o) => o.name);
    who = names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ');
  }
  if (r.audienceSegment === 'FAMILIES') return `${who} · families`;
  if (r.audienceSegment === 'STAFF') return `${who} · staff`;
  return who;
}

function invalidateLibrary(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['library-resources'] });
  queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
}

interface ResourceManagerProps {
  scope: 'PLATFORM' | 'ORGANIZATION';
  organizationId?: string;
  /** Used in the audience labels, e.g. "Everyone in Sunrise Nursery". */
  organizationName?: string;
  /** Shown above the list, e.g. "visible to everyone on Upllyft". */
  audienceNote: string;
  /**
   * Whether this viewer may upload, edit and delete. The API only accepts those from
   * platform admins and the org's own admins, so plain members get a read-only list.
   */
  canUpload?: boolean;
  /** Platform admins may share an org resource beyond its organisation. */
  canShareWidely?: boolean;
}

/**
 * Upload + manage library resources — shared by the platform admin panel
 * (scope PLATFORM) and the org workspace (scope ORGANIZATION). Each upload picks its
 * audience: platform admins choose everyone / all organisations / selected
 * organisations; org admins publish to their own organisation. Both can narrow to
 * families or staff. Org resources can also be made view-only.
 */
export function ResourceManager({
  scope,
  organizationId,
  organizationName,
  audienceNote,
  canUpload = true,
  canShareWidely = false,
}: ResourceManagerProps) {
  const queryClient = useQueryClient();
  // null = closed, 'new' = upload form, a resource = editing it.
  const [form, setForm] = useState<'new' | LibraryResource | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['library-resources', scope, organizationId],
    queryFn: async () => {
      const { data } = await apiClient.get('/library-resources', {
        params: scope === 'ORGANIZATION' ? { organizationId } : { scope: 'PLATFORM' },
      });
      return data.resources as LibraryResource[];
    },
    enabled: scope === 'PLATFORM' || !!organizationId,
  });

  const remove = useRemoveResource();
  const toggleDownload = useToggleDownload();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-500">{audienceNote}</p>
        {canUpload ? (
          <Button variant="primary" onClick={() => setForm((f) => (f ? null : 'new'))}>
            {form ? 'Close' : '+ Upload resource'}
          </Button>
        ) : (
          <p className="text-xs text-gray-400">Only organisation admins can upload resources.</p>
        )}
      </div>

      {canUpload && form && (
        <ResourceForm
          // Remount per target so the fields start from that resource's values.
          key={form === 'new' ? 'new' : form.id}
          scope={scope}
          organizationId={organizationId}
          organizationName={organizationName}
          editing={form === 'new' ? null : form}
          canShareWidely={canShareWidely}
          onDone={() => setForm(null)}
        />
      )}

      <ResourceList
        resources={data}
        isLoading={isLoading}
        isError={isError}
        isRetrying={isFetching}
        onRetry={() => refetch()}
        emptyText={canUpload ? 'No resources yet — upload the first one.' : 'No resources yet.'}
        onEdit={canUpload ? (r) => setForm(r) : undefined}
        onDelete={canUpload ? (id) => remove.mutate(id) : undefined}
        onToggleDownload={
          canUpload && scope === 'ORGANIZATION'
            ? (r) => toggleDownload.mutate({ id: r.id, downloadable: !r.downloadable })
            : undefined
        }
      />
    </div>
  );
}

// ─── Upload / edit form ─────────────────────────────────────────────────────

interface ResourceFormProps {
  scope: 'PLATFORM' | 'ORGANIZATION';
  organizationId?: string;
  organizationName?: string;
  editing: LibraryResource | null;
  /** Org resources only: show the platform-admin sharing options. */
  canShareWidely?: boolean;
  onDone: () => void;
}

/** 'OWN' = an org resource kept to its own organisation (sent as ORGS + no extra orgs). */
type AudienceChoice = Audience | 'OWN';

function ResourceForm({
  scope,
  organizationId,
  organizationName,
  editing,
  canShareWidely = false,
  onDone,
}: ResourceFormProps) {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(editing?.title ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [resourceType, setResourceType] = useState(editing?.resourceType ?? 'GUIDE');
  const [tags, setTags] = useState(editing?.tags.join(', ') ?? '');
  const [file, setFile] = useState<File | null>(null);
  // The owning organisation of an org resource is always in its audience, so the
  // picker only holds the organisations it is shared with in addition.
  const owningOrgId = scope === 'ORGANIZATION' ? (editing?.organization?.id ?? organizationId) : undefined;
  const [targetOrgIds, setTargetOrgIds] = useState<string[]>(
    (editing?.audienceOrgs ?? []).map((o) => o.id).filter((id) => id !== owningOrgId),
  );
  const [audience, setAudience] = useState<AudienceChoice>(() => {
    if (scope === 'PLATFORM') return editing?.audience ?? 'EVERYONE';
    if (!editing || isOwnOrgOnly(editing)) return 'OWN';
    return editing.audience;
  });
  const [segment, setSegment] = useState<AudienceSegment>(editing?.audienceSegment ?? 'ALL');
  const [downloadable, setDownloadable] = useState(editing?.downloadable ?? true);
  const [error, setError] = useState<string | null>(null);

  // Only PDF, images and video can be shown in the app, so only those can be view-only.
  const mimeType = editing?.mimeType ?? file?.type ?? '';
  const canBeViewOnly = !mimeType || isViewable(mimeType);
  const effectiveDownloadable = scope === 'PLATFORM' || !canBeViewOnly ? true : downloadable;

  const save = useMutation({
    mutationFn: async () => {
      const sharing =
        scope === 'PLATFORM' || canShareWidely
          ? {
              audience: audience === 'OWN' ? 'ORGS' : audience,
              ...(audience === 'ORGS' || audience === 'OWN'
                ? { organizationIds: audience === 'ORGS' ? targetOrgIds : [] }
                : {}),
            }
          : {}; // org admins never send an audience — the API keeps the current one
      const audienceFields = {
        audienceSegment: segment,
        ...sharing,
        ...(scope === 'ORGANIZATION' ? { downloadable: effectiveDownloadable } : {}),
      };

      if (editing) {
        await apiClient.patch(`/library-resources/${editing.id}`, {
          title: title.trim(),
          description: description.trim() || null,
          resourceType,
          tags,
          ...audienceFields,
        });
        return;
      }

      const fd = new FormData();
      fd.append('file', file!);
      fd.append('title', title.trim());
      if (description.trim()) fd.append('description', description.trim());
      fd.append('resourceType', resourceType);
      fd.append('tags', tags);
      fd.append('scope', scope);
      if (organizationId) fd.append('organizationId', organizationId);
      for (const [k, v] of Object.entries(audienceFields)) {
        fd.append(k, Array.isArray(v) ? v.join(',') : String(v));
      }
      await apiClient.post('/library-resources', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      invalidateLibrary(queryClient);
      onDone();
    },
    onError: (e: any) =>
      setError(e?.response?.data?.message ?? (editing ? 'Saving failed' : 'Upload failed') + ' — please try again.'),
  });

  const canSubmit =
    (editing || !!file) &&
    !!title.trim() &&
    !(audience === 'ORGS' && targetOrgIds.length === 0) &&
    !save.isPending;

  const inputClass =
    'w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      {editing && (
        <p className="text-sm font-semibold text-gray-900">
          Editing “{editing.title}” <span className="font-normal text-gray-400">· {editing.fileName}</span>
        </p>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Getting ready for a sensory-friendly haircut"
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={`${inputClass} resize-none`}
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Resource type</label>
          <ChipGroup
            value={resourceType}
            onChange={setResourceType}
            options={RESOURCE_TYPES.map((t) => ({ value: t, label: t.charAt(0) + t.slice(1).toLowerCase() }))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags (comma-separated)</label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="sensory, routines, school"
            className={inputClass}
          />
        </div>
      </div>

      {/* ── Audience ─────────────────────────────────────── */}
      <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-4">
        <p className="text-sm font-semibold text-gray-800">Who can see this</p>
        {scope === 'PLATFORM' && (
          <div className="space-y-2">
            {PLATFORM_AUDIENCES.map((a) => (
              <label key={a.value} className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="audience"
                  checked={audience === a.value}
                  onChange={() => setAudience(a.value)}
                  className="mt-0.5 accent-teal-600"
                />
                <span className="text-sm">
                  <span className="font-medium text-gray-800">{a.label}</span>
                  <span className="block text-xs text-gray-500">{a.hint}</span>
                </span>
              </label>
            ))}
            {audience === 'ORGS' && <OrganizationPicker value={targetOrgIds} onChange={setTargetOrgIds} />}
          </div>
        )}
        {scope === 'ORGANIZATION' && canShareWidely && (
          <div className="space-y-2">
            {orgShareAudiences(organizationName).map((a) => (
              <label key={a.value} className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="audience"
                  checked={audience === a.value}
                  onChange={() => setAudience(a.value)}
                  className="mt-0.5 accent-teal-600"
                />
                <span className="text-sm">
                  <span className="font-medium text-gray-800">{a.label}</span>
                  <span className="block text-xs text-gray-500">{a.hint}</span>
                </span>
              </label>
            ))}
            {audience === 'ORGS' && (
              <OrganizationPicker
                value={targetOrgIds}
                onChange={setTargetOrgIds}
                excludeIds={owningOrgId ? [owningOrgId] : []}
              />
            )}
          </div>
        )}
        {scope === 'ORGANIZATION' && !canShareWidely && editing && !isOwnOrgOnly(editing) && (
          <p className="text-xs text-teal-800 bg-teal-50 rounded-lg px-3 py-2">
            Upllyft has shared this beyond your organisation ({audienceSummary(editing)}). Only Upllyft
            admins can change who it&apos;s shared with.
          </p>
        )}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1.5">
            {scope === 'PLATFORM' || audience !== 'OWN' ? 'Narrow to' : 'Show to'}
          </p>
          <ChipGroup
            value={segment}
            onChange={(v) => setSegment(v as AudienceSegment)}
            options={segmentOptions(
              scope === 'PLATFORM' || audience !== 'OWN'
                ? 'Everyone'
                : `Everyone in ${organizationName ?? 'the organisation'}`,
            )}
          />
        </div>
        {scope === 'ORGANIZATION' && (
          <label className={`flex items-start gap-2.5 ${canBeViewOnly ? 'cursor-pointer' : 'opacity-60'}`}>
            <input
              type="checkbox"
              checked={effectiveDownloadable}
              disabled={!canBeViewOnly}
              onChange={(e) => setDownloadable(e.target.checked)}
              className="mt-0.5 accent-teal-600"
            />
            <span className="text-sm">
              <span className="font-medium text-gray-800">Allow download</span>
              <span className="block text-xs text-gray-500">
                {canBeViewOnly
                  ? 'Untick to make it view-only: it opens inside Upllyft with no download button.'
                  : 'Word and PowerPoint files are always downloadable — convert to PDF to make it view-only.'}
              </span>
            </span>
          </label>
        )}
      </div>

      {!editing && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">File</label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.pptx,.mp4"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-600 file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-teal-50 file:text-teal-700 file:font-semibold file:text-sm hover:file:bg-teal-100"
          />
          <p className="text-xs text-gray-400 mt-1">PDF, images, Word, PowerPoint or MP4 — up to 50 MB.</p>
        </div>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}
      <div className="flex gap-2">
        <Button variant="primary" disabled={!canSubmit} onClick={() => save.mutate()}>
          {save.isPending ? (editing ? 'Saving…' : 'Uploading…') : editing ? 'Save changes' : 'Publish resource'}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ChipGroup({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            value === o.value
              ? 'bg-teal-600 border-teal-600 text-white'
              : 'bg-white border-gray-200 text-gray-600 hover:border-teal-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Searchable multi-select of every organisation, for platform admins. */
function OrganizationPicker({
  value,
  onChange,
  excludeIds = [],
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  /** e.g. the owning organisation, which is always included anyway. */
  excludeIds?: string[];
}) {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'organizations'], queryFn: getOrganizations });

  const shown = useMemo(
    () =>
      (data ?? [])
        .filter((o) => !excludeIds.includes(o.id))
        .filter((o) => !search || o.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data, search, excludeIds],
  );
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div className="ml-6 space-y-2">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search organisations…"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
      <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white divide-y divide-gray-50">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : shown.length === 0 ? (
          <p className="p-3 text-xs text-gray-500">No organisations match.</p>
        ) : (
          shown.map((o) => (
            <label key={o.id} className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={value.includes(o.id)}
                onChange={() => toggle(o.id)}
                className="accent-teal-600"
              />
              <span className="text-gray-800">{o.name}</span>
            </label>
          ))
        )}
      </div>
      <p className="text-xs text-gray-500">
        {value.length === 0 ? 'Pick at least one organisation.' : `${value.length} selected`}
      </p>
    </div>
  );
}

// ─── List ───────────────────────────────────────────────────────────────────

function useRemoveResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/library-resources/${id}`),
    onSuccess: () => invalidateLibrary(queryClient),
  });
}

function useToggleDownload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, downloadable }: { id: string; downloadable: boolean }) =>
      apiClient.patch(`/library-resources/${id}`, { downloadable }),
    onSuccess: () => invalidateLibrary(queryClient),
  });
}

interface ResourceListProps {
  resources: LibraryResource[] | undefined;
  isLoading: boolean;
  /** A failed load must not look like an empty shelf — admins would think uploads vanished. */
  isError?: boolean;
  isRetrying?: boolean;
  onRetry?: () => void;
  emptyText: string;
  onEdit?: (r: LibraryResource) => void;
  editLabel?: string;
  /** Omit for a read-only list. */
  onDelete?: (id: string) => void;
  /** Org resources only: flip between downloadable and view-only. */
  onToggleDownload?: (r: LibraryResource) => void;
  /** Show which organisation each row belongs to (admin oversight view). */
  showOrganization?: boolean;
}

function ResourceList({
  resources,
  isLoading,
  isError,
  isRetrying,
  onRetry,
  emptyText,
  onEdit,
  editLabel = 'Edit',
  onDelete,
  onToggleDownload,
  showOrganization,
}: ResourceListProps) {
  // Delete removes the stored file too, so it is confirmed first.
  const [deleteTarget, setDeleteTarget] = useState<LibraryResource | null>(null);

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  if (isError && !resources) {
    return <LoadError isRetrying={isRetrying} onRetry={onRetry} />;
  }

  if ((resources?.length ?? 0) === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
        <p className="text-sm text-gray-500">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
      {resources!.map((r) => {
        const openHref = r.fileUrl ?? undefined;
        return (
          <div key={r.id} className="flex items-center gap-4 px-5 py-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={openHref}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-gray-900 hover:text-teal-700 truncate"
                >
                  {r.title}
                </a>
                <Badge color={(TYPE_COLORS[r.resourceType] as any) ?? 'gray'}>
                  {r.resourceType.charAt(0) + r.resourceType.slice(1).toLowerCase()}
                </Badge>
                {showOrganization && r.organization && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-medium">
                    {r.organization.name}
                  </span>
                )}
                {!r.downloadable && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
                    View only
                  </span>
                )}
                {r.tags.map((t) => (
                  <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {t}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                <span className="text-teal-700 font-medium">{audienceSummary(r)}</span> · {r.fileName} ·{' '}
                {formatSize(r.fileSize)}
                {r.uploadedBy?.name ? ` · by ${r.uploadedBy.name}` : ''} ·{' '}
                {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </p>
            </div>
            {onToggleDownload && r.scope === 'ORGANIZATION' && isViewable(r.mimeType) && (
              <button
                onClick={() => onToggleDownload(r)}
                className="text-xs font-medium text-gray-500 hover:text-teal-700 whitespace-nowrap"
                title={r.downloadable ? 'Make view-only' : 'Allow download'}
              >
                {r.downloadable ? 'Make view-only' : 'Allow download'}
              </button>
            )}
            <a
              href={openHref}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap"
            >
              Open
            </a>
            {onEdit && (
              <button
                onClick={() => onEdit(r)}
                className="text-sm font-medium text-gray-500 hover:text-gray-800 whitespace-nowrap"
              >
                {editLabel}
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => setDeleteTarget(r)}
                aria-label="Delete resource"
                className="text-gray-300 hover:text-red-400 transition-colors p-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        );
      })}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete resource?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be removed from the library and its file deleted.
              Anyone it&apos;s shared with will no longer be able to open it. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) onDelete?.(deleteTarget.id);
                setDeleteTarget(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function LoadError({ isRetrying, onRetry }: { isRetrying?: boolean; onRetry?: () => void }) {
  return (
    <div role="alert" className="text-center py-12 bg-white rounded-2xl border border-red-100">
      <p className="text-sm font-medium text-gray-800">Couldn&apos;t load resources</p>
      <p className="text-xs text-gray-500 mt-1">This is usually a brief connection problem.</p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="outline" onClick={onRetry} disabled={isRetrying}>
            {isRetrying ? 'Retrying…' : 'Retry'}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Platform-admin oversight of every organisation's shelf. Admins rarely hold a
 * membership of the orgs they look after, so the org workspace would bounce them;
 * this lists org resources from the admin console and lets them share one beyond its
 * organisation, switch view-only on or off, or remove it.
 */
export function OrganizationResourcesOverview() {
  const [organizationId, setOrganizationId] = useState('');
  const [editing, setEditing] = useState<LibraryResource | null>(null);
  const remove = useRemoveResource();
  const toggleDownload = useToggleDownload();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['library-resources', 'ORGANIZATION', 'all'],
    queryFn: async () => {
      const { data } = await apiClient.get('/library-resources', {
        params: { scope: 'ORGANIZATION' },
      });
      return data.resources as LibraryResource[];
    },
  });

  const organizations = useMemo(() => {
    const byId = new Map<string, string>();
    for (const r of data ?? []) if (r.organization) byId.set(r.organization.id, r.organization.name);
    return [...byId].sort((a, b) => a[1].localeCompare(b[1]));
  }, [data]);

  // Stays undefined while there is no data, so a failed load shows Retry, not "no resources".
  const resources = useMemo(
    () => data?.filter((r) => !organizationId || r.organization?.id === organizationId),
    [data, organizationId],
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-500">
          Uploaded by organisation admins and visible within their organisation, unless you share one more
          widely with Edit &amp; share.
        </p>
        {organizations.length > 1 && (
          <select
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All organisations ({data?.length ?? 0})</option>
            {organizations.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        )}
      </div>
      {editing && (
        <ResourceForm
          key={editing.id}
          scope="ORGANIZATION"
          organizationId={editing.organization?.id}
          organizationName={editing.organization?.name}
          editing={editing}
          canShareWidely
          onDone={() => setEditing(null)}
        />
      )}
      <ResourceList
        resources={resources}
        isLoading={isLoading}
        isError={isError}
        isRetrying={isFetching}
        onRetry={() => refetch()}
        emptyText="No organisation has uploaded resources yet."
        onEdit={(r) => setEditing(r)}
        editLabel="Edit & share"
        onDelete={(id) => remove.mutate(id)}
        onToggleDownload={(r) => toggleDownload.mutate({ id: r.id, downloadable: !r.downloadable })}
        showOrganization
      />
    </div>
  );
}
