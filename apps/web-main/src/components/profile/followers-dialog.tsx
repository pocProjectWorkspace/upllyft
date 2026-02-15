'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Avatar,
  Skeleton,
  ScrollArea,
} from '@upllyft/ui';
import { useAuth } from '@upllyft/api-client';
import { FollowButton } from './follow-button';
import { getFollowers, getFollowing, type FollowUser } from '@/lib/api/profiles';

interface FollowersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  initialTab?: 'followers' | 'following';
  followerCount?: number;
  followingCount?: number;
}

export function FollowersDialog({
  open,
  onOpenChange,
  userId,
  userName,
  initialTab = 'followers',
  followerCount = 0,
  followingCount = 0,
}: FollowersDialogProps) {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      if (initialTab === 'followers') fetchFollowers();
      else fetchFollowingList();
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (open) {
      if (activeTab === 'followers' && followers.length === 0) fetchFollowers();
      else if (activeTab === 'following' && following.length === 0) fetchFollowingList();
    }
  }, [activeTab]);

  async function fetchFollowers() {
    setLoadingFollowers(true);
    try {
      const resp = await getFollowers(userId);
      setFollowers(resp.followers || []);
    } catch {
      setFollowers([]);
    } finally {
      setLoadingFollowers(false);
    }
  }

  async function fetchFollowingList() {
    setLoadingFollowing(true);
    try {
      const resp = await getFollowing(userId);
      setFollowing(resp.following || []);
    } catch {
      setFollowing([]);
    } finally {
      setLoadingFollowing(false);
    }
  }

  function handleFollowChange(targetId: string, isNowFollowing: boolean) {
    const update = (users: FollowUser[]) =>
      users.map((u) => (u.id === targetId ? { ...u, isFollowing: isNowFollowing } : u));
    if (activeTab === 'followers') setFollowers(update);
    else setFollowing(update);
  }

  const UserItem = ({ user }: { user: FollowUser }) => (
    <div className="flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded-xl">
      <a
        href={`/profile/${user.id}`}
        onClick={() => onOpenChange(false)}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <Avatar name={user.name} src={user.avatar} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
            {user.verificationStatus === 'APPROVED' && (
              <svg className="w-4 h-4 text-teal-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">{user.email}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-gray-400">{user._count?.posts || 0} posts</span>
            <span className="text-xs text-gray-400">{user._count?.followers || 0} followers</span>
          </div>
        </div>
      </a>
      {currentUser && currentUser.id !== user.id && (
        <FollowButton
          userId={user.id}
          isFollowing={user.isFollowing || false}
          onFollowChange={(f) => handleFollowChange(user.id, f)}
        />
      )}
    </div>
  );

  const SkeletonList = () => (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-1.5" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{userName}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'followers' | 'following')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="followers">
              Followers{followerCount > 0 ? ` (${followerCount})` : ''}
            </TabsTrigger>
            <TabsTrigger value="following">
              Following{followingCount > 0 ? ` (${followingCount})` : ''}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="followers" className="mt-4">
            <ScrollArea className="h-[400px] pr-2">
              {loadingFollowers ? (
                <SkeletonList />
              ) : followers.length === 0 ? (
                <p className="text-center py-8 text-sm text-gray-500">No followers yet</p>
              ) : (
                <div className="space-y-1">
                  {followers.map((u) => <UserItem key={u.id} user={u} />)}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="following" className="mt-4">
            <ScrollArea className="h-[400px] pr-2">
              {loadingFollowing ? (
                <SkeletonList />
              ) : following.length === 0 ? (
                <p className="text-center py-8 text-sm text-gray-500">Not following anyone yet</p>
              ) : (
                <div className="space-y-1">
                  {following.map((u) => <UserItem key={u.id} user={u} />)}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
