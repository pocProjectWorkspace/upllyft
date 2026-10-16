'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Skeleton } from '@upllyft/ui';
import { useMyChildren } from '@/resources/journey/hooks';
import { usePortal } from '../hooks';
import type { Portal, PortalClinic, PortalSession } from '../lib/api';
import { ageLabel, clinicColor, joinAnd } from '../lib/format';
import { NoClinic } from './no-clinic';
import { OverviewTab } from './overview-tab';
import { SessionsTab } from './sessions-tab';
import { ReportsTab } from './reports-tab';
import { HomeTab } from './home-tab';
import { FormsTab } from './forms-tab';
import { CancelDialog, DocDialog, RescheduleDialog, type DocTarget } from './dialogs';

export type Tab = 'overview' | 'sessions' | 'reports' | 'home' | 'forms';
const TABS: Array<[Tab, string]> = [
  ['overview', 'Overview'],
  ['sessions', 'Sessions'],
  ['reports', 'Assessments & reports'],
  ['home', 'Home activities'],
  ['forms', 'Forms & consent'],
];
const CHILD_COLORS = ['#E0457B', '#0ea5e9', '#a78bfa', '#f59e0b', '#10b981'];

/** A session plus what the parent may do with it right now. */
export interface PortalRow extends PortalSession {
  clinic: PortalClinic;
  start: Date;
  upcoming: boolean;
  canChange: boolean;
  locked: boolean;
  /** Why it can't be changed online, when locked. */
  lockReason: 'window' | 'tele' | null;
}

export interface PortalActions {
  reschedule: (row: PortalRow) => void;
  cancel: (row: PortalRow) => void;
  openDoc: (doc: DocTarget) => void;
  goTo: (tab: Tab, clinicKey?: string | null) => void;
}

export function decorate(s: PortalSession, clinic: PortalClinic, now: Date): PortalRow {
  const start = new Date(s.startAt);
  const upcoming = start > now && s.status !== 'cancelled';
  const hours = (start.getTime() - now.getTime()) / 3_600_000;
  const teleOff = s.mode === 'online' && clinic.consents?.tele === false;
  const inWindow = hours < clinic.changeWindowHours;
  return {
    ...s,
    clinic,
    start,
    upcoming,
    canChange: upcoming && !inWindow && !teleOff,
    locked: upcoming && (inWindow || teleOff),
    lockReason: !upcoming ? null : inWindow ? 'window' : teleOff ? 'tele' : null,
  };
}

/**
 * The parent's Clinic Portal: one calm place per child for what's next, what the
 * therapists have shared, and the forms and consent each clinic needs. URL state
 * (?child, ?tab, ?clinic) keeps notification deep links and the back button working.
 */
export function ClinicPortal() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const children = useMyChildren();

  const childId = params.get('child') ?? children.data?.[0]?.id ?? '';
  const tabParam = params.get('tab') as Tab | null;
  const tab: Tab = TABS.some(([k]) => k === tabParam) ? tabParam! : 'overview';
  const portal = usePortal(childId);

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

  const [resched, setResched] = useState<PortalRow | null>(null);
  const [cancelling, setCancelling] = useState<PortalRow | null>(null);
  const [doc, setDoc] = useState<DocTarget | null>(null);

  const data = portal.data;
  const now = useMemo(() => new Date(), [data]); // re-evaluate windows on every refresh
  const clinics = data?.clinics ?? [];
  const multi = clinics.length > 1;
  const filterParam = params.get('clinic');
  const filter = multi && filterParam && clinics.some((c) => c.key === filterParam) ? filterParam : null;

  const rows = useMemo(() => {
    if (!data) return [];
    const byKey = new Map(clinics.map((c) => [c.key, c]));
    return data.sessions.filter((s) => byKey.has(s.clinicKey)).map((s) => decorate(s, byKey.get(s.clinicKey)!, now));
  }, [data, clinics, now]);

  const actions: PortalActions = {
    reschedule: setResched,
    cancel: setCancelling,
    openDoc: setDoc,
    goTo: (t, clinicKey) => setParams({ tab: t === 'overview' ? null : t, clinic: multi && clinicKey ? clinicKey : null }),
  };

  if (children.isLoading || (childId && portal.isLoading)) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid gap-5 md:grid-cols-2">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!children.data?.length) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Add your child to get started</h1>
        <p className="mt-2 text-sm text-gray-500">
          The Clinic portal shows sessions, reports and forms for each child you care for.
        </p>
        <Link href="/profile/children/add" className="mt-5 inline-flex rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white">
          Add a child
        </Link>
      </div>
    );
  }

  if (portal.isError || !data) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500">
        We couldn’t load the Clinic portal. Please refresh to try again.
      </div>
    );
  }

  const name = data.child.firstName;
  const subtitle = clinics.length
    ? clinics.length === 1
      ? `${name}’s care with ${clinics[0].name}${clinics[0].discipline ? ` · ${clinics[0].discipline}` : ''}`
      : `${name} is seeing ${clinics.length} clinics — ${joinAnd(
          clinics.map((c) => (c.discipline ? `${c.discipline.replace(/ therapy$/i, '')} at ${c.short}` : c.short)),
        )}.`
    : 'Sessions, reports and forms from the clinics caring for your child.';

  const upcomingCount = rows.filter((r) => r.upcoming).length;
  const newActivities = data.activities.filter((a) => a.isNew).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900">Clinic portal</h1>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {children.data.map((c, i) => {
            const active = c.id === childId;
            if (!active && children.data!.length === 1) return null;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setParams({ child: c.id, clinic: null })}
                className={`inline-flex items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-3.5 text-left ${
                  active ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-white hover:border-teal-300'
                }`}
                aria-pressed={active}
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: CHILD_COLORS[i % CHILD_COLORS.length] }}
                >
                  {c.firstName.slice(0, 1).toUpperCase()}
                </span>
                <span>
                  <span className="block text-sm font-bold leading-tight text-gray-900">{c.firstName}</span>
                  {ageLabel(c.dateOfBirth) && (
                    <span className="block text-[11px] font-medium text-gray-400">{ageLabel(c.dateOfBirth)}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {!clinics.length ? (
        <NoClinic childName={name} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200">
            <nav className="-mb-px flex gap-1 overflow-x-auto" role="tablist" aria-label="Clinic portal">
              {TABS.map(([key, label]) => {
                const on = tab === key;
                const count = key === 'sessions' ? upcomingCount : key === 'home' ? newActivities : 0;
                return (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={on}
                    onClick={() => setParams({ tab: key === 'overview' ? null : key })}
                    className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-3 text-sm ${
                      on ? 'border-teal-500 font-bold text-teal-700' : 'border-transparent font-semibold text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {label}
                    {count > 0 && (
                      <span className={`rounded-full px-1.5 text-[11px] font-bold ${on ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
            {multi && tab !== 'overview' && (
              <div className="flex flex-wrap gap-1.5 pb-2" aria-label="Filter by clinic">
                {[{ key: null as string | null, label: 'All clinics', dot: '#9AA4A1' }, ...clinics.map((c) => ({ key: c.key, label: c.short, dot: clinicColor(c.colorIndex).ink }))].map(
                  (f) => {
                    const on = filter === f.key;
                    return (
                      <button
                        key={f.key ?? 'all'}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setParams({ clinic: f.key })}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${
                          on ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 bg-white text-gray-500'
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ background: f.dot }} />
                        {f.label}
                      </button>
                    );
                  },
                )}
              </div>
            )}
          </div>

          {tab === 'overview' && <OverviewTab data={data} rows={rows} actions={actions} now={now} />}
          {tab === 'sessions' && <SessionsTab rows={rows.filter((r) => !filter || r.clinicKey === filter)} actions={actions} />}
          {tab === 'reports' && <ReportsTab data={data} filter={filter} actions={actions} />}
          {tab === 'home' && <HomeTab data={data} filter={filter} actions={actions} childId={childId} />}
          {tab === 'forms' && <FormsTab data={data} filter={filter} childId={childId} />}
        </>
      )}

      <RescheduleDialog childId={childId} row={resched} onClose={() => setResched(null)} />
      <CancelDialog childId={childId} row={cancelling} reasons={data.cancelReasons} onClose={() => setCancelling(null)} />
      <DocDialog childId={childId} target={doc} onClose={() => setDoc(null)} />
    </div>
  );
}

export type { Portal };
