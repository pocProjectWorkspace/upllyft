'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  Switch,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@upllyft/ui';
import { CommunityShell } from '@/components/community-shell';
import { useCreateQuestion } from '@/hooks/use-questions';

const CATEGORIES = [
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
];

export default function AskQuestionPage() {
  const router = useRouter();
  const createQuestion = useCreateQuestion();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (title.length < 10) newErrors.title = 'Title must be at least 10 characters';
    if (content.length < 20) newErrors.content = 'Content must be at least 20 characters';
    if (!category) newErrors.category = 'Please select a category';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;

    createQuestion.mutate(
      {
        title,
        content,
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
          <h1 className="text-2xl font-bold text-gray-900">Ask a Question</h1>
          <p className="text-gray-500 mt-1">Get help from parents, therapists, and educators in the community</p>
        </div>

        {/* Tips Card */}
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

        {/* Title */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-sm font-medium text-gray-700">Title</Label>
            <span className={`text-xs ${title.length > 0 && title.length < 10 ? 'text-red-500' : 'text-gray-400'}`}>
              {title.length} characters
            </span>
          </div>
          <Input
            placeholder="What is your question? Be specific..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title}
          />
        </div>

        {/* Content */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-sm font-medium text-gray-700">Details</Label>
            <span className={`text-xs ${content.length > 0 && content.length < 20 ? 'text-red-500' : 'text-gray-400'}`}>
              {content.length} characters
            </span>
          </div>
          <Textarea
            placeholder="Provide more details about your question. Markdown is supported..."
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
              <p className="font-medium text-gray-900">Ask Anonymously</p>
              <p className="text-sm text-gray-500">Your name and profile will be hidden</p>
            </div>
            <Switch
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
            />
          </div>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createQuestion.isPending}>
            {createQuestion.isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Submit Question
              </span>
            )}
          </Button>
        </div>
      </div>
    </CommunityShell>
  );
}
