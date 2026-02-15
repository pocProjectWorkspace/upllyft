'use client';

import { useState } from 'react';
import { useAuth, APP_URLS } from '@upllyft/api-client';
import { AppHeader, Card, Avatar, Badge, Skeleton } from '@upllyft/ui';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getProfile, getUserSocialProfile, calculateAge } from '@/lib/api/profiles';
import { FollowButton } from '@/components/profile/follow-button';
import { FollowersDialog } from '@/components/profile/followers-dialog';
import { ContributionStats } from '@/components/profile/contribution-stats';
import { TrustScore } from '@/components/profile/trust-score';
import { BadgeDisplay } from '@/components/profile/badge-display';
import { ActivityFeed } from '@/components/profile/activity-feed';

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

  const { data: social } = useQuery({
    queryKey: ['social', profileId],
    queryFn: () => getUserSocialProfile(profileId),
    enabled: isAuthenticated && !!profileId,
  });

  const [followersOpen, setFollowersOpen] = useState(false);
  const [followersTab, setFollowersTab] = useState<'followers' | 'following'>('followers');

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

  // Redirect to own profile page if viewing self
  if (user.id === profileId) {
    router.replace('/profile');
    return null;
  }

  const displayName = profile?.fullName || profile?.email || 'User';
  const isOwnProfile = user.id === profileId;

  const openFollowers = (tab: 'followers' | 'following') => {
    setFollowersTab(tab);
    setFollowersOpen(true);
  };

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
            <a href={APP_URLS.community} className="text-sm text-teal-600 hover:text-teal-700 font-medium mt-2 inline-block">
              Back to Feed
            </a>
          </Card>
        ) : profile ? (
          <div className="space-y-6">
            {/* Profile Header */}
            <Card className="p-6">
              <div className="flex items-start gap-5">
                <Avatar name={displayName} size="xl" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
                    {(profile as any).verificationStatus === 'APPROVED' && (
                      <svg className="w-5 h-5 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
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

                  {/* Follower / Following counts */}
                  {social && (
                    <div className="flex items-center gap-4 mt-3">
                      <button
                        onClick={() => openFollowers('followers')}
                        className="text-sm text-gray-600 hover:text-teal-600"
                      >
                        <span className="font-bold text-gray-900">{social.followerCount}</span> followers
                      </button>
                      <button
                        onClick={() => openFollowers('following')}
                        className="text-sm text-gray-600 hover:text-teal-600"
                      >
                        <span className="font-bold text-gray-900">{social.followingCount}</span> following
                      </button>
                    </div>
                  )}
                </div>

                {/* Follow Button */}
                {!isOwnProfile && social && (
                  <FollowButton
                    userId={profileId}
                    isFollowing={social.isFollowing}
                  />
                )}
              </div>
            </Card>

            {/* Badges */}
            {social && social.badges.length > 0 && (
              <BadgeDisplay badges={social.badges} />
            )}

            {/* Trust Score */}
            {social && (
              <Card className="p-5">
                <TrustScore score={social.trustScore} />
              </Card>
            )}

            {/* Contribution Stats */}
            {social && (
              <ContributionStats
                stats={social.contributionStats}
                onFollowerClick={() => openFollowers('followers')}
                onFollowingClick={() => openFollowers('following')}
              />
            )}

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

            {/* Activity Feed */}
            {social && social.recentActivity.length > 0 && (
              <ActivityFeed activities={social.recentActivity} />
            )}

            {/* Children */}
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

      {/* Followers Dialog */}
      {social && (
        <FollowersDialog
          open={followersOpen}
          onOpenChange={setFollowersOpen}
          userId={profileId}
          userName={displayName}
          initialTab={followersTab}
          followerCount={social.followerCount}
          followingCount={social.followingCount}
        />
      )}
    </div>
  );
}
