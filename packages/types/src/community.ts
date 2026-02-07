export interface Post {
  id: string;
  authorId: string;
  title?: string;
  content: string;
  groupId?: string;
  likes: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  parentId?: string;
  likes: number;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  memberCount: number;
  isPrivate: boolean;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  groupId?: string;
  hostId: string;
  startAt: string;
  endAt: string;
  location?: string;
  isVirtual: boolean;
  attendeeCount: number;
  createdAt: string;
}
