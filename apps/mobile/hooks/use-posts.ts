import { useState, useEffect, useCallback, useRef } from 'react';

import { getPosts } from '../lib/api/community';
import { Post, PostType, SortOption } from '../lib/types/community';

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [activeType, setActiveType] = useState<PostType | undefined>(undefined);
  const [sort, setSort] = useState<SortOption>('recent');
  const mountedRef = useRef(true);

  const loadPosts = useCallback(
    async (pageNum: number, replace: boolean) => {
      try {
        if (replace) setLoading(true);
        setError(null);
        const res = await getPosts({
          page: pageNum,
          limit: 15,
          type: activeType,
          sort,
        });
        if (!mountedRef.current) return;
        setPosts((prev) => (replace ? res.posts : [...prev, ...res.posts]));
        setHasMore(res.hasMore);
      } catch {
        if (!mountedRef.current) return;
        setError('Failed to load posts');
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [activeType, sort],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setPage(1);
    loadPosts(1, true);
  }, [loadPosts]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    loadPosts(1, true);
  }, [loadPosts]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading || refreshing) return;
    const next = page + 1;
    setPage(next);
    loadPosts(next, false);
  }, [hasMore, loading, refreshing, page, loadPosts]);

  return {
    posts,
    loading,
    refreshing,
    error,
    hasMore,
    activeType,
    sort,
    setActiveType,
    setSort,
    refresh,
    loadMore,
  };
}
