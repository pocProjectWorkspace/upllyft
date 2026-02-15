import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { toast } from '@upllyft/ui';
import {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  votePost,
  toggleBookmark,
  getPostComments,
  createComment,
  voteComment,
  getTrendingPosts,
  getTrendingTags,
  suggestTags,
  reportPost,
  type PostFilters,
  type CreatePostDto,
  type UpdatePostDto,
  type Post,
} from '@/lib/api/posts';

const postKeys = {
  all: ['posts'] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  list: (filters?: PostFilters) => [...postKeys.lists(), filters] as const,
  details: () => [...postKeys.all, 'detail'] as const,
  detail: (id: string) => [...postKeys.details(), id] as const,
  comments: (id: string, page?: number) => [...postKeys.detail(id), 'comments', page] as const,
  trending: () => [...postKeys.all, 'trending'] as const,
};

export function usePosts(filters?: PostFilters) {
  return useQuery({
    queryKey: postKeys.list(filters),
    queryFn: () => getPosts(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useInfinitePosts(filters?: Omit<PostFilters, 'page'>) {
  return useInfiniteQuery({
    queryKey: [...postKeys.lists(), 'infinite', filters],
    queryFn: ({ pageParam = 1 }) => getPosts({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.pages) return lastPage.page + 1;
      return undefined;
    },
    initialPageParam: 1,
  });
}

export function usePost(id: string) {
  return useQuery({
    queryKey: postKeys.detail(id),
    queryFn: () => getPost(id),
    enabled: !!id,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePostDto) => createPost(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      toast({ title: 'Post created', description: 'Your post has been published.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create post.', variant: 'destructive' });
    },
  });
}

export function useUpdatePost(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdatePostDto) => updatePost(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      toast({ title: 'Post deleted' });
    },
  });
}

export function useVotePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, vote }: { id: string; vote: 'up' | 'down' | null }) => votePost(id, vote),
    onMutate: async ({ id, vote }) => {
      await queryClient.cancelQueries({ queryKey: postKeys.detail(id) });
      const previous = queryClient.getQueryData<Post>(postKeys.detail(id));
      if (previous) {
        queryClient.setQueryData(postKeys.detail(id), {
          ...previous,
          userVote: vote,
          upvotes: vote === 'up' ? previous.upvotes + 1 : previous.userVote === 'up' ? previous.upvotes - 1 : previous.upvotes,
          downvotes: vote === 'down' ? previous.downvotes + 1 : previous.userVote === 'down' ? previous.downvotes - 1 : previous.downvotes,
        });
      }
      return { previous };
    },
    onError: (_err, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(postKeys.detail(id), context.previous);
      }
    },
  });
}

export function useToggleBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => toggleBookmark(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

export function usePostComments(postId: string, page = 1) {
  return useQuery({
    queryKey: postKeys.comments(postId, page),
    queryFn: () => getPostComments(postId, page),
    enabled: !!postId,
  });
}

export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { content: string; parentId?: string }) => createComment(postId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.comments(postId) });
      queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) });
    },
  });
}

export function useVoteComment() {
  return useMutation({
    mutationFn: ({ commentId, vote }: { commentId: string; vote: 'up' | 'down' | null }) => voteComment(commentId, vote),
  });
}

export function useTrendingPosts(limit = 5) {
  return useQuery({
    queryKey: postKeys.trending(),
    queryFn: () => getTrendingPosts(limit),
  });
}

export function useTrendingTags(limit = 10) {
  return useQuery({
    queryKey: [...postKeys.all, 'tags', 'trending'],
    queryFn: () => getTrendingTags(limit),
    staleTime: 10 * 60 * 1000,
  });
}

export function useSuggestTags() {
  return useMutation({
    mutationFn: (content: string) => suggestTags(content),
  });
}

export function useReportPost() {
  return useMutation({
    mutationFn: ({ id, reason, description }: { id: string; reason: string; description?: string }) =>
      reportPost(id, { reason, description }),
    onSuccess: () => {
      toast({ title: 'Report submitted', description: 'Thank you. We will review this post.' });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to submit report.';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    },
  });
}
