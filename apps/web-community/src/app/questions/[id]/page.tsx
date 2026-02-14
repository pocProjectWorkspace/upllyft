'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@upllyft/api-client';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Skeleton,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@upllyft/ui';
import { CommunityShell } from '@/components/community-shell';
import {
  useQuestion,
  useAnswers,
  useCreateAnswer,
  useVoteAnswer,
  useAcceptAnswer,
  useToggleFollowQuestion,
} from '@/hooks/use-questions';
import type { Answer } from '@/lib/api/questions';

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

const STATUS_STYLES: Record<string, { color: 'green' | 'red' | 'gray' | 'yellow'; label: string }> = {
  OPEN: { color: 'green', label: 'Open' },
  CLOSED: { color: 'red', label: 'Closed' },
  MERGED: { color: 'gray', label: 'Merged' },
  DUPLICATE: { color: 'yellow', label: 'Duplicate' },
};

const ROLE_COLORS: Record<string, 'teal' | 'purple' | 'blue' | 'green' | 'gray'> = {
  USER: 'teal',
  THERAPIST: 'purple',
  EDUCATOR: 'blue',
  ADMIN: 'teal',
  ORGANIZATION: 'green',
};

function AnswerCard({
  answer,
  questionId,
  isQuestionAuthor,
}: {
  answer: Answer;
  questionId: string;
  isQuestionAuthor: boolean;
}) {
  const voteAnswer = useVoteAnswer();
  const acceptAnswer = useAcceptAnswer(questionId);

  return (
    <div className={`py-5 ${answer.isAccepted ? 'bg-green-50/50 -mx-6 px-6 rounded-xl' : ''}`}>
      <div className="flex gap-4">
        {/* Vote column */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <button
            onClick={() => voteAnswer.mutate({ answerId: answer.id, vote: answer.userVote === 'up' ? null : 'up' })}
            className={`p-1.5 rounded-lg transition-colors ${
              answer.userVote === 'up' ? 'text-teal-600 bg-teal-50' : 'text-gray-400 hover:text-teal-600 hover:bg-teal-50'
            }`}
          >
            <svg className="w-5 h-5" fill={answer.userVote === 'up' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <span className={`text-sm font-semibold ${
            answer.userVote === 'up' ? 'text-teal-600' : answer.userVote === 'down' ? 'text-red-500' : 'text-gray-700'
          }`}>
            {answer.upvotes - answer.downvotes}
          </span>
          <button
            onClick={() => voteAnswer.mutate({ answerId: answer.id, vote: answer.userVote === 'down' ? null : 'down' })}
            className={`p-1.5 rounded-lg transition-colors ${
              answer.userVote === 'down' ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
            }`}
          >
            <svg className="w-5 h-5" fill={answer.userVote === 'down' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Accepted check */}
          {answer.isAccepted && (
            <div className="mt-1 text-green-600" title="Accepted answer">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Author */}
          <div className="flex items-center gap-2 mb-3">
            <Avatar
              name={answer.author.name || 'User'}
              src={answer.author.image || undefined}
              size="sm"
            />
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-gray-900">{answer.author.name || 'User'}</span>
              {answer.author.role && (
                <Badge color={ROLE_COLORS[answer.author.role] || 'gray'} className="text-[10px]">
                  {answer.author.role}
                </Badge>
              )}
            </div>
            <span className="text-xs text-gray-400 ml-auto">{formatTimeAgo(answer.createdAt)}</span>
          </div>

          {/* Answer content */}
          <div className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
            {answer.content}
          </div>

          {/* Accept button */}
          {isQuestionAuthor && !answer.isAccepted && (
            <div className="mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => acceptAnswer.mutate(answer.id)}
                disabled={acceptAnswer.isPending}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Accept Answer
              </Button>
            </div>
          )}

          {answer.isAccepted && (
            <Badge color="green" className="mt-3">Accepted Answer</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QuestionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [answerSort, setAnswerSort] = useState<'best' | 'recent' | 'oldest'>('best');
  const [answerContent, setAnswerContent] = useState('');

  const { data: question, isLoading: questionLoading } = useQuestion(id);
  const { data: answers, isLoading: answersLoading } = useAnswers(id, answerSort);
  const createAnswer = useCreateAnswer(id);
  const toggleFollow = useToggleFollowQuestion();

  const isAuthor = user?.id === question?.author.id;

  function handleSubmitAnswer() {
    if (!answerContent.trim()) return;
    createAnswer.mutate(answerContent, {
      onSuccess: () => setAnswerContent(''),
    });
  }

  if (questionLoading) {
    return (
      <CommunityShell>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="p-6">
                <Skeleton className="h-8 w-3/4 mb-4" />
                <Skeleton className="h-4 w-1/2 mb-6" />
                <Skeleton className="h-32 w-full" />
              </Card>
            </div>
            <div>
              <Card className="p-4">
                <Skeleton className="h-6 w-full mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </Card>
            </div>
          </div>
        </div>
      </CommunityShell>
    );
  }

  if (!question) {
    return (
      <CommunityShell>
        <div className="max-w-4xl mx-auto text-center py-20">
          <h2 className="text-xl font-semibold text-gray-900">Question not found</h2>
          <p className="text-gray-500 mt-2">This question may have been removed or you do not have access.</p>
          <Button variant="secondary" onClick={() => router.push('/questions')} className="mt-4">
            Back to Questions
          </Button>
        </div>
      </CommunityShell>
    );
  }

  const statusInfo = STATUS_STYLES[question.status] || STATUS_STYLES.OPEN;
  const answersList = answers || [];

  return (
    <CommunityShell>
      <div className="max-w-4xl mx-auto">
        {/* Back nav */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Questions
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Question */}
            <Card className="p-6">
              {/* Status + title */}
              <div className="flex items-start gap-3 mb-4">
                <Badge color={statusInfo.color}>{statusInfo.label}</Badge>
                <h1 className="text-xl font-bold text-gray-900 flex-1">{question.title}</h1>
              </div>

              {/* Author info */}
              <div className="flex items-center gap-3 mb-4">
                <Avatar
                  name={question.isAnonymous ? (question.anonymousName || 'Anonymous') : (question.author.name || 'User')}
                  src={question.isAnonymous ? undefined : (question.author.image || undefined)}
                  size="md"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-gray-900">
                      {question.isAnonymous ? (question.anonymousName || 'Anonymous') : (question.author.name || 'User')}
                    </span>
                    {!question.isAnonymous && question.author.role && (
                      <Badge color={ROLE_COLORS[question.author.role] || 'gray'} className="text-[10px]">
                        {question.author.role}
                      </Badge>
                    )}
                    {!question.isAnonymous && question.author.reputation > 0 && (
                      <span className="text-xs text-gray-400">Rep: {question.author.reputation}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">Asked {formatTimeAgo(question.createdAt)}</p>
                </div>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <Badge color="blue">{question.category}</Badge>
                {question.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full">#{tag}</span>
                ))}
              </div>

              {/* Content */}
              <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{question.content}</div>

              {/* Stats bar */}
              <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {question.viewCount} views
                </span>
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {question.answerCount} answers
                </span>
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {question.followerCount} followers
                </span>

                <div className="ml-auto">
                  <Button
                    variant={question.isFollowing ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => toggleFollow.mutate(id)}
                    disabled={toggleFollow.isPending}
                  >
                    <svg
                      className="w-4 h-4 mr-1"
                      fill={question.isFollowing ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {question.isFollowing ? 'Following' : 'Follow'}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Answers Section */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {answersList.length} {answersList.length === 1 ? 'Answer' : 'Answers'}
                </h2>
                <Select value={answerSort} onValueChange={(v) => setAnswerSort(v as 'best' | 'recent' | 'oldest')}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="best">Best</SelectItem>
                    <SelectItem value="recent">Recent</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {answersLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex gap-4 py-4">
                      <div className="w-10">
                        <Skeleton className="h-8 w-full mb-1" />
                        <Skeleton className="h-4 w-full mb-1" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                      <div className="flex-1">
                        <Skeleton className="h-4 w-1/3 mb-3" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : answersList.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No answers yet. Be the first to help out.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {answersList.map((answer) => (
                    <AnswerCard
                      key={answer.id}
                      answer={answer}
                      questionId={id}
                      isQuestionAuthor={isAuthor}
                    />
                  ))}
                </div>
              )}

              {/* Answer form */}
              {question.status === 'OPEN' && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="font-medium text-gray-900 mb-3">Your Answer</h3>
                  <Textarea
                    placeholder="Write your answer here..."
                    value={answerContent}
                    onChange={(e) => setAnswerContent(e.target.value)}
                    rows={5}
                  />
                  <div className="flex justify-end mt-3">
                    <Button
                      onClick={handleSubmitAnswer}
                      disabled={createAnswer.isPending || !answerContent.trim()}
                    >
                      {createAnswer.isPending ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Posting...
                        </span>
                      ) : (
                        'Post Answer'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Question Stats */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Question Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <Badge color={statusInfo.color}>{statusInfo.label}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Views</span>
                  <span className="text-gray-900 font-medium">{question.viewCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Answers</span>
                  <span className="text-gray-900 font-medium">{question.answerCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Followers</span>
                  <span className="text-gray-900 font-medium">{question.followerCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Asked</span>
                  <span className="text-gray-900 font-medium">{new Date(question.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Activity</span>
                  <span className="text-gray-900 font-medium">{formatTimeAgo(question.lastActivityAt)}</span>
                </div>
              </div>
            </Card>

            {/* Related Questions */}
            {question.relatedQuestions && question.relatedQuestions.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Related Questions</h3>
                <div className="space-y-3">
                  {question.relatedQuestions.map((rq) => (
                    <button
                      key={rq.id}
                      onClick={() => router.push(`/questions/${rq.relatedQuestion.id}`)}
                      className="block w-full text-left group"
                    >
                      <p className="text-sm font-medium text-gray-700 group-hover:text-teal-600 transition-colors line-clamp-2">
                        {rq.relatedQuestion.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs ${rq.relatedQuestion.hasAcceptedAnswer ? 'text-green-600' : 'text-gray-400'}`}>
                          {rq.relatedQuestion.answerCount} answers
                        </span>
                        <span className="text-xs text-gray-300">|</span>
                        <span className="text-xs text-gray-400">{rq.relatedQuestion.viewCount} views</span>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {/* Ask a question CTA */}
            <Card className="p-4 bg-gradient-to-br from-teal-50 to-teal-100/50 border-teal-100">
              <h3 className="font-semibold text-teal-900 mb-1">Have a question?</h3>
              <p className="text-sm text-teal-700 mb-3">Get answers from experienced professionals and parents.</p>
              <Button size="sm" onClick={() => router.push('/questions/ask')} className="w-full">
                Ask a Question
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </CommunityShell>
  );
}
