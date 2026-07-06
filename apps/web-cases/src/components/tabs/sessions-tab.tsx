'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@upllyft/api-client';
import { Skeleton, Button } from '@upllyft/ui';
import { Plus, CalendarDays, Sparkles, Loader2 } from 'lucide-react';
import { useSessions, useGenerateAiSummary } from '@/hooks/use-cases';
import { disciplineMeta } from '@/lib/disciplines';
import type { TherapyDiscipline } from '@/lib/api/care-plans';

interface SessionsTabProps {
  caseId: string;
}

type SchedStatus = 'completed' | 'next' | 'scheduled';

const initials = (name?: string) =>
  (name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export function SessionsTab({ caseId }: SessionsTabProps) {
  const router = useRouter();
  const { user } = useAuth() as any;
  const { data: sessionsData, isLoading } = useSessions(caseId);
  const generateAiSummary = useGenerateAiSummary();
  const [generatingAI, setGeneratingAI] = useState<string | null>(null);

  const [filterDisc, setFilterDisc] = useState<TherapyDiscipline | 'ALL'>('ALL');
  const [filterTherapist, setFilterTherapist] = useState<string | 'ALL' | 'MINE'>('ALL');

  const raw: any[] = Array.isArray(sessionsData)
    ? sessionsData
    : (sessionsData as any)?.data ?? (sessionsData as any)?.sessions ?? (sessionsData as any)?.items ?? [];

  // Sort ascending by date, number them, and derive scheduling status vs now.
  const sessions = useMemo(() => {
    const now = Date.now();
    const sorted = [...raw].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );
    let nextAssigned = false;
    return sorted.map((s, i) => {
      const t = new Date(s.scheduledAt).getTime();
      const signed = s.noteStatus === 'SIGNED';
      let status: SchedStatus;
      if (t < now || signed) status = 'completed';
      else if (!nextAssigned) {
        status = 'next';
        nextAssigned = true;
      } else status = 'scheduled';
      return { ...s, _num: i + 1, _status: status };
    });
  }, [raw]);

  // Filter option sets
  const presentDisciplines = useMemo(
    () => Array.from(new Set(sessions.map((s) => s.discipline).filter(Boolean))) as TherapyDiscipline[],
    [sessions],
  );
  const therapists = useMemo(() => {
    const map = new Map<string, string>();
    sessions.forEach((s) => {
      if (s.therapist?.id) map.set(s.therapist.id, s.therapist.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [sessions]);

  const filtered = sessions.filter((s) => {
    if (filterDisc !== 'ALL' && s.discipline !== filterDisc) return false;
    if (filterTherapist === 'MINE' && s.therapist?.id !== user?.id) return false;
    if (filterTherapist !== 'ALL' && filterTherapist !== 'MINE' && s.therapist?.id !== filterTherapist)
      return false;
    return true;
  });

  const doneCount = sessions.filter((s) => s._status === 'completed').length;

  const handleAI = (e: React.MouseEvent, s: any) => {
    e.stopPropagation();
    setGeneratingAI(s.id);
    generateAiSummary.mutate(
      { caseId, sessionId: s.id, data: { rawNotes: s.rawNotes || undefined, structuredNotes: s.structuredNotes || undefined } },
      { onSettled: () => setGeneratingAI(null) },
    );
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider">Therapy sessions</p>
          <p className="text-3xl font-bold text-gray-900">
            {doneCount}
            <span className="text-lg font-medium text-gray-400">/{sessions.length}</span>
          </p>
          <p className="text-xs text-gray-400">completed</p>
        </div>
        <Button
          variant="primary"
          className="bg-teal-600 hover:bg-teal-700"
          onClick={() => router.push(`/${caseId}/sessions/new`)}
        >
          <Plus className="h-4 w-4 mr-2" /> Add session
        </Button>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <CalendarDays className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium">No sessions yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Sessions are generated from the care plan in{' '}
            <a href={`/${caseId}/consultation`} className="text-teal-600 font-medium">
              Consultation
            </a>
            .
          </p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider w-20">
                Discipline
              </span>
              <Chip active={filterDisc === 'ALL'} onClick={() => setFilterDisc('ALL')}>
                All
              </Chip>
              {presentDisciplines.map((d) => {
                const m = disciplineMeta(d);
                return (
                  <Chip
                    key={d}
                    active={filterDisc === d}
                    onClick={() => setFilterDisc(d)}
                    color={m.color}
                    bg={m.bg}
                  >
                    {m.short}
                  </Chip>
                );
              })}
            </div>
            {therapists.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider w-20">
                  Therapist
                </span>
                <Chip active={filterTherapist === 'MINE'} onClick={() => setFilterTherapist(filterTherapist === 'MINE' ? 'ALL' : 'MINE')}>
                  ★ My sessions
                </Chip>
                {therapists
                  .filter((t) => t.id !== user?.id)
                  .map((t) => (
                    <Chip key={t.id} active={filterTherapist === t.id} onClick={() => setFilterTherapist(t.id)}>
                      {t.name}
                    </Chip>
                  ))}
              </div>
            )}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((s) => {
              const m = disciplineMeta(s.discipline);
              const isMine = s.therapist?.id === user?.id;
              const date = new Date(s.scheduledAt);
              return (
                <button
                  key={s.id}
                  onClick={() => router.push(`/${caseId}/sessions/${s.id}`)}
                  className="text-left rounded-2xl border border-gray-100 bg-white overflow-hidden hover:shadow-md hover:border-gray-200 transition-all"
                >
                  <div className="h-1.5" style={{ background: m.color }} />
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                        Session {s._num}
                      </span>
                      <StatusBadge status={s._status} />
                    </div>
                    <p className="text-base font-semibold text-gray-900">
                      {date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        {s.discipline && (
                          <span
                            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                            style={{ background: m.bg, color: m.color }}
                          >
                            {m.short}
                          </span>
                        )}
                        {s.therapist?.name && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                            <span className="h-5 w-5 rounded-full bg-gray-100 text-gray-600 text-[9px] font-semibold flex items-center justify-center">
                              {initials(s.therapist.name)}
                            </span>
                            {isMine && (
                              <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                                You
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleAI(e, s)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                        title="AI summary"
                      >
                        {generatingAI === s.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  color,
  bg,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
  bg?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        active ? 'border-transparent' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
      style={active ? { background: bg ?? '#0f766e', color: color ?? '#fff' } : undefined}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: SchedStatus }) {
  const map = {
    completed: { label: 'Completed', cls: 'bg-teal-50 text-teal-700' },
    next: { label: 'Next up', cls: 'bg-amber-50 text-amber-700' },
    scheduled: { label: 'Scheduled', cls: 'bg-gray-100 text-gray-500' },
  }[status];
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map.cls}`}>{map.label}</span>;
}
