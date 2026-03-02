'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRegion, APP_URLS, useAuth } from '@upllyft/api-client';
import { BookingShell } from '@/components/booking-shell';
import { useSearchClinics } from '@/hooks/use-clinics';
import { formatCurrency } from '@/lib/utils';
import type { ClinicSearchFilters } from '@/lib/api/clinics';
import { Card, Badge, Avatar, Skeleton, Input, Button, MiraNudge } from '@upllyft/ui';

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function StarIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={filled ? 0 : 1.5} d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
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

function ClinicCardSkeleton() {
  return (
    <Card className="rounded-2xl overflow-hidden">
      <div className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <Skeleton className="w-16 h-16 rounded-xl" />
          <div className="flex-1">
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-56 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4 mb-4" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </Card>
  );
}

function MiraNudgeForParent({ nudgeId, message, chipText }: { nudgeId: string; message: string; chipText: string }) {
  const { user } = useAuth();
  if (user?.role !== 'USER') return null;
  return <MiraNudge nudgeId={nudgeId} message={message} chipText={chipText} mainAppUrl={APP_URLS.main} />;
}

const SPECIALIZATIONS = [
  { label: 'All Clinics', value: '' },
  { label: 'Speech Therapy', value: 'Speech Therapy' },
  { label: 'Occupational Therapy', value: 'Occupational Therapy' },
  { label: 'Behavioral Therapy', value: 'Behavioral Therapy' },
  { label: 'Child Psychology', value: 'Child Psychology' },
  { label: 'Special Education', value: 'Special Education' },
];

const ITEMS_PER_PAGE = 9;

export default function ClinicsPage() {
  const router = useRouter();
  const { region } = useRegion();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filters: ClinicSearchFilters = {
    search: debouncedSearch || undefined,
    specialization: specialization || undefined,
    country: region?.country,
    page,
    limit: ITEMS_PER_PAGE,
  };

  const { data, isLoading } = useSearchClinics(filters);
  const clinics = data?.clinics ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <BookingShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center mx-auto mb-4">
            <BuildingIcon className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Find the Right Clinic</h1>
          <p className="text-gray-500 mt-2 text-lg max-w-xl mx-auto">
            Browse verified clinics and book a session with the right team
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search by clinic name, specialization..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 rounded-xl h-11"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
          {SPECIALIZATIONS.map((cat) => (
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

        {/* Mira Nudge */}
        <MiraNudgeForParent
          nudgeId="booking-clinics"
          message="Not sure which clinic is right for your child?"
          chipText="Help me find the right clinic"
        />

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <ClinicCardSkeleton key={i} />
            ))}
          </div>
        ) : clinics.length === 0 ? (
          <div className="text-center py-16">
            <BuildingIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">No clinics found</h3>
            <p className="text-gray-500 mt-1">
              Try adjusting your search or filters, or browse all clinics.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clinics.map((clinic) => (
                <Card
                  key={clinic.id}
                  className="rounded-2xl overflow-hidden hover:shadow-lg transition-shadow duration-200"
                >
                  <div className="p-6">
                    {/* Logo + Name */}
                    <div className="flex items-start gap-4 mb-4">
                      <Avatar
                        src={clinic.logoUrl || undefined}
                        name={clinic.name}
                        size="xl"
                        className="border-2 border-teal-100 rounded-xl"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {clinic.name}
                        </h3>
                        {clinic.address && (
                          <p className="text-sm text-gray-500 flex items-center gap-1 truncate">
                            <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" />
                            {clinic.address}
                          </p>
                        )}
                        {clinic.rating != null && clinic.rating > 0 && (
                          <RatingStars rating={clinic.rating} />
                        )}
                      </div>
                    </div>

                    {/* Specializations */}
                    {clinic.specializations.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {clinic.specializations.slice(0, 3).map((spec) => (
                          <Badge key={spec} color="blue">{spec}</Badge>
                        ))}
                        {clinic.specializations.length > 3 && (
                          <Badge color="gray">+{clinic.specializations.length - 3}</Badge>
                        )}
                      </div>
                    )}

                    {/* Therapist count */}
                    <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <UsersIcon className="w-4 h-4" />
                        {clinic._count.therapists} therapist{clinic._count.therapists !== 1 ? 's' : ''}
                      </span>
                      {clinic.totalReviews > 0 && (
                        <span className="text-gray-400">
                          {clinic.totalReviews} review{clinic.totalReviews !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {clinic.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                        {clinic.description}
                      </p>
                    )}

                    {/* Action */}
                    <Button
                      className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white"
                      onClick={() => router.push(`/clinics/${clinic.id}`)}
                    >
                      View Clinic
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button variant="outline" size="sm" className="rounded-xl" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeftIcon className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600 px-3">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" className="rounded-xl" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
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
