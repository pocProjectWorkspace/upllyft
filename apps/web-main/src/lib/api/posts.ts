import { apiClient } from '@upllyft/api-client';

export interface Author {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: string;
  verificationStatus: string;
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
  isBookmarked?: boolean;
  userVote?: 'up' | 'down' | null;
  isAnonymous?: boolean;
}

export interface PostsResponse {
  posts: Post[];
  total: number;
  page: number;
  pages: number;
  hasMore: boolean;
}

export interface PostFilters {
  page?: number;
  limit?: number;
  type?: string;
  category?: string;
  tags?: string[];
  sort?: 'recent' | 'popular' | 'trending';
  search?: string;
}

export interface CreatePostDto {
  title: string;
  content: string;
  type: 'DISCUSSION' | 'QUESTION' | 'CASE_STUDY' | 'RESOURCE';
  category: string;
  tags: string[];
  isAnonymous?: boolean;
}

export async function getPosts(filters?: PostFilters): Promise<PostsResponse> {
  const { data } = await apiClient.get<PostsResponse>('/posts', { params: filters });
  return data;
}

export async function getPost(id: string): Promise<Post> {
  const { data } = await apiClient.get<Post>(`/posts/${id}`);
  return data;
}

export async function createPost(postData: CreatePostDto): Promise<Post> {
  const { data } = await apiClient.post<Post>('/posts', postData);
  return data;
}

export async function votePost(id: string, vote: 'up' | 'down' | null): Promise<void> {
  if (vote === null) {
    await apiClient.delete(`/posts/${id}/vote`);
  } else {
    await apiClient.post(`/posts/${id}/vote`, { value: vote === 'up' ? 1 : -1 });
  }
}

export async function bookmarkPost(id: string): Promise<void> {
  await apiClient.post(`/posts/${id}/bookmark`);
}

export async function unbookmarkPost(id: string): Promise<void> {
  await apiClient.delete(`/posts/${id}/bookmark`);
}

export async function getTrendingPosts(limit = 5): Promise<Post[]> {
  const { data } = await apiClient.get<Post[]>('/posts/trending', { params: { limit } });
  return data;
}
