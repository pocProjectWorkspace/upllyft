import api from '../api';
import { Notification, NotificationsResponse } from '../types/notifications';

export async function getNotifications(page = 1, limit = 20, type?: string): Promise<NotificationsResponse> {
  const { data } = await api.get('/notifications', { params: { page, limit, type } });
  return data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await api.get('/notifications/unread-count');
  return data.count ?? data;
}

export async function markAsRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllAsRead(): Promise<void> {
  await api.patch('/notifications/read-all');
}

export async function deleteNotification(id: string): Promise<void> {
  await api.delete(`/notifications/${id}`);
}
