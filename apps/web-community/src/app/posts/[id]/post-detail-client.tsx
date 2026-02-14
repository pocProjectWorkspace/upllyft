'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@upllyft/api-client';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Skeleton,
  Textarea,
  toast,
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
  useDeletePost,
} from '@/hooks/use-posts';
import { useMyCommunities } from '@/hooks/use-community';
import { ShareModal } from '@/components/share-modal';
import type { Comment } from '@/lib/api/posts';

const GROUP_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-600' },
  { bg: 'bg-purple-100', text: 'text-purple-600' },
  { bg: 'bg-green-100', text: 'text-green-600' },
  { bg: 'bg-orange-100', text: 'text-orange-600' },
  { bg: 'bg-teal-100', text: 'text-teal-600' },
];

const TYPE_COLORS: Record<string, 'teal' | 'blue' | 'purple' | 'green'> = {
  DISCUSSION: 'teal',
  QUESTION: 'blue',
  CASE_STUDY: 'purple',
  RESOURCE: 'green',
};

const TYPE_BORDER: Record<string, string> = {
  DISCUSSION: 'border-l-teal-500',
  QUESTION: 'border-l-blue-500',
  CASE_STUDY: 'border-l-purple-500',
  RESOURCE: 'border-l-green-500',
  EVENT: 'border-l-orange-500',
  PHOTO: 'border-l-green-400',
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
            name={comment.author.name || comment.author.email?.split('@')[0] || 'User'}
            src={comment.author.image || undefined}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-900">{comment.author.name || comment.author.email?.split('@')[0] || 'User'}</span>
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

function DetailPostMenu({
  postId,
  postTitle,
  authorId,
  userId,
  userRole,
  onDelete,
}: {
  postId: string;
  postTitle: string;
  authorId: string;
  userId?: string;
  userRole?: string;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const canManage = userId === authorId || userRole === 'ADMIN' || userRole === 'MODERATOR';

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setOpen(!open)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-9 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-40">
          {canManage && (
            <>
              <button onClick={() => { router.push(`/posts/${postId}/edit`); setOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Edit Post
              </button>
              <button onClick={() => { setShowDeleteConfirm(true); setOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete Post
              </button>
              <div className="border-t border-gray-100 my-1" />
            </>
          )}
          <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: 'Link copied' }); setOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            Copy Link
          </button>
          <button onClick={() => { toast({ title: 'Reported', description: 'Thank you. We will review this post.' }); setOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z" /></svg>
            Report Post
          </button>
        </div>
      )}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Post?</h3>
            <p className="text-sm text-gray-500 mb-1">This action cannot be undone.</p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-gray-900 line-clamp-2">&ldquo;{postTitle}&rdquo;</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition">Cancel</button>
              <button onClick={() => { onDelete(); setShowDeleteConfirm(false); }} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LeftSidebar() {
  const { data: myCommunities, isLoading: groupsLoading } = useMyCommunities();
  const navClass = 'text-gray-600 hover:bg-gray-50 hover:text-gray-900';

  return (
    <aside className="hidden lg:block w-60 flex-shrink-0">
      <div className="sticky top-24">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
          {/* Create Post */}
          <Link href="/posts/create">
            <button className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-pink-600 hover:to-rose-600 transition-all shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Post
            </button>
          </Link>

          {/* Navigation */}
          <nav className="mt-4 space-y-1">
            <Link href="/" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${navClass}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              Feed
            </Link>
            <Link href="/communities" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${navClass}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Groups
            </Link>
            <Link href="/events" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${navClass}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Events
            </Link>
            <Link href="/questions" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${navClass}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Q&A
            </Link>
          </nav>

          {/* My Groups */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">My Groups</h4>
            {groupsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : myCommunities && myCommunities.length > 0 ? (
              <div className="space-y-1">
                {myCommunities.slice(0, 4).map((community, i) => {
                  const color = GROUP_COLORS[i % GROUP_COLORS.length];
                  return (
                    <Link
                      key={community.id}
                      href={`/communities/${community.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className={`w-8 h-8 ${color.bg} rounded-full flex items-center justify-center`}>
                        <span className={`${color.text} text-xs font-bold`}>
                          {community.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm text-gray-700 truncate">{community.name}</span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 px-3">No groups joined yet</p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function PostDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data: post, isLoading: postLoading } = usePost(id);
  const { data: commentsData, isLoading: commentsLoading } = usePostComments(id);
  const { data: trendingPosts } = useTrendingPosts(5);
  const createComment = useCreateComment(id);
  const votePost = useVotePost();
  const toggleBookmark = useToggleBookmark();
  const deletePostMutation = useDeletePost();

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
        <div className="flex gap-6">
          <LeftSidebar />
          <main className="flex-1 min-w-0 space-y-4">
            <Card className="p-6">
              <Skeleton className="h-8 w-3/4 mb-4" />
              <Skeleton className="h-4 w-1/2 mb-6" />
              <Skeleton className="h-32 w-full" />
            </Card>
          </main>
          <aside className="hidden xl:block w-[300px] flex-shrink-0">
            <div className="sticky top-24 space-y-4">
              <Card className="p-4">
                <Skeleton className="h-6 w-full mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </Card>
            </div>
          </aside>
        </div>
      </CommunityShell>
    );
  }

  if (!post) {
    return (
      <CommunityShell>
        <div className="flex gap-6">
          <LeftSidebar />
          <main className="flex-1 min-w-0 text-center py-20">
            <h2 className="text-xl font-semibold text-gray-900">Post not found</h2>
            <p className="text-gray-500 mt-2">This post may have been removed or you do not have access.</p>
            <Button variant="secondary" onClick={() => router.push('/')} className="mt-4">
              Back to Feed
            </Button>
          </main>
        </div>
      </CommunityShell>
    );
  }

  const comments = commentsData?.data || [];

  return (
    <CommunityShell>
      <div className="flex gap-6">
        {/* Left Sidebar — same nav as feed page */}
        <LeftSidebar />

        {/* Main Content */}
        <main className="flex-1 min-w-0 flex flex-col gap-6">
          {/* Back nav */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors self-start"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Feed
          </button>

          {/* Post */}
          <Card className={`p-6 border-l-4 ${TYPE_BORDER[post.type] || 'border-l-gray-300'}`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <Avatar
                  name={post.isAnonymous ? 'Anonymous' : (post.author.name || 'User')}
                  src={post.isAnonymous ? undefined : (post.author.image || undefined)}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">
                      {post.isAnonymous ? 'Anonymous' : (post.author.name || post.author.email?.split('@')[0] || 'User')}
                    </span>
                    {!post.isAnonymous && post.author.role && (
                      <Badge color="purple" className="text-[10px]">{post.author.role}</Badge>
                    )}
                    {!post.isAnonymous && post.author.trustScore !== undefined && (
                      <span className="text-xs text-gray-400">Trust: {post.author.trustScore}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-xs text-gray-400">{formatTimeAgo(post.createdAt)}</p>
                    <Badge color={TYPE_COLORS[post.type] || 'teal'}>{post.type.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </div>
              <DetailPostMenu
                postId={post.id}
                postTitle={post.title}
                authorId={post.authorId}
                userId={user?.id}
                userRole={user?.role}
                onDelete={() => deletePostMutation.mutate(post.id, { onSuccess: () => router.push('/') })}
              />
            </div>

            {/* Title & Content */}
            <h1 className="text-xl font-bold text-gray-900 mb-3">{post.title}</h1>
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{post.content}</div>

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                <Badge color="gray">{post.category}</Badge>
                {post.tags.map((tag) => (
                  <span key={tag} className="text-xs text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">#{tag}</span>
                ))}
              </div>
            )}

            {/* Stats row */}
            <div className="flex items-center gap-4 text-xs text-gray-400 mt-4">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {post.viewCount} views
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {post.commentCount ?? comments.length} comments
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                {post.bookmarkCount ?? 0} saves
              </span>
            </div>

            {/* Action bar */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
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
            </div>
          </Card>

          <ShareModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            postId={post.id}
            postTitle={post.title}
            postContent={post.content}
            postType={post.type}
            authorName={post.isAnonymous ? 'Anonymous' : (post.author.name || post.author.email?.split('@')[0] || 'User')}
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
        </main>

        {/* Right Sidebar */}
        <aside className="hidden xl:block w-[300px] flex-shrink-0">
          <div className="sticky top-24 space-y-4">
            {/* Trending Posts */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
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
            </div>

            {/* Post Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
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
            </div>
          </div>
        </aside>
      </div>
    </CommunityShell>
  );
}
