'use client';

import { useAuth } from '@upllyft/api-client';
import { AppHeader, Card, Avatar, Badge, Skeleton } from '@upllyft/ui';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getProfile, calculateAge } from '@/lib/api/profiles';

export default function UserProfilePage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const profileId = params.id as string;

  const { data: profile, isLoading: profileLoading, error } = useQuery({
    queryKey: ['profile', profileId],
    queryFn: () => getProfile(profileId),
    enabled: isAuthenticated && !!profileId,
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
        {profileLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        ) : error ? (
          <Card className="p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-gray-500 text-sm">Profile not found</p>
            <a href="/feed" className="text-sm text-teal-600 hover:text-teal-700 font-medium mt-2 inline-block">
              Back to Feed
            </a>
          </Card>
        ) : profile ? (
          <div className="space-y-6">
            {/* Profile Header */}
            <Card className="p-6">
              <div className="flex items-start gap-5">
                <Avatar name={profile.fullName || profile.email || 'User'} size="xl" />
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-gray-900">
                    {profile.fullName || 'Anonymous User'}
                  </h1>
                  {profile.email && (
                    <p className="text-sm text-gray-500">{profile.email}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {profile.relationshipToChild && (
                      <Badge color="teal">{profile.relationshipToChild}</Badge>
                    )}
                    {profile.city && profile.state && (
                      <span className="text-xs text-gray-400">
                        {profile.city}, {profile.state}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Contact Info */}
            <Card className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Information</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {profile.occupation && (
                  <div>
                    <p className="text-gray-500">Occupation</p>
                    <p className="text-gray-900 font-medium">{profile.occupation}</p>
                  </div>
                )}
                {profile.educationLevel && (
                  <div>
                    <p className="text-gray-500">Education</p>
                    <p className="text-gray-900 font-medium">{profile.educationLevel}</p>
                  </div>
                )}
                {profile.country && (
                  <div>
                    <p className="text-gray-500">Location</p>
                    <p className="text-gray-900 font-medium">
                      {[profile.city, profile.state, profile.country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Children (visible to professionals on the same case) */}
            {profile.children && profile.children.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-3">Children</h2>
                <div className="space-y-3">
                  {profile.children.map((child) => (
                    <Card key={child.id} className="p-5">
                      <div className="flex items-start gap-4">
                        <Avatar name={child.firstName} size="md" />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900">{child.firstName}</h3>
                          <p className="text-xs text-gray-500">
                            {calculateAge(child.dateOfBirth)} years old
                            {child.gender && ` · ${child.gender}`}
                            {child.grade && ` · Grade ${child.grade}`}
                          </p>
                          {child.conditions?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {child.conditions.map((c) => (
                                <Badge key={c.id} color="teal">{c.conditionType}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
