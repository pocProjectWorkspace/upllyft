'use client';

import { useAuth, APP_URLS } from '@upllyft/api-client';
import { AppHeader, Skeleton, Avatar, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@upllyft/ui';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getPosts, type PostFilters } from '@/lib/api/posts';
import { PostCard } from '@/components/feed/post-card';

type FeedView = 'for-you' | 'following' | 'saved';
type SortBy = 'recent' | 'popular' | 'trending';

const sidebarNav = [
  {
    label: 'Feed',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    ),
    active: true,
    href: '/feed',
  },
  {
    label: 'Groups',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    active: false,
    href: `${APP_URLS.community}/groups`,
  },
  {
    label: 'Events',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    active: false,
    href: `${APP_URLS.community}/events`,
  },
  {
    label: 'Q&A',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    active: false,
    href: `${APP_URLS.community}/questions`,
  },
  {
    label: 'Saved',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    ),
    active: false,
    href: '/feed?view=saved',
  },
];

const myGroups = [
  { name: 'Speech Therapy Parents', initial: 'S', bgColor: 'bg-blue-100', textColor: 'text-blue-600' },
  { name: 'ASD Support Circle', initial: 'A', bgColor: 'bg-purple-100', textColor: 'text-purple-600' },
  { name: 'Sensory Play Ideas', initial: 'S', bgColor: 'bg-green-100', textColor: 'text-green-600' },
];

const suggestedGroups = [
  { name: 'OT Activities at Home', initial: 'O', bgColor: 'bg-teal-100', textColor: 'text-teal-600', members: '1.2k' },
  { name: 'Sensory Play Ideas', initial: 'S', bgColor: 'bg-purple-100', textColor: 'text-purple-600', members: '856' },
];

const trendingTopics = [
  { tag: '#SensoryPlayIdeas', count: '45 posts this week' },
  { tag: '#SpeechTherapyWins', count: '32 posts this week' },
  { tag: '#InclusiveEducation', count: '28 posts this week' },
];

export default function FeedPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<FeedView>('for-you');
  const [sort, setSort] = useState<SortBy>('recent');
  const [search, setSearch] = useState('');
  const observerRef = useRef<HTMLDivElement>(null);

  const filters: PostFilters = {
    sort,
    limit: 10,
    ...(search && { search }),
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['posts', view, sort, search],
    queryFn: ({ pageParam = 1 }) => getPosts({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: isAuthenticated,
  });

  // Intersection observer for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

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

  const displayName = user.name || user.email?.split('@')[0] || 'User';
  const posts = data?.pages.flatMap((page) => page.posts) || [];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader currentApp="main" />

      <div className="flex">
        {/* Left Sidebar */}
        <aside className="hidden lg:block w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-64px)] sticky top-16">
          <div className="p-4">
            <button
              className="w-full py-3 bg-gradient-to-br from-pink-500 to-pink-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90 transition"
              onClick={() => {/* TODO: create post modal */}}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Post
            </button>
          </div>

          <nav className="px-2">
            {sidebarNav.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-r-lg ${
                  item.active
                    ? 'font-medium text-gray-900 border-l-[3px] border-teal-600'
                    : 'text-gray-600 hover:bg-gray-50 rounded-lg'
                }`}
                style={item.active ? {
                  background: 'linear-gradient(90deg, rgba(13, 148, 136, 0.1) 0%, transparent 100%)',
                } : undefined}
              >
                <span className={item.active ? 'text-pink-600' : ''}>{item.icon}</span>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="p-4 mt-4">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">My Groups</h4>
            <div className="space-y-2">
              {myGroups.map((group) => (
                <a key={group.name} href={`${APP_URLS.community}/groups`} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                  <div className={`w-8 h-8 ${group.bgColor} rounded-lg flex items-center justify-center`}>
                    <span className={`${group.textColor} text-xs font-bold`}>{group.initial}</span>
                  </div>
                  <span className="text-sm text-gray-700">{group.name}</span>
                </a>
              ))}
            </div>
          </div>
        </aside>

        {/* Center Content */}
        <div className="flex-1 max-w-2xl mx-auto px-4 py-6">
          {/* Create Post Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-3">
              <Avatar name={displayName} src={user.image || undefined} size="sm" />
              <input
                type="text"
                placeholder="Share something with the community..."
                className="flex-1 bg-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                onFocus={() => {/* TODO: open create post modal */}}
                readOnly
              />
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <button className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Photo
              </button>
              <button className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Question
              </button>
              <button className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Event
              </button>
            </div>
          </div>

          {/* View Tabs + Sort */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {(['for-you', 'following', 'saved'] as FeedView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    view === v
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {v === 'for-you' ? 'For You' : v === 'following' ? 'Following' : 'Saved'}
                </button>
              ))}
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v as SortBy)}>
              <SelectTrigger className="w-[120px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="popular">Popular</SelectItem>
                <SelectItem value="trending">Trending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
            />
          </div>

          {/* Posts */}
          <div className="space-y-6">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-2xl" />
              ))
            ) : posts.length > 0 ? (
              posts.map((post) => (
                <PostCard key={post.id} post={post} onVoteChange={() => refetch()} />
              ))
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
                <p className="text-gray-500 text-sm">No posts yet. Be the first to share!</p>
              </div>
            )}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={observerRef} className="py-4">
            {isFetchingNextPage && (
              <div className="flex justify-center">
                <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="hidden xl:block w-80 p-6">
          {/* Suggested Groups */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Suggested Groups</h3>
            <div className="space-y-3">
              {suggestedGroups.map((group) => (
                <div key={group.name} className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${group.bgColor} rounded-lg flex items-center justify-center`}>
                    <span className={`${group.textColor} font-bold`}>{group.initial}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{group.name}</p>
                    <p className="text-xs text-gray-500">{group.members} members</p>
                  </div>
                  <button className="px-3 py-1 bg-teal-100 text-teal-700 text-xs font-medium rounded-full hover:bg-teal-200">
                    Join
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Trending Topics */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Trending Topics</h3>
            <div className="space-y-2">
              {trendingTopics.map((topic) => (
                <a key={topic.tag} href="#" className="block p-2 hover:bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-900">{topic.tag}</p>
                  <p className="text-xs text-gray-500">{topic.count}</p>
                </a>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
