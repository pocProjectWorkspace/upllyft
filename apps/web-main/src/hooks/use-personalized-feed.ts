import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getPersonalizedFeed,
  type FeedView,
  type FeedFilters,
  type FeedPost,
} from '@/lib/api/feeds';
import { useDebounce } from '@/hooks/use-debounce';

interface UsePersonalizedFeedOptions {
  view: FeedView;
  filters?: FeedFilters;
  limit?: number;
  enabled?: boolean;
}

export function usePersonalizedFeed({
  view,
  filters,
  limit = 20,
  enabled = true,
}: UsePersonalizedFeedOptions) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalPosts, setTotalPosts] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debouncedFilters = useDebounce(filters, 500);

  const fetchPosts = useCallback(
    async (reset = false) => {
      if (!enabled) return;

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        setLoading(true);
        setError(null);

        const currentPage = reset ? 1 : page;

        const response = await getPersonalizedFeed({
          view,
          page: currentPage,
          limit,
          filters: debouncedFilters,
          signal: controller.signal,
        });

        if (reset) {
          setPosts(response.posts);
          setPage(1);
        } else {
          setPosts((prev) => [...prev, ...response.posts]);
        }

        setHasMore(response.hasMore);
        setTotalPosts(response.total);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message || 'Failed to fetch posts');
        }
      } finally {
        // Only clear loading if this request wasn't aborted —
        // prevents a cancelled request from flipping loading=false
        // while a newer request is still in flight.
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [view, page, debouncedFilters, limit, enabled],
  );

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1);
    }
  }, [loading, hasMore]);

  const refresh = useCallback(() => {
    fetchPosts(true);
  }, [fetchPosts]);

  // Reset and fetch when view or filters change
  useEffect(() => {
    fetchPosts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, debouncedFilters]);

  // Load more when page increments beyond 1
  useEffect(() => {
    if (page > 1) {
      fetchPosts(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    posts,
    loading,
    error,
    hasMore,
    totalPosts,
    page,
    loadMore,
    refresh,
  };
}
