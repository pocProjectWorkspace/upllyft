'use client';

import { useState } from 'react';
import { useAuth } from '@upllyft/api-client';
import { Button, Card, Avatar, Textarea } from '@upllyft/ui';
import { ResourcesShell } from '@/components/resources-shell';
import {
  useTopContributors,
  useApplyForVerification,
  useApproveVerification,
} from '@/hooks/use-worksheets';
import { renderStars } from '@/lib/utils';

export default function ContributorsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useTopContributors();
  const applyMutation = useApplyForVerification();
  const approveMutation = useApproveVerification();

  const [bio, setBio] = useState('');

  const contributors = data?.data ?? [];
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (bio.trim()) {
      applyMutation.mutate(bio.trim(), {
        onSuccess: () => setBio(''),
      });
    }
  }

  return (
    <ResourcesShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Top Contributors</h1>
          <p className="text-gray-500 mt-1">
            Recognizing the community members who share the best learning resources.
          </p>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : contributors.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-lg font-semibold text-gray-900">No contributors yet</h3>
            <p className="text-gray-500 mt-1">
              Be the first to publish a worksheet and appear on the leaderboard.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {contributors.map((c, idx) => (
              <Card key={c.userId} className="p-4">
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className={`
                    flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                    ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-100 text-gray-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'}
                  `}>
                    {idx + 1}
                  </div>

                  {/* Avatar + Name */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar src={c.image || undefined} name={c.name} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-900 truncate">{c.name}</span>
                        {c.isVerifiedContributor && (
                          <svg className="w-4 h-4 text-teal-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <p className="text-sm text-yellow-500">{renderStars(c.averageRating)}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
                    <div className="text-center">
                      <p className="font-semibold text-gray-900">{c.publishedCount}</p>
                      <p className="text-xs text-gray-400">Published</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-900">{c.totalClones}</p>
                      <p className="text-xs text-gray-400">Clones</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-900">{c.averageRating.toFixed(1)}</p>
                      <p className="text-xs text-gray-400">Avg Rating</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-900">{c.totalReviews}</p>
                      <p className="text-xs text-gray-400">Reviews</p>
                    </div>
                  </div>

                  {/* Admin verify button */}
                  {isAdmin && !c.isVerifiedContributor && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate(c.userId)}
                    >
                      Verify
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Apply for Verification */}
        <div className="border-t pt-8 mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Apply for Verification</h2>
          <p className="text-gray-500 text-sm mb-4">
            Verified contributors get a badge next to their name and their worksheets are highlighted in the community library. Tell us about your background and experience.
          </p>
          <form onSubmit={handleApply} className="space-y-4 max-w-xl">
            <Textarea
              placeholder="Share your professional background, credentials, and experience working with neurodivergent children..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
            />
            <Button type="submit" disabled={!bio.trim() || applyMutation.isPending}>
              {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
            </Button>
          </form>
        </div>
      </div>
    </ResourcesShell>
  );
}
