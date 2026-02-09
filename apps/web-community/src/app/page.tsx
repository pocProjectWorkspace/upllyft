'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CommunityShell } from '@/components/community-shell';
import { useInfinitePosts, useTrendingPosts } from '@/hooks/use-posts';
import { useCommunityStats } from '@/hooks/use-community';
import { Card, Button, Avatar, Badge, Input, Skeleton } from '@upllyft/ui';
import type { Post } from '@/lib/api/posts';

const POST_TYPE_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Discussion', value: 'DISCUSSION' as const },
  { label: 'Question', value: 'QUESTION' as const },
  { label: 'Case Study', value: 'CASE_STUDY' as const },
  { label: 'Resource', value: 'RESOURCE' as const },
] as const;

const SORT_OPTIONS = [
  { label: 'Recent', value: 'recent' as const },
  { label: 'Popular', value: 'popular' as const },
  { label: 'Trending', value: 'trending' as const },
] as const;

const typeBadgeColors: Record<string, 'teal' | 'blue' | 'purple' | 'green'> = {
  DISCUSSION: 'teal',
  QUESTION: 'blue',
  CASE_STUDY: 'purple',
  RESOURCE: 'green',
};

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

function PostCard({ post }: { post: Post }) {
  const contentPreview =
    post.content.length > 180 ? post.content.slice(0, 180) + '...' : post.content;

  return (
    <Link href={`/posts/${post.id}`}>
      <Card hover className="p-5">
        <div className="flex items-start gap-3">
          <Avatar
            src={post.author.image || undefined}
            name={post.author.name}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900 text-sm">
                {post.isAnonymous ? 'Anonymous' : post.author.name}
              </span>
              {!post.isAnonymous && post.author.role !== 'USER' && (
                <Badge color={roleBadgeColor(post.author.role)}>
                  {formatLabel(post.author.role)}
                </Badge>
              )}
              <span className="text-xs text-gray-400">{formatTimeAgo(post.createdAt)}</span>
            </div>

            <h3 className="mt-1.5 font-semibold text-gray-900 text-base leading-snug">
              {post.title}
            </h3>

            <div className="mt-1 flex items-center gap-2">
              <Badge color={typeBadgeColors[post.type] || 'gray'}>
                {formatLabel(post.type)}
              </Badge>
              {post.featured && <Badge color="yellow">Featured</Badge>}
            </div>

            <p className="mt-2 text-sm text-gray-600 leading-relaxed">{contentPreview}</p>

            <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                {post.upvotes}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {post.downvotes}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {post.commentCount ?? 0}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {post.viewCount}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
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

function TrendingSidebar() {
  const { data: trendingPosts, isLoading: trendingLoading } = useTrendingPosts(5);
  const { data: stats, isLoading: statsLoading } = useCommunityStats();

  return (
    <div className="space-y-6">
      {/* Community Stats */}
      <Card className="p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Community Stats
        </h3>
        {statsLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : stats ? (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Members</span>
              <span className="font-medium text-gray-900">{stats.totalMembers.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Verified</span>
              <span className="font-medium text-gray-900">{stats.verifiedMembers.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Posts</span>
              <span className="font-medium text-gray-900">{stats.totalPosts.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Active Today</span>
              <span className="font-medium text-teal-600">{stats.activeToday.toLocaleString()}</span>
            </div>
          </div>
        ) : null}
      </Card>

      {/* Trending Posts */}
      <Card className="p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Trending
        </h3>
        {trendingLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : trendingPosts && trendingPosts.length > 0 ? (
          <div className="space-y-3">
            {trendingPosts.map((post, index) => (
              <Link
                key={post.id}
                href={`/posts/${post.id}`}
                className="flex items-start gap-2.5 group"
              >
                <span className="text-xs font-bold text-teal-500 mt-0.5 min-w-[18px]">
                  {index + 1}.
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-teal-600 transition-colors leading-snug line-clamp-2">
                    {post.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {post.upvotes} upvotes &middot; {post.commentCount ?? 0} comments
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No trending posts yet</p>
        )}
      </Card>

      {/* Quick Links */}
      <Card className="p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Quick Links
        </h3>
        <div className="space-y-2">
          <Link
            href="/communities"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-teal-600 transition-colors py-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Browse Communities
          </Link>
          <Link
            href="/communities/create"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-teal-600 transition-colors py-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Community
          </Link>
          <Link
            href="/questions"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-teal-600 transition-colors py-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Ask a Question
          </Link>
          <Link
            href="/events"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-teal-600 transition-colors py-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Events
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default function CommunityFeedPage() {
  const [typeFilter, setTypeFilter] = useState<
    'DISCUSSION' | 'QUESTION' | 'CASE_STUDY' | 'RESOURCE' | undefined
  >(undefined);
  const [sort, setSort] = useState<'recent' | 'popular' | 'trending'>('recent');
  const [search, setSearch] = useState('');

  const filters = {
    ...(typeFilter ? { type: typeFilter } : {}),
    sort,
    ...(search ? { search } : {}),
    limit: 10,
  };

  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfinitePosts(filters);

  const allPosts = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <CommunityShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Community Feed</h1>
          <p className="text-gray-500 mt-1">
            Connect, share, and learn with parents, therapists, and educators
          </p>
        </div>
        <Link href="/posts/create">
          <Button>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Post
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Main Feed */}
        <div className="space-y-4">
          {/* Search */}
          <Input
            variant="search"
            placeholder="Search posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Filters + Sort */}
          <div className="flex items-center justify-between flex-wrap gap-3">
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
            <div className="flex items-center gap-2">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSort(option.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    sort === option.value
                      ? 'text-teal-700 bg-teal-50'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Posts */}
          {isLoading ? (
            <div className="space-y-4">
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
                {search ? 'Try a different search term' : 'Be the first to start a discussion!'}
              </p>
              <Link href="/posts/create" className="inline-block mt-4">
                <Button size="sm">Create Post</Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-4">
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
        </div>

        {/* Sidebar */}
        <aside className="hidden lg:block">
          <TrendingSidebar />
        </aside>
      </div>
    </CommunityShell>
  );
}
