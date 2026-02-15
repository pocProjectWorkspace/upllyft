'use client';

import { useState } from 'react';
import { useToast } from '@upllyft/ui';
import { followUser, unfollowUser } from '@/lib/api/profiles';

interface FollowButtonProps {
  userId: string;
  isFollowing: boolean;
  onFollowChange?: (following: boolean) => void;
  className?: string;
}

export function FollowButton({ userId, isFollowing: initialFollowing, onFollowChange, className }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFollow = async () => {
    // Optimistic update
    const prev = isFollowing;
    setIsFollowing(!prev);
    setLoading(true);

    try {
      if (prev) {
        await unfollowUser(userId);
        toast({ title: 'Unfollowed', description: 'You have unfollowed this user' });
      } else {
        await followUser(userId);
        toast({ title: 'Following', description: 'You are now following this user' });
      }
      onFollowChange?.(!prev);
    } catch {
      // Revert on error
      setIsFollowing(prev);
      toast({ title: 'Error', description: 'Failed to update follow status', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleFollow}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
        isFollowing
          ? 'border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-red-200 hover:text-red-600'
          : 'bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700 shadow-md'
      } ${className || ''}`}
    >
      {isFollowing ? (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Following
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Follow
        </>
      )}
    </button>
  );
}
