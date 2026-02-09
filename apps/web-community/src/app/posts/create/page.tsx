'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
} from '@upllyft/ui';
import { CommunityShell } from '@/components/community-shell';
import { useCreatePost } from '@/hooks/use-posts';
import type { CreatePostDto } from '@/lib/api/posts';

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
    description: 'Ask the community for help or advice',
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

const CATEGORIES = [
  'General',
  'Therapy',
  'Education',
  'Parenting',
  'Medical',
  'Resources',
  'Support',
  'Research',
];

export default function CreatePostPage() {
  const router = useRouter();
  const createPost = useCreatePost();

  const [type, setType] = useState<CreatePostDto['type'] | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!type) newErrors.type = 'Please select a post type';
    if (title.length < 10) newErrors.title = 'Title must be at least 10 characters';
    if (title.length > 200) newErrors.title = 'Title must be less than 200 characters';
    if (content.length < 50) newErrors.content = 'Content must be at least 50 characters';
    if (content.length > 10000) newErrors.content = 'Content must be less than 10,000 characters';
    if (!category) newErrors.category = 'Please select a category';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(published: boolean) {
    if (!validate() || !type) return;

    createPost.mutate(
      {
        title,
        content,
        type,
        category,
        tags,
        isAnonymous,
        published,
      },
      {
        onSuccess: (post) => {
          router.push(`/posts/${post.id}`);
        },
      },
    );
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase();
      if (tag && !tags.includes(tag) && tags.length < 5) {
        setTags([...tags, tag]);
        setTagInput('');
      }
    }
  }

  function removeTag(tagToRemove: string) {
    setTags(tags.filter((t) => t !== tagToRemove));
  }

  return (
    <CommunityShell>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Create a Post</h1>
          <p className="text-gray-500 mt-1">Share your thoughts, questions, or resources with the community</p>
        </div>

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

        {/* Title */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-sm font-medium text-gray-700">Title</Label>
            <span className={`text-xs ${title.length > 200 ? 'text-red-500' : 'text-gray-400'}`}>
              {title.length}/200
            </span>
          </div>
          <Input
            placeholder="Give your post a descriptive title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title}
          />
        </div>

        {/* Content */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-sm font-medium text-gray-700">Content</Label>
            <span className={`text-xs ${content.length > 10000 ? 'text-red-500' : 'text-gray-400'}`}>
              {content.length}/10,000
            </span>
          </div>
          <Textarea
            placeholder="Write your post content here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className={errors.content ? 'border-red-300 focus-visible:border-red-500 focus-visible:ring-red-500/20' : ''}
          />
          {errors.content && <p className="mt-1 text-xs text-red-500">{errors.content}</p>}
        </div>

        {/* Category */}
        <div className="mb-6">
          <Label className="text-sm font-medium text-gray-700 mb-1 block">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category}</p>}
        </div>

        {/* Tags */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-sm font-medium text-gray-700">Tags</Label>
            <span className="text-xs text-gray-400">{tags.length}/5</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => (
              <Badge key={tag} color="teal" className="gap-1">
                {tag}
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
          <Input
            placeholder={tags.length >= 5 ? 'Maximum 5 tags reached' : 'Type a tag and press Enter...'}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            disabled={tags.length >= 5}
          />
        </div>

        {/* Anonymous Toggle */}
        <Card className="p-4 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Post Anonymously</p>
              <p className="text-sm text-gray-500">Your name and profile will be hidden</p>
            </div>
            <Switch
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
            />
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => handleSubmit(false)}
            disabled={createPost.isPending}
          >
            Save Draft
          </Button>
          <Button
            onClick={() => handleSubmit(true)}
            disabled={createPost.isPending}
          >
            {createPost.isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Publishing...
              </span>
            ) : (
              'Publish'
            )}
          </Button>
        </div>
      </div>
    </CommunityShell>
  );
}
