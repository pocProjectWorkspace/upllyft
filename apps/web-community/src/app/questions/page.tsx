'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  Skeleton,
  StatCard,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@upllyft/ui';
import { useAuth } from '@upllyft/api-client';
import { CommunityShell } from '@/components/community-shell';
import { useQuestions, useQuestionsStats } from '@/hooks/use-questions';
import type { QuestionFilters } from '@/lib/api/questions';

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

const ROLE_COLORS: Record<string, 'teal' | 'purple' | 'blue' | 'green' | 'red' | 'gray'> = {
  USER: 'teal',
  THERAPIST: 'purple',
  EDUCATOR: 'blue',
  ADMIN: 'red',
  ORGANIZATION: 'green',
};

export default function QuestionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [sort, setSort] = useState<QuestionFilters['sort']>('recent');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filters: QuestionFilters = {
    page,
    limit: 15,
    sort,
    search: search || undefined,
    ...(activeTab === 'answered' ? { hasAcceptedAnswer: true } : {}),
    ...(activeTab === 'unanswered' ? { hasAcceptedAnswer: false } : {}),
    ...(activeTab === 'following' ? { following: true } : {}),
    ...(activeTab === 'mine' && user?.id ? { authorId: user.id } : {}),
  };

  const { data: questionsData, isLoading } = useQuestions(filters);
  const { data: stats } = useQuestionsStats();

  const questions = questionsData?.data || [];
  const totalPages = questionsData?.totalPages || 1;

  return (
    <CommunityShell>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Questions</h1>
            <p className="text-gray-500 mt-1">Ask and answer questions from the community</p>
          </div>
          <Button onClick={() => router.push('/posts/create?type=QUESTION')}>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ask Question
            </span>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            value={stats?.total ?? 0}
            label="Total Questions"
          />
          <StatCard
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            value={stats?.answered ?? 0}
            label="Answered"
          />
          <StatCard
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            value={stats?.unanswered ?? 0}
            label="Unanswered"
          />
        </div>

        {/* Filters row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <Input
              variant="search"
              placeholder="Search questions..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select value={sort} onValueChange={(v) => { setSort(v as QuestionFilters['sort']); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recent</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="popular">Popular</SelectItem>
              <SelectItem value="unanswered">Unanswered</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="answered">Answered</TabsTrigger>
            <TabsTrigger value="unanswered">Unanswered</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
            {user && <TabsTrigger value="mine">My Questions</TabsTrigger>}
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="p-4">
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center gap-1">
                        <Skeleton className="w-10 h-10 rounded-lg" />
                        <Skeleton className="w-10 h-10 rounded-lg" />
                      </div>
                      <div className="flex-1">
                        <Skeleton className="h-5 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-full mb-3" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">No questions found</p>
                <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or be the first to ask.</p>
                <Button variant="secondary" className="mt-4" onClick={() => router.push('/posts/create?type=QUESTION')}>
                  Ask a Question
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((q) => (
                  <Card
                    key={q.id}
                    hover
                    className="p-4 cursor-pointer"
                    onClick={() => router.push(`/questions/${q.id}`)}
                  >
                    <div className="flex gap-4">
                      {/* Stats column */}
                      <div className="flex flex-col items-center gap-1.5 text-center flex-shrink-0 w-16">
                        <div
                          className={`w-full px-2 py-1.5 rounded-lg text-xs font-semibold ${
                            q.hasAcceptedAnswer
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : q.answerCount > 0
                                ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                : 'bg-gray-50 text-gray-500 border border-gray-200'
                          }`}
                        >
                          {q.answerCount}
                          <span className="block text-[10px] font-normal">
                            {q.answerCount === 1 ? 'answer' : 'answers'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {q.viewCount} views
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 hover:text-teal-600 transition-colors line-clamp-2">
                          {q.title}
                        </h3>
                        {q.summary && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{q.summary}</p>
                        )}

                        <div className="flex items-center gap-2 flex-wrap mt-3">
                          {q.tags.map((tag) => (
                            <span key={tag} className="text-xs bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <Avatar
                              name={q.isAnonymous ? (q.anonymousName || 'Anonymous') : (q.author.name || 'User')}
                              src={q.isAnonymous ? undefined : (q.author.image || undefined)}
                              size="sm"
                            />
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-gray-600 font-medium">
                                {q.isAnonymous ? (q.anonymousName || 'Anonymous') : (q.author.name || 'User')}
                              </span>
                              {!q.isAnonymous && q.author.role && (
                                <Badge color={ROLE_COLORS[q.author.role] || 'gray'} className="text-[10px]">
                                  {q.author.role}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {q.followerCount}
                            </span>
                            <span>{formatTimeAgo(q.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}

                {/* Load More */}
                {page < totalPages && (
                  <div className="flex justify-center pt-4">
                    <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
                      Load More
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </CommunityShell>
  );
}
