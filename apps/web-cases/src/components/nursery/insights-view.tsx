'use client';

import { Badge, Card, Skeleton } from '@upllyft/ui';
import { ArrowLeft, Users, Flag, Target, CalendarCheck, Scale } from 'lucide-react';
import { useNursery } from './nursery-context';
import { useInsights } from '@/hooks/use-nursery';
import { DEVELOPMENTAL_DOMAINS, type GroupStat } from '@/lib/api/nursery';

const domainLabel = (id: string) => DEVELOPMENTAL_DOMAINS.find(d => d.id === id)?.label ?? id;
const pct = (r: number) => `${Math.round(r * 100)}%`;

/**
 * Setting-level early-identification insights (F10), for nursery leadership.
 *
 * Hides on 403 (a plain keyworker isn't the audience). The distinctive section is equity:
 * identification rate by group, framed as a prompt to look — never a verdict.
 */
export function InsightsView() {
  const { facilityId, facility } = useNursery();
  const { data, isLoading, isError } = useInsights(facilityId ?? undefined);

  if (isError) {
    return (
      <div className="space-y-4">
        <BackLink />
        <Card className="p-8 text-center text-sm text-gray-500">
          Insights are available to nursery leadership. If you think you should see this, check with your manager.
        </Card>
      </div>
    );
  }
  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    );
  }

  const { headcount, domainFlags, outcomes, reviews, equity } = data;
  const maxFlag = Math.max(1, ...domainFlags.map(d => d.count));

  return (
    <div className="space-y-6">
      <BackLink />
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Insights</h1>
        <p className="text-sm text-gray-600 mt-1">Early-identification at {facility?.name}</p>
      </div>

      {/* Headline counts. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={<Users className="w-4 h-4" />} label="Children" value={headcount.active} sub={`${headcount.pendingConsent} awaiting consent`} />
        <Stat icon={<CalendarCheck className="w-4 h-4" />} label="Screened" value={headcount.screened} sub={`${reviews.done} reviews done`} />
        <Stat icon={<Flag className="w-4 h-4" />} label="Identified" value={headcount.identified} sub="flagged or a concern raised" />
        <Stat icon={<Target className="w-4 h-4" />} label="Outcomes met" value={`${outcomes.achieved}/${outcomes.total}`} sub={`${outcomes.inProgress} in progress`} />
      </div>

      {/* Flags per domain. */}
      <Card className="p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Where children are being flagged</h2>
        {domainFlags.length === 0 ? (
          <p className="text-sm text-gray-500">No domains flagged yet.</p>
        ) : (
          <div className="space-y-2.5">
            {domainFlags.map(d => (
              <div key={d.domain} className="flex items-center gap-3">
                <span className="text-sm text-gray-700 w-40 shrink-0">{domainLabel(d.domain)}</span>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500" style={{ width: `${(d.count / maxFlag) * 100}%` }} />
                </div>
                <span className="text-sm text-gray-500 w-8 text-right tabular-nums">{d.count}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Equity. */}
      <Card className="p-6">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Scale className="w-4 h-4 text-teal-600" /> Who is being identified
        </h2>
        <p className="text-xs text-gray-500 mt-1 mb-4">{equity.note}</p>
        <div className="grid md:grid-cols-3 gap-6">
          <EquityGroup title="By gender" stats={equity.byGender} />
          <EquityGroup title="By age" stats={equity.byAgeBand} />
          <EquityGroup title="By home language" stats={equity.byLanguage} />
        </div>
      </Card>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-gray-400 text-xs">{icon}<span>{label}</span></div>
      <p className="text-2xl font-semibold text-gray-900 mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </Card>
  );
}

function EquityGroup({ title, stats }: { title: string; stats: GroupStat[] }) {
  if (stats.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{title}</p>
      <div className="space-y-2">
        {stats.map(g => (
          <div key={g.group}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{g.group}</span>
              <span className="text-gray-500 tabular-nums">
                {pct(g.rate)} <span className="text-gray-300">·</span> {g.identified}/{g.total}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-teal-400" style={{ width: pct(g.rate) }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <a href="/nursery" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
      <ArrowLeft className="w-4 h-4 mr-1" /> Back to roster
    </a>
  );
}
