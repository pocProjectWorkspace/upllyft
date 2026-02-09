import { useState, useEffect, useCallback, useRef } from 'react';

import { getRecentPosts, getUnreadNotificationCount } from '../lib/api/home';
import { Post } from '../lib/types/community';

export function useHome() {
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [posts, count] = await Promise.all([
        getRecentPosts(3),
        getUnreadNotificationCount().catch(() => 0),
      ]);
      if (!mountedRef.current) return;
      setRecentPosts(posts);
      setUnreadCount(count);
    } catch {
      if (mountedRef.current) setError('Failed to load data');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { recentPosts, unreadCount, loading, error, refresh: loadData };
}
