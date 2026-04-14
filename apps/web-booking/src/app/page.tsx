'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useRegion, APP_URLS } from '@upllyft/api-client';
import { BookingShell } from '@/components/booking-shell';
import { RegionGate } from '@/components/region-gate';
import { useSearchTherapists } from '@/hooks/use-marketplace';
import { formatCurrency } from '@/lib/utils';
import type { TherapistSearchFilters, TherapistProfile } from '@/lib/api/marketplace';
import {
  Card,
  Badge,
  Avatar,
  Skeleton,
  Input,
  Button,
  MiraNudge,
} from '@upllyft/ui';

// ── Inline SVG Icons ──

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function StarIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={filled ? 0 : 1.5}
        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
      />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  );
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

// ── Category filter options ──

const CATEGORIES = [
  { label: 'All Therapists', value: '' },
  { label: 'Speech Therapy', value: 'Speech Therapy' },
  { label: 'Occupational Therapy', value: 'Occupational Therapy' },
  { label: 'Behavioral Therapy', value: 'Behavioral Therapy' },
  { label: 'Child Psychology', value: 'Child Psychology' },
  { label: 'Special Education', value: 'Special Education' },
];

const ITEMS_PER_PAGE = 9;

// ── Stars renderer ──

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon
          key={star}
          className={`w-4 h-4 ${star <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
          filled={star <= Math.round(rating)}
        />
      ))}
      <span className="ml-1 text-sm font-medium text-gray-700">{rating.toFixed(1)}</span>
    </div>
  );
}

// ── Skeleton card ──

function TherapistCardSkeleton() {
  return (
    <Card className="rounded-2xl overflow-hidden">
      <div className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-48 mb-2" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
        <div className="flex items-center gap-4 mb-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4 mb-4" />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 flex-1 rounded-xl" />
        </div>
      </div>
    </Card>
  );
}

// ── Main page ──

function MiraNudgeForParent({ nudgeId, message, chipText, childName }: { nudgeId: string; message: string; chipText: string; childName?: string }) {
  const { user } = useAuth();
  if (user?.role !== 'USER') return null;
  return <MiraNudge nudgeId={nudgeId} message={message} chipText={chipText} childName={childName} mainAppUrl={APP_URLS.main} />;
}

type SortOption = 'relevance' | 'rating' | 'experience';

function MarketplacePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { serviceModel, isRegionResolved } = useRegion();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [page, setPage] = useState(1);

  // Read incoming URL filters ONCE so the redirect effect below can
  // short-circuit when a Mira deep-link arrives.
  const urlHasIncomingFilter = useMemo(() => {
    return !!(
      searchParams.get('specialization') ||
      searchParams.get('search') ||
      searchParams.get('therapistId') ||
      searchParams.get('minRating')
    );
  }, [searchParams]);

  // Hydrate filters from URL query params (used by Mira deep-links)
  useEffect(() => {
    const urlSpec = searchParams.get('specialization');
    const urlSearch = searchParams.get('search');
    const urlMinRating = searchParams.get('minRating');
    const urlTherapistId = searchParams.get('therapistId');

    // If Mira passed a specific therapistId, jump straight to that profile.
    if (urlTherapistId) {
      router.replace(`/therapists/${urlTherapistId}`);
      return;
    }

    if (urlSpec) setSpecialization(urlSpec);
    if (urlSearch) {
      setSearchInput(urlSearch);
      setDebouncedSearch(urlSearch);
    }
    if (urlMinRating) {
      const parsed = Number(urlMinRating);
      if (!Number.isNaN(parsed)) setMinRating(parsed);
    }
    // Intentionally run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect clinic-directory users to /clinics — but ONLY when they land
  // here with no filters. If Mira sent them here with a specific search or
  // specialization filter, respect that: show them the therapists that
  // match, even if their region is clinic-based. Redirecting and dropping
  // the filter is what caused the "blank booking page" bug.
  useEffect(() => {
    if (serviceModel === 'CLINIC_DIRECTORY' && !urlHasIncomingFilter) {
      router.replace('/clinics');
    }
  }, [serviceModel, router, urlHasIncomingFilter]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filters: TherapistSearchFilters = {
    search: debouncedSearch || undefined,
    specialization: specialization || undefined,
    minRating: minRating > 0 ? minRating : undefined,
    page,
    limit: ITEMS_PER_PAGE,
  };

  const { data, isLoading } = useSearchTherapists(filters);
  const rawTherapists = data?.therapists ?? [];
  const totalPages = data?.totalPages ?? 1;

  // Client-side sort (relevance = default API order)
  const therapists = useMemo<TherapistProfile[]>(() => {
    const list = [...rawTherapists];
    if (sortBy === 'rating') {
      list.sort((a, b) => (b.overallRating || 0) - (a.overallRating || 0));
    } else if (sortBy === 'experience') {
      list.sort((a, b) => (b.yearsExperience || 0) - (a.yearsExperience || 0));
    }
    return list;
  }, [rawTherapists, sortBy]);

  const hasActiveFilters =
    !!specialization || !!debouncedSearch || minRating > 0 || sortBy !== 'relevance';

  const clearFilters = () => {
    setSpecialization('');
    setSearchInput('');
    setDebouncedSearch('');
    setMinRating(0);
    setSortBy('relevance');
    setPage(1);
  };

  // Show region gate for unresolved parents (after all hooks)
  if (!isRegionResolved && user?.role === 'USER') {
    return (
      <BookingShell>
        <RegionGate />
      </BookingShell>
    );
  }

  return (
    <BookingShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center mx-auto mb-4">
            <HeartIcon className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Find the Right Support</h1>
          <p className="text-gray-500 mt-2 text-lg max-w-xl mx-auto">
            Browse verified therapists and book a session that works for you
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search by name, specialization..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 rounded-xl h-11"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => { setSpecialization(cat.value); setPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                specialization === cat.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Refine Filters: Rating + Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">Rating</span>
            {[0, 4, 4.5].map((r) => (
              <button
                key={r}
                onClick={() => { setMinRating(r); setPage(1); }}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  minRating === r
                    ? 'bg-amber-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-amber-50 hover:border-amber-300'
                }`}
              >
                {r === 0 ? (
                  'Any'
                ) : (
                  <>
                    <StarIcon className="w-3 h-3" filled />
                    {r}+
                  </>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="text-sm rounded-lg border border-gray-200 bg-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="relevance">Relevance</option>
              <option value="rating">Highest rated</option>
              <option value="experience">Most experienced</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>
              Showing {therapists.length} {therapists.length === 1 ? 'therapist' : 'therapists'}
              {specialization && <> in <span className="font-medium">{specialization}</span></>}
              {minRating > 0 && <> rated <span className="font-medium">{minRating}+</span></>}
              {debouncedSearch && <> matching &ldquo;<span className="font-medium">{debouncedSearch}</span>&rdquo;</>}
            </span>
            <button
              onClick={clearFilters}
              className="text-teal-600 hover:text-teal-700 font-medium underline"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Mira Nudge */}
        <MiraNudgeForParent
          nudgeId="booking-marketplace"
          message="Not sure what type of therapist your child needs?"
          chipText="Help me find the right therapist for my child"
        />

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <TherapistCardSkeleton key={i} />
            ))}
          </div>
        ) : therapists.length === 0 ? (
          <div className="text-center py-16 px-4 max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-100 to-blue-100 flex items-center justify-center mx-auto mb-5">
              <SearchIcon className="w-8 h-8 text-teal-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              No therapists match these filters
            </h3>
            <p className="text-gray-600 mt-2 leading-relaxed">
              {hasActiveFilters
                ? (<>We couldn&rsquo;t find any therapists matching
                    {specialization && <> the specialization <span className="font-medium">{specialization}</span></>}
                    {debouncedSearch && <> the search &ldquo;<span className="font-medium">{debouncedSearch}</span>&rdquo;</>}
                    {minRating > 0 && <> with rating {minRating}+</>}
                    . Try adjusting the filters, or browse all therapists below.</>)
                : 'No therapists are available right now. Please check back soon.'}
            </p>
            {hasActiveFilters && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button onClick={clearFilters}>
                  Browse all therapists
                </Button>
                {serviceModel === 'CLINIC_DIRECTORY' && (
                  <Button variant="outline" onClick={() => router.push('/clinics')}>
                    See clinics in your region
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {therapists.map((therapist) => {
                const name = therapist.user?.name ?? 'Therapist';
                const initials = name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();
                const avatarUrl = therapist.profileImage || therapist.user?.image;

                return (
                  <Card
                    key={therapist.id}
                    className="rounded-2xl overflow-hidden hover:shadow-lg transition-shadow duration-200"
                  >
                    <div className="p-6">
                      {/* Avatar + Name */}
                      <div className="flex items-start gap-4 mb-4">
                        <Avatar src={avatarUrl || undefined} name={name} size="xl" className="border-2 border-teal-100" />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 truncate flex items-center gap-1.5">
                            {name}
                            <svg className="w-4 h-4 text-blue-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </h3>
                          <p className="text-sm text-gray-500 truncate">{therapist.title}</p>
                          <RatingStars rating={therapist.overallRating} />
                        </div>
                      </div>

                      {/* Specializations */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {therapist.specializations.slice(0, 3).map((spec) => (
                          <Badge key={spec} color="blue">
                            {spec}
                          </Badge>
                        ))}
                        {therapist.specializations.length > 3 && (
                          <Badge color="gray">+{therapist.specializations.length - 3}</Badge>
                        )}
                      </div>

                      {/* Experience + Languages */}
                      <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <BriefcaseIcon className="w-4 h-4" />
                          {therapist.yearsExperience}y exp
                        </span>
                        <span className="flex items-center gap-1">
                          <GlobeIcon className="w-4 h-4" />
                          {therapist.languages.slice(0, 2).join(', ')}
                          {therapist.languages.length > 2 && ` +${therapist.languages.length - 2}`}
                        </span>
                      </div>

                      {/* Bio */}
                      <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                        {therapist.bio || 'No bio available.'}
                      </p>

                      {/* Price */}
                      {therapist.startingPrice != null && therapist.startingPrice > 0 && (
                        <div className="mb-4">
                          <span className="text-lg font-bold text-gray-900">{formatCurrency(therapist.startingPrice)}</span>
                          <span className="text-xs text-gray-500 ml-1">per session (60 min)</span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 rounded-xl"
                          onClick={() => router.push(`/therapists/${therapist.id}`)}
                        >
                          View Profile
                        </Button>
                        <Button
                          className="flex-1 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white"
                          onClick={() => router.push(`/book/${therapist.id}`)}
                        >
                          Book Now
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600 px-3">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </BookingShell>
  );
}

// useSearchParams() requires a Suspense boundary during prerender.
export default function MarketplacePage() {
  return (
    <Suspense
      fallback={
        <BookingShell>
          <div className="space-y-8">
            <div className="text-center">
              <Skeleton className="w-14 h-14 rounded-2xl mx-auto mb-4" />
              <Skeleton className="h-7 w-64 mx-auto mb-2" />
              <Skeleton className="h-5 w-80 mx-auto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <TherapistCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </BookingShell>
      }
    >
      <MarketplacePageContent />
    </Suspense>
  );
}
