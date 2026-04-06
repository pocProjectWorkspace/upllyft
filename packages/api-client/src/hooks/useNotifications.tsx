'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import * as notificationsApi from '../notifications';
import type { Notification } from '../notifications';

const POLL_INTERVAL = 30_000;

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  filter: 'all' | 'unread';
  setFilter: (f: 'all' | 'unread') => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { count } = await notificationsApi.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Silently fail — backend may not have the endpoint yet
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationsApi.getNotifications({
        page: 1,
        limit: 20,
        filter,
      });
      setNotifications(Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : []);
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchNotifications(), fetchUnreadCount()]);
  }, [fetchNotifications, fetchUnreadCount]);

  // Poll unread count only — lightweight, no full list fetch on mount
  useEffect(() => {
    fetchUnreadCount();
    pollRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchUnreadCount]);

  // Fetch notifications list when filter changes, but skip initial mount
  const hasFetched = useRef(false);
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      /* ignore */
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      /* ignore */
    }
  }, []);

  const deleteNotif = useCallback(
    async (id: string) => {
      try {
        const target = notifications.find((n) => n.id === id);
        await notificationsApi.deleteNotification(id);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        if (target && !target.read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch {
        /* ignore */
      }
    },
    [notifications],
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    filter,
    setFilter,
    markAsRead,
    markAllAsRead,
    deleteNotification: deleteNotif,
    refresh,
  };
}
