import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChildItem,
  JourneyChild,
  LibraryPage,
  Progress,
  ScreeningSummary,
  getItems,
  getLibrary,
  getMyChildren,
  getProgress,
  getScreening,
} from '../lib/api/resource-journey';

/** The app's data-hook shape: data + loading + pull-to-refresh + refetch. */
function useLoader<T>(load: () => Promise<T>, deps: unknown[], enabled = true) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ignore responses from a previous child / filter set.
  const seq = useRef(0);

  const run = useCallback(
    async (mode: 'load' | 'refresh') => {
      if (!enabled) return;
      const id = ++seq.current;
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      try {
        const next = await load();
        if (id === seq.current) {
          setData(next);
          setError(null);
        }
      } catch (e: any) {
        if (id === seq.current) setError(e?.response?.data?.message ?? 'Could not load. Pull to retry.');
      } finally {
        if (id === seq.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, ...deps],
  );

  useEffect(() => {
    run('load');
  }, [run]);

  return {
    data,
    setData,
    loading,
    refreshing,
    error,
    refresh: () => run('refresh'),
    refetch: () => run('load'),
  };
}

export function useJourneyChildren() {
  return useLoader<JourneyChild[]>(getMyChildren, []);
}

export function useJourneyLibrary(
  childId: string,
  f: { q?: string; type?: string; domain?: string | null; ageFit?: boolean },
) {
  return useLoader<LibraryPage>(() => getLibrary(childId, f), [childId, f.q, f.type, f.domain, f.ageFit], !!childId);
}

export function useJourneyScreening(childId: string) {
  return useLoader<ScreeningSummary | null>(() => getScreening(childId), [childId], !!childId);
}

export function useJourneyItems(childId: string) {
  return useLoader<{ items: ChildItem[]; summary: Record<string, number> }>(() => getItems(childId), [childId], !!childId);
}

export function useJourneyProgress(childId: string, domain: string | null, enabled: boolean) {
  return useLoader<Progress>(() => getProgress(childId, domain), [childId, domain], !!childId && enabled);
}
