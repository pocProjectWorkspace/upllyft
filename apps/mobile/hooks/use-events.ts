import { useState, useEffect, useCallback, useRef } from 'react';

import { getEvents } from '../lib/api/events';
import { EventItem, EventFormat } from '../lib/types/events';

export function useEvents() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<EventFormat | undefined>(undefined);
  const mountedRef = useRef(true);
  const limit = 15;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async (off: number, replace: boolean) => {
    try {
      if (replace) setLoading(true);
      setError(null);
      const res = await getEvents({ limit, offset: off, format, sortBy: 'startDate', order: 'asc' });
      if (!mountedRef.current) return;
      setEvents(prev => replace ? res.events : [...prev, ...res.events]);
      setHasMore(res.hasMore);
    } catch {
      if (mountedRef.current) setError('Failed to load events');
    } finally {
      if (mountedRef.current) { setLoading(false); setRefreshing(false); }
    }
  }, [format]);

  useEffect(() => {
    setOffset(0);
    load(0, true);
  }, [load]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setOffset(0);
    load(0, true);
  }, [load]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading || refreshing) return;
    const next = offset + limit;
    setOffset(next);
    load(next, false);
  }, [hasMore, loading, refreshing, offset, load]);

  return { events, loading, refreshing, error, hasMore, format, setFormat, refresh, loadMore };
}
