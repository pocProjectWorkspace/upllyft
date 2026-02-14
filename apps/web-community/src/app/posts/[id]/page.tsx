'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@upllyft/api-client';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Skeleton,
  Textarea,
} from '@upllyft/ui';
import { CommunityShell } from '@/components/community-shell';
import {
  usePost,
  usePostComments,
  useCreateComment,
  useVotePost,
  useToggleBookmark,
  useTrendingPosts,
  useVoteComment,
} from '@/hooks/use-posts';
import { ShareModal } from '@/components/share-modal';
import type { Comment } from '@/lib/api/posts';

const TYPE_COLORS: Record<string, 'teal' | 'blue' | 'purple' | 'green'> = {
  DISCUSSION: 'teal',
  QUESTION: 'blue',
  CASE_STUDY: 'purple',
  RESOURCE: 'green',
};

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function VoteButtons({
  upvotes,
  downvotes,
  userVote,
  onVote,
  size = 'md',
}: {
  upvotes: number;
  downvotes: number;
  userVote?: 'up' | 'down' | null;
  onVote: (vote: 'up' | 'down' | null) => void;
  size?: 'sm' | 'md';
}) {
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onVote(userVote === 'up' ? null : 'up')}
        className={`p-1.5 rounded-lg transition-colors ${
          userVote === 'up' ? 'text-teal-600 bg-teal-50' : 'text-gray-400 hover:text-teal-600 hover:bg-teal-50'
        }`}
      >
        <svg className={iconSize} fill={userVote === 'up' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
      <span className={`font-semibold text-sm min-w-[2ch] text-center ${
        userVote === 'up' ? 'text-teal-600' : userVote === 'down' ? 'text-red-500' : 'text-gray-700'
      }`}>
        {upvotes - downvotes}
      </span>
      <button
        onClick={() => onVote(userVote === 'down' ? null : 'down')}
        className={`p-1.5 rounded-lg transition-colors ${
          userVote === 'down' ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
        }`}
      >
        <svg className={iconSize} fill={userVote === 'down' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}

function CommentItem({
  comment,
  postId,
  depth = 0,
}: {
  comment: Comment;
  postId: string;
  depth?: number;
}) {
  const [showReply, setShowReply] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const createComment = useCreateComment(postId);
  const voteComment = useVoteComment();

  function handleReply() {
    if (!replyContent.trim()) return;
    createComment.mutate(
      { content: replyContent, parentId: comment.id },
      {
        onSuccess: () => {
          setReplyContent('');
          setShowReply(false);
        },
      },
    );
  }

  return (
    <div className={depth > 0 ? 'ml-8 border-l-2 border-gray-100 pl-4' : ''}>
      <div className="py-4">
        <div className="flex items-start gap-3">
          <Avatar
            name={comment.author.name || 'Anonymous'}
            src={comment.author.image || undefined}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-900">{comment.author.name}</span>
              <span className="text-xs text-gray-400">{formatTimeAgo(comment.createdAt)}</span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
            <div className="flex items-center gap-3 mt-2">
              <VoteButtons
                upvotes={comment.upvotes}
                downvotes={comment.downvotes}
                userVote={comment.userVote}
                onVote={(vote) => voteComment.mutate({ commentId: comment.id, vote })}
                size="sm"
              />
              {depth === 0 && (
                <button
                  onClick={() => setShowReply(!showReply)}
                  className="text-xs text-gray-500 hover:text-teal-600 font-medium transition-colors"
                >
                  Reply
                </button>
              )}
            </div>

            {showReply && (
              <div className="mt-3 flex gap-2">
                <Textarea
                  placeholder="Write a reply..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
                <div className="flex flex-col gap-1">
                  <Button size="sm" onClick={handleReply} disabled={createComment.isPending || !replyContent.trim()}>
                    Reply
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowReply(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nested replies (1 level deep) */}
      {comment.replies?.map((reply) => (
        <CommentItem key={reply.id} comment={reply} postId={postId} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data: post, isLoading: postLoading } = usePost(id);
  const { data: commentsData, isLoading: commentsLoading } = usePostComments(id);
  const { data: trendingPosts } = useTrendingPosts(5);
  const createComment = useCreateComment(id);
  const votePost = useVotePost();
  const toggleBookmark = useToggleBookmark();

  const [commentContent, setCommentContent] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

  function handleComment() {
    if (!commentContent.trim()) return;
    createComment.mutate(
      { content: commentContent },
      {
        onSuccess: () => setCommentContent(''),
      },
    );
  }

  if (postLoading) {
    return (
      <CommunityShell>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card className="p-6">
                <Skeleton className="h-8 w-3/4 mb-4" />
                <Skeleton className="h-4 w-1/2 mb-6" />
                <Skeleton className="h-32 w-full" />
              </Card>
            </div>
            <div>
              <Card className="p-4">
                <Skeleton className="h-6 w-full mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </Card>
            </div>
          </div>
        </div>
      </CommunityShell>
    );
  }

  if (!post) {
    return (
      <CommunityShell>
        <div className="max-w-4xl mx-auto text-center py-20">
          <h2 className="text-xl font-semibold text-gray-900">Post not found</h2>
          <p className="text-gray-500 mt-2">This post may have been removed or you do not have access.</p>
          <Button variant="secondary" onClick={() => router.push('/')} className="mt-4">
            Back to Feed
          </Button>
        </div>
      </CommunityShell>
    );
  }

  const comments = commentsData?.data || [];

  return (
    <CommunityShell>
      <div className="max-w-4xl mx-auto">
        {/* Back nav */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Post */}
            <Card className="p-6">
              {/* Header */}
              <div className="flex items-start gap-3 mb-4">
                <Avatar
                  name={post.isAnonymous ? 'Anonymous' : (post.author.name || 'User')}
                  src={post.isAnonymous ? undefined : (post.author.image || undefined)}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">
                      {post.isAnonymous ? 'Anonymous' : post.author.name}
                    </span>
                    {!post.isAnonymous && post.author.role && (
                      <Badge color="purple" className="text-[10px]">{post.author.role}</Badge>
                    )}
                    {!post.isAnonymous && post.author.trustScore !== undefined && (
                      <span className="text-xs text-gray-400">Trust: {post.author.trustScore}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{formatTimeAgo(post.createdAt)}</p>
                </div>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <Badge color={TYPE_COLORS[post.type] || 'teal'}>{post.type.replace('_', ' ')}</Badge>
                <Badge color="gray">{post.category}</Badge>
                {post.tags.map((tag) => (
                  <span key={tag} className="text-xs text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">#{tag}</span>
                ))}
              </div>

              {/* Title & Content */}
              <h1 className="text-xl font-bold text-gray-900 mb-3">{post.title}</h1>
              <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{post.content}</div>

              {/* Action bar */}
              <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-100">
                <VoteButtons
                  upvotes={post.upvotes}
                  downvotes={post.downvotes}
                  userVote={post.userVote}
                  onVote={(vote) => votePost.mutate({ id: post.id, vote })}
                />

                <button
                  onClick={() => toggleBookmark.mutate(post.id)}
                  className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-sm ${
                    post.isBookmarked ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'
                  }`}
                >
                  <svg className="w-5 h-5" fill={post.isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Bookmark
                </button>

                <button
                  onClick={() => setShowShareModal(true)}
                  className="p-1.5 rounded-lg transition-colors flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>

                <span className="text-sm text-gray-400 flex items-center gap-1 ml-auto">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {post.commentCount ?? comments.length} comments
                </span>
              </div>
            </Card>

            <ShareModal
              isOpen={showShareModal}
              onClose={() => setShowShareModal(false)}
              postId={post.id}
              postTitle={post.title}
            />

            {/* Comments Section */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Comments</h2>

              {/* Comment form */}
              <div className="mb-6">
                <Textarea
                  placeholder="Share your thoughts..."
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end mt-2">
                  <Button
                    size="sm"
                    onClick={handleComment}
                    disabled={createComment.isPending || !commentContent.trim()}
                  >
                    {createComment.isPending ? 'Posting...' : 'Post Comment'}
                  </Button>
                </div>
              </div>

              {/* Comments list */}
              {commentsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No comments yet. Be the first to share your thoughts.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {comments.map((comment) => (
                    <CommentItem key={comment.id} comment={comment} postId={id} />
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Trending Posts */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Trending Posts
              </h3>
              {trendingPosts && trendingPosts.length > 0 ? (
                <div className="space-y-3">
                  {trendingPosts.map((tp) => (
                    <button
                      key={tp.id}
                      onClick={() => router.push(`/posts/${tp.id}`)}
                      className="block w-full text-left group"
                    >
                      <p className="text-sm font-medium text-gray-700 group-hover:text-teal-600 transition-colors line-clamp-2">
                        {tp.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">{tp.upvotes - tp.downvotes} votes</span>
                        <span className="text-xs text-gray-300">|</span>
                        <span className="text-xs text-gray-400">{tp.commentCount ?? 0} comments</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No trending posts yet.</p>
              )}
            </Card>

            {/* Post Info */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Post Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Views</span>
                  <span className="text-gray-900 font-medium">{post.viewCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Upvotes</span>
                  <span className="text-gray-900 font-medium">{post.upvotes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Comments</span>
                  <span className="text-gray-900 font-medium">{post.commentCount ?? comments.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Published</span>
                  <span className="text-gray-900 font-medium">{new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </CommunityShell>
  );
}
