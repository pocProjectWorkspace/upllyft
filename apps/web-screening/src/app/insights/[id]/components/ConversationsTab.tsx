'use client';

import { Skeleton } from '@upllyft/ui';
import { APP_URLS } from '@upllyft/api-client';
import { useRelevantPosts } from '@/hooks/use-assessments';
import { formatDate } from '@/lib/utils';

interface ConversationsTabProps {
  conversationId: string;
}

export function ConversationsTab({ conversationId }: ConversationsTabProps) {
  const { data: posts, isLoading, error } = useRelevantPosts(conversationId);

  if (isLoading) {
    return (
      <div className="space-y-4 fade-in">
        <Skeleton className="h-6 w-48" />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error || !posts || posts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center fade-in">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-gray-500">No relevant community conversations found.</p>
        <p className="text-sm text-gray-400 mt-1">Posts matching this case will appear here as the community grows.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 fade-in">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Related Conversations</h2>
      {posts.map((post) => (
        <a
          key={post.id}
          href={`${APP_URLS.community}/posts/${post.id}`}
          className="block bg-white rounded-2xl border border-gray-200 p-6 card-hover"
        >
          {/* Author */}
          <div className="flex items-center gap-3 mb-3">
            {post.authorAvatar ? (
              <img src={post.authorAvatar} alt={post.authorName} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500 text-sm font-medium">{post.authorName?.[0]?.toUpperCase()}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{post.authorName}</span>
                <span className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {post.authorRole}
                </span>
              </div>
              <span className="text-xs text-gray-400">{formatDate(post.createdAt)}</span>
            </div>
          </div>

          {/* Title + Content */}
          <h3 className="text-base font-semibold text-gray-900 mb-1">{post.title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-3">{post.content}</p>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
            <span className="inline-flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              {post.upvotes}
            </span>
            <span className="inline-flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {post.commentCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {post.viewCount}
            </span>
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span key={tag} className="inline-flex px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Community */}
          {post.communityName && (
            <p className="text-xs text-teal-600 mt-2">in {post.communityName}</p>
          )}
        </a>
      ))}
    </div>
  );
}
