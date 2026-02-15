'use client';

import { useAuth } from '@upllyft/api-client';
import { AppHeader, Avatar, Badge, Card, Skeleton } from '@upllyft/ui';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getTrendingPosts, type Post } from '@/lib/api/posts';

function timeAgo(date: string) {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

const tagColors: Record<string, 'teal' | 'blue' | 'purple' | 'green' | 'yellow' | 'red' | 'gray'> = {
  autism: 'purple',
  adhd: 'blue',
  sensory: 'green',
  speech: 'teal',
  therapy: 'yellow',
};

function getTagColor(tag: string): 'teal' | 'blue' | 'purple' | 'green' | 'yellow' | 'red' | 'gray' {
  const lower = tag.toLowerCase();
  for (const [key, color] of Object.entries(tagColors)) {
    if (lower.includes(key)) return color;
  }
  return 'gray';
}

export default function TrendingPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const { data: posts, isLoading } = useQuery({
    queryKey: ['posts', 'trending'],
    queryFn: () => getTrendingPosts(20),
    enabled: isAuthenticated,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    router.replace('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader currentApp="main" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Trending</h1>
            <p className="text-sm text-gray-500 mt-1">Popular posts across the community</p>
          </div>
          <a
            href="/feed"
            className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            View All
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))
          ) : posts && posts.length > 0 ? (
            posts.map((post: Post, index: number) => (
              <Card key={post.id} className="p-5 hover:shadow-md transition-shadow">
                <a href={`/posts/${post.id}`} className="block">
                  <div className="flex items-start gap-4">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                      <span className="text-sm font-bold text-teal-600">{index + 1}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar name={post.author.name} src={post.author.image || undefined} size="sm" />
                        <span className="text-sm font-medium text-gray-900">{post.author.name}</span>
                        {post.author.verificationStatus === 'APPROVED' && (
                          <svg className="w-4 h-4 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span className="text-xs text-gray-400">{timeAgo(post.createdAt)}</span>
                      </div>

                      <h3 className="text-base font-semibold text-gray-900 mb-1">{post.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">{post.content}</p>

                      {/* Tags */}
                      {post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {post.tags.slice(0, 4).map((tag) => (
                            <Badge key={tag} color={getTagColor(tag)}>
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-4">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                          {post.upvotes} upvotes
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          {post.commentCount ?? 0} comments
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {post.viewCount} views
                        </span>
                      </div>
                    </div>
                  </div>
                </a>
              </Card>
            ))
          ) : (
            <Card className="p-12 text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">No trending posts yet</h2>
              <p className="text-gray-500 text-sm mb-4">
                Be the first to start a conversation in the community.
              </p>
              <a
                href="/feed"
                className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                Browse Feed
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
