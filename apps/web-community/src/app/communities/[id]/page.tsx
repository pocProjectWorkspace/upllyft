'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CommunityShell } from '@/components/community-shell';
import {
  useCommunity,
  useCommunityPosts,
  useCommunityMembersList,
  useJoinCommunity,
  useLeaveCommunity,
} from '@/hooks/use-community';
import { useEvents } from '@/hooks/use-events';
import type { CommunityEvent } from '@/lib/api/events';
import {
  Card,
  Button,
  Avatar,
  Badge,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@upllyft/ui';

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatLabel(value: string): string {
  if (!value) return '';
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTypeLabel(type: string): string {
  switch (type) {
    case 'CONDITION_SPECIFIC':
      return 'Condition';
    case 'REGIONAL':
      return 'Regional';
    case 'PROFESSIONAL':
      return 'Professional';
    case 'ORGANIZATION':
      return 'Organization';
    default:
      return type;
  }
}

function typeBadgeClasses(type: string): string {
  switch (type) {
    case 'CONDITION_SPECIFIC':
      return 'bg-pink-100 text-pink-700';
    case 'REGIONAL':
      return 'bg-blue-100 text-blue-700';
    case 'PROFESSIONAL':
      return 'bg-teal-100 text-teal-700';
    default:
      return 'bg-purple-100 text-purple-700';
  }
}

function typeGradient(type: string): string {
  switch (type) {
    case 'CONDITION_SPECIFIC':
      return 'from-pink-500 via-rose-500 to-pink-600';
    case 'TOPIC_BASED':
      return 'from-purple-500 via-indigo-500 to-purple-600';
    case 'REGIONAL':
      return 'from-blue-500 via-cyan-500 to-blue-600';
    case 'PROFESSIONAL':
      return 'from-teal-500 via-emerald-500 to-teal-600';
    default:
      return 'from-gray-700 to-gray-900';
  }
}

function PostsTab({ communityId }: { communityId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCommunityPosts(communityId, { page, limit: 10, sort: 'recent' });
  const posts = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 10);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-start gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        </div>
        <h3 className="font-semibold text-gray-900">No posts yet</h3>
        <p className="text-sm text-gray-500 mt-1">Be the first to start a discussion in this community!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post: any) => (
        <Link key={post.id} href={`/posts/${post.id}`}>
          <Card hover className="p-5">
            <div className="flex items-start gap-3">
              <Avatar
                src={post.author?.image || undefined}
                name={post.author?.name || 'Anonymous'}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 text-sm">
                    {post.isAnonymous ? 'Anonymous' : (post.author?.name || post.author?.email?.split('@')[0] || 'User')}
                  </span>
                  <span className="text-xs text-gray-400">{formatTimeAgo(post.createdAt)}</span>
                </div>
                <h3 className="mt-1 font-semibold text-gray-900 text-base leading-snug">
                  {post.title}
                </h3>
                <p className="mt-1.5 text-sm text-gray-600 leading-relaxed line-clamp-2">
                  {post.content}
                </p>
                <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    {post.upvotes ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {post.commentCount ?? post._count?.comments ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </Link>
      ))}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-500 px-3">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function MembersTab({ communityId }: { communityId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCommunityMembersList(communityId, { page, limit: 12 });
  const members = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 12);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-pink-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="font-semibold text-gray-900">No members yet</h3>
        <p className="text-sm text-gray-500 mt-1">Be the first to join this community!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member) => (
          <Card key={member.id} className="p-4">
            <div className="flex items-center gap-3">
              <Avatar
                src={member.image || undefined}
                name={member.name || member.email?.split('@')[0] || 'User'}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">
                  {member.name || member.email?.split('@')[0] || 'User'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {member.role && member.role !== 'USER' && (
                    <Badge color={member.role === 'THERAPIST' ? 'blue' : member.role === 'EDUCATOR' ? 'purple' : 'green'}>
                      {formatLabel(member.role)}
                    </Badge>
                  )}
                  {member.verificationStatus === 'VERIFIED' && (
                    <span className="text-xs text-green-600 font-medium">Verified</span>
                  )}
                </div>
                {member.bio && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{member.bio}</p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-500 px-3">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function EventsTab({ communityId }: { communityId: string }) {
  const { data, isLoading } = useEvents({ communityId, limit: 12 });
  const events = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="w-full h-32 rounded-none" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="font-semibold text-gray-900">No events yet</h3>
        <p className="text-sm text-gray-500 mt-1">No events have been created for this community.</p>
        <Link href="/events/create" className="inline-block mt-4">
          <Button size="sm">Create Event</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {events.map((event: CommunityEvent) => (
        <Link key={event.id} href={`/events/${event.id}`}>
          <Card hover className="overflow-hidden">
            {event.coverImage ? (
              <img src={event.coverImage} alt={event.title} className="w-full h-32 object-cover" />
            ) : (
              <div className="w-full h-32 bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge color="yellow">{formatLabel(event.type)}</Badge>
                <Badge color="blue">{formatLabel(event.format)}</Badge>
              </div>
              <h4 className="font-semibold text-gray-900 line-clamp-1">{event.title}</h4>
              <p className="text-sm text-gray-500 mt-1 line-clamp-1">{event.description}</p>
              <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-600">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatDate(event.startDate)}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>{event.interestedCount} interested</span>
                <span>{event.goingCount} going</span>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function AboutTab({
  community,
}: {
  community: {
    type: string;
    isPrivate: boolean;
    description: string;
    tags: string[];
    creator?: { id: string; name: string; image?: string };
  };
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Community Details</h3>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Type</p>
            <div className="mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeBadgeClasses(community.type)}`}>
                {formatTypeLabel(community.type)}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Privacy</p>
            <p className="text-sm text-gray-700 mt-1">
              {community.isPrivate ? 'Private - Invite only' : 'Public - Anyone can join'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Description</p>
            <p className="text-sm text-gray-700 mt-1 leading-relaxed">{community.description}</p>
          </div>
          {community.tags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {community.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-full bg-pink-50 text-pink-700 text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Created By</h3>
        {community.creator ? (
          <div className="flex items-center gap-3">
            <Avatar
              src={community.creator.image || undefined}
              name={community.creator.name || 'User'}
              size="lg"
            />
            <div>
              <p className="font-medium text-gray-900">{community.creator.name || 'User'}</p>
              <p className="text-sm text-gray-500">Community Owner</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Creator information unavailable</p>
        )}
      </Card>
    </div>
  );
}

export default function CommunityDetailPage() {
  const params = useParams();
  const communityId = params.id as string;
  const { data: community, isLoading, error } = useCommunity(communityId);
  const joinMutation = useJoinCommunity();
  const leaveMutation = useLeaveCommunity();

  if (isLoading) {
    return (
      <CommunityShell>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
        </div>
      </CommunityShell>
    );
  }

  if (error || !community) {
    return (
      <CommunityShell>
        <Card className="p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900">Community not found</h3>
          <p className="text-sm text-gray-500 mt-1">
            This community may have been removed or you don&apos;t have access.
          </p>
          <Link href="/communities" className="inline-block mt-4">
            <Button variant="outline" size="sm">
              Back to Communities
            </Button>
          </Link>
        </Card>
      </CommunityShell>
    );
  }

  const isMember = community.isMember || community.userMembership?.status === 'ACTIVE';
  const isOwner = community.userMembership?.role === 'OWNER';
  const memberCount = community._count?.members ?? community.memberCount ?? 0;
  const postCount = community._count?.posts ?? community.postCount ?? 0;

  return (
    <CommunityShell>
      {/* Banner */}
      <div className="mb-6">
        <div className="relative rounded-2xl overflow-hidden">
          {community.bannerImage ? (
            <img
              src={community.bannerImage}
              alt={`${community.name} banner`}
              className="w-full h-56 object-cover"
            />
          ) : (
            <div className={`w-full h-56 bg-gradient-to-r ${typeGradient(community.type)}`} />
          )}
          {/* Dark overlay for text contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

          {/* Banner content */}
          <div className="absolute inset-x-0 bottom-0 p-6 flex items-end gap-4">
            {/* Spacer matching avatar width */}
            <div className="w-20 shrink-0" />

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white drop-shadow-sm">{community.name}</h1>
              <p className="text-white/80 mt-1 line-clamp-2 text-sm">{community.description}</p>
              <div className="flex items-center gap-3 mt-2 flex-wrap text-sm text-white/80">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {memberCount} members
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                  {postCount} posts
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm">
                  {formatTypeLabel(community.type)}
                </span>
                {community.isPrivate && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Private
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {isMember ? (
                <>
                  <Link href={`/posts/create?communityId=${communityId}`}>
                    <button className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-white text-gray-900 hover:bg-white/90 transition-all shadow-sm">
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create Post
                    </button>
                  </Link>
                  {!isOwner && (
                    <button
                      onClick={() => leaveMutation.mutate(communityId)}
                      disabled={leaveMutation.isPending}
                      className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border border-white/40 text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      Leave
                    </button>
                  )}
                  {isOwner && (
                    <button className="p-2 rounded-full text-white/80 hover:bg-white/10 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={() => joinMutation.mutate(communityId)}
                  disabled={joinMutation.isPending}
                  className="inline-flex items-center px-5 py-2.5 rounded-full text-sm font-semibold bg-white text-gray-900 hover:bg-white/90 transition-colors shadow-sm disabled:opacity-50"
                >
                  {joinMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mr-2" />
                      Joining...
                    </>
                  ) : (
                    'Join Community'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Avatar — half in, half out of banner */}
        <div className="relative z-10 -mt-10 ml-6">
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${typeGradient(community.type)} flex items-center justify-center text-white font-bold text-3xl shadow-lg border-4 border-white`}>
            {community.icon || community.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="posts">
        <TabsList className="mb-6">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          <PostsTab communityId={communityId} />
        </TabsContent>

        <TabsContent value="members">
          <MembersTab communityId={communityId} />
        </TabsContent>

        <TabsContent value="events">
          <EventsTab communityId={communityId} />
        </TabsContent>

        <TabsContent value="about">
          <AboutTab community={community} />
        </TabsContent>
      </Tabs>
    </CommunityShell>
  );
}
