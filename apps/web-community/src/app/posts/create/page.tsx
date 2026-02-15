'use client';

import { Suspense, useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Markdown from 'react-markdown';
import {
  Button,
  Card,
  Input,
  Label,
  Textarea,
  Switch,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Badge,
  Skeleton,
  toast,
} from '@upllyft/ui';
import { CommunityShell } from '@/components/community-shell';
import { useCreatePost, useSuggestTags } from '@/hooks/use-posts';
import { useCreateQuestion } from '@/hooks/use-questions';
import { useMyCommunities } from '@/hooks/use-community';
import type { CreatePostDto } from '@/lib/api/posts';

// ===== Constants =====

const POST_TYPES = [
  {
    value: 'DISCUSSION' as const,
    label: 'Discussion',
    description: 'Start a conversation or share your thoughts',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    value: 'QUESTION' as const,
    label: 'Question',
    description: 'Ask a question and get answers from the community',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    value: 'CASE_STUDY' as const,
    label: 'Case Study',
    description: 'Share a clinical case or learning experience',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    value: 'RESOURCE' as const,
    label: 'Resource',
    description: 'Share a helpful article, tool, or link',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
];

const CATEGORIES_BY_TYPE: Record<string, string[]> = {
  DISCUSSION: [
    'General Discussion',
    'Therapy Techniques',
    'Professional Development',
    'Mental Health',
    'Work-Life Balance',
    'Industry News',
  ],
  QUESTION: [
    'General',
    'Autism Spectrum',
    'ADHD',
    'Cerebral Palsy',
    'Down Syndrome',
    'Learning Disabilities',
    'Speech Disorders',
    'Sensory Processing',
    'Therapy',
    'Education',
  ],
  CASE_STUDY: [
    'Pediatric Cases',
    'Adult Rehabilitation',
    'Neurological Conditions',
    'Developmental Disorders',
    'Mental Health Cases',
    'Success Stories',
  ],
  RESOURCE: [
    'Research Papers',
    'Tools & Software',
    'Educational Materials',
    'Assessment Tools',
    'Treatment Protocols',
    'Guidelines & Standards',
  ],
};

function getContentPlaceholder(type: string | null): string {
  switch (type) {
    case 'QUESTION':
      return 'Provide more details about your question. Include relevant context like age, diagnosis, what you have tried, etc. Markdown is supported.';
    case 'CASE_STUDY':
      return 'Present the case background, interventions, outcomes, and key learnings. Remember to maintain confidentiality.';
    case 'RESOURCE':
      return 'Describe the resource, who it is for, and how it can be useful. Include links if applicable.';
    default:
      return 'Write your content here. You can use Markdown for formatting (bold, italic, lists, links, etc.)';
  }
}

function getTitlePlaceholder(type: string | null): string {
  switch (type) {
    case 'QUESTION':
      return 'What is your question? Be specific...';
    case 'CASE_STUDY':
      return 'Brief case title (keep it confidential)';
    case 'RESOURCE':
      return 'Name or title of the resource';
    default:
      return 'Give your post a descriptive title...';
  }
}

// ===== Markdown Toolbar =====

function MarkdownToolbar({ textareaRef, content, setContent }: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  content: string;
  setContent: (v: string) => void;
}) {
  function insertMarkdown(before: string, after: string = '') {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.slice(start, end);
    const replacement = `${before}${selected || 'text'}${after}`;
    const newContent = content.slice(0, start) + replacement + content.slice(end);
    setContent(newContent);
    // Restore cursor position after React re-renders
    requestAnimationFrame(() => {
      ta.focus();
      const cursorPos = start + before.length + (selected || 'text').length;
      ta.setSelectionRange(cursorPos, cursorPos);
    });
  }

  const btnClass = 'p-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors';

  return (
    <div className="flex items-center gap-0.5 px-3 py-2 border border-b-0 border-gray-200 rounded-t-xl bg-gray-50">
      <button type="button" title="Bold" className={btnClass} onClick={() => insertMarkdown('**', '**')}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6zm0 8h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" stroke="currentColor" strokeWidth="1" fill="none"/><text x="7" y="17" fontSize="14" fontWeight="bold" fill="currentColor">B</text></svg>
      </button>
      <button type="button" title="Italic" className={btnClass} onClick={() => insertMarkdown('*', '*')}>
        <svg className="w-4 h-4" viewBox="0 0 24 24"><text x="8" y="17" fontSize="14" fontStyle="italic" fill="currentColor">I</text></svg>
      </button>
      <div className="w-px h-5 bg-gray-300 mx-1" />
      <button type="button" title="Bullet List" className={btnClass} onClick={() => insertMarkdown('\n- ')}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>
      <button type="button" title="Numbered List" className={btnClass} onClick={() => insertMarkdown('\n1. ')}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
      </button>
      <div className="w-px h-5 bg-gray-300 mx-1" />
      <button type="button" title="Quote" className={btnClass} onClick={() => insertMarkdown('\n> ')}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>
      </button>
      <button type="button" title="Code" className={btnClass} onClick={() => insertMarkdown('`', '`')}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
      </button>
      <button type="button" title="Link" className={btnClass} onClick={() => insertMarkdown('[', '](url)')}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
      </button>
      <button type="button" title="Heading" className={btnClass} onClick={() => insertMarkdown('\n## ')}>
        <svg className="w-4 h-4" viewBox="0 0 24 24"><text x="4" y="17" fontSize="14" fontWeight="bold" fill="currentColor">H</text></svg>
      </button>
    </div>
  );
}

// ===== Main Page =====

export default function CreatePostPage() {
  return (
    <Suspense fallback={
      <CommunityShell>
        <div className="max-w-3xl mx-auto">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-4 w-80 mb-8" />
          <Skeleton className="h-40 w-full mb-6" />
          <Skeleton className="h-10 w-full mb-6" />
          <Skeleton className="h-48 w-full" />
        </div>
      </CommunityShell>
    }>
      <CreatePostForm />
    </Suspense>
  );
}

function CreatePostForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createPost = useCreatePost();
  const createQuestion = useCreateQuestion();
  const suggestTags = useSuggestTags();
  const { data: myCommunities, isLoading: communitiesLoading } = useMyCommunities();

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const urlCommunityId = searchParams.get('communityId');
  const urlType = searchParams.get('type');

  const [type, setType] = useState<CreatePostDto['type'] | 'QUESTION' | null>(
    urlType === 'QUESTION' ? 'QUESTION' : null
  );
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<string>(urlCommunityId || 'public');
  const [isPreview, setIsPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [aiTagsRequested, setAiTagsRequested] = useState(false);

  const isQuestion = type === 'QUESTION';
  const isMutating = createPost.isPending || createQuestion.isPending;

  // Reset category when type changes
  useEffect(() => {
    setCategory('');
  }, [type]);

  const currentCategories = type ? CATEGORIES_BY_TYPE[type] || [] : [];

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!type) newErrors.type = 'Please select a post type';
    if (title.length < 10) newErrors.title = 'Title must be at least 10 characters';
    if (title.length > 200) newErrors.title = 'Title must be less than 200 characters';
    const minContent = isQuestion ? 20 : 50;
    if (content.length < minContent) newErrors.content = `Content must be at least ${minContent} characters`;
    if (content.length > 10000) newErrors.content = 'Content must be less than 10,000 characters';
    if (!category) newErrors.category = 'Please select a category';
    if (!isQuestion && tags.length < 1) newErrors.tags = 'Add at least one tag';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(published: boolean) {
    if (!validate() || !type) return;

    if (isQuestion) {
      createQuestion.mutate(
        {
          title: title.trim(),
          content: content.trim(),
          category,
          tags,
          isAnonymous,
        },
        {
          onSuccess: (question) => {
            router.push(`/questions/${question.id}`);
          },
        },
      );
    } else {
      const communityId = selectedCommunity !== 'public' ? selectedCommunity : undefined;

      createPost.mutate(
        {
          title: title.trim(),
          content: content.trim(),
          type: type as CreatePostDto['type'],
          category,
          tags,
          isAnonymous,
          published,
          communityId,
        },
        {
          onSuccess: (post) => {
            if (communityId) {
              router.push(`/communities/${communityId}`);
            } else {
              router.push(`/posts/${post.id}`);
            }
          },
        },
      );
    }
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(tagInput);
    }
  }

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, '-');
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  }

  function removeTag(tagToRemove: string) {
    setTags(tags.filter((t) => t !== tagToRemove));
  }

  function handleGetAiTags() {
    if (content.length < 50) {
      toast({ title: 'Need more content', description: 'Write at least 50 characters to get AI tag suggestions.' });
      return;
    }
    setAiTagsRequested(true);
    suggestTags.mutate(content, {
      onSuccess: (data) => {
        const newTags = Array.isArray(data) ? data : [];
        setSuggestedTags(newTags.filter((t: string) => !tags.includes(t)));
      },
      onError: () => {
        toast({ title: 'Error', description: 'Failed to get tag suggestions.' });
      },
    });
  }

  return (
    <CommunityShell>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {isQuestion ? 'Ask a Question' : 'Create a Post'}
            </h1>
            <p className="text-gray-500 mt-1">
              {isQuestion
                ? 'Get help from parents, therapists, and educators in the community'
                : selectedCommunity !== 'public' && myCommunities
                  ? `Posting to ${myCommunities.find((c: any) => c.id === selectedCommunity)?.name || 'community'}`
                  : 'Share your thoughts, questions, or resources with the community'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreview(!isPreview)}
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {isPreview ? 'Edit' : 'Preview'}
          </Button>
        </div>

        {/* Community/Group Selector — hidden for questions */}
        {!isQuestion && !communitiesLoading && myCommunities && myCommunities.length > 0 && (
          <Card className="p-4 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">Post to Community (Optional)</p>
                <p className="text-xs text-gray-500">Select a community to share with specific members</p>
              </div>
            </div>
            <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
              <SelectTrigger>
                <SelectValue placeholder="Select a community or post publicly" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Everyone (Public Post)</SelectItem>
                {myCommunities.map((community: any) => (
                  <SelectItem key={community.id} value={community.id}>
                    {community.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCommunity !== 'public' && (
              <div className="mt-3 flex items-start gap-2 p-3 bg-teal-50 rounded-lg">
                <svg className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-teal-700">
                  This post will be shared with the {myCommunities.find((c: any) => c.id === selectedCommunity)?.name} community
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Type Selection */}
        <div className="mb-8">
          <Label className="text-sm font-medium text-gray-700 mb-3 block">Post Type</Label>
          <div className="grid grid-cols-2 gap-3">
            {POST_TYPES.map((pt) => (
              <Card
                key={pt.value}
                hover
                className={`p-4 cursor-pointer transition-all ${
                  type === pt.value
                    ? 'ring-2 ring-teal-500 border-teal-500 bg-teal-50/50'
                    : 'hover:border-gray-200'
                }`}
                onClick={() => {
                  setType(pt.value);
                  if (errors.type) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.type;
                      return next;
                    });
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl ${type === pt.value ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-500'}`}>
                    {pt.icon}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{pt.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{pt.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          {errors.type && <p className="mt-1.5 text-xs text-red-500">{errors.type}</p>}
        </div>

        {/* Tips Card — shown for questions */}
        {isQuestion && (
          <Card className="p-4 mb-6 bg-teal-50/50 border-teal-100">
            <div className="flex gap-3">
              <div className="p-2 bg-teal-100 rounded-xl text-teal-600 h-fit">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-teal-900">Tips for a great question</p>
                <ul className="text-xs text-teal-700 mt-1 space-y-0.5 list-disc ml-4">
                  <li>Be specific and clear about what you are asking</li>
                  <li>Include relevant context (age, diagnosis, etc.)</li>
                  <li>Mention what you have already tried</li>
                  <li>Use tags to help others find your question</li>
                </ul>
              </div>
            </div>
          </Card>
        )}

        {/* Title */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-sm font-medium text-gray-700">Title <span className="text-red-500">*</span></Label>
            <span className={`text-xs ${title.length > 200 ? 'text-red-500' : 'text-gray-400'}`}>
              {title.length}/200
            </span>
          </div>
          <Input
            placeholder={getTitlePlaceholder(type)}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title}
          />
        </div>

        {/* Category — dynamic based on type */}
        <div className="mb-6">
          <Label className="text-sm font-medium text-gray-700 mb-1 block">Category <span className="text-red-500">*</span></Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder={type ? 'Select a category' : 'Select a post type first'} />
            </SelectTrigger>
            <SelectContent>
              {currentCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category}</p>}
        </div>

        {/* Content — Markdown editor with toolbar and preview */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-sm font-medium text-gray-700">
              {type === 'CASE_STUDY' ? 'Case Details' : isQuestion ? 'Details' : 'Content'} <span className="text-red-500">*</span>
            </Label>
            <span className={`text-xs ${content.length > 10000 ? 'text-red-500' : 'text-gray-400'}`}>
              {content.length}/10,000 &middot; Markdown supported
            </span>
          </div>

          {isPreview ? (
            <Card className="p-6 min-h-[200px]">
              {content ? (
                <div className="prose prose-sm max-w-none text-gray-700">
                  <Markdown>{content}</Markdown>
                </div>
              ) : (
                <p className="text-gray-400 italic">Nothing to preview yet...</p>
              )}
            </Card>
          ) : (
            <div>
              <MarkdownToolbar textareaRef={textareaRef} content={content} setContent={setContent} />
              <Textarea
                ref={textareaRef}
                placeholder={getContentPlaceholder(type)}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                className={`rounded-t-none ${errors.content ? 'border-red-300 focus-visible:border-red-500 focus-visible:ring-red-500/20' : ''}`}
              />
            </div>
          )}
          {errors.content && <p className="mt-1 text-xs text-red-500">{errors.content}</p>}

          {/* Case study confidentiality warning */}
          {type === 'CASE_STUDY' && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs text-amber-700">
                Remember to remove all identifying information to maintain patient confidentiality. The system will also auto-redact detected PII.
              </p>
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-sm font-medium text-gray-700">Tags <span className="text-red-500">*</span></Label>
            <span className="text-xs text-gray-400">{tags.length}/5</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => (
              <Badge key={tag} color="teal" className="gap-1">
                #{tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:text-teal-900"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder={tags.length >= 5 ? 'Maximum 5 tags reached' : 'Type a tag and press Enter...'}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              disabled={tags.length >= 5}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => addTag(tagInput)}
              disabled={!tagInput.trim() || tags.length >= 5}
              className="px-3"
            >
              Add
            </Button>
          </div>
          {errors.tags && tags.length === 0 && <p className="mt-1 text-xs text-red-500">{errors.tags}</p>}

          {/* AI Tag Suggestions */}
          <div className="mt-3">
            {!aiTagsRequested ? (
              <button
                type="button"
                onClick={handleGetAiTags}
                disabled={content.length < 50}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Get AI Tag Suggestions
              </button>
            ) : suggestTags.isPending ? (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-teal-500 rounded-full animate-spin" />
                Getting suggestions...
              </div>
            ) : suggestedTags.length > 0 ? (
              <div className="p-3 bg-teal-50 rounded-lg">
                <p className="text-xs text-teal-700 font-medium mb-2">AI Suggested Tags — click to add:</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        addTag(tag);
                        setSuggestedTags(suggestedTags.filter((t) => t !== tag));
                      }}
                      disabled={tags.length >= 5}
                      className="text-xs px-2.5 py-1 bg-white border border-teal-200 text-teal-700 rounded-full hover:bg-teal-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            ) : aiTagsRequested && !suggestTags.isPending ? (
              <p className="text-xs text-gray-400">No suggestions available. Try adding more content.</p>
            ) : null}
          </div>
        </div>

        {/* Anonymous Toggle */}
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Post Anonymously</p>
              <p className="text-sm text-gray-500">Your name and profile will be hidden from other users</p>
            </div>
            <Switch
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
            />
          </div>
          {isAnonymous && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
              <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700">
                Anonymous posts can still be moderated. Your identity is hidden from other users but visible to moderators for safety purposes.
              </p>
            </div>
          )}
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            disabled={isMutating}
          >
            Cancel
          </Button>
          {!isQuestion && (
            <Button
              variant="outline"
              onClick={() => handleSubmit(false)}
              disabled={isMutating}
            >
              Save Draft
            </Button>
          )}
          <Button
            onClick={() => handleSubmit(true)}
            disabled={isMutating}
          >
            {isMutating ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isQuestion ? 'Submitting...' : 'Publishing...'}
              </span>
            ) : (
              isQuestion ? 'Submit Question' : 'Publish'
            )}
          </Button>
        </div>
      </div>
    </CommunityShell>
  );
}
