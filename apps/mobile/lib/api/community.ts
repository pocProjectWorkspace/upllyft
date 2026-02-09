import api from '../api';
import {
  Post,
  PostComment,
  PostType,
  PostsResponse,
  CommentsResponse,
  GetPostsParams,
} from '../types/community';

export async function getPosts(params: GetPostsParams = {}): Promise<PostsResponse> {
  const { data } = await api.get('/posts', { params });
  return data;
}

export async function getPost(id: string): Promise<Post> {
  const { data } = await api.get(`/posts/${id}`);
  return data;
}

export async function getComments(
  postId: string,
  page = 1,
  limit = 20,
): Promise<CommentsResponse> {
  const { data } = await api.get(`/posts/${postId}/comments`, {
    params: { page, limit },
  });
  // Backend returns { comments, total, page, pages, hasMore }
  // Normalize to our CommentsResponse shape
  if (data.comments && !data.data) {
    return {
      data: data.comments,
      meta: {
        page: data.page ?? page,
        limit,
        total: data.total ?? data.comments.length,
        totalPages: data.pages ?? 1,
      },
    };
  }
  return data;
}

export async function votePost(
  postId: string,
  value: 1 | -1,
): Promise<{ upvotes: number; downvotes: number; userVote: number | null }> {
  const { data } = await api.post(`/posts/${postId}/vote`, { value });
  return data;
}

export async function bookmarkPost(
  postId: string,
): Promise<{ isBookmarked: boolean }> {
  const { data } = await api.post(`/posts/${postId}/bookmark`);
  // Backend returns { bookmarked: boolean }, normalize to { isBookmarked }
  return { isBookmarked: data.isBookmarked ?? data.bookmarked ?? false };
}

export interface CreatePostData {
  title: string;
  content: string;
  type: PostType;
  category: string;
  tags?: string[];
}

export async function createPost(postData: CreatePostData): Promise<Post> {
  const { data } = await api.post('/posts', postData);
  return data;
}

export async function createComment(
  postId: string,
  content: string,
  parentId?: string,
): Promise<PostComment> {
  const { data } = await api.post(`/posts/${postId}/comments`, {
    content,
    parentId,
  });
  return data;
}
