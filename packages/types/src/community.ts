import type { PostAuthor } from './user';

export enum PostType {
  GENERAL = 'GENERAL',
  QUESTION = 'QUESTION',
  MILESTONE = 'MILESTONE',
  EVENT = 'EVENT',
  POLL = 'POLL',
}

export interface Post {
  id: string;
  content: string;
  type: PostType;
  authorId: string;
  author: PostAuthor;
  communityId?: string;
  images?: string[];
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  author: PostAuthor;
  postId: string;
  parentId?: string;
  likesCount: number;
  createdAt: string;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  image?: string;
  memberCount: number;
  isJoined: boolean;
  isPrivate: boolean;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  communityId?: string;
  hostId: string;
  startAt: string;
  endAt: string;
  location?: string;
  isVirtual: boolean;
  attendeeCount: number;
  createdAt: string;
}
