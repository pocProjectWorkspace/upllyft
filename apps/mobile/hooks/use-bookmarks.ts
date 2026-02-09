import { useState, useEffect, useCallback, useRef } from 'react';

import { getBookmarks } from '../lib/api/bookmarks';
import { Post } from '../lib/types/community';

interface BookmarkItem {
  id: string;
  post: Post;
  createdAt: string;
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async (pageNum: number, replace: boolean) => {
    try {
      if (replace) setLoading(true);
      setError(null);
      const res = await getBookmarks(pageNum);
      if (!mountedRef.current) return;
      setBookmarks((prev) => (replace ? res.bookmarks : [...prev, ...res.bookmarks]));
      setHasMore(res.hasMore);
    } catch {
      if (mountedRef.current) setError('Failed to load bookmarks');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    load(1, true);
  }, [load]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    load(1, true);
  }, [load]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading || refreshing) return;
    const next = page + 1;
    setPage(next);
    load(next, false);
  }, [hasMore, loading, refreshing, page, load]);

  const removeLocal = useCallback((bookmarkId: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
  }, []);

  return { bookmarks, loading, refreshing, error, hasMore, refresh, loadMore, removeLocal };
}
