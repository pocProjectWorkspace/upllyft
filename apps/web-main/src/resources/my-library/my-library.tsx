'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogTitle, Skeleton, useDebounce } from '@upllyft/ui';
import { AssignDialog } from '@/resources/journey/assign-dialog';
import { journeyApi } from '@/resources/journey/api';
import { journeyKeys } from '@/resources/journey/hooks';
import { useOpenResource } from '@/resources/journey/open-resource';
import { DOMAINS, domainLabel } from '@/resources/journey/ui';
import { cloneWorksheet, publishWorksheet } from '@/resources/lib/api/worksheets';
import type { WorksheetType } from '@/resources/lib/api/worksheets';
import { difficultyLabels, domainLabels, worksheetTypeLabels } from '@/resources/lib/utils';
import { myLibraryApi, myLibraryKeys, type Creation, type CreationsPage, type SavedItem, type SavedPage } from './api';

// My Library (handoff "My Library v2"): Your Resources (saved from the Resource
// Library) and Create New (the therapist's own creations), behind one toggle.

type Tab = 'saved' | 'create';
type Sort = 'recent' | 'used' | 'az';
type View = 'grid' | 'list';

const PAGE = 24;
const UNDO_MS = 3500;
const VIEW_KEY = 'upllyft.myLibrary.view';

const ICON = {
  ws: 'M9 3h6a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2V4a1 1 0 0 1 1-1zM9 12h6M9 16h4',
  vis: 'M4 4h16v16H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01',
  story: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M9 8h6M9 12h4',
  guide: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM20 17v4H6.5',
  video: 'M4 6h12v12H4zM16 10l4-2v8l-4-2',
  blank: 'M12 5v14M5 12h14',
};

// Type-tinted thumbnail fallback (prototype TY map).
function tone(type: string): { icon: string; tint: string; ink: string } {
  const t = type.toLowerCase();
  if (t.includes('social')) return { icon: ICON.story, tint: '#fdf3e7', ink: '#b8681a' };
  if (t.includes('visual')) return { icon: ICON.vis, tint: '#edf2fd', ink: '#3a63c9' };
  if (t.includes('video')) return { icon: ICON.video, tint: '#f3eefb', ink: '#7a4fc0' };
  if (t.includes('guide')) return { icon: ICON.guide, tint: '#f3eefb', ink: '#7a4fc0' };
  return { icon: ICON.ws, tint: '#e9f7f3', ink: '#12998c' };
}

function TypeIcon({ path, className = 'h-7 w-7', color }: { path: string; className?: string; color: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

function relative(date: string | null): string {
  if (!date) return '';
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 864e5);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return '1 week ago';
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function usageLine(u: SavedItem['usage']): string {
  if (!u.clientCount) return 'Not used with a client yet';
  return `Used with ${u.clientCount} client${u.clientCount === 1 ? '' : 's'} · ${relative(u.lastUsedAt)}`;
}

function ages(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `Ages ${min}–${max}`;
  return min != null ? `Ages ${min}+` : `Up to ${max}`;
}

// Grid / list choice, remembered per browser (spec 11.7).
const viewListeners = new Set<() => void>();
function subscribeView(cb: () => void) {
  viewListeners.add(cb);
  return () => viewListeners.delete(cb);
}
function readView(): View {
  return window.localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid';
}
function writeView(v: View) {
  window.localStorage.setItem(VIEW_KEY, v);
  viewListeners.forEach((cb) => cb());
}

function apiMessage(e: unknown, fallback: string): string {
  const m = (e as { response?: { data?: { message?: unknown } } } | null)?.response?.data?.message;
  return typeof m === 'string' ? m : fallback;
}

const selectCls =
  'h-11 rounded-xl border border-[#E7EDED] bg-white px-3 text-sm text-[#0F1D20] focus:outline-none focus:ring-2 focus:ring-[#12998C]/30';

// ── toast with an action (Undo / View) ───────────────────────────────────────

interface ToastState {
  msg: string;
  action?: { label: string; run: () => void };
}

function useActionToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((t: ToastState, ms = 4000) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(t);
    timer.current = setTimeout(() => setToast(null), ms);
  }, []);
  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
  }, []);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  // Stable identity, so callbacks that use it don't defeat the memoised cards.
  return useMemo(() => ({ toast, show, hide }), [toast, show, hide]);
}

// ── page ─────────────────────────────────────────────────────────────────────

export function MyLibrary() {
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'create' ? 'create' : 'saved');
  const qc = useQueryClient();
  const toast = useActionToast();

  // Load both tabs' counts up front so both badges are right before switching.
  const saved = useQuery({ queryKey: myLibraryKeys.saved(), queryFn: myLibraryApi.saved });
  const creations = useQuery({ queryKey: myLibraryKeys.creations(), queryFn: myLibraryApi.creations });

  // Unsave is optimistic: hidden at once, committed when the Undo window closes.
  const [pending, setPending] = useState<SavedItem[]>([]);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirrors `pending` for timers and unmount; every setPending below updates it too.
  const pendingRef = useRef<SavedItem[]>([]);

  const commitPending = useCallback(async () => {
    const items = pendingRef.current;
    if (!items.length) return;
    pendingRef.current = [];
    setPending([]);
    const results = await Promise.allSettled(items.map((i) => myLibraryApi.unsave(i.kind, i.id)));
    if (results.some((r) => r.status === 'rejected')) {
      toast.show({ msg: 'Couldn’t remove. Try again.' });
    }
    qc.invalidateQueries({ queryKey: myLibraryKeys.all });
  }, [qc, toast]);

  // Leaving the page commits what the toast was still holding.
  useEffect(() => () => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    const items = pendingRef.current;
    if (items.length) items.forEach((i) => void myLibraryApi.unsave(i.kind, i.id));
  }, []);

  const unsave = useCallback(
    (items: SavedItem[]) => {
      // A new unsave closes the previous Undo window first.
      if (commitTimer.current) clearTimeout(commitTimer.current);
      void commitPending().then(() => {
        pendingRef.current = items;
        setPending(items);
        commitTimer.current = setTimeout(() => void commitPending(), UNDO_MS);
        toast.show(
          {
            msg: items.length > 1 ? `${items.length} resources removed from your library` : 'Removed from your library',
            action: {
              label: 'Undo',
              run: () => {
                if (commitTimer.current) clearTimeout(commitTimer.current);
                pendingRef.current = [];
                setPending([]);
                toast.hide();
              },
            },
          },
          UNDO_MS,
        );
      });
    },
    [commitPending, toast],
  );

  const pendingIds = useMemo(() => new Set(pending.map((p) => p.savedId)), [pending]);
  const savedCount = (saved.data?.counts.saved ?? 0) - pending.length;
  const createdCount = creations.data?.counts.all ?? saved.data?.counts.created ?? 0;

  const switchTab = useCallback((next: Tab) => {
    setTab(next);
    // replaceState keeps Back and deep links working without a navigation.
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    window.history.replaceState(window.history.state, '', url.toString());
  }, []);

  const savedTabRef = useRef<HTMLButtonElement>(null);
  const createTabRef = useRef<HTMLButtonElement>(null);
  function onTabKey(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const next: Tab = tab === 'saved' ? 'create' : 'saved';
    switchTab(next);
    (next === 'saved' ? savedTabRef : createTabRef).current?.focus();
  }

  const router = useRouter();
  const isSaved = tab === 'saved';
  // The bulk action bar sits where the toast does; the toast moves up while it shows.
  const [bulkBar, setBulkBar] = useState(false);

  return (
    <div className="mx-auto max-w-[1320px] space-y-6 pb-24 text-[#0F1D20]">
      <div>
        <nav aria-label="Breadcrumb" className="mb-2 text-sm text-[#5B6B70]">
          <Link href="/resources/library" className="hover:text-[#12998C]">
            Resources
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[#0F1D20]">My Library</span>
        </nav>
        <div className="flex flex-col gap-4 min-[900px]:flex-row min-[900px]:items-end min-[900px]:justify-between">
          <div>
            <h1 className="text-[34px] font-bold leading-tight tracking-[-0.025em]">My Library</h1>
            <p className="mt-1 text-[15px] text-[#5B6B70]">
              {isSaved
                ? 'Resources you’ve saved from the Resource Library, ready to use in sessions.'
                : 'Worksheets, visual supports and stories you’ve made yourself.'}
            </p>
          </div>
          <div className="flex flex-col gap-3 min-[900px]:flex-row min-[900px]:items-center">
            <div
              role="tablist"
              aria-label="My Library"
              onKeyDown={onTabKey}
              className="relative grid h-[52px] w-full grid-cols-2 rounded-[14px] bg-[#EAEFEF] p-1 min-[900px]:w-[400px]"
            >
              <span
                aria-hidden
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-[10px] bg-white shadow-sm transition-[left] duration-300 ease-[cubic-bezier(.3,.7,.2,1)]"
                style={{ left: isSaved ? '4px' : '50%' }}
              />
              {(
                [
                  { key: 'saved', label: 'Your Resources', count: savedCount, ref: savedTabRef, icon: 'M5 4a1 1 0 011-1h12a1 1 0 011 1v17l-7-4-7 4V4z' },
                  { key: 'create', label: 'Create New', count: createdCount, ref: createTabRef, icon: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z' },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  ref={t.ref}
                  role="tab"
                  id={`my-library-tab-${t.key}`}
                  aria-selected={tab === t.key}
                  aria-controls={`my-library-panel-${t.key}`}
                  tabIndex={tab === t.key ? 0 : -1}
                  type="button"
                  onClick={() => switchTab(t.key)}
                  className={`relative z-10 flex items-center justify-center gap-2 text-sm font-semibold ${
                    tab === t.key ? 'text-[#0F1D20]' : 'text-[#6B7C80]'
                  }`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d={t.icon} />
                  </svg>
                  {t.label}
                  <span className="rounded-full bg-[#E2F3F0] px-2 py-0.5 text-xs text-[#12998C]">{t.count}</span>
                </button>
              ))}
            </div>
            {/* Mounted only on Create New (QA: not in the DOM on ?tab=saved). */}
            {!isSaved && (
              <button
                type="button"
                onClick={() => router.push('/resources/create')}
                className="h-[52px] w-full rounded-[14px] bg-[#12998C] px-6 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(18,153,140,.28)] hover:bg-[#0E8A7F] min-[900px]:w-auto"
              >
                Create Something New
              </button>
            )}
          </div>
        </div>
      </div>

      <div
        role="tabpanel"
        id="my-library-panel-saved"
        aria-labelledby="my-library-tab-saved"
        hidden={!isSaved}
      >
        <SavedTab
          query={saved}
          pendingIds={pendingIds}
          onUnsave={unsave}
          active={isSaved}
          onBulkBar={setBulkBar}
          toast={toast}
          onViewCreations={() => switchTab('create')}
        />
      </div>
      <div
        role="tabpanel"
        id="my-library-panel-create"
        aria-labelledby="my-library-tab-create"
        hidden={isSaved}
      >
        <CreateTab query={creations} toast={toast} />
      </div>

      {toast.toast && (
        <div
          role="status"
          className={`fixed left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-xl bg-[#0F1D20] px-5 py-3 text-sm text-white shadow-lg transition-[bottom] ${
            isSaved && bulkBar ? 'bottom-[96px]' : 'bottom-7'
          }`}
        >
          <span>{toast.toast.msg}</span>
          {toast.toast.action && (
            <button type="button" onClick={toast.toast.action.run} className="font-semibold text-[#7FD8CD] hover:underline">
              {toast.toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Your Resources ───────────────────────────────────────────────────────────

function SavedTab({
  query,
  pendingIds,
  onUnsave,
  active,
  onBulkBar,
  toast,
  onViewCreations,
}: {
  query: UseQueryResult<SavedPage>;
  pendingIds: Set<string>;
  onUnsave: (items: SavedItem[]) => void;
  active: boolean;
  onBulkBar: (on: boolean) => void;
  toast: ReturnType<typeof useActionToast>;
  onViewCreations: () => void;
}) {
  const qc = useQueryClient();
  const { open: openResource, viewer } = useOpenResource();

  // Filter state survives switching tabs (the component stays mounted).
  const [q, setQ] = useState('');
  const search = useDebounce(q, 250);
  const [type, setType] = useState('All');
  const [diff, setDiff] = useState('All');
  const [domain, setDomain] = useState('All');
  const [coll, setColl] = useState('all');
  const [sort, setSort] = useState<Sort>('recent');
  const view = useSyncExternalStore(subscribeView, readView, () => 'grid' as View);
  const [showFilters, setShowFilters] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [shown, setShown] = useState(PAGE);
  const [assignFor, setAssignFor] = useState<SavedItem | null>(null);
  const [bulkModal, setBulkModal] = useState<'client' | 'collection' | null>(null);
  const [newCollOpen, setNewCollOpen] = useState(false);
  const [newCollName, setNewCollName] = useState('');

  const changeView = writeView;

  // Switching tabs leaves select mode (adjusted during render, not in an effect).
  const [wasActive, setWasActive] = useState(active);
  if (wasActive !== active) {
    setWasActive(active);
    if (!active) {
      setSelectMode(false);
      setSelected([]);
    }
  }
  useEffect(() => {
    onBulkBar(selectMode && active);
  }, [selectMode, active, onBulkBar]);

  const all = useMemo(
    () => (query.data?.items ?? []).filter((i) => !pendingIds.has(i.savedId)),
    [query.data, pendingIds],
  );
  const typeOptions = useMemo(() => [...new Set(all.map((i) => i.type))].sort(), [all]);

  const list = useMemo(() => {
    const ql = search.trim().toLowerCase();
    const out = all.filter(
      (r) =>
        (coll === 'all' || r.collectionIds.includes(coll)) &&
        (type === 'All' || r.type === type) &&
        (diff === 'All' || r.difficulty === diff) &&
        (domain === 'All' || r.domains.includes(domain as never)) &&
        (!ql || `${r.title} ${r.description ?? ''}`.toLowerCase().includes(ql)),
    );
    if (sort === 'used') return [...out].sort((a, b) => b.usage.clientCount - a.usage.clientCount);
    if (sort === 'az') return [...out].sort((a, b) => a.title.localeCompare(b.title));
    return out; // API order: most recently saved first
  }, [all, search, coll, type, diff, domain, sort]);

  const filtered = coll !== 'all' || !!search.trim() || type !== 'All' || diff !== 'All' || domain !== 'All';
  const visible = list.slice(0, shown);
  const collections = useMemo(
    () =>
      (query.data?.collections ?? []).map((c) => ({
        ...c,
        count: all.filter((i) => i.collectionIds.includes(c.id)).length,
      })),
    [query.data, all],
  );

  // Infinite scroll in pages of 24.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setShown((n) => n + PAGE);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [visible.length]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }, []);

  const customise = useMutation({
    mutationFn: (r: SavedItem) => cloneWorksheet(r.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: myLibraryKeys.creations() });
      toast.show({ msg: 'Editable copy added to Create New', action: { label: 'View', run: () => { toast.hide(); onViewCreations(); } } });
    },
    onError: () => toast.show({ msg: 'Couldn’t make a copy. Try again.' }),
  });

  const createColl = useMutation({
    mutationFn: (name: string) => myLibraryApi.createCollection(name),
    onSuccess: (c) => {
      setNewCollOpen(false);
      setNewCollName('');
      setColl(c.id);
      qc.invalidateQueries({ queryKey: myLibraryKeys.saved() });
      toast.show({ msg: `Collection “${c.name}” created` });
    },
    onError: (e) => toast.show({ msg: apiMessage(e, 'Couldn’t create the collection.') }),
  });

  const onCardUnsave = useCallback((r: SavedItem) => onUnsave([r]), [onUnsave]);
  const onCardAssign = useCallback((r: SavedItem) => setAssignFor(r), []);
  const onCardCustomise = useCallback((r: SavedItem) => customise.mutate(r), [customise]);
  const onCardOpen = useCallback(
    (r: SavedItem) => {
      if (selectMode) toggleSelect(r.savedId);
      else openResource(r);
    },
    [selectMode, toggleSelect, openResource],
  );

  const selectedItems = all.filter((i) => selected.includes(i.savedId));

  if (query.isLoading) {
    return (
      <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(290px,1fr))]">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[340px] rounded-[18px]" />
        ))}
      </div>
    );
  }

  const nothingSaved = all.length === 0;

  return (
    <div className="space-y-4">
      {/* 11.1 Collections */}
      {!nothingSaved && (
        <div className="flex flex-wrap items-center gap-2">
          {[{ id: 'all', name: 'All saved', count: all.length, folder: false }, ...collections.map((c) => ({ ...c, folder: true }))].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setColl(c.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium ${
                coll === c.id ? 'border-[#0F1D20] bg-[#0F1D20] text-white' : 'border-[#E7EDED] bg-white text-[#3D4C50]'
              }`}
            >
              {c.folder && (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
              )}
              {c.name}
              <span className="opacity-70">{c.count}</span>
            </button>
          ))}
          {newCollOpen ? (
            <span className="inline-flex items-center gap-1.5">
              <input
                autoFocus
                value={newCollName}
                maxLength={60}
                onChange={(e) => setNewCollName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCollName.trim()) createColl.mutate(newCollName.trim());
                  if (e.key === 'Escape') {
                    setNewCollOpen(false);
                    setNewCollName('');
                  }
                }}
                placeholder="Collection name"
                aria-label="New collection name"
                className="h-9 rounded-full border border-[#E7EDED] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#12998C]/30"
              />
              <button
                type="button"
                disabled={!newCollName.trim() || createColl.isPending}
                onClick={() => createColl.mutate(newCollName.trim())}
                className="h-9 rounded-full bg-[#12998C] px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                Add
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setNewCollOpen(true)}
              className="rounded-full border border-dashed border-[#C5D2D2] px-3.5 py-1.5 text-sm font-medium text-[#5B6B70] hover:border-[#12998C] hover:text-[#12998C]"
            >
              + New collection
            </button>
          )}
        </div>
      )}

      {/* Filter bar (collapses to a Filters button on small screens) */}
      {!nothingSaved && (
        <>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            className="h-11 w-full rounded-xl border border-[#E7EDED] bg-white text-sm font-semibold min-[640px]:hidden"
          >
            Filters
          </button>
          <div
            className={`${showFilters ? 'flex' : 'hidden'} flex-col gap-3 rounded-[18px] border border-[#E7EDED] bg-white p-3.5 min-[640px]:flex min-[640px]:flex-row min-[640px]:flex-wrap`}
          >
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setShown(PAGE);
              }}
              placeholder="Search saved resources…"
              aria-label="Search saved resources"
              className={`${selectCls} flex-1 min-[640px]:min-w-[320px]`}
            />
            <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Type" className={selectCls}>
              <option value="All">All Types</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select value={diff} onChange={(e) => setDiff(e.target.value)} aria-label="Difficulty" className={selectCls}>
              <option value="All">All Difficulties</option>
              {Object.entries(difficultyLabels).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
            <select value={domain} onChange={(e) => setDomain(e.target.value)} aria-label="Domain" className={selectCls}>
              <option value="All">All Domains</option>
              {DOMAINS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Result line + toolbar */}
      {!nothingSaved && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#5B6B70]">
            Showing <span className="font-semibold text-[#0F1D20]">{list.length}</span> saved from the Resource Library
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/resources/library" className="mr-2 text-sm font-semibold text-[#12998C] hover:underline">
              Browse Resource Library →
            </Link>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort" className={`${selectCls} h-10`}>
              <option value="recent">Recently saved</option>
              <option value="used">Most used</option>
              <option value="az">A–Z</option>
            </select>
            <div className="flex rounded-xl bg-[#EAEFEF] p-1" role="group" aria-label="View">
              {(['grid', 'list'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  aria-label={v === 'grid' ? 'Grid view' : 'List view'}
                  onClick={() => changeView(v)}
                  className={`flex h-8 w-9 items-center justify-center rounded-lg ${view === v ? 'bg-white shadow-sm' : 'text-[#6B7C80]'}`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d={v === 'grid' ? 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' : 'M4 6h16M4 12h16M4 18h16'} />
                  </svg>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectMode((m) => !m);
                setSelected([]);
              }}
              className={`h-10 rounded-xl px-4 text-sm font-semibold ${
                selectMode ? 'bg-[#0F1D20] text-white' : 'border border-[#E7EDED] bg-white text-[#0F1D20]'
              }`}
            >
              {selectMode ? 'Done' : 'Select'}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {nothingSaved ? (
        <EmptyCard
          title="Save resources from the Library to see them here"
          body="Use the bookmark on any Resource Library item to keep it in My Library, ready for sessions."
          cta
        />
      ) : list.length === 0 ? (
        <EmptyCard
          title="No saved resources match"
          body={filtered ? 'Try clearing a filter or searching for something else.' : ''}
          onClear={() => {
            setQ('');
            setType('All');
            setDiff('All');
            setDomain('All');
            setColl('all');
          }}
        />
      ) : view === 'grid' ? (
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(290px,1fr))]">
          {visible.map((r) => (
            <SavedCard
              key={r.savedId}
              r={r}
              collectionNames={collections.filter((c) => r.collectionIds.includes(c.id)).map((c) => c.name)}
              selectMode={selectMode}
              selected={selected.includes(r.savedId)}
              onOpen={onCardOpen}
              onUnsave={onCardUnsave}
              onAssign={onCardAssign}
              onCustomise={onCardCustomise}
            />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-[#E7EDED] overflow-hidden rounded-[18px] border border-[#E7EDED] bg-white">
          {visible.map((r) => (
            <SavedRow
              key={r.savedId}
              r={r}
              selectMode={selectMode}
              selected={selected.includes(r.savedId)}
              onOpen={onCardOpen}
              onUnsave={onCardUnsave}
              onAssign={onCardAssign}
              onCustomise={onCardCustomise}
            />
          ))}
        </div>
      )}
      {visible.length < list.length && <div ref={sentinel} className="h-10" />}

      {/* 11.5 Bulk action bar */}
      {selectMode && active && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-2xl bg-[#0F1D20] px-3 py-2 text-sm text-white shadow-xl">
          <span className="px-2 font-semibold">{selected.length} selected</span>
          {(
            [
              { label: 'Add to collection', run: () => setBulkModal('collection') },
              { label: 'Use with client', run: () => setBulkModal('client') },
              { label: 'Unsave', run: () => { onUnsave(selectedItems); setSelectMode(false); setSelected([]); } },
            ] as const
          ).map((a) => (
            <button
              key={a.label}
              type="button"
              disabled={!selected.length}
              onClick={a.run}
              className="rounded-lg px-3 py-1.5 hover:bg-white/10 disabled:opacity-40"
            >
              {a.label}
            </button>
          ))}
          <button
            type="button"
            aria-label="Leave select mode"
            onClick={() => {
              setSelectMode(false);
              setSelected([]);
            }}
            className="rounded-lg px-2 py-1.5 hover:bg-white/10"
          >
            ✕
          </button>
        </div>
      )}

      {/* 11.2 Use with client: the shared assign journey, resource fixed. */}
      {assignFor && (
        <AssignDialog
          key={assignFor.savedId}
          open
          resource={assignFor}
          onClose={() => {
            setAssignFor(null);
            qc.invalidateQueries({ queryKey: myLibraryKeys.saved() });
          }}
        />
      )}
      <BulkClientModal
        open={bulkModal === 'client'}
        items={selectedItems}
        onClose={() => setBulkModal(null)}
        onDone={(msg) => {
          setBulkModal(null);
          setSelectMode(false);
          setSelected([]);
          qc.invalidateQueries({ queryKey: myLibraryKeys.saved() });
          toast.show({ msg });
        }}
      />
      <CollectionModal
        open={bulkModal === 'collection'}
        collections={collections}
        savedIds={selected}
        onClose={() => setBulkModal(null)}
        onDone={(msg) => {
          setBulkModal(null);
          setSelectMode(false);
          setSelected([]);
          qc.invalidateQueries({ queryKey: myLibraryKeys.saved() });
          toast.show({ msg });
        }}
      />
      {viewer}
    </div>
  );
}

function EmptyCard({ title, body, cta, onClear }: { title: string; body: string; cta?: boolean; onClear?: () => void }) {
  return (
    <div className="rounded-[18px] border-2 border-dashed border-[#D5DFDF] bg-white px-6 py-14 text-center">
      <p className="text-lg font-semibold">{title}</p>
      {body && <p className="mt-1 text-sm text-[#5B6B70]">{body}</p>}
      <div className="mt-5 flex items-center justify-center gap-4">
        {onClear && (
          <button type="button" onClick={onClear} className="text-sm font-semibold text-[#0F1D20] hover:underline">
            Clear filters
          </button>
        )}
        <Link
          href="/resources/library"
          className={
            cta
              ? 'rounded-xl bg-[#12998C] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0E8A7F]'
              : 'text-sm font-semibold text-[#12998C] hover:underline'
          }
        >
          Browse the Resource Library
        </Link>
      </div>
    </div>
  );
}

interface CardProps {
  r: SavedItem;
  selectMode: boolean;
  selected: boolean;
  onOpen: (r: SavedItem) => void;
  onUnsave: (r: SavedItem) => void;
  onAssign: (r: SavedItem) => void;
  onCustomise: (r: SavedItem) => void;
}

function UnsaveButton({ r, onUnsave }: { r: SavedItem; onUnsave: (r: SavedItem) => void }) {
  return (
    <button
      type="button"
      aria-label={`Remove ${r.title} from My Library`}
      title="Remove from My Library"
      onClick={(e) => {
        e.stopPropagation();
        onUnsave(r);
      }}
      className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-white text-[#12998C] shadow-sm hover:bg-[#E2F3F0]"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={2}>
        <path strokeLinejoin="round" d="M5 4a1 1 0 011-1h12a1 1 0 011 1v17l-7-4-7 4V4z" />
      </svg>
    </button>
  );
}

function Checkbox({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-flex h-6 w-6 items-center justify-center rounded-md border-2 ${on ? 'border-[#12998C] bg-[#12998C]' : 'border-[#C5D2D2] bg-white'}`}
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke={on ? '#fff' : 'transparent'} strokeWidth={3}>
        <path d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}

const SavedCard = memo(function SavedCard({
  r,
  collectionNames,
  selectMode,
  selected,
  onOpen,
  onUnsave,
  onAssign,
  onCustomise,
}: CardProps & { collectionNames: string[] }) {
  const t = tone(r.type);
  const age = ages(r.ageMin, r.ageMax);
  return (
    <article
      onClick={() => onOpen(r)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (e.preventDefault(), onOpen(r))}
      tabIndex={0}
      aria-label={selectMode ? `${r.title}${selected ? ', selected' : ''}` : undefined}
      className={`group flex cursor-pointer flex-col overflow-hidden rounded-[18px] border bg-white transition-all duration-200 hover:-translate-y-[3px] hover:border-[#CFE6E2] hover:shadow-[0_14px_34px_rgba(15,29,32,.08)] ${
        selected ? 'border-[#12998C] ring-[3px] ring-[#12998C]/20' : 'border-[#E7EDED]'
      }`}
    >
      <div className="relative flex h-[150px] items-center justify-center" style={{ background: t.tint }}>
        {r.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- generated worksheet previews come from storage hosts outside the optimiser allowlist
          <img src={r.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
            <TypeIcon path={t.icon} color={t.ink} />
          </span>
        )}
        {selectMode ? (
          <span className="absolute left-3 top-3">
            <Checkbox on={selected} />
          </span>
        ) : (
          <>
            <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-xs font-semibold" style={{ color: t.ink }}>
              {r.type}
            </span>
            <span className="absolute right-3 top-3">
              <UnsaveButton r={r} onUnsave={onUnsave} />
            </span>
          </>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        {collectionNames.length > 0 && <p className="text-xs font-semibold text-[#12998C]">{collectionNames.join(' · ')}</p>}
        <h3 className="text-[17px] font-semibold leading-snug">{r.title}</h3>
        {r.description && <p className="line-clamp-2 text-sm text-[#5B6B70]">{r.description}</p>}
        <div className="flex flex-wrap gap-1.5">
          {r.domains[0] && <span className="rounded-full bg-[#EEF3FE] px-2.5 py-0.5 text-xs font-medium text-[#3A63C9]">{domainLabel(r.domains[0])}</span>}
          {r.difficulty && (
            <span className="rounded-full bg-[#E8F6EE] px-2.5 py-0.5 text-xs font-medium text-[#1F7A47]">{difficultyLabels[r.difficulty]}</span>
          )}
          {age && <span className="rounded-full bg-[#F1F4F4] px-2.5 py-0.5 text-xs font-medium text-[#4B5A5E]">{age}</span>}
        </div>
        <p className="mt-auto flex items-center gap-1.5 text-xs text-[#5B6B70]">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" />
          </svg>
          {usageLine(r.usage)}
        </p>
        {!selectMode && (
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAssign(r);
              }}
              className="flex-1 rounded-xl bg-[#E2F3F0] px-3 py-2 text-sm font-semibold text-[#12998C] hover:bg-[#d3ece8]"
            >
              Use with client
            </button>
            {r.canCustomise && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCustomise(r);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7EDED] px-3 py-2 text-sm font-semibold text-[#0F1D20] hover:border-[#CFE6E2]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M8 8h12v12H8zM4 16V4h12" />
                </svg>
                Customise
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
});

const SavedRow = memo(function SavedRow({ r, selectMode, selected, onOpen, onUnsave, onAssign, onCustomise }: CardProps) {
  const t = tone(r.type);
  const meta = [r.type, r.domains[0] ? domainLabel(r.domains[0]) : null, r.difficulty ? difficultyLabels[r.difficulty] : null, ages(r.ageMin, r.ageMax)]
    .filter(Boolean)
    .join(' · ');
  return (
    <div
      onClick={() => onOpen(r)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (e.preventDefault(), onOpen(r))}
      tabIndex={0}
      aria-label={selectMode ? `${r.title}${selected ? ', selected' : ''}` : undefined}
      className={`flex cursor-pointer items-center gap-4 px-4 py-3 ${selected ? 'bg-[#F2FAF8]' : 'hover:bg-[#FAFCFC]'}`}
    >
      {selectMode && <Checkbox on={selected} />}
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: t.tint }}>
        <TypeIcon path={t.icon} color={t.ink} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{r.title}</p>
        <p className="truncate text-xs text-[#5B6B70]">{meta}</p>
      </div>
      <p className="hidden w-48 shrink-0 text-xs text-[#5B6B70] lg:block">{usageLine(r.usage)}</p>
      {!selectMode && (
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAssign(r);
            }}
            className="rounded-xl bg-[#E2F3F0] px-3 py-1.5 text-sm font-semibold text-[#12998C]"
          >
            Use with client
          </button>
          {r.canCustomise && (
            <button
              type="button"
              aria-label={`Customise ${r.title}`}
              title="Customise"
              onClick={(e) => {
                e.stopPropagation();
                onCustomise(r);
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#E7EDED]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M8 8h12v12H8zM4 16V4h12" />
              </svg>
            </button>
          )}
          <UnsaveButton r={r} onUnsave={onUnsave} />
        </div>
      )}
    </div>
  );
});

// ── modals ───────────────────────────────────────────────────────────────────

function PickModal({
  open,
  title,
  sub,
  options,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
  empty,
}: {
  open: boolean;
  title: string;
  sub: string;
  options: Array<{ id: string; label: string; meta: string }>;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: (id: string) => void;
  onClose: () => void;
  empty: string;
}) {
  const [pick, setPick] = useState<string | null>(null);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setPick(null);
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-[460px]">
        <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
        <p className="-mt-2 text-sm text-[#5B6B70]">{sub}</p>
        {options.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#5B6B70]">{empty}</p>
        ) : (
          <div role="radiogroup" className="max-h-[320px] space-y-2 overflow-y-auto">
            {options.map((o) => {
              const on = pick === o.id;
              const initials = o.label
                .split(/[\s–-]+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0])
                .join('')
                .toUpperCase();
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setPick(o.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${on ? 'border-[#12998C] bg-[#F2FAF8]' : 'border-[#E7EDED] bg-white'}`}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E2F3F0] text-xs font-bold text-[#12998C]">{initials}</span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{o.label}</span>
                    <span className="block text-xs text-[#5B6B70]">{o.meta}</span>
                  </span>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${on ? 'border-[#12998C]' : 'border-[#C5D2D2]'}`}>
                    {on && <span className="h-2.5 w-2.5 rounded-full bg-[#12998C]" />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-[#5B6B70]">
            Cancel
          </button>
          <button
            type="button"
            disabled={!pick || busy}
            onClick={() => pick && onConfirm(pick)}
            className="rounded-xl bg-[#12998C] px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Bulk "Use with client": the same assignment as the single journey, one per resource. */
function BulkClientModal({
  open,
  items,
  onClose,
  onDone,
}: {
  open: boolean;
  items: SavedItem[];
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const qc = useQueryClient();
  const clients = useQuery({ queryKey: journeyKeys.clients(), queryFn: journeyApi.myClients, enabled: open });
  const share = useMutation({
    mutationFn: async (childId: string) => {
      for (const r of items) await journeyApi.assign(childId, { kind: r.kind, resourceId: r.id });
      return childId;
    },
    onSuccess: (childId) => {
      const c = clients.data?.clients.find((x) => x.id === childId);
      qc.invalidateQueries({ queryKey: journeyKeys.assigned(childId) });
      qc.invalidateQueries({ queryKey: journeyKeys.clients() });
      const who = c?.firstName ?? 'the client';
      onDone(items.length > 1 ? `${items.length} resources shared with ${who}` : `Shared with ${who}`);
    },
    onError: (e) => onDone(apiMessage(e, 'Couldn’t share. Try again.')),
  });
  return (
    <PickModal
      open={open}
      title="Use with client"
      sub={`Add ${items.length === 1 ? 'this resource' : `${items.length} resources`} to a child’s library. Their family is notified.`}
      options={(clients.data?.clients ?? []).map((c) => ({
        id: c.id,
        label: c.firstName,
        meta: [c.age != null ? `Age ${c.age}` : null, c.parent.name].filter(Boolean).join(' · '),
      }))}
      empty={clients.isLoading ? 'Loading your caseload…' : 'No clients yet.'}
      confirmLabel="Share"
      busy={share.isPending}
      onConfirm={(id) => share.mutate(id)}
      onClose={onClose}
    />
  );
}

function CollectionModal({
  open,
  collections,
  savedIds,
  onClose,
  onDone,
}: {
  open: boolean;
  collections: Array<{ id: string; name: string; count: number }>;
  savedIds: string[];
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const add = useMutation({
    mutationFn: (collectionId: string) => myLibraryApi.addToCollection(collectionId, savedIds),
    onSuccess: (_r, collectionId) => {
      const name = collections.find((c) => c.id === collectionId)?.name ?? 'the collection';
      onDone(savedIds.length > 1 ? `${savedIds.length} resources added to ${name}` : `Added to ${name}`);
    },
    onError: () => onDone('Couldn’t add to the collection. Try again.'),
  });
  return (
    <PickModal
      open={open}
      title="Add to collection"
      sub="Group saved resources by client goal."
      options={collections.map((c) => ({ id: c.id, label: c.name, meta: `${c.count} saved` }))}
      empty="No collections yet. Use “+ New collection” above the filters."
      confirmLabel="Add"
      busy={add.isPending}
      onConfirm={(id) => add.mutate(id)}
      onClose={onClose}
    />
  );
}

// ── Create New ───────────────────────────────────────────────────────────────

const FORMATS: Array<{ name: string; desc: string; href: string; typeName: string }> = [
  { name: 'Activity Worksheet', desc: 'Structured tasks with goals, steps and practice items.', href: '/resources/create?type=ACTIVITY', typeName: 'Worksheet' },
  { name: 'Visual Support', desc: 'Schedules, choice boards and picture-based cues.', href: '/resources/create?type=VISUAL_SUPPORT', typeName: 'Visual Support' },
  { name: 'Social Story', desc: 'Short narratives that prepare for real situations.', href: '/resources/create?type=VISUAL_SUPPORT&subType=social_story', typeName: 'Social Story' },
  { name: 'Start blank', desc: 'An empty canvas. Build your own structure.', href: '/resources/create', typeName: '' },
];

function editedOn(date: string) {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function CreateTab({
  query,
  toast,
}: {
  query: UseQueryResult<CreationsPage>;
  toast: ReturnType<typeof useActionToast>;
}) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<'All' | 'DRAFT' | 'PUBLISHED'>('All');
  const [cq, setCq] = useState('');
  const csearch = useDebounce(cq, 250);
  const [ctype, setCtype] = useState('All');

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const counts = query.data?.counts ?? { all: 0, draft: 0, published: 0 };
  // Sorted newest-edited first by the API; the newest draft is the one to resume.
  const resume = items.find((c) => c.status === 'DRAFT' && !c.generating);
  const list = useMemo(() => {
    const ql = csearch.trim().toLowerCase();
    return items.filter(
      (c) => (status === 'All' || c.status === status) && (ctype === 'All' || c.type === ctype) && (!ql || c.title.toLowerCase().includes(ql)),
    );
  }, [items, status, ctype, csearch]);
  const typeOptions = useMemo(() => [...new Set(items.map((c) => c.type))], [items]);

  const submit = useMutation({
    mutationFn: (c: Creation) => publishWorksheet(c.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: myLibraryKeys.creations() });
      toast.show({ msg: 'Shared to the Community Library' });
    },
    onError: (e) => toast.show({ msg: apiMessage(e, 'Couldn’t submit. Try again.') }),
  });

  return (
    <div className="space-y-8">
      {/* 11.4 Continue where you left off */}
      {resume && (
        <div className="flex flex-col gap-4 rounded-[22px] bg-[#0F2A2A] p-6 text-white sm:flex-row sm:items-center">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10">
            <TypeIcon path={tone(worksheetTypeLabels[resume.type]).icon} color="#7FD8CD" />
          </span>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#7FD8CD]">Continue where you left off</p>
            <p className="mt-1 text-lg font-semibold">{resume.title}</p>
            <p className="text-sm text-white/70">
              {worksheetTypeLabels[resume.type]} · Draft · Edited {editedOn(resume.updatedAt)}
            </p>
          </div>
          <Link href={`/resources/${resume.id}`} className="rounded-xl bg-white px-5 py-2.5 text-center text-sm font-semibold text-[#0F1D20]">
            Resume editing →
          </Link>
        </div>
      )}

      <section className="rounded-[18px] border border-[#E7EDED] bg-white p-5">
        <h2 className="text-xl font-bold">Start from a format</h2>
        <p className="mt-1 text-sm text-[#5B6B70]">Pick a format and we’ll set up the structure. You add the goals and content.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FORMATS.map((f) => {
            const t = f.typeName ? tone(f.typeName) : { icon: ICON.blank, tint: '#f1f4f4', ink: '#4b5a5e' };
            return (
              <Link
                key={f.name}
                href={f.href}
                className="rounded-2xl border border-[#E7EDED] p-4 transition-all hover:-translate-y-0.5 hover:border-[#CFE6E2] hover:shadow-[0_14px_34px_rgba(15,29,32,.08)]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: t.tint }}>
                  <TypeIcon path={t.icon} color={t.ink} className="h-5 w-5" />
                </span>
                <p className="mt-3 font-semibold">{f.name}</p>
                <p className="mt-0.5 text-sm text-[#5B6B70]">{f.desc}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Your creations</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-[#EAEFEF] p-1" role="group" aria-label="Status">
              {(
                [
                  { key: 'All', label: 'All', n: counts.all },
                  { key: 'DRAFT', label: 'Drafts', n: counts.draft },
                  { key: 'PUBLISHED', label: 'Published', n: counts.published },
                ] as const
              ).map((s) => (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={status === s.key}
                  onClick={() => setStatus(s.key)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${status === s.key ? 'bg-white text-[#0F1D20] shadow-sm' : 'text-[#6B7C80]'}`}
                >
                  {s.label} <span className="opacity-70">{s.n}</span>
                </button>
              ))}
            </div>
            <input
              value={cq}
              onChange={(e) => setCq(e.target.value)}
              placeholder="Search creations…"
              aria-label="Search your creations"
              className={`${selectCls} w-full sm:w-[260px]`}
            />
            <select value={ctype} onChange={(e) => setCtype(e.target.value)} aria-label="Type" className={selectCls}>
              <option value="All">All types</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {worksheetTypeLabels[t as WorksheetType] ?? t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {query.isLoading ? (
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(290px,1fr))]">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[300px] rounded-[18px]" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-[18px] border-2 border-dashed border-[#D5DFDF] bg-white px-6 py-12 text-center">
            <p className="text-lg font-semibold">Nothing here yet</p>
            <p className="mt-1 text-sm text-[#5B6B70]">Pick a format above to create your first resource.</p>
          </div>
        ) : (
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(290px,1fr))]">
            {list.map((c) => (
              <CreationCard key={c.id} c={c} submitting={submit.isPending && submit.variables?.id === c.id} onSubmit={submit.mutate} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const CreationCard = memo(function CreationCard({
  c,
  submitting,
  onSubmit,
}: {
  c: Creation;
  submitting: boolean;
  onSubmit: (c: Creation) => void;
}) {
  const typeLabel = worksheetTypeLabels[c.type] ?? c.type;
  const t = tone(c.subType === 'social_story' ? 'Social Story' : typeLabel);
  const draft = c.status === 'DRAFT';
  const chip = c.isPublic
    ? { label: 'In Library', color: '#3A63C9' }
    : draft
      ? { label: c.generating ? 'Generating' : 'Draft', color: '#8A6A12' }
      : { label: 'Published', color: '#1F7A47' };
  return (
    <article className="flex flex-col overflow-hidden rounded-[18px] border border-[#E7EDED] bg-white transition-all hover:-translate-y-[3px] hover:border-[#CFE6E2] hover:shadow-[0_14px_34px_rgba(15,29,32,.08)]">
      <div className="relative flex h-[150px] items-center justify-center" style={{ background: t.tint }}>
        {c.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- generated worksheet previews come from storage hosts outside the optimiser allowlist
          <img src={c.previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
            <TypeIcon path={t.icon} color={t.ink} />
          </span>
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold" style={{ color: chip.color }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: chip.color }} />
          {chip.label}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        {c.basedOn && <p className="text-xs text-[#5B6B70]">Based on {c.basedOn}</p>}
        <h3 className="text-[17px] font-semibold leading-snug">{c.title}</h3>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-[#EEF3FE] px-2.5 py-0.5 text-xs font-medium text-[#3A63C9]">{typeLabel}</span>
          <span className="rounded-full bg-[#E8F6EE] px-2.5 py-0.5 text-xs font-medium text-[#1F7A47]">{difficultyLabels[c.difficulty]}</span>
          {c.targetDomains[0] && (
            <span className="rounded-full bg-[#F1F4F4] px-2.5 py-0.5 text-xs font-medium text-[#4B5A5E]">
              {domainLabels[c.targetDomains[0]] ?? c.targetDomains[0]}
            </span>
          )}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#E7EDED] pt-3">
          <span className="text-xs text-[#5B6B70]">Edited {editedOn(c.updatedAt)}</span>
          <Link href={`/resources/${c.id}`} className="text-sm font-semibold text-[#12998C] hover:underline">
            {draft ? 'Continue editing →' : 'Open →'}
          </Link>
        </div>
        {!draft && !c.isPublic && (
          <button
            type="button"
            disabled={submitting}
            onClick={() => onSubmit(c)}
            className="rounded-xl border border-[#12998C] px-3 py-2 text-sm font-semibold text-[#12998C] hover:bg-[#E2F3F0] disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit to Library'}
          </button>
        )}
        {c.isPublic && <p className="text-xs text-[#5B6B70]">Shared in the Community Library</p>}
      </div>
    </article>
  );
});
