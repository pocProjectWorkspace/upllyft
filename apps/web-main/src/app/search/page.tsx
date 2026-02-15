'use client';

import { useAuth } from '@upllyft/api-client';
import { AppHeader, Avatar, Badge, Card, Skeleton } from '@upllyft/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { searchPosts, getTrendingSearches, type SearchResult, type SearchFilters } from '@/lib/api/search';

const CATEGORIES = [
  'All', 'Autism Spectrum', 'ADHD', 'Speech & Language',
  'Occupational Therapy', 'Sensory Processing', 'Behavioral',
  'Education', 'Parenting Tips', 'Success Stories',
];

const POST_TYPES = ['All', 'QUESTION', 'DISCUSSION', 'CASE_STUDY', 'RESOURCE'];
const AUTHOR_ROLES = ['All', 'THERAPIST', 'EDUCATOR', 'ORGANIZATION', 'USER'];
const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'date', label: 'Most Recent' },
  { value: 'popularity', label: 'Most Popular' },
];

function SearchContent() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [searchTime, setSearchTime] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [trending, setTrending] = useState<string[]>([]);

  const [filters, setFilters] = useState<SearchFilters>({
    category: undefined,
    type: undefined,
    authorRole: undefined,
    verifiedOnly: false,
    sortBy: 'relevance',
  });

  useEffect(() => {
    getTrendingSearches()
      .then(setTrending)
      .catch(() => {});
  }, []);

  const doSearch = useCallback(
    async (q: string, p: number, f: SearchFilters) => {
      if (!q.trim()) {
        setResults([]);
        setTotalResults(0);
        return;
      }
      setLoading(true);
      try {
        const data = await searchPosts(q.trim(), {
          ...f,
          category: f.category === 'All' ? undefined : f.category,
          type: f.type === 'All' ? undefined : f.type,
          authorRole: f.authorRole === 'All' ? undefined : f.authorRole,
        }, p);
        setResults(data.results);
        setTotalResults(data.total);
        setSearchTime(data.searchTime);
        setTotalPages(data.pages);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (initialQuery) {
      doSearch(initialQuery, 1, filters);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    doSearch(query, 1, filters);
    const url = new URL(window.location.href);
    url.searchParams.set('q', query);
    window.history.replaceState({}, '', url.toString());
  }

  function handleFilterChange(key: keyof SearchFilters, value: any) {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
    if (query.trim()) doSearch(query, 1, newFilters);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    doSearch(query, newPage, filters);
    window.scrollTo(0, 0);
  }

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

  const activeFilterCount = [
    filters.category && filters.category !== 'All',
    filters.type && filters.type !== 'All',
    filters.authorRole && filters.authorRole !== 'All',
    filters.verifiedOnly,
  ].filter(Boolean).length;

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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search posts, questions, resources..."
              className="w-full pl-12 pr-24 py-3.5 rounded-2xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none shadow-sm"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-5 py-2 text-sm font-medium hover:from-teal-600 hover:to-teal-700 transition-all"
            >
              Search
            </button>
          </div>
        </form>

        {totalResults > 0 && (
          <p className="text-sm text-gray-500 mb-4">
            {totalResults.toLocaleString()} result{totalResults !== 1 ? 's' : ''} in {searchTime}ms
          </p>
        )}

        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <Card className="p-4 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() =>
                      setFilters({ sortBy: 'relevance', category: undefined, type: undefined, authorRole: undefined, verifiedOnly: false })
                    }
                    className="text-xs text-teal-600 hover:text-teal-700"
                  >
                    Clear all ({activeFilterCount})
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Sort by</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Category</label>
                  <select
                    value={filters.category || 'All'}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Post type</label>
                  <select
                    value={filters.type || 'All'}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  >
                    {POST_TYPES.map((t) => (
                      <option key={t} value={t}>{t === 'All' ? 'All types' : t.toLowerCase().replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Author role</label>
                  <select
                    value={filters.authorRole || 'All'}
                    onChange={(e) => handleFilterChange('authorRole', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  >
                    {AUTHOR_ROLES.map((r) => (
                      <option key={r} value={r}>{r === 'All' ? 'All roles' : r.charAt(0) + r.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.verifiedOnly || false}
                    onChange={(e) => handleFilterChange('verifiedOnly', e.target.checked)}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">Verified authors only</span>
                </label>
              </div>
            </Card>
          </aside>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-2xl" />
                ))}
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-4">
                {results.map((result) => (
                  <Card key={result.id} className="p-5 hover:shadow-md transition-shadow">
                    <a href={`/posts/${result.id}`} className="block">
                      <div className="flex items-start gap-3">
                        <Avatar name={result.author.name} src={result.author.image || undefined} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">{result.author.name}</span>
                            {result.author.verificationStatus === 'APPROVED' && (
                              <svg className="w-4 h-4 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                            <Badge color="gray">{result.type.toLowerCase().replace('_', ' ')}</Badge>
                            <span className="text-xs text-gray-400">{timeAgo(result.createdAt)}</span>
                          </div>
                          <h3 className="text-base font-semibold text-gray-900 mb-1">{result.title}</h3>
                          <p className="text-sm text-gray-600 line-clamp-2">{result.content}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-gray-400">{result.viewCount} views</span>
                            <span className="text-xs text-gray-400">{result.upvotes} upvotes</span>
                            {result.tags.length > 0 && (
                              <div className="flex gap-1">
                                {result.tags.slice(0, 3).map((tag) => (
                                  <span key={tag} className="text-xs text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </a>
                  </Card>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-500">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            ) : query.trim() ? (
              <Card className="p-12 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">No results found</h2>
                <p className="text-sm text-gray-500">
                  Try different keywords or adjust your filters
                </p>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Trending Searches */}
                {trending.length > 0 && (
                  <Card className="p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Trending Searches</h3>
                    <div className="flex flex-wrap gap-2">
                      {trending.map((term) => (
                        <button
                          key={term}
                          onClick={() => {
                            setQuery(term);
                            doSearch(term, 1, filters);
                          }}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-teal-50 hover:text-teal-700 rounded-full text-sm text-gray-700 transition-colors"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Popular Topics */}
                <Card className="p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Popular Topics</h3>
                  <div className="flex flex-wrap gap-2">
                    {['Autism', 'ADHD', 'Speech Therapy', 'Sensory Processing', 'IEP', 'ABA Therapy', 'Social Skills', 'Motor Development'].map((topic) => (
                      <button
                        key={topic}
                        onClick={() => {
                          setQuery(topic);
                          doSearch(topic, 1, filters);
                        }}
                        className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-full text-sm font-medium hover:bg-teal-100 transition-colors"
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
