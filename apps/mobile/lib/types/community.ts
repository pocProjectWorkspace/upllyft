export type PostType =
  | 'DISCUSSION'
  | 'QUESTION'
  | 'CASE_STUDY'
  | 'RESOURCE'
  | 'ANNOUNCEMENT'
  | 'STORY';

export type SortOption = 'recent' | 'popular' | 'trending';

export interface Author {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  verificationStatus: string;
}

export interface PostComment {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
  parentId?: string | null;
  replies?: PostComment[];
}

export interface Post {
  id: string;
  title: string;
  content: string;
  summary?: string | null;
  type: PostType;
  category: string;
  tags: string[];
  author: Author;
  upvotes: number;
  downvotes: number;
  viewCount: number;
  commentCount?: number;
  _count?: { comments: number; bookmarks: number };
  userVote?: number | null;
  isBookmarked?: boolean;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PostsResponse {
  posts: Post[];
  total: number;
  page: number;
  pages: number;
  hasMore: boolean;
}

export interface CommentsResponse {
  data: PostComment[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetPostsParams {
  page?: number;
  limit?: number;
  type?: PostType;
  sort?: SortOption;
  search?: string;
}
