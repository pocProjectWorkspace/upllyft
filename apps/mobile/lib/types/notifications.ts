export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  relatedPostId: string | null;
  relatedUserId: string | null;
  actionUrl: string | null;
  priority: string;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: { total: number; page: number; limit: number; pages: number };
}
