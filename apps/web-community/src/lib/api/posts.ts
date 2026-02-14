import { apiClient } from '@upllyft/api-client';

export interface Author {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: string;
  verificationStatus: string;
  organization?: string | null;
  bio?: string;
  trustScore?: number;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  type: 'DISCUSSION' | 'QUESTION' | 'CASE_STUDY' | 'RESOURCE';
  category: string;
  tags: string[];
  author: Author;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  published: boolean;
  viewCount: number;
  upvotes: number;
  downvotes: number;
  commentCount?: number;
  bookmarkCount?: number;
  isBookmarked?: boolean;
  userVote?: 'up' | 'down' | null;
  featured?: boolean;
  isAnonymous?: boolean;
  communityId?: string;
}

export interface Comment {
  id: string;
  content: string;
  postId: string;
  parentId?: string | null;
  author: Author;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  upvotes: number;
  downvotes: number;
  userVote?: 'up' | 'down' | null;
  helpful: boolean;
  sentiment?: number;
  replies?: Comment[];
}

export interface PostFilters {
  page?: number;
  limit?: number;
  type?: 'DISCUSSION' | 'QUESTION' | 'CASE_STUDY' | 'RESOURCE';
  category?: string;
  tags?: string[];
  author?: string;
  sort?: 'recent' | 'popular' | 'trending' | 'unanswered';
  search?: string;
  view?: 'saved' | 'following';
}

export interface PostsResponse {
  posts: Post[];
  total: number;
  page: number;
  pages: number;
  hasMore: boolean;
}

export interface CreatePostDto {
  title: string;
  content: string;
  type: 'DISCUSSION' | 'QUESTION' | 'CASE_STUDY' | 'RESOURCE';
  category: string;
  tags: string[];
  isAnonymous?: boolean;
  published?: boolean;
  communityId?: string;
}

export interface UpdatePostDto {
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
  published?: boolean;
}

export async function getPosts(filters?: PostFilters): Promise<PostsResponse> {
  const { data } = await apiClient.get('/posts', { params: filters });
  return data;
}

export async function getPost(id: string): Promise<Post> {
  const { data } = await apiClient.get(`/posts/${id}`);
  return data;
}

export async function createPost(dto: CreatePostDto): Promise<Post> {
  const { data } = await apiClient.post('/posts', dto);
  return data;
}

export async function updatePost(id: string, dto: UpdatePostDto): Promise<Post> {
  const { data } = await apiClient.put(`/posts/${id}`, dto);
  return data;
}

export async function deletePost(id: string): Promise<void> {
  await apiClient.delete(`/posts/${id}`);
}

export async function votePost(id: string, vote: 'up' | 'down' | null): Promise<void> {
  const value = vote === 'up' ? 1 : vote === 'down' ? -1 : 0;
  await apiClient.post(`/posts/${id}/vote`, { value });
}

export async function toggleBookmark(id: string): Promise<{ bookmarked: boolean }> {
  const { data } = await apiClient.post(`/bookmarks/toggle/${id}`);
  return data;
}

export async function getPostComments(postId: string, page = 1, limit = 20): Promise<{ data: Comment[]; total: number }> {
  const { data } = await apiClient.get(`/posts/${postId}/comments`, { params: { page, limit } });
  return data;
}

export async function createComment(postId: string, dto: { content: string; parentId?: string }): Promise<Comment> {
  const { data } = await apiClient.post(`/posts/${postId}/comments`, dto);
  return data;
}

export async function updateComment(commentId: string, content: string): Promise<Comment> {
  const { data } = await apiClient.put(`/comments/${commentId}`, { content });
  return data;
}

export async function deleteComment(commentId: string): Promise<void> {
  await apiClient.delete(`/comments/${commentId}`);
}

export async function voteComment(commentId: string, vote: 'up' | 'down' | null): Promise<void> {
  await apiClient.post(`/comments/${commentId}/vote`, { vote });
}

export async function getTrendingPosts(limit = 5): Promise<Post[]> {
  const { data } = await apiClient.get('/posts/trending', { params: { limit } });
  return data;
}

export async function suggestTags(content: string): Promise<string[]> {
  const { data } = await apiClient.post('/ai/suggest-tags', { content });
  return data;
}

export async function getTrendingTags(limit = 10): Promise<{ tag: string; count: number }[]> {
  const { data } = await apiClient.get('/posts/tags/trending', { params: { limit } });
  return data;
}
