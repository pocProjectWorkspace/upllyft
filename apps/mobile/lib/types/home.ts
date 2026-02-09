import { Post } from './community';

export interface HomeData {
  recentPosts: Post[];
  unreadNotificationCount: number;
}
