'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Skeleton, toast } from '@upllyft/ui';
import type { LibraryCard } from './api';
import { useItems, useMyChildren, useProgress, useRevoke, useSave } from './hooks';
import { LibraryTab } from './library-tab';
import { LogDialog, type LogTarget } from './log-dialog';
import { MyLibraryTab } from './my-library-tab';
import { useOpenResource } from './open-resource';
import { ProgressView } from './progress-view';
import { ShareDialog } from './share-dialog';
import { ageText } from './ui';

type Tab = 'library' | 'mine' | 'progress';
const CHILD_COLORS = ['#0ea5e9', '#f472b6', '#a78bfa', '#f59e0b', '#10b981'];

/**
 * The parent's Resources journey: Library · {child}'s library · Progress, for one child
 * at a time. URL state (?child, ?tab, ?area) keeps the back button and Mira links working.
 */
export function ResourceJourney() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const children = useMyChildren();

  const childId = params.get('child') ?? children.data?.[0]?.id ?? '';
  const tab = (['library', 'mine', 'progress'].includes(params.get('tab') ?? '') ? params.get('tab') : 'library') as Tab;
  const area = params.get('area');

  const setParams = useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v) sp.set(k, v);
        else sp.delete(k);
      }
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const child = children.data?.find((c) => c.id === childId);
  const childName = child?.firstName ?? 'your child';
  const items = useItems(childId);
  const [logTarget, setLogTarget] = useState<LogTarget | null>(null);
  const [sharing, setSharing] = useState(false);
  const { open, viewer } = useOpenResource();

  // Mira's "Log this?" card hands over a pre-filled log through sessionStorage.
  useEffect(() => {
    if (!childId) return;
    const raw = sessionStorage.getItem('journey:prefill-log');
    if (!raw) return;
    sessionStorage.removeItem('journey:prefill-log');
    try {
      const t = JSON.parse(raw);
      if (t.childId === childId) setLogTarget(t.target);
    } catch {
      /* ignore a malformed hand-over */
    }
  }, [childId]);

  if (children.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!children.data?.length) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Add your child to get started</h1>
        <p className="mt-2 text-sm text-gray-500">
          Resources are matched to your child’s age and screening, and progress is kept per child.
        </p>
        <Link href="/profile/children/add" className="mt-5 inline-flex rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white">
          Add a child
        </Link>
      </div>
    );
  }

  const mineCount = items.data?.items.length ?? 0;
  const tabs: Array<{ key: Tab; label: string; badge?: number }> = [
    { key: 'library', label: 'Library' },
    { key: 'mine', label: `${childName}’s library`, badge: mineCount || undefined },
    { key: 'progress', label: 'Progress' },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900">Resource Library</h1>
          <p className="mt-1 text-sm text-gray-500">
            Guides, stories and printables from the Upllyft team and your care centre. Save one to {childName}’s library, try it together, and log how it went.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Showing for</span>
          {children.data.map((c, i) => {
            const age = ageText(c.dateOfBirth);
            const active = c.id === childId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setParams({ child: c.id, area: null })}
                className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-sm ${
                  active ? 'border-teal-500 bg-teal-50 font-semibold text-teal-800' : 'border-gray-200 bg-white text-gray-700 hover:border-teal-300'
                }`}
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white"
                  style={{ background: CHILD_COLORS[i % CHILD_COLORS.length] }}
                >
                  {c.firstName.slice(0, 1).toUpperCase()}
                </span>
                {c.firstName}
                {age != null && <span className="text-xs text-gray-500">{age}y</span>}
              </button>
            );
          })}
        </div>
      </header>

      <nav className="flex gap-1 border-b border-gray-200" aria-label="Resources sections">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setParams({ tab: t.key === 'library' ? null : t.key })}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === t.key ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
            {t.badge != null && <span className="rounded-full bg-teal-100 px-2 text-[11px] text-teal-700">{t.badge}</span>}
          </button>
        ))}
      </nav>

      {tab === 'library' && (
        <LibraryTab
          childId={childId}
          childName={childName}
          initialDomain={area}
          onDomainChange={(d) => setParams({ area: d })}
          onTried={setLogTarget}
          onOpen={open}
        />
      )}
      {tab === 'mine' && (
        <MyLibraryTab
          childId={childId}
          childName={childName}
          onTried={setLogTarget}
          onOpen={open}
          onBrowse={() => setParams({ tab: null, area: null })}
          onBrowseArea={(d) => setParams({ tab: null, area: d })}
        />
      )}
      {tab === 'progress' && (
        <ParentProgress childId={childId} childName={childName} onShare={() => setSharing(true)} onOpen={open} />
      )}

      <LogDialog childId={childId} childName={childName} target={logTarget} onClose={() => setLogTarget(null)} />
      <ShareDialog childId={childId} childName={childName} open={sharing} onClose={() => setSharing(false)} />
      {viewer}
    </div>
  );
}

function ParentProgress({
  childId,
  childName,
  onShare,
  onOpen,
}: {
  childId: string;
  childName: string;
  onShare: () => void;
  onOpen: (card: LibraryCard) => void;
}) {
  const [domain, setDomain] = useState<string | null>(null);
  const { data, isLoading } = useProgress(childId, domain ?? undefined);
  const revoke = useRevoke(childId);
  const save = useSave(childId);

  const banner = useMemo(() => {
    const shares = data?.shares ?? [];
    if (!shares.length) {
      return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-sm text-gray-700">🔒 Private: only you can see this</p>
          <button type="button" onClick={onShare} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-teal-700 shadow-sm hover:bg-teal-50">
            Share with therapist
          </button>
        </div>
      );
    }
    return (
      <div className="space-y-2 rounded-2xl border border-teal-100 bg-teal-50/60 px-4 py-3">
        {shares.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-teal-900">
              Shared with {s.therapist.name ?? 'your therapist'} · {new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </p>
            <button
              type="button"
              onClick={() =>
                revoke.mutate(s.id, { onSuccess: () => toast({ title: 'Sharing stopped', description: `${s.therapist.name ?? 'They'} can no longer see this.` }) })
              }
              className="text-sm font-semibold text-teal-800 hover:underline"
            >
              Stop sharing
            </button>
          </div>
        ))}
        <button type="button" onClick={onShare} className="text-sm font-medium text-teal-700 hover:underline">
          Share with another therapist
        </button>
      </div>
    );
  }, [data?.shares, onShare, revoke]);

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <ProgressView
      data={data}
      childName={childName}
      banner={banner}
      domainFilter={domain}
      onDomainFilter={setDomain}
      onOpen={onOpen}
      onSaveSuggestion={(card) =>
        save.mutate(
          { kind: card.kind, resourceId: card.id },
          { onSuccess: () => toast({ title: `Saved for ${childName}`, description: card.title }) },
        )
      }
    />
  );
}
