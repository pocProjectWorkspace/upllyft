'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@upllyft/api-client';
import { CommunityShell } from '@/components/community-shell';
import { useInfinitePosts, useTrendingTags, useVotePost, useToggleBookmark, useDeletePost, useReportPost } from '@/hooks/use-posts';
import { useQuestions } from '@/hooks/use-questions';
import { useMyCommunities, useBrowseCommunities } from '@/hooks/use-community';
import { Card, Button, Avatar, Badge, Skeleton, toast } from '@upllyft/ui';
import { ShareModal } from '@/components/share-modal';
import type { Post } from '@/lib/api/posts';
import type { Question, QuestionFilters } from '@/lib/api/questions';

// ===== Constants =====

const POST_TYPE_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Discussion', value: 'DISCUSSION' as const },
  { label: 'Question', value: 'QUESTION' as const },
  { label: 'Case Study', value: 'CASE_STUDY' as const },
  { label: 'Resource', value: 'RESOURCE' as const },
  { label: 'Milestone', value: 'MILESTONE' as const },
] as const;

const SORT_OPTIONS = [
  { label: 'Recent', value: 'recent' as const },
  { label: 'Popular', value: 'popular' as const },
  { label: 'Trending', value: 'trending' as const },
] as const;

const VIEW_TABS = [
  { label: 'For You', value: 'feed' },
  { label: 'Following', value: 'following' },
  { label: 'Saved', value: 'saved' },
] as const;

const typeBadgeColors: Record<string, 'teal' | 'blue' | 'purple' | 'green' | 'red'> = {
  DISCUSSION: 'teal',
  QUESTION: 'blue',
  CASE_STUDY: 'purple',
  RESOURCE: 'green',
  MILESTONE: 'red',
};

const typeBorderColors: Record<string, string> = {
  DISCUSSION: 'border-l-teal-500',
  QUESTION: 'border-l-blue-500',
  CASE_STUDY: 'border-l-purple-500',
  RESOURCE: 'border-l-green-500',
  MILESTONE: 'border-l-pink-500',
  EVENT: 'border-l-orange-500',
  PHOTO: 'border-l-green-400',
};

const GROUP_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-600' },
  { bg: 'bg-purple-100', text: 'text-purple-600' },
  { bg: 'bg-green-100', text: 'text-green-600' },
  { bg: 'bg-orange-100', text: 'text-orange-600' },
  { bg: 'bg-teal-100', text: 'text-teal-600' },
];

// ===== Helpers =====

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function roleBadgeColor(role: string): 'teal' | 'blue' | 'purple' | 'green' | 'gray' {
  switch (role) {
    case 'THERAPIST':
      return 'blue';
    case 'EDUCATOR':
      return 'purple';
    case 'ADMIN':
    case 'MODERATOR':
      return 'green';
    default:
      return 'gray';
  }
}

// ===== Reusable Components =====

function PostMenu({
  post,
  userId,
  userRole,
  onDelete,
  onReport,
}: {
  post: Post;
  userId?: string;
  userRole?: string;
  onDelete: () => void;
  onReport: (reason: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const isAuthor = userId === post.authorId;
  const isMod = userRole === 'ADMIN' || userRole === 'MODERATOR';
  const canManage = isAuthor || isMod;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}`);
    toast({ title: 'Link copied', description: 'Post link copied to clipboard.' });
    setOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-40">
          {canManage && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); router.push(`/posts/${post.id}/edit`); setOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Post
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); setOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Post
              </button>
              <div className="border-t border-gray-100 my-1" />
            </>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleCopyLink(); }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Copy Link
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowReportDialog(true); setOpen(false); }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z" />
            </svg>
            Report Post
          </button>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Post?</h3>
            <p className="text-sm text-gray-500 mb-1">This action cannot be undone.</p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-gray-900 line-clamp-2">&ldquo;{post.title}&rdquo;</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={() => { onDelete(); setShowDeleteConfirm(false); }}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report dialog */}
      {showReportDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowReportDialog(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Report Post</h3>
            <p className="text-sm text-gray-500 mb-3">Why are you reporting this post?</p>
            <div className="space-y-2 mb-4">
              {['Spam', 'Harassment', 'Misinformation', 'Inappropriate content', 'Other'].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setReportReason(reason)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                    reportReason === reason
                      ? 'bg-teal-50 text-teal-700 font-medium border border-teal-200'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowReportDialog(false); setReportReason(''); }}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (reportReason) {
                    onReport(reportReason);
                    setShowReportDialog(false);
                    setReportReason('');
                  }
                }}
                disabled={!reportReason}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const router = useRouter();
  const { user } = useAuth();
  const votePost = useVotePost();
  const toggleBookmark = useToggleBookmark();
  const deletePostMutation = useDeletePost();
  const reportPostMutation = useReportPost();

  const [userVote, setUserVote] = useState<'up' | 'down' | null>(post.userVote ?? null);
  const [voteScore, setVoteScore] = useState(post.upvotes - post.downvotes);
  const [bookmarked, setBookmarked] = useState(post.isBookmarked ?? false);
  const [showShareModal, setShowShareModal] = useState(false);

  const contentPreview =
    post.content.length > 180 ? post.content.slice(0, 180) + '...' : post.content;

  const borderColor = typeBorderColors[post.type] || 'border-l-gray-300';

  const handleReport = (reason: string) => {
    reportPostMutation.mutate({ id: post.id, reason });
  };

  const handleVote = (direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    const prevVote = userVote;
    const prevScore = voteScore;
    const newVote = userVote === direction ? null : direction;
    setUserVote(newVote);

    let scoreDelta = 0;
    if (prevVote === 'up') scoreDelta -= 1;
    if (prevVote === 'down') scoreDelta += 1;
    if (newVote === 'up') scoreDelta += 1;
    if (newVote === 'down') scoreDelta -= 1;
    setVoteScore((s) => s + scoreDelta);

    votePost.mutate(
      { id: post.id, vote: newVote },
      { onError: () => { setUserVote(prevVote); setVoteScore(prevScore); } },
    );
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    const was = bookmarked;
    setBookmarked(!was);
    toggleBookmark.mutate(post.id, { onError: () => setBookmarked(was) });
  };

  const handleDelete = () => {
    deletePostMutation.mutate(post.id);
  };

  return (
    <Card hover className={`p-5 border-l-4 ${borderColor}`}>
      {/* Author row + menu */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <Avatar
            src={post.isAnonymous ? undefined : (post.author.image || undefined)}
            name={post.isAnonymous ? 'Anonymous' : (post.author.name || post.author.email?.split('@')[0] || 'User')}
            size="md"
          />
          <div>
            <span className="text-sm font-semibold text-gray-900">
              {post.isAnonymous ? 'Anonymous' : (post.author.name || post.author.email?.split('@')[0] || 'User')}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              {!post.isAnonymous && post.author.role !== 'USER' && (
                <Badge color={roleBadgeColor(post.author.role)}>
                  {formatLabel(post.author.role)}
                </Badge>
              )}
              <span className="text-xs text-gray-400">
                {formatTimeAgo(post.createdAt)}
              </span>
              {post.type === 'MILESTONE' ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-700">
                  Milestone {'\u{1F389}'}
                </span>
              ) : (
                <Badge color={typeBadgeColors[post.type] || 'gray'}>
                  {formatLabel(post.type)}
                </Badge>
              )}
              {post.featured && <Badge color="yellow">Featured</Badge>}
            </div>
          </div>
        </div>
        <PostMenu
          post={post}
          userId={user?.id}
          userRole={user?.role}
          onDelete={handleDelete}
          onReport={handleReport}
        />
      </div>

      {/* Title — only clickable link */}
      <Link href={`/posts/${post.id}`} className="block relative z-10">
        <h3 className="font-semibold text-gray-900 text-base leading-snug mb-1 hover:text-teal-700 transition-colors">
          {post.title}
        </h3>
      </Link>

      {/* Content preview */}
      <p className="text-gray-600 text-sm leading-relaxed mb-3">{contentPreview}</p>

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {post.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="text-xs text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full"
            >
              #{tag}
            </span>
          ))}
          {post.tags.length > 5 && (
            <span className="text-xs text-gray-400">+{post.tags.length - 5}</span>
          )}
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
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
          {post.commentCount ?? 0} comments
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          {post.bookmarkCount ?? 0} saves
        </span>
      </div>

      {/* Milestone gradient footer */}
      {post.type === 'MILESTONE' && (
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 -mx-5 px-5 py-3 mb-0 rounded-b-none">
          <p className="text-xs font-medium text-pink-600">A milestone worth celebrating!</p>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-3">
          {/* Upvote/Downvote */}
          <div className="flex items-center border border-gray-200 rounded-lg">
            <button
              onClick={(e) => handleVote('up', e)}
              className={`p-1.5 rounded-l-lg transition ${userVote === 'up' ? 'text-teal-600 bg-teal-50' : 'text-gray-400 hover:text-teal-600 hover:bg-teal-50'}`}
            >
              <svg className="w-4 h-4" fill={userVote === 'up' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <span className={`px-2 text-sm font-semibold min-w-[2rem] text-center ${
              voteScore > 0 ? 'text-teal-600' : voteScore < 0 ? 'text-red-500' : 'text-gray-700'
            }`}>
              {voteScore}
            </span>
            <button
              onClick={(e) => handleVote('down', e)}
              className={`p-1.5 rounded-r-lg transition ${userVote === 'down' ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
            >
              <svg className="w-4 h-4" fill={userVote === 'down' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Reply */}
          <button
            onClick={(e) => { e.stopPropagation(); router.push(`/posts/${post.id}#comments`); }}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-teal-600 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            <span className="text-xs font-medium">Reply</span>
          </button>

          {/* Share */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowShareModal(true); }}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-teal-600 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>

        {/* Bookmark */}
        <button
          onClick={handleBookmark}
          className={`flex items-center gap-1.5 text-sm transition ${bookmarked ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'}`}
        >
          <svg className="w-4 h-4" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        postId={post.id}
        postTitle={post.title}
        postContent={post.content}
        postType={post.type}
        authorName={post.isAnonymous ? 'Anonymous' : (post.author.name || post.author.email?.split('@')[0] || 'User')}
      />
    </Card>
  );
}

function PostCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex gap-4 pt-1">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      </div>
    </Card>
  );
}

// ===== Question Feed Components =====

function QuestionFeedCard({ question }: { question: Question }) {
  const statusBadge = question.hasAcceptedAnswer
    ? { label: 'Answered', color: 'green' as const }
    : { label: 'Unanswered', color: 'gray' as const };

  const answerCountColor = question.hasAcceptedAnswer
    ? 'text-green-600 bg-green-50 border-green-200'
    : question.answerCount > 0
      ? 'text-teal-600 bg-teal-50 border-teal-200'
      : 'text-gray-400 bg-gray-50 border-gray-200';

  return (
    <Card hover className="p-5 border-l-4 border-l-blue-500">
      <div className="flex gap-4">
        {/* Answer count box */}
        <div className={`hidden sm:flex flex-col items-center justify-center w-16 h-16 rounded-xl border ${answerCountColor} flex-shrink-0`}>
          <span className="text-lg font-bold">{question.answerCount}</span>
          <span className="text-[10px] font-medium">
            {question.answerCount === 1 ? 'answer' : 'answers'}
          </span>
          {question.hasAcceptedAnswer && (
            <svg className="w-3.5 h-3.5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
            <Badge color="blue">Question</Badge>
            <Badge color={statusBadge.color}>{statusBadge.label}</Badge>
            {question.category && (
              <span className="text-xs text-gray-400">{question.category}</span>
            )}
          </div>

          {/* Title */}
          <Link href={`/questions/${question.id}`} className="block relative z-10">
            <h3 className="font-semibold text-gray-900 text-base leading-snug mb-1 hover:text-teal-700 transition-colors">
              {question.title}
            </h3>
          </Link>

          {/* Content preview */}
          <p className="text-gray-600 text-sm leading-relaxed mb-2 line-clamp-2">
            {question.content.length > 180 ? question.content.slice(0, 180) + '...' : question.content}
          </p>

          {/* Tags */}
          {question.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {question.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Stats + CTA row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {question.viewCount} views
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {question.followerCount} followers
              </span>
              <span className="text-xs text-gray-400">
                {formatTimeAgo(question.createdAt)}
              </span>
            </div>
            <Link
              href={`/questions/${question.id}`}
              className="text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors"
            >
              {question.answerCount > 0 ? 'View answers' : 'Be the first to answer'}
            </Link>
          </div>

          {/* Author */}
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
            <Avatar
              src={question.isAnonymous ? undefined : (question.author.image || undefined)}
              name={question.isAnonymous ? 'Anonymous' : (question.author.name || 'User')}
              size="sm"
            />
            <span className="text-xs text-gray-500">
              Asked by {question.isAnonymous ? 'Anonymous' : (question.author.name || 'User')}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function QuestionFeedSection({
  sort,
  search,
}: {
  sort: 'recent' | 'popular' | 'trending';
  search: string;
}) {
  const [page, setPage] = useState(1);

  // Map feed sort values to question sort values
  const questionSort: QuestionFilters['sort'] =
    sort === 'popular' ? 'popular' : sort === 'trending' ? 'active' : 'recent';

  const filters: QuestionFilters = {
    page,
    limit: 10,
    sort: questionSort,
    ...(search ? { search } : {}),
  };

  const { data, isLoading } = useQuestions(filters);

  const questions = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[...Array(5)].map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="font-semibold text-gray-900">No questions found</h3>
        <p className="text-sm text-gray-500 mt-1">
          {search ? 'Try a different search term' : 'Be the first to ask a question!'}
        </p>
        <Link href="/posts/create?type=QUESTION" className="inline-block mt-4">
          <Button size="sm">Ask a Question</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {questions.map((question) => (
        <QuestionFeedCard key={question.id} question={question} />
      ))}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

// ===== Layout Sections =====

function LeftSidebar({ view, onViewChange }: { view: string; onViewChange: (v: string) => void }) {
  const { data: myCommunities, isLoading: groupsLoading } = useMyCommunities();

  const activeClass = 'bg-teal-50 text-teal-700 font-semibold border-l-3 border-teal-600';
  const inactiveClass = 'text-gray-600 hover:bg-gray-50 hover:text-gray-900';

  return (
    <aside className="hidden lg:block w-64 flex-shrink-0">
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
            <button
              onClick={() => onViewChange('feed')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${view === 'feed' ? activeClass : inactiveClass}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              Feed
            </button>

            <Link
              href="/communities"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${inactiveClass}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Groups
            </Link>

            <Link
              href="/events"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${inactiveClass}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Events
            </Link>

            <Link
              href="/questions"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${inactiveClass}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Q&A
            </Link>

            <button
              onClick={() => onViewChange('saved')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${view === 'saved' ? activeClass : inactiveClass}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Saved
            </button>
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

function CreatePostCard() {
  const { user } = useAuth();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center gap-3">
        <Avatar name={user?.name || 'User'} src={user?.avatar || undefined} size="md" />
        <Link href="/posts/create" className="flex-1">
          <div className="bg-gray-100 rounded-full px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-200 transition-colors cursor-pointer">
            Share something with the community...
          </div>
        </Link>
      </div>
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
        <Link
          href="/posts/create"
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Photo
        </Link>
        <Link
          href="/posts/create?type=QUESTION"
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Question
        </Link>
        <Link
          href="/events/create"
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Event
        </Link>
      </div>
    </div>
  );
}

function RightSidebar() {
  const { data: browseResult, isLoading: groupsLoading } = useBrowseCommunities({ limit: 3 });
  const { data: trendingTags, isLoading: tagsLoading } = useTrendingTags(5);

  const suggestedGroups = browseResult?.data ?? [];

  return (
    <aside className="hidden xl:block w-80 flex-shrink-0">
      <div className="sticky top-24 space-y-4">
        {/* Suggested Groups */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Suggested Groups</h3>
          {groupsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : suggestedGroups.length > 0 ? (
            <div className="space-y-3">
              {suggestedGroups.map((group, i) => {
                const color = GROUP_COLORS[i % GROUP_COLORS.length];
                return (
                  <div key={group.id} className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${color.bg} rounded-lg flex items-center justify-center shrink-0`}>
                      <span className={`${color.text} font-bold`}>
                        {group.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/communities/${group.id}`}>
                        <p className="font-medium text-gray-900 text-sm truncate hover:text-teal-600 transition-colors">
                          {group.name}
                        </p>
                      </Link>
                      <p className="text-xs text-gray-500">
                        {(group._count?.members ?? group.memberCount ?? 0).toLocaleString()} members
                      </p>
                    </div>
                    <Link
                      href={`/communities/${group.id}`}
                      className="px-3 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-full hover:bg-teal-100 transition-colors shrink-0"
                    >
                      Join
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No groups to suggest</p>
          )}
          <Link
            href="/communities"
            className="block mt-3 text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            See All
          </Link>
        </div>

        {/* Trending Topics */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Trending Topics</h3>
          {tagsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : trendingTags && trendingTags.length > 0 ? (
            <div className="space-y-1">
              {trendingTags.map((item) => (
                <div
                  key={item.tag}
                  className="block p-2 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <p className="text-sm text-gray-600">#{item.tag}</p>
                  <p className="text-xs text-gray-500">{item.count} posts this week</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No trending topics yet</p>
          )}
        </div>
      </div>
    </aside>
  );
}

// ===== Main Page =====

export default function CommunityFeedPage() {
  const [view, setView] = useState('feed');
  const [typeFilter, setTypeFilter] = useState<
    'DISCUSSION' | 'QUESTION' | 'CASE_STUDY' | 'RESOURCE' | 'MILESTONE' | undefined
  >(undefined);
  const [sort, setSort] = useState<'recent' | 'popular' | 'trending'>('recent');
  const [search, setSearch] = useState('');

  const isQuestionFilter = typeFilter === 'QUESTION';

  const filters = {
    ...(typeFilter && !isQuestionFilter ? { type: typeFilter } : {}),
    sort,
    ...(search ? { search } : {}),
    ...(view === 'saved' ? { view: 'saved' as const } : {}),
    limit: 10,
  };

  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfinitePosts(filters);

  const allPosts = data?.pages.flatMap((page) => page.posts) ?? [];

  return (
    <CommunityShell>
      <div className="flex gap-6">
        {/* Left Sidebar */}
        <LeftSidebar view={view} onViewChange={setView} />

        {/* Center Feed */}
        <main className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Create Post Card */}
          <CreatePostCard />

          {/* View Tabs + Sort */}
          <div className="flex items-center justify-between">
            <div className="flex items-center bg-white rounded-xl shadow-sm border border-gray-100 p-1">
              {VIEW_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setView(tab.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    view === tab.value
                      ? 'bg-gray-100 text-gray-900 font-semibold'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'recent' | 'popular' | 'trending')}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {POST_TYPE_FILTERS.map((filter) => (
              <button
                key={filter.label}
                onClick={() => setTypeFilter(filter.value)}
                className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  typeFilter === filter.value
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-teal-300 hover:text-teal-600'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder={isQuestionFilter ? 'Search questions...' : 'Search posts...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          {/* Posts / Questions */}
          {isQuestionFilter ? (
            <QuestionFeedSection sort={sort} search={search} />
          ) : isLoading ? (
            <div className="flex flex-col gap-4">
              {[...Array(5)].map((_, i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          ) : allPosts.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900">No posts found</h3>
              <p className="text-sm text-gray-500 mt-1">
                {search
                  ? 'Try a different search term'
                  : view === 'saved'
                    ? 'No saved posts yet. Bookmark posts to see them here.'
                    : 'Be the first to start a discussion!'}
              </p>
              {view === 'feed' && (
                <Link href="/posts/create" className="inline-block mt-4">
                  <Button size="sm">Create Post</Button>
                </Link>
              )}
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {allPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
              {hasNextPage && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-teal-500 rounded-full animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Right Sidebar */}
        <RightSidebar />
      </div>
    </CommunityShell>
  );
}
