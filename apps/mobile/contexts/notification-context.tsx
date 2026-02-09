import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUnreadCount } from '../lib/api/notifications';
import { getTokens } from '../lib/auth-store';

interface NotificationContextType {
  unreadCount: number;
  refreshUnread: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  refreshUnread: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    try {
      const { accessToken } = await getTokens();
      if (!accessToken) return;
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    refreshUnread();
    const interval = setInterval(refreshUnread, 30000);
    return () => clearInterval(interval);
  }, [refreshUnread]);

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshUnread }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  return useContext(NotificationContext);
}
