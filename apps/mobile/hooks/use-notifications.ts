import { useState, useEffect, useCallback } from 'react';
import { Notification } from '../lib/types/notifications';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification } from '../lib/api/notifications';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchPage = useCallback(async (p: number, replace: boolean) => {
    try {
      const res = await getNotifications(p, 20);
      const items = res.notifications ?? [];
      if (replace) setNotifications(items);
      else setNotifications(prev => [...prev, ...items]);
      setHasMore(p < (res.pagination?.pages ?? 1));
    } catch { /* ignore */ }
  }, []);

  const fetchUnread = useCallback(async () => {
    try { setUnreadCount(await getUnreadCount()); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    Promise.all([fetchPage(1, true), fetchUnread()]).finally(() => setLoading(false));
  }, []);

  const refresh = async () => {
    setPage(1);
    await Promise.all([fetchPage(1, true), fetchUnread()]);
  };

  const loadMore = () => {
    if (!hasMore || loading) return;
    const next = page + 1;
    setPage(next);
    fetchPage(next, false);
  };

  const markRead = async (id: string) => {
    try {
      await markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  const remove = async (id: string) => {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch { /* ignore */ }
  };

  return {
    notifications, unreadCount, loading, hasMore,
    refresh, loadMore, markRead, markAllRead, remove, fetchUnread,
  };
}
