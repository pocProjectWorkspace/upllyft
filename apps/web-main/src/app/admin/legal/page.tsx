'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, useAuth } from '@upllyft/api-client';
import { ListSkeleton } from '@/components/skeletons';
import { LegalMarkdown, formatLegalDate } from '@/components/legal/legal-document';

// Legal documents: draft → preview → publish, with every published version kept.
// Admins draft; only a super admin publishes. The public pages and the acceptance gate
// read the published version, so a publish takes effect without a deploy.

type Edition = 'GLOBAL' | 'IN' | 'AE';
const EDITION_LABEL: Record<Edition, string> = { GLOBAL: 'Global', IN: 'India', AE: 'UAE' };

interface VersionSummary {
  id: string;
  status: 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED';
  version: string | null;
  acceptanceVersion: string | null;
  title: string;
  changeSummary: string | null;
  publishedAt: string | null;
  updatedAt?: string;
}
interface OverviewRow {
  type: string;
  slug: string;
  title: string;
  url: string;
  requiredForAll: boolean;
  edition: Edition;
  published: VersionSummary | null;
  draft: VersionSummary | null;
}
interface FullVersion extends VersionSummary {
  type: string;
  edition: Edition;
  content: string;
}

const OVERVIEW = ['admin', 'legal'] as const;
const errorText = (e: unknown) => {
  const msg = (e as any)?.response?.data?.message;
  return Array.isArray(msg) ? msg.join(', ') : typeof msg === 'string' ? msg : 'Something went wrong. Please try again.';
};

export default function AdminLegalPage() {
  const { user } = useAuth();
  const canPublish = user?.role === 'SUPERADMIN';
  const qc = useQueryClient();
  const overview = useQuery({
    queryKey: OVERVIEW,
    queryFn: async () => (await apiClient.get<OverviewRow[]>('/admin/legal')).data,
  });
  const [selected, setSelected] = useState<{ type: string; edition: Edition } | null>(null);

  const docs = useMemo(() => {
    const byType = new Map<string, OverviewRow[]>();
    for (const r of overview.data ?? []) byType.set(r.type, [...(byType.get(r.type) ?? []), r]);
    return [...byType.values()];
  }, [overview.data]);
  const row = overview.data?.find((r) => r.type === selected?.type && r.edition === selected?.edition) ?? null;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Legal documents</h1>
        <p className="text-sm text-gray-500 mt-1 max-w-3xl">
          Terms, Privacy and the clinic and therapist agreements. Edit a draft, preview it, then publish. Every published
          version is kept, so you can always show exactly what someone agreed to.
          {canPublish ? '' : ' Only a super admin can publish.'}
        </p>
      </div>

      {overview.isLoading ? (
        <ListSkeleton rows={4} />
      ) : overview.isError ? (
        <p className="text-sm text-red-600">{errorText(overview.error)}</p>
      ) : selected && row ? (
        <Editor row={row} canPublish={canPublish} onBack={() => setSelected(null)} onChanged={() => qc.invalidateQueries({ queryKey: OVERVIEW })} />
      ) : (
        <div className="space-y-4">
          {docs.map((rows) => (
            <div key={rows[0].type} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{rows[0].title}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {rows[0].requiredForAll ? 'Every account accepts this at sign-up.' : 'Shown publicly; accepted by the relevant organisations and therapists.'}{' '}
                    <a href={rows[0].url} target="_blank" rel="noopener noreferrer" className="text-teal-700 underline">
                      View public page
                    </a>
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {rows.map((r) => (
                  <button
                    key={r.edition}
                    onClick={() => setSelected({ type: r.type, edition: r.edition })}
                    className="text-left rounded-xl border border-gray-200 px-4 py-3 hover:border-teal-400 hover:bg-teal-50/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">{EDITION_LABEL[r.edition]}</span>
                      {r.draft && <span className="text-[11px] font-semibold rounded-full bg-amber-50 text-amber-700 px-2 py-0.5">Draft</span>}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {r.published
                        ? `Version ${r.published.version} · ${formatLegalDate(r.published.publishedAt)}`
                        : r.edition === 'GLOBAL'
                          ? 'Not published'
                          : 'Not published — the Global text is shown'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Editor({
  row,
  canPublish,
  onBack,
  onChanged,
}: {
  row: OverviewRow;
  canPublish: boolean;
  onBack: () => void;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const historyKey = ['admin', 'legal', row.type, row.edition, 'history'];
  const history = useQuery({
    queryKey: historyKey,
    queryFn: async () => (await apiClient.get<VersionSummary[]>(`/admin/legal/${row.type}/history`, { params: { edition: row.edition } })).data,
  });
  const draftId = row.draft?.id ?? null;
  const draft = useQuery({
    queryKey: ['admin', 'legal', 'version', draftId],
    queryFn: async () => (await apiClient.get<FullVersion>(`/admin/legal/versions/${draftId}`)).data,
    enabled: !!draftId,
  });
  const published = useQuery({
    queryKey: ['admin', 'legal', 'version', row.published?.id],
    queryFn: async () => (await apiClient.get<FullVersion>(`/admin/legal/versions/${row.published!.id}`)).data,
    enabled: !!row.published && !draftId,
  });

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (draft.data) {
      setTitle(draft.data.title);
      setContent(draft.data.content);
      setSummary(draft.data.changeSummary ?? '');
    }
  }, [draft.data?.id]);

  const refresh = () => {
    onChanged();
    qc.invalidateQueries({ queryKey: historyKey });
  };
  const start = useMutation({
    mutationFn: async () => (await apiClient.post(`/admin/legal/${row.type}/drafts`, { edition: row.edition })).data,
    onSuccess: refresh,
    onError: (e) => setError(errorText(e)),
  });
  const save = useMutation({
    mutationFn: async () => (await apiClient.patch(`/admin/legal/versions/${draftId}`, { title, content, changeSummary: summary })).data,
    onSuccess: () => {
      setError(null);
      setSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      qc.invalidateQueries({ queryKey: ['admin', 'legal', 'version', draftId] });
      refresh();
    },
    onError: (e) => setError(errorText(e)),
  });
  const discard = useMutation({
    mutationFn: async () => (await apiClient.delete(`/admin/legal/versions/${draftId}`)).data,
    onSuccess: () => {
      setTitle('');
      setContent('');
      setSummary('');
      refresh();
    },
    onError: (e) => setError(errorText(e)),
  });

  const dirty = !!draft.data && (title !== draft.data.title || content !== draft.data.content || summary !== (draft.data.changeSummary ?? ''));

  return (
    <div>
      <button onClick={onBack} className="text-sm text-teal-700 font-medium mb-3">
        ← All documents
      </button>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {row.title} · {EDITION_LABEL[row.edition]}
          </h2>
          <p className="text-sm text-gray-500">
            {row.published
              ? `Live: version ${row.published.version}, published ${formatLegalDate(row.published.publishedAt)}.`
              : 'Not published yet.'}{' '}
            {row.requiredForAll && row.published?.acceptanceVersion && `Users accept version ${row.published.acceptanceVersion}.`}
          </p>
        </div>
        {!draftId && (
          <button
            onClick={() => start.mutate()}
            disabled={start.isPending}
            className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {start.isPending ? 'Opening…' : row.published ? 'Edit (new draft)' : 'Write first version'}
          </button>
        )}
      </div>

      {error && <p className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 min-w-0">
          {draftId ? (
            draft.isLoading ? (
              <ListSkeleton rows={3} />
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-semibold rounded-full bg-amber-50 text-amber-700 px-2.5 py-1">
                    Draft — not visible to users
                  </span>
                  <div className="flex rounded-lg bg-gray-100 p-0.5 text-xs font-semibold">
                    {(['edit', 'preview'] as const).map((v) => (
                      <button key={v} onClick={() => setView(v)} className={`rounded-md px-3 py-1 ${view === v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                        {v === 'edit' ? 'Edit' : 'Preview'}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm mb-3" />
                {view === 'edit' ? (
                  <>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Text (Markdown: <code>## Heading</code>, <code>**bold**</code>, <code>- list item</code>, blank line between paragraphs)
                    </label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      spellCheck
                      className="w-full min-h-[520px] rounded-xl border border-gray-200 px-3 py-2 font-mono text-[13px] leading-relaxed"
                    />
                  </>
                ) : (
                  <div className="rounded-xl border border-gray-100 p-5 max-h-[640px] overflow-y-auto">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
                    <LegalMarkdown content={content} />
                  </div>
                )}
                <label className="block text-xs font-medium text-gray-600 mt-4 mb-1">What changed (shown in the version history)</label>
                <input
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  maxLength={300}
                  placeholder="e.g. Added the CIN and registered office"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => save.mutate()}
                    disabled={!dirty || save.isPending}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-40"
                  >
                    {save.isPending ? 'Saving…' : 'Save draft'}
                  </button>
                  <button
                    onClick={() => setPublishing(true)}
                    disabled={!canPublish || dirty || save.isPending}
                    title={!canPublish ? 'Only a super admin can publish' : dirty ? 'Save the draft first' : undefined}
                    className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    Publish…
                  </button>
                  <button
                    onClick={() => discard.mutate()}
                    disabled={discard.isPending}
                    className="ml-auto text-sm font-medium text-gray-500 hover:text-red-600"
                  >
                    Discard draft
                  </button>
                  {saved && !dirty && <span className="text-xs text-gray-400">Saved {saved}</span>}
                  {dirty && <span className="text-xs text-amber-700">Unsaved changes</span>}
                </div>
              </>
            )
          ) : published.data ? (
            <>
              <span className="text-xs font-semibold rounded-full bg-teal-50 text-teal-700 px-2.5 py-1">Live version {published.data.version}</span>
              <div className="mt-4 max-h-[640px] overflow-y-auto">
                <LegalMarkdown content={published.data.content} />
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              {row.edition === 'GLOBAL' ? 'Nothing published yet.' : `No ${EDITION_LABEL[row.edition]} edition yet. Users there see the Global text.`}
            </p>
          )}
        </div>

        <aside className="bg-white rounded-2xl border border-gray-200 p-5 h-fit">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Version history</h3>
          {history.isLoading ? (
            <ListSkeleton rows={3} />
          ) : !history.data?.length ? (
            <p className="text-xs text-gray-500">No versions yet.</p>
          ) : (
            <ol className="space-y-3">
              {history.data.map((h) => (
                <li key={h.id} className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-gray-900">{h.status === 'DRAFT' ? 'Draft' : h.version}</span>
                    {h.status === 'PUBLISHED' && <span className="rounded-full bg-teal-50 text-teal-700 px-1.5">live</span>}
                    {h.status !== 'DRAFT' && h.acceptanceVersion === h.version && row.requiredForAll && (
                      <span className="rounded-full bg-blue-50 text-blue-700 px-1.5">re-accept</span>
                    )}
                  </div>
                  <div className="text-gray-500">{h.changeSummary ?? '—'}</div>
                  {h.status !== 'DRAFT' && (
                    <a
                      href={`${row.url}?version=${encodeURIComponent(h.version!)}${row.edition !== 'GLOBAL' ? `&edition=${row.edition}` : ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-700 underline"
                    >
                      {formatLegalDate(h.publishedAt)} · view
                    </a>
                  )}
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>

      {publishing && draftId && (
        <PublishDialog
          row={row}
          draftId={draftId}
          summary={summary}
          onClose={() => setPublishing(false)}
          onPublished={() => {
            setPublishing(false);
            setTitle('');
            setContent('');
            setSummary('');
            refresh();
          }}
        />
      )}
    </div>
  );
}

function PublishDialog({
  row,
  draftId,
  summary,
  onClose,
  onPublished,
}: {
  row: OverviewRow;
  draftId: string;
  summary: string;
  onClose: () => void;
  onPublished: () => void;
}) {
  const [reaccept, setReaccept] = useState<boolean | null>(row.requiredForAll ? null : false);
  const [changeSummary, setChangeSummary] = useState(summary);
  const [error, setError] = useState<string | null>(null);
  const publish = useMutation({
    mutationFn: async () =>
      (await apiClient.post(`/admin/legal/versions/${draftId}/publish`, { requireAcceptance: reaccept === true, changeSummary })).data,
    onSuccess: onPublished,
    onError: (e) => setError(errorText(e)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900">Publish {row.title}</h3>
        <p className="text-sm text-gray-500 mt-1">
          The new text replaces the live page for {EDITION_LABEL[row.edition]} users at once. The current version stays in the history.
        </p>
        {row.requiredForAll && (
          <fieldset className="mt-4 space-y-2">
            <legend className="text-sm font-semibold text-gray-800 mb-1">Should everyone accept again?</legend>
            {[
              [true, 'Yes — this is a real change', 'Every user is asked to review and accept on their next visit.'],
              [false, 'No — wording fix only', 'Typos, formatting, contact details. Nobody is prompted.'],
            ].map(([value, label, hint]) => (
              <label
                key={String(value)}
                className={`flex gap-3 rounded-xl border p-3 cursor-pointer ${reaccept === value ? 'border-teal-500 bg-teal-50/50' : 'border-gray-200'}`}
              >
                <input type="radio" name="reaccept" checked={reaccept === value} onChange={() => setReaccept(value as boolean)} className="mt-1" />
                <span>
                  <span className="block text-sm font-semibold text-gray-900">{label as string}</span>
                  <span className="block text-xs text-gray-500">{hint as string}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}
        <label className="block text-xs font-medium text-gray-600 mt-4 mb-1">What changed</label>
        <input
          value={changeSummary}
          onChange={(e) => setChangeSummary(e.target.value)}
          maxLength={300}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
        />
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700">
            Cancel
          </button>
          <button
            onClick={() => publish.mutate()}
            disabled={reaccept === null || !changeSummary.trim() || publish.isPending}
            className="flex-1 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {publish.isPending ? 'Publishing…' : 'Publish now'}
          </button>
        </div>
      </div>
    </div>
  );
}
