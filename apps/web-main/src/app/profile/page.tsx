'use client';

import { useAuth } from '@upllyft/api-client';
import { AppHeader, Card, Avatar, Badge, Skeleton, ProgressRing } from '@upllyft/ui';
import { useRouter } from 'next/navigation';
import { useMyProfile } from '@/hooks/use-dashboard';
import { calculateAge } from '@/lib/api/profiles';

export default function ProfilePage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const router = useRouter();

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

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader currentApp="main" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {profileLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile Header */}
            <Card className="p-6">
              <div className="flex items-start gap-5">
                <Avatar name={displayName} src={user.image || undefined} size="xl" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
                    {user.verificationStatus === 'APPROVED' && (
                      <svg className="w-5 h-5 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge color="teal">{user.role}</Badge>
                    {user.location && (
                      <span className="text-xs text-gray-400">{user.location}</span>
                    )}
                  </div>
                  {user.bio && (
                    <p className="text-sm text-gray-600 mt-3">{user.bio}</p>
                  )}
                </div>
                <a
                  href="/profile/edit"
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium border border-teal-200 rounded-xl px-4 py-2 hover:bg-teal-50 transition-colors"
                >
                  Edit Profile
                </a>
              </div>
            </Card>

            {/* Profile Completeness */}
            {profile && profile.completenessScore < 100 && (
              <Card className="p-5 bg-gradient-to-r from-teal-50 to-blue-50 border-teal-100">
                <div className="flex items-center gap-4">
                  <ProgressRing value={profile.completenessScore} size={56} strokeWidth={4} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Profile {profile.completenessScore}% complete
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Complete your profile to get personalized recommendations
                    </p>
                  </div>
                  <a
                    href="/profile/edit"
                    className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                  >
                    Complete
                  </a>
                </div>
              </Card>
            )}

            {/* Contact Info */}
            <Card className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Contact Information</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Email</p>
                  <p className="text-gray-900 font-medium">{user.email}</p>
                </div>
                <div>
                  <p className="text-gray-500">Phone</p>
                  <p className="text-gray-900 font-medium">{profile?.phoneNumber || user.phone || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Location</p>
                  <p className="text-gray-900 font-medium">
                    {[profile?.city, profile?.state, profile?.country].filter(Boolean).join(', ') || 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Occupation</p>
                  <p className="text-gray-900 font-medium">{profile?.occupation || 'Not set'}</p>
                </div>
              </div>
            </Card>

            {/* Children (Parents Only) */}
            {user.role === 'USER' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-gray-900">Children</h2>
                  <a
                    href="/profile/edit"
                    className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                  >
                    Manage
                  </a>
                </div>
                {profile?.children && profile.children.length > 0 ? (
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
                ) : (
                  <Card className="p-8 text-center">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <p className="text-sm text-gray-500 mb-3">No children added yet</p>
                    <a
                      href="/profile/edit"
                      className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                    >
                      Add a child
                    </a>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
