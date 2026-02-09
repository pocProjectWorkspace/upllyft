import { useState, useRef, useCallback } from 'react';
import { Post } from '../lib/types/community';
import { searchPosts } from '../lib/api/search';

export function useSearch() {
  const [results, setResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const lastQuery = useRef('');

  const search = useCallback(async (query: string) => {
    if (!query.trim()) return;
    lastQuery.current = query.trim();
    setLoading(true);
    setSearched(true);
    setPage(1);
    try {
      const res = await searchPosts(query.trim(), 1);
      setResults(res.posts);
      setHasMore(res.posts.length >= 15);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !lastQuery.current) return;
    const next = page + 1;
    setPage(next);
    try {
      const res = await searchPosts(lastQuery.current, next);
      setResults(prev => [...prev, ...res.posts]);
      setHasMore(res.posts.length >= 15);
    } catch { /* ignore */ }
  }, [hasMore, loading, page]);

  const clear = () => {
    setResults([]);
    setSearched(false);
    lastQuery.current = '';
  };

  return { results, loading, searched, hasMore, search, loadMore, clear };
}
