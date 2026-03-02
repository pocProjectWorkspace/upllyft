'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRegion, useAuth, APP_URLS } from '@upllyft/api-client';
import { BookingShell } from '@/components/booking-shell';
import { useClinic } from '@/hooks/use-clinics';
import { formatCurrency } from '@/lib/utils';
import { Card, Badge, Avatar, Skeleton, Button, MiraNudge } from '@upllyft/ui';

function StarIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={filled ? 0 : 1.5} d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
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

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

function MiraNudgeForParent({ nudgeId, message, chipText }: { nudgeId: string; message: string; chipText: string }) {
  const { user } = useAuth();
  if (user?.role !== 'USER') return null;
  return <MiraNudge nudgeId={nudgeId} message={message} chipText={chipText} mainAppUrl={APP_URLS.main} />;
}

export default function ClinicDetailPage() {
  const params = useParams();
  const clinicId = params.id as string;
  const router = useRouter();
  const { currency } = useRegion();
  const { data: clinic, isLoading } = useClinic(clinicId);

  if (isLoading) {
    return (
      <BookingShell>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        </div>
      </BookingShell>
    );
  }

  if (!clinic) {
    return (
      <BookingShell>
        <div className="text-center py-16">
          <h3 className="text-lg font-semibold text-gray-700">Clinic not found</h3>
          <p className="text-gray-500 mt-1">The clinic you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Button variant="outline" className="mt-4 rounded-xl" onClick={() => router.push('/clinics')}>
            Browse Clinics
          </Button>
        </div>
      </BookingShell>
    );
  }

  return (
    <BookingShell>
      <div className="space-y-8">
        {/* Back */}
        <button onClick={() => router.push('/clinics')} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to clinics
        </button>

        {/* Clinic Hero */}
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-8 text-white">
          <div className="flex items-start gap-6">
            <Avatar
              src={clinic.logoUrl || undefined}
              name={clinic.name}
              size="xl"
              className="border-4 border-white/20 rounded-xl w-20 h-20"
            />
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{clinic.name}</h1>
              {clinic.address && (
                <p className="flex items-center gap-1.5 mt-1 text-teal-100">
                  <MapPinIcon className="w-4 h-4" />
                  {clinic.address}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm">
                {clinic.phone && (
                  <span className="flex items-center gap-1 text-teal-100">
                    <PhoneIcon className="w-4 h-4" /> {clinic.phone}
                  </span>
                )}
                {clinic.email && (
                  <span className="flex items-center gap-1 text-teal-100">
                    <MailIcon className="w-4 h-4" /> {clinic.email}
                  </span>
                )}
              </div>
              {clinic.rating != null && clinic.rating > 0 && (
                <div className="mt-3">
                  <RatingStars rating={clinic.rating} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {clinic.description && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">About</h2>
            <p className="text-gray-600 leading-relaxed">{clinic.description}</p>
          </div>
        )}

        {/* Specializations */}
        {clinic.specializations.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Specializations</h2>
            <div className="flex flex-wrap gap-2">
              {clinic.specializations.map((spec) => (
                <Badge key={spec} color="blue">{spec}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Mira Nudge */}
        <MiraNudgeForParent
          nudgeId="clinic-detail-help"
          message="Want tips for your first session at a clinic?"
          chipText="What should I expect at my first visit?"
        />

        {/* Therapists */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Our Therapists ({clinic.therapists.length})
          </h2>

          {clinic.therapists.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No therapists are currently accepting bookings at this clinic.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clinic.therapists.map((therapist) => {
                const name = therapist.user?.name ?? 'Therapist';
                const avatarUrl = therapist.profileImage || therapist.user?.image;
                const startingPrice = therapist.sessionPricing?.[0]?.price;
                const priceCurrency = therapist.sessionPricing?.[0]?.currency || currency;

                return (
                  <Card key={therapist.id} className="rounded-2xl overflow-hidden hover:shadow-lg transition-shadow duration-200">
                    <div className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <Avatar src={avatarUrl || undefined} name={name} size="xl" className="border-2 border-teal-100" />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">{name}</h3>
                          <p className="text-sm text-gray-500 truncate">{therapist.title}</p>
                          <RatingStars rating={therapist.overallRating} />
                        </div>
                      </div>

                      {/* Specializations */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {therapist.specializations.slice(0, 3).map((spec) => (
                          <Badge key={spec} color="blue">{spec}</Badge>
                        ))}
                        {therapist.specializations.length > 3 && (
                          <Badge color="gray">+{therapist.specializations.length - 3}</Badge>
                        )}
                      </div>

                      {/* Experience + Languages */}
                      <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                        {therapist.yearsExperience != null && (
                          <span className="flex items-center gap-1">
                            <BriefcaseIcon className="w-4 h-4" />
                            {therapist.yearsExperience}y exp
                          </span>
                        )}
                        {therapist.languages.length > 0 && (
                          <span className="flex items-center gap-1">
                            <GlobeIcon className="w-4 h-4" />
                            {therapist.languages.slice(0, 2).join(', ')}
                            {therapist.languages.length > 2 && ` +${therapist.languages.length - 2}`}
                          </span>
                        )}
                      </div>

                      {/* Bio */}
                      <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                        {therapist.bio || 'No bio available.'}
                      </p>

                      {/* Price */}
                      {startingPrice != null && startingPrice > 0 && (
                        <div className="mb-4">
                          <span className="text-lg font-bold text-gray-900">
                            {formatCurrency(startingPrice, priceCurrency)}
                          </span>
                          <span className="text-xs text-gray-500 ml-1">per session</span>
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
          )}
        </div>
      </div>
    </BookingShell>
  );
}
