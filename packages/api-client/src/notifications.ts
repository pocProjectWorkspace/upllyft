import { apiClient } from './client';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  metadata?: Record<string, unknown>;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  data: Notification[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export async function getNotifications(params?: {
  page?: number;
  limit?: number;
  filter?: 'all' | 'unread';
}): Promise<NotificationsResponse> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  // The API takes `unreadOnly` and answers { notifications, pagination }; normalise it
  // to the shape callers use (the bell read `data` and so always showed an empty list).
  const { data } = await apiClient.get('/notifications', {
    params: { page, limit, ...(params?.filter === 'unread' ? { unreadOnly: 'true' } : {}) },
  });
  const list: Notification[] = Array.isArray(data?.notifications) ? data.notifications : Array.isArray(data?.data) ? data.data : [];
  const total: number = data?.pagination?.total ?? data?.total ?? list.length;
  return { data: list, total, page, limit, hasMore: page * limit < total };
}

export async function getUnreadCount(): Promise<{ count: number }> {
  const { data } = await apiClient.get('/notifications/unread-count');
  return data;
}

export async function markAsRead(notificationId: string): Promise<void> {
  await apiClient.patch(`/notifications/${notificationId}/read`);
}

export async function markAllAsRead(): Promise<void> {
  await apiClient.patch('/notifications/read-all');
}

export async function deleteNotification(notificationId: string): Promise<void> {
  await apiClient.delete(`/notifications/${notificationId}`);
}
