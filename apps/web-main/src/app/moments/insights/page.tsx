'use client';

import { Skeleton } from '@upllyft/ui';
import { useMomentsChild } from '@/components/moments/moments-shell';
import { useMomentInsights, useUpdateInsight } from '@/hooks/use-moments';
import { INSIGHT_TYPE_META } from '@/components/moments/meta';

export default function MomentInsightsPage() {
  const { child, loading } = useMomentsChild();
  const { data, isLoading } = useMomentInsights(child?.id);
  const updateInsight = useUpdateInsight(child?.id);

  if (loading || !child) return loading ? <Skeleton className="h-64 w-full" /> : null;

  const insights = data?.insights ?? [];
  const momentCount = data?.momentCount ?? 0;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Things Mira has noticed</h1>
        <p className="text-sm text-gray-500 mt-1">
          Connections that may be worth understanding or watching. Nothing here is a conclusion —
          you know {child.firstName} best.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : insights.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
          {momentCount < 3 ? (
            <>
              <p className="text-sm font-medium text-gray-700">Nothing to show yet — early days.</p>
              <p className="text-sm text-gray-500 mt-1">
                Mira starts looking for patterns once a few moments build up. Keep capturing the
                small things.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700">Nothing new right now.</p>
              <p className="text-sm text-gray-500 mt-1">
                Mira is keeping an eye on your recent moments and will surface anything worth
                knowing. Quiet is fine.
              </p>
            </>
          )}
        </div>
      ) : (
        insights.map((insight) => {
          const meta = INSIGHT_TYPE_META[insight.type];
          return (
            <div key={insight.id} className={`rounded-2xl border p-5 ${meta.card}`}>
              <div className="flex items-center justify-between">
                <p className={`text-[11px] font-semibold tracking-wide ${meta.text}`}>
                  {meta.label.toUpperCase()}
                </p>
                {insight.status === 'WATCHING' && (
                  <span className="text-[11px] font-medium text-gray-400">Keeping watch</span>
                )}
              </div>

              <h2 className="text-base font-bold text-gray-900 mt-2">{insight.title}</h2>

              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-wide text-gray-400">
                    WHAT MIRA NOTICED
                  </p>
                  <p className="text-sm text-gray-700 mt-0.5">{insight.body}</p>
                </div>
                {insight.whatHelped && (
                  <div>
                    <p className="text-[11px] font-semibold tracking-wide text-gray-400">
                      WHAT SEEMED TO HELP
                    </p>
                    <p className="text-sm text-gray-700 mt-0.5">{insight.whatHelped}</p>
                  </div>
                )}
                {insight.settings.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold tracking-wide text-gray-400">
                      WHERE THIS HAPPENED
                    </p>
                    <div className="flex gap-2 mt-1.5">
                      {insight.settings.map((s) => (
                        <span
                          key={s}
                          className="px-2.5 py-1 rounded-full bg-white/70 border border-gray-200 text-xs text-gray-600"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {insight.whyMatters && (
                  <div>
                    <p className="text-[11px] font-semibold tracking-wide text-gray-400">
                      WHY THIS MATTERS
                    </p>
                    <p className="text-sm text-gray-700 mt-0.5">{insight.whyMatters}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 mt-5">
                {insight.status !== 'WATCHING' && (
                  <button
                    onClick={() => updateInsight.mutate({ insightId: insight.id, status: 'WATCHING' })}
                    className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:border-teal-300 transition-colors"
                  >
                    Keep watching
                  </button>
                )}
                <button
                  onClick={() => updateInsight.mutate({ insightId: insight.id, status: 'DISMISSED' })}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
