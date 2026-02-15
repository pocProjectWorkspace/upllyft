'use client';

import { useAuth, APP_URLS } from '@upllyft/api-client';
import { AppHeader, Avatar, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useToast } from '@upllyft/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPost, type CreatePostDto } from '@/lib/api/posts';
import { PersonalizedFeed } from '@/components/feed/personalized-feed';

const sidebarNav = [
  {
    label: 'Feed',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    ),
    active: true,
    href: '/feed',
  },
  {
    label: 'Groups',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    active: false,
    href: `${APP_URLS.community}/groups`,
  },
  {
    label: 'Events',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    active: false,
    href: `${APP_URLS.community}/events`,
  },
  {
    label: 'Q&A',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    active: false,
    href: `${APP_URLS.community}/questions`,
  },
  {
    label: 'Saved',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    ),
    active: false,
    href: '/feed?view=saved',
  },
];

const myGroups = [
  { name: 'Speech Therapy Parents', initial: 'S', bgColor: 'bg-blue-100', textColor: 'text-blue-600' },
  { name: 'ASD Support Circle', initial: 'A', bgColor: 'bg-purple-100', textColor: 'text-purple-600' },
  { name: 'Sensory Play Ideas', initial: 'S', bgColor: 'bg-green-100', textColor: 'text-green-600' },
];

const suggestedGroups = [
  { name: 'OT Activities at Home', initial: 'O', bgColor: 'bg-teal-100', textColor: 'text-teal-600', members: '1.2k' },
  { name: 'Sensory Play Ideas', initial: 'S', bgColor: 'bg-purple-100', textColor: 'text-purple-600', members: '856' },
];

const trendingTopics = [
  { tag: '#SensoryPlayIdeas', count: '45 posts this week' },
  { tag: '#SpeechTherapyWins', count: '32 posts this week' },
  { tag: '#InclusiveEducation', count: '28 posts this week' },
];

const POST_CATEGORIES = [
  'General', 'Autism Spectrum', 'ADHD', 'Speech & Language',
  'Occupational Therapy', 'Sensory Processing', 'Behavioral',
  'Education', 'Parenting Tips', 'Success Stories',
];

export default function FeedPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create post modal state
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState<CreatePostDto['type']>('DISCUSSION');
  const [postCategory, setPostCategory] = useState('General');
  const [postTags, setPostTags] = useState('');
  const [postAnonymous, setPostAnonymous] = useState(false);

  const createPostMutation = useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      toast({ title: 'Post created', description: 'Your post has been published' });
      setShowCreatePost(false);
      setPostTitle('');
      setPostContent('');
      setPostType('DISCUSSION');
      setPostCategory('General');
      setPostTags('');
      setPostAnonymous(false);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to create post',
        variant: 'destructive',
      });
    },
  });

  function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) return;
    createPostMutation.mutate({
      title: postTitle.trim(),
      content: postContent.trim(),
      type: postType,
      category: postCategory,
      tags: postTags.split(',').map((t) => t.trim()).filter(Boolean),
      isAnonymous: postAnonymous,
    });
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    router.replace('/login');
    return null;
  }

  const displayName = user.name || user.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader currentApp="main" />

      <div className="flex">
        {/* Left Sidebar */}
        <aside className="hidden lg:block w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-64px)] sticky top-16">
          <div className="p-4">
            <button
              className="w-full py-3 bg-gradient-to-br from-pink-500 to-pink-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90 transition"
              onClick={() => setShowCreatePost(true)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Post
            </button>
          </div>

          <nav className="px-2">
            {sidebarNav.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-r-lg ${
                  item.active
                    ? 'font-medium text-gray-900 border-l-[3px] border-teal-600'
                    : 'text-gray-600 hover:bg-gray-50 rounded-lg'
                }`}
                style={item.active ? {
                  background: 'linear-gradient(90deg, rgba(13, 148, 136, 0.1) 0%, transparent 100%)',
                } : undefined}
              >
                <span className={item.active ? 'text-pink-600' : ''}>{item.icon}</span>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="p-4 mt-4">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">My Groups</h4>
            <div className="space-y-2">
              {myGroups.map((group) => (
                <a key={group.name} href={`${APP_URLS.community}/groups`} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                  <div className={`w-8 h-8 ${group.bgColor} rounded-lg flex items-center justify-center`}>
                    <span className={`${group.textColor} text-xs font-bold`}>{group.initial}</span>
                  </div>
                  <span className="text-sm text-gray-700">{group.name}</span>
                </a>
              ))}
            </div>
          </div>
        </aside>

        {/* Center Content */}
        <div className="flex-1 max-w-2xl mx-auto px-4 py-6">
          {/* Create Post Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-3">
              <Avatar name={displayName} src={user.avatar || undefined} size="sm" />
              <input
                type="text"
                placeholder="Share something with the community..."
                className="flex-1 bg-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer"
                onClick={() => setShowCreatePost(true)}
                readOnly
              />
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => { setPostType('DISCUSSION'); setShowCreatePost(true); }}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
              >
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Photo
              </button>
              <button
                onClick={() => { setPostType('QUESTION'); setShowCreatePost(true); }}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
              >
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Question
              </button>
              <button
                onClick={() => { setPostType('RESOURCE'); setShowCreatePost(true); }}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
              >
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Resource
              </button>
            </div>
          </div>

          {/* Create Post Modal */}
          {showCreatePost && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">Create Post</h2>
                  <button
                    onClick={() => setShowCreatePost(false)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <form onSubmit={handleCreatePost} className="p-4 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar name={displayName} src={user.avatar || undefined} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {postAnonymous ? 'Anonymous' : displayName}
                      </p>
                      <p className="text-xs text-gray-500">Posting as {postAnonymous ? 'anonymous' : user.role?.toLowerCase()}</p>
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      placeholder="Post title..."
                      required
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                    />
                  </div>

                  <div>
                    <textarea
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      placeholder="What's on your mind? Share your thoughts, questions, or experiences..."
                      required
                      rows={5}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <Select value={postType} onValueChange={(v) => setPostType(v as CreatePostDto['type'])}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DISCUSSION">Discussion</SelectItem>
                          <SelectItem value="QUESTION">Question</SelectItem>
                          <SelectItem value="RESOURCE">Resource</SelectItem>
                          <SelectItem value="CASE_STUDY">Case Study</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <Select value={postCategory} onValueChange={setPostCategory}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {POST_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                    <input
                      type="text"
                      value={postTags}
                      onChange={(e) => setPostTags(e.target.value)}
                      placeholder="autism, sensory, tips (comma-separated)"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={postAnonymous}
                      onChange={(e) => setPostAnonymous(e.target.checked)}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-600">Post anonymously</span>
                  </label>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreatePost(false)}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createPostMutation.isPending || !postTitle.trim() || !postContent.trim()}
                      className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-6 py-2 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {createPostMutation.isPending ? 'Publishing...' : 'Publish'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Personalized Feed */}
          <PersonalizedFeed
            isAuthenticated={isAuthenticated}
            categories={POST_CATEGORIES}
          />
        </div>

        {/* Right Sidebar */}
        <aside className="hidden xl:block w-80 p-6">
          {/* Suggested Groups */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Suggested Groups</h3>
            <div className="space-y-3">
              {suggestedGroups.map((group) => (
                <div key={group.name} className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${group.bgColor} rounded-lg flex items-center justify-center`}>
                    <span className={`${group.textColor} font-bold`}>{group.initial}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{group.name}</p>
                    <p className="text-xs text-gray-500">{group.members} members</p>
                  </div>
                  <button className="px-3 py-1 bg-teal-100 text-teal-700 text-xs font-medium rounded-full hover:bg-teal-200">
                    Join
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Trending Topics */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Trending Topics</h3>
            <div className="space-y-2">
              {trendingTopics.map((topic) => (
                <a key={topic.tag} href="#" className="block p-2 hover:bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-900">{topic.tag}</p>
                  <p className="text-xs text-gray-500">{topic.count}</p>
                </a>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
