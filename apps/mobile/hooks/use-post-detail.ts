import { useState, useEffect, useCallback, useRef } from 'react';

import {
  getPost,
  getComments,
  createComment as apiCreateComment,
} from '../lib/api/community';
import { Post, PostComment } from '../lib/types/community';

export function usePostDetail(id: string) {
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsPage, setCommentsPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [postData, commentsData] = await Promise.all([
        getPost(id),
        getComments(id, 1),
      ]);
      if (!mountedRef.current) return;
      setPost(postData);
      setComments(commentsData.data);
      setCommentsPage(1);
      setHasMoreComments(1 < commentsData.meta.totalPages);
    } catch {
      if (mountedRef.current) setError('Failed to load post');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadMoreComments = useCallback(async () => {
    if (!hasMoreComments || loadingComments) return;
    setLoadingComments(true);
    try {
      const next = commentsPage + 1;
      const res = await getComments(id, next);
      if (!mountedRef.current) return;
      setComments((prev) => [...prev, ...res.data]);
      setCommentsPage(next);
      setHasMoreComments(next < res.meta.totalPages);
    } catch {
      // silent
    } finally {
      if (mountedRef.current) setLoadingComments(false);
    }
  }, [id, commentsPage, hasMoreComments, loadingComments]);

  const addComment = useCallback(
    async (content: string, parentId?: string) => {
      const newComment = await apiCreateComment(id, content, parentId);
      if (mountedRef.current) {
        setComments((prev) => [newComment, ...prev]);
      }
    },
    [id],
  );

  return {
    post,
    setPost,
    comments,
    loading,
    loadingComments,
    error,
    hasMoreComments,
    refresh: loadData,
    loadMoreComments,
    addComment,
  };
}
