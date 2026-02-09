'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CommunityShell } from '@/components/community-shell';
import {
  useBrowseCommunities,
  useCommunityStats,
  useCommunityMembers,
  useTopContributors,
  useJoinCommunity,
  useLeaveCommunity,
} from '@/hooks/use-community';
import {
  Card,
  Button,
  Avatar,
  Badge,
  Input,
  Skeleton,
  StatCard,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@upllyft/ui';
import type { Community, CommunityMember } from '@/lib/api/community';

const COMMUNITY_TYPE_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Condition', value: 'CONDITION_SPECIFIC' },
  { label: 'Regional', value: 'REGIONAL' },
  { label: 'Professional', value: 'PROFESSIONAL' },
] as const;

function typeBadgeColor(type: string): 'teal' | 'blue' | 'purple' | 'green' | 'gray' {
  switch (type) {
    case 'CONDITION_SPECIFIC':
      return 'purple';
    case 'REGIONAL':
      return 'blue';
    case 'PROFESSIONAL':
      return 'teal';
    case 'ORGANIZATION':
      return 'green';
    default:
      return 'gray';
  }
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

function roleBadgeColor(role: string): 'teal' | 'blue' | 'purple' | 'green' | 'gray' {
  switch (role) {
    case 'THERAPIST':
      return 'blue';
    case 'EDUCATOR':
      return 'purple';
    case 'ADMIN':
    case 'MODERATOR':
      return 'green';
    default:
      return 'gray';
  }
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function CommunityCard({ community }: { community: Community }) {
  const joinMutation = useJoinCommunity();
  const leaveMutation = useLeaveCommunity();
  const isMember = community.isMember || community.userMembership?.status === 'ACTIVE';
  const memberCount = community._count?.members ?? community.memberCount ?? 0;
  const postCount = community._count?.posts ?? community.postCount ?? 0;

  return (
    <Card hover className="p-5 flex flex-col h-full">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
          {community.icon || community.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <Link href={`/communities/${community.id}`}>
            <h3 className="font-semibold text-gray-900 hover:text-teal-600 transition-colors truncate">
              {community.name}
            </h3>
          </Link>
          <Badge color={typeBadgeColor(community.type)} className="mt-1">
            {formatTypeLabel(community.type)}
          </Badge>
        </div>
      </div>

      <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-3 flex-1">
        {community.description}
      </p>

      {community.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {community.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600 text-xs"
            >
              {tag}
            </span>
          ))}
          {community.tags.length > 3 && (
            <span className="text-xs text-gray-400">+{community.tags.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {memberCount}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            {postCount}
          </span>
        </div>
        {isMember ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => leaveMutation.mutate(community.id)}
            disabled={leaveMutation.isPending}
          >
            Joined
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => joinMutation.mutate(community.id)}
            disabled={joinMutation.isPending}
          >
            Join
          </Button>
        )}
      </div>
    </Card>
  );
}

function MemberCard({ member }: { member: CommunityMember }) {
  const postCount = member._count?.posts ?? 0;
  const commentCount = member._count?.comments ?? 0;

  return (
    <Card hover className="p-5">
      <div className="flex items-center gap-3">
        <Avatar src={member.image || undefined} name={member.name} size="lg" />
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-gray-900 truncate">{member.name}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            {member.role !== 'USER' && (
              <Badge color={roleBadgeColor(member.role)}>
                {formatLabel(member.role)}
              </Badge>
            )}
            {member.verificationStatus === 'VERIFIED' && (
              <Badge color="green">Verified</Badge>
            )}
          </div>
          {member.bio && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-1">{member.bio}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
        {member.trustScore !== undefined && (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {member.trustScore}
          </span>
        )}
        <span>{postCount} posts</span>
        <span>{commentCount} comments</span>
      </div>
    </Card>
  );
}

function ContributorRow({
  member,
  rank,
}: {
  member: CommunityMember;
  rank: number;
}) {
  const postCount = member._count?.posts ?? 0;
  const commentCount = member._count?.comments ?? 0;

  return (
    <div className="flex items-center gap-4 py-3">
      <span
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
          rank === 1
            ? 'bg-yellow-100 text-yellow-700'
            : rank === 2
              ? 'bg-gray-100 text-gray-600'
              : rank === 3
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-50 text-gray-500'
        }`}
      >
        {rank}
      </span>
      <Avatar src={member.image || undefined} name={member.name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900 text-sm truncate">{member.name}</p>
        <div className="flex items-center gap-2">
          {member.role !== 'USER' && (
            <Badge color={roleBadgeColor(member.role)}>
              {formatLabel(member.role)}
            </Badge>
          )}
        </div>
      </div>
      <div className="text-right text-xs text-gray-500">
        <p>{postCount + commentCount} contributions</p>
        {member.trustScore !== undefined && (
          <p className="flex items-center gap-1 justify-end mt-0.5">
            <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {member.trustScore}
          </p>
        )}
      </div>
    </div>
  );
}

function CommunitiesGrid() {
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const params = {
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(search ? { search } : {}),
    page,
    limit: 12,
  };

  const { data, isLoading } = useBrowseCommunities(params);
  const communities = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 12);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input
            variant="search"
            placeholder="Search communities..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          {COMMUNITY_TYPE_FILTERS.map((filter) => (
            <button
              key={filter.label}
              onClick={() => {
                setTypeFilter(filter.value);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                typeFilter === filter.value
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-teal-300 hover:text-teal-600'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-start gap-3 mb-3">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3 mt-1" />
              <div className="flex justify-between mt-4 pt-3 border-t border-gray-100">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16 rounded-xl" />
              </div>
            </Card>
          ))}
        </div>
      ) : communities.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900">No communities found</h3>
          <p className="text-sm text-gray-500 mt-1">
            {search ? 'Try adjusting your search' : 'Be the first to create one!'}
          </p>
          <Link href="/communities/create" className="inline-block mt-4">
            <Button size="sm">Create Community</Button>
          </Link>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {communities.map((community) => (
              <CommunityCard key={community.id} community={community} />
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
        </>
      )}
    </div>
  );
}

function MembersGrid() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCommunityMembers({ page, limit: 12, search: search || undefined });
  const members = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 12);

  return (
    <div className="space-y-4">
      <Input
        variant="search"
        placeholder="Search members..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : members.length === 0 ? (
        <Card className="p-12 text-center">
          <h3 className="font-semibold text-gray-900">No members found</h3>
          <p className="text-sm text-gray-500 mt-1">Try adjusting your search</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member) => (
              <MemberCard key={member.id} member={member} />
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
        </>
      )}
    </div>
  );
}

function VerifiedMembersGrid() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCommunityMembers({ page, limit: 12, role: 'THERAPIST' });
  const members = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 12);

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : members.length === 0 ? (
        <Card className="p-12 text-center">
          <h3 className="font-semibold text-gray-900">No verified members found</h3>
          <p className="text-sm text-gray-500 mt-1">Verified therapists and professionals will appear here</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member) => (
              <MemberCard key={member.id} member={member} />
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
        </>
      )}
    </div>
  );
}

function TopContributorsTab() {
  const { data: contributors, isLoading } = useTopContributors(20);

  return (
    <div>
      {isLoading ? (
        <Card className="p-5">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </Card>
      ) : !contributors || contributors.length === 0 ? (
        <Card className="p-12 text-center">
          <h3 className="font-semibold text-gray-900">No contributors yet</h3>
          <p className="text-sm text-gray-500 mt-1">Start contributing to appear on the leaderboard!</p>
        </Card>
      ) : (
        <Card className="p-5 divide-y divide-gray-100">
          {contributors.map((member, index) => (
            <ContributorRow key={member.id} member={member} rank={index + 1} />
          ))}
        </Card>
      )}
    </div>
  );
}

export default function BrowseCommunitiesPage() {
  const { data: stats, isLoading: statsLoading } = useCommunityStats();

  return (
    <CommunityShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communities</h1>
          <p className="text-gray-500 mt-1">
            Discover and join communities of parents, therapists, and educators
          </p>
        </div>
        <Link href="/communities/create">
          <Button>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Community
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-8">
        {statsLoading ? (
          [...Array(5)].map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-8 w-8 rounded-xl mb-3" />
              <Skeleton className="h-6 w-16 mb-1" />
              <Skeleton className="h-4 w-20" />
            </Card>
          ))
        ) : stats ? (
          <>
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              value={stats.totalMembers.toLocaleString()}
              label="Members"
            />
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              }
              value={stats.verifiedMembers.toLocaleString()}
              label="Verified"
            />
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              }
              value={stats.totalPosts.toLocaleString()}
              label="Posts"
            />
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              }
              value={stats.totalComments.toLocaleString()}
              label="Comments"
            />
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
              value={stats.activeToday.toLocaleString()}
              label="Active Today"
            />
          </>
        ) : null}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="communities">
        <TabsList className="mb-6">
          <TabsTrigger value="communities">Communities</TabsTrigger>
          <TabsTrigger value="members">All Members</TabsTrigger>
          <TabsTrigger value="verified">Verified</TabsTrigger>
          <TabsTrigger value="contributors">Top Contributors</TabsTrigger>
        </TabsList>

        <TabsContent value="communities">
          <CommunitiesGrid />
        </TabsContent>

        <TabsContent value="members">
          <MembersGrid />
        </TabsContent>

        <TabsContent value="verified">
          <VerifiedMembersGrid />
        </TabsContent>

        <TabsContent value="contributors">
          <TopContributorsTab />
        </TabsContent>
      </Tabs>
    </CommunityShell>
  );
}
