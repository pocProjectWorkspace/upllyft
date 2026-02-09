import { useState, useEffect, useCallback } from 'react';
import { TherapistProfile } from '../lib/types/marketplace';
import { getTherapists, TherapistFilters } from '../lib/api/marketplace';

export function useTherapists() {
  const [therapists, setTherapists] = useState<TherapistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [specialization, setSpecialization] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const fetchTherapists = useCallback(async (pageNum: number, replace: boolean, filters?: TherapistFilters) => {
    try {
      const res = await getTherapists({ page: pageNum, limit: 15, specialization: filters?.specialization ?? specialization });
      if (replace) {
        setTherapists(res.therapists ?? []);
      } else {
        setTherapists(prev => [...prev, ...(res.therapists ?? [])]);
      }
      setHasMore(res.hasMore ?? false);
      setError(null);
    } catch {
      setError('Failed to load therapists');
    }
  }, [specialization]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchTherapists(1, true).finally(() => setLoading(false));
  }, [specialization]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await fetchTherapists(1, true);
    setRefreshing(false);
  }, [fetchTherapists]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    const next = page + 1;
    setPage(next);
    fetchTherapists(next, false);
  }, [hasMore, loading, page, fetchTherapists]);

  return { therapists, loading, refreshing, error, hasMore, specialization, setSpecialization, refresh, loadMore };
}
