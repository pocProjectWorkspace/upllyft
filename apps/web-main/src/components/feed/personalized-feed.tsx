'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Skeleton } from '@upllyft/ui';
import { usePersonalizedFeed } from '@/hooks/use-personalized-feed';
import { useFeedPreferences } from '@/hooks/use-feed-preferences';
import { useFeedInteraction } from '@/hooks/use-feed-interaction';
import type { FeedView, FeedFilters, FeedDensity } from '@/lib/api/feeds';
import { PostCard } from './post-card';
import { FeedViewSelector } from './feed-view-selector';
import { FeedDensityToggle } from './feed-density-toggle';
import { AdvancedFilters } from './advanced-filters';
import { FeedCustomizer } from './feed-customizer';

interface PersonalizedFeedProps {
  isAuthenticated: boolean;
  categories: string[];
}

const densityClasses: Record<FeedDensity, string> = {
  compact: 'space-y-2',
  comfortable: 'space-y-4',
  spacious: 'space-y-6',
};

export function PersonalizedFeed({ isAuthenticated, categories }: PersonalizedFeedProps) {
  const [view, setView] = useState<FeedView>('for-you');
  const [filters, setFilters] = useState<FeedFilters>({});
  const [search, setSearch] = useState('');
  const observerRef = useRef<HTMLDivElement>(null);

  const mergedFilters = useMemo<FeedFilters>(() => ({
    ...filters,
    ...(search && { search }),
  }), [filters, search]);

  const {
    posts,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  } = usePersonalizedFeed({
    view,
    filters: mergedFilters,
    enabled: isAuthenticated,
  });

  const {
    preferences,
    density,
    setDensity,
    setContentWeights,
    addMutedKeyword,
    removeMutedKeyword,
    addPreferredCategory,
    removePreferredCategory,
  } = useFeedPreferences();

  const { trackView, trackClick } = useFeedInteraction();

  // Intersection observer for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !loading) {
        loadMore();
      }
    },
    [loadMore, hasMore, loading],
  );

  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  // Track post visibility via intersection observer
  const postObserverRef = useRef<IntersectionObserver | null>(null);
  const trackedPosts = useRef<Set<string>>(new Set());

  useEffect(() => {
    postObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const postId = entry.target.getAttribute('data-post-id');
            if (postId && !trackedPosts.current.has(postId)) {
              trackedPosts.current.add(postId);
              trackView(postId);
            }
          }
        });
      },
      { threshold: 0.5 },
    );

    return () => {
      postObserverRef.current?.disconnect();
    };
  }, [trackView]);

  const postRefCallback = useCallback(
    (el: HTMLDivElement | null) => {
      if (el && postObserverRef.current) {
        postObserverRef.current.observe(el);
      }
    },
    [],
  );

  function handlePostClick(postId: string) {
    trackClick(postId);
  }

  return (
    <div className="space-y-4">
      {/* Top Bar: View Selector + Density Toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <FeedViewSelector view={view} onChange={setView} />
        <FeedDensityToggle density={density} onChange={setDensity} />
      </div>

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search posts..."
          className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
        />
      </div>

      {/* Advanced Filters */}
      <AdvancedFilters filters={filters} onChange={setFilters} categories={categories} />

      {/* Feed Customizer */}
      <FeedCustomizer
        preferences={preferences}
        density={density}
        onDensityChange={setDensity}
        onWeightsChange={setContentWeights}
        onAddMutedKeyword={addMutedKeyword}
        onRemoveMutedKeyword={removeMutedKeyword}
        onAddCategory={addPreferredCategory}
        onRemoveCategory={removePreferredCategory}
        categories={categories}
      />

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={refresh}
            className="mt-2 text-sm text-red-700 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Posts */}
      <div className={densityClasses[density]}>
        {loading && posts.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))
        ) : posts.length > 0 ? (
          posts.map((post) => (
            <div
              key={post.id}
              ref={postRefCallback}
              data-post-id={post.id}
              onClick={() => handlePostClick(post.id)}
            >
              <PostCard post={post} onVoteChange={refresh} density={density} />
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <svg
              className="w-16 h-16 text-gray-300 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
              />
            </svg>
            <p className="text-gray-500 text-sm">
              {view === 'saved'
                ? 'No saved posts yet. Bookmark posts to find them here.'
                : view === 'following'
                  ? 'No posts from people you follow yet.'
                  : 'No posts yet. Be the first to share!'}
            </p>
          </div>
        )}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={observerRef} className="py-4">
        {loading && posts.length > 0 && (
          <div className="flex justify-center">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
