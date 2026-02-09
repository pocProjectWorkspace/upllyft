'use client';

import { Avatar } from '@upllyft/ui';
import type { Post } from '@/lib/api/posts';
import { votePost, bookmarkPost, unbookmarkPost } from '@/lib/api/posts';
import { useState } from 'react';

interface PostCardProps {
  post: Post;
  onVoteChange?: () => void;
}

const typeBadgeConfig: Record<string, { bg: string; text: string; label: string }> = {
  DISCUSSION: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Discussion' },
  QUESTION: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Question' },
  CASE_STUDY: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Milestone' },
  RESOURCE: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Resource' },
};

export function PostCard({ post, onVoteChange }: PostCardProps) {
  const [localUpvotes, setLocalUpvotes] = useState(post.upvotes);
  const [isLiked, setIsLiked] = useState(post.userVote === 'up');
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked);

  async function handleLike() {
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLocalUpvotes((v) => v + (wasLiked ? -1 : 1));

    try {
      await votePost(post.id, wasLiked ? null : 'up');
      onVoteChange?.();
    } catch {
      setIsLiked(wasLiked);
      setLocalUpvotes(post.upvotes);
    }
  }

  async function handleBookmark() {
    const prev = isBookmarked;
    setIsBookmarked(!prev);
    try {
      if (prev) await unbookmarkPost(post.id);
      else await bookmarkPost(post.id);
    } catch {
      setIsBookmarked(prev);
    }
  }

  const timeAgo = getTimeAgo(post.createdAt);
  const badge = typeBadgeConfig[post.type] || typeBadgeConfig.DISCUSSION;
  const isMilestoneType = post.type === 'CASE_STUDY';
  const isQuestionType = post.type === 'QUESTION';

  return (
    <article className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="p-4">
        {/* Author Header */}
        <div className="flex items-start gap-3">
          <Avatar name={post.author?.name || 'User'} size="sm" src={post.author?.image || undefined} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 truncate">
                {post.isAnonymous ? 'Anonymous' : post.author?.name}
              </span>
              {post.author?.verificationStatus === 'APPROVED' && (
                <svg className="w-4 h-4 text-teal-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              <span className={`px-2 py-0.5 ${badge.bg} ${badge.text} text-xs font-medium rounded-full`}>
                {badge.label}{isMilestoneType ? ' \u{1F389}' : ''}
              </span>
            </div>
            <p className="text-xs text-gray-500">{timeAgo}{post.category ? ` \u00B7 ${post.category}` : ''}</p>
          </div>
        </div>

        {/* Content */}
        <div className="mt-3">
          {isQuestionType && (
            <p className="text-gray-800 font-medium">{post.title}</p>
          )}
          {!isQuestionType && post.title && (
            <h3 className="text-base font-semibold text-gray-900 mb-1">{post.title}</h3>
          )}
          <p className={`${isQuestionType ? 'text-gray-600 mt-2' : 'text-gray-800'} line-clamp-3`}>{post.content}</p>
        </div>

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-xs text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full"
              >
                #{tag}
              </span>
            ))}
            {post.tags.length > 4 && (
              <span className="text-xs text-gray-400">+{post.tags.length - 4} more</span>
            )}
          </div>
        )}
      </div>

      {/* Footer — different style per type */}
      <div className={`px-4 py-3 border-t border-gray-100 ${isMilestoneType ? 'bg-gradient-to-r from-pink-50 to-purple-50' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Heart / Like */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 ${isLiked ? 'text-pink-600' : 'text-gray-600 hover:text-pink-600'}`}
            >
              <svg className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="text-sm">{localUpvotes}</span>
            </button>
            {/* Comment */}
            <button className="flex items-center gap-1 text-gray-600 hover:text-blue-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-sm">{isQuestionType ? `${post.commentCount || 0} answers` : post.commentCount || 0}</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            {/* Answer button for questions */}
            {isQuestionType && (
              <button className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                Answer
              </button>
            )}
            {/* Bookmark */}
            <button
              onClick={handleBookmark}
              className={`p-1.5 rounded-lg transition-colors ${
                isBookmarked
                  ? 'text-amber-500'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <svg className="w-5 h-5" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
