'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@upllyft/api-client';
import { ListSkeleton } from '@/components/skeletons';
import {
  AUDIENCE_LABELS,
  FaqAnswer,
  type AdminFaqCategory,
  type AdminFaqItem,
  type FaqAudience,
} from '@/help/lib/faq';

const QUERY_KEY = ['admin', 'faq'];
const AUDIENCES = Object.keys(AUDIENCE_LABELS) as FaqAudience[];

type ItemDraft = Pick<AdminFaqItem, 'categoryId' | 'question' | 'answer' | 'slug' | 'published'>;

function errorMessage(error: unknown) {
  const msg = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(msg) ? msg.join(', ') : msg || 'Something went wrong. Please try again.';
}

/**
 * Help Center editor. What is published here appears on the public /help page within
 * five minutes. Answers are plain text: a blank line starts a new paragraph and
 * **double asterisks** make text bold. Items with [placeholders] were seeded as drafts.
 */
export default function AdminFaqPage() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => apiClient.get<AdminFaqCategory[]>('/admin/faq').then((r) => r.data),
  });

  const [editing, setEditing] = useState<{ id: string | null; draft: ItemDraft } | null>(null);
  const [newCategory, setNewCategory] = useState<{ name: string; audience: FaqAudience } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  const onError = (e: unknown) => setError(errorMessage(e));

  const saveItem = useMutation({
    mutationFn: ({ id, draft }: { id: string | null; draft: ItemDraft }) =>
      id ? apiClient.patch(`/admin/faq/items/${id}`, draft) : apiClient.post('/admin/faq/items', draft),
    onSuccess: () => {
      setEditing(null);
      setError(null);
      invalidate();
    },
    onError,
  });

  const togglePublished = useMutation({
    mutationFn: (item: AdminFaqItem) => apiClient.patch(`/admin/faq/items/${item.id}`, { published: !item.published }),
    onSuccess: invalidate,
    onError,
  });

  const moveItem = useMutation({
    mutationFn: ({ a, b }: { a: AdminFaqItem; b: AdminFaqItem }) =>
      Promise.all([
        apiClient.patch(`/admin/faq/items/${a.id}`, { sortOrder: b.sortOrder }),
        apiClient.patch(`/admin/faq/items/${b.id}`, { sortOrder: a.sortOrder }),
      ]),
    onSuccess: invalidate,
    onError,
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/faq/items/${id}`),
    onSuccess: invalidate,
    onError,
  });

  const createCategory = useMutation({
    mutationFn: (body: { name: string; audience: FaqAudience }) => apiClient.post('/admin/faq/categories', body),
    onSuccess: () => {
      setNewCategory(null);
      setError(null);
      invalidate();
    },
    onError,
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; audience?: FaqAudience }) =>
      apiClient.patch(`/admin/faq/categories/${id}`, body),
    onSuccess: invalidate,
    onError,
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/faq/categories/${id}`),
    onSuccess: invalidate,
    onError,
  });

  if (isPending) return <ListSkeleton bare rows={6} />;

  const categories = data ?? [];
  const total = categories.reduce((n, c) => n + c.items.length, 0);
  const drafts = categories.reduce((n, c) => n + c.items.filter((i) => !i.published).length, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Help Center</h1>
          <p className="mt-1 text-sm text-gray-500">
            {total} question{total === 1 ? '' : 's'}, {drafts} draft{drafts === 1 ? '' : 's'}. Published answers appear
            on{' '}
            <a href="/help" target="_blank" rel="noreferrer" className="text-teal-700 hover:underline">
              /help
            </a>{' '}
            within five minutes. In answers, a blank line starts a paragraph, lines starting with &ldquo;- &rdquo; become a list, and **text** is bold.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNewCategory({ name: '', audience: 'PARENT' })}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-teal-400"
        >
          New category
        </button>
      </div>

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {newCategory && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newCategory.name.trim()) createCategory.mutate(newCategory);
          }}
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-teal-100 bg-teal-50/50 p-4"
        >
          <label className="flex-1 min-w-[200px] text-sm">
            <span className="mb-1 block font-medium text-gray-700">Category name</span>
            <input
              autoFocus
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
          <AudienceSelect value={newCategory.audience} onChange={(audience) => setNewCategory({ ...newCategory, audience })} />
          <button
            type="submit"
            disabled={createCategory.isPending || !newCategory.name.trim()}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Add
          </button>
          <button type="button" onClick={() => setNewCategory(null)} className="px-2 py-2 text-sm text-gray-500">
            Cancel
          </button>
        </form>
      )}

      {categories.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <p className="font-medium text-gray-700">No FAQ yet</p>
          <p className="mt-1 text-sm text-gray-500">Add a category to start the Help Center.</p>
        </div>
      )}

      {categories.map((category) => (
        <section key={category.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 bg-gray-50 px-5 py-3">
            <input
              defaultValue={category.name}
              aria-label="Category name"
              onBlur={(e) => {
                const name = e.target.value.trim();
                if (name && name !== category.name) updateCategory.mutate({ id: category.id, name });
              }}
              className="min-w-[180px] flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 font-semibold text-gray-900 hover:border-gray-200 focus:border-teal-400 focus:bg-white focus:outline-none"
            />
            <AudienceSelect
              compact
              value={category.audience}
              onChange={(audience) => updateCategory.mutate({ id: category.id, audience })}
            />
            <button
              type="button"
              onClick={() =>
                setEditing({ id: null, draft: { categoryId: category.id, question: '', answer: '', slug: '', published: false } })
              }
              className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
            >
              Add question
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete "${category.name}" and its ${category.items.length} question(s)?`)) {
                  deleteCategory.mutate(category.id);
                }
              }}
              className="text-xs font-semibold text-red-600 hover:underline"
            >
              Delete
            </button>
          </div>

          {editing && editing.id === null && editing.draft.categoryId === category.id && (
            <ItemForm
              categories={categories}
              draft={editing.draft}
              saving={saveItem.isPending}
              onChange={(draft) => setEditing({ id: null, draft })}
              onCancel={() => setEditing(null)}
              onSave={() => saveItem.mutate(editing)}
            />
          )}

          {category.items.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">No questions in this category.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {category.items.map((item, index) =>
                editing?.id === item.id ? (
                  <li key={item.id}>
                    <ItemForm
                      categories={categories}
                      draft={editing.draft}
                      saving={saveItem.isPending}
                      onChange={(draft) => setEditing({ id: item.id, draft })}
                      onCancel={() => setEditing(null)}
                      onSave={() => saveItem.mutate(editing)}
                    />
                  </li>
                ) : (
                  <li key={item.id} className="flex items-start gap-3 px-5 py-3">
                    <div className="flex flex-col pt-0.5">
                      <button
                        type="button"
                        aria-label="Move up"
                        disabled={index === 0 || moveItem.isPending}
                        onClick={() => moveItem.mutate({ a: item, b: category.items[index - 1] })}
                        className="text-xs text-gray-400 hover:text-teal-600 disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        aria-label="Move down"
                        disabled={index === category.items.length - 1 || moveItem.isPending}
                        onClick={() => moveItem.mutate({ a: item, b: category.items[index + 1] })}
                        className="text-xs text-gray-400 hover:text-teal-600 disabled:opacity-30"
                      >
                        ▼
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-900">{item.question}</span>
                        {!item.published && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Draft</span>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">{item.answer}</p>
                      <p className="mt-0.5 text-xs text-gray-400">/help#{item.slug}</p>
                    </div>
                    <div className="flex flex-none items-center gap-3 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => togglePublished.mutate(item)}
                        className={item.published ? 'text-gray-500 hover:underline' : 'text-teal-700 hover:underline'}
                      >
                        {item.published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEditing({
                            id: item.id,
                            draft: {
                              categoryId: item.categoryId,
                              question: item.question,
                              answer: item.answer,
                              slug: item.slug,
                              published: item.published,
                            },
                          })
                        }
                        className="text-gray-700 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete "${item.question}"?`)) deleteItem.mutate(item.id);
                        }}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ),
              )}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

function AudienceSelect({
  value,
  onChange,
  compact = false,
}: {
  value: FaqAudience;
  onChange: (audience: FaqAudience) => void;
  compact?: boolean;
}) {
  const select = (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as FaqAudience)}
      aria-label="Audience"
      className={`rounded-lg border border-gray-200 bg-white ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'}`}
    >
      {AUDIENCES.map((a) => (
        <option key={a} value={a}>
          {AUDIENCE_LABELS[a]}
        </option>
      ))}
    </select>
  );
  if (compact) return select;
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium text-gray-700">Shown to</span>
      {select}
    </label>
  );
}

function ItemForm({
  categories,
  draft,
  saving,
  onChange,
  onCancel,
  onSave,
}: {
  categories: AdminFaqCategory[];
  draft: ItemDraft;
  saving: boolean;
  onChange: (draft: ItemDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const valid = draft.question.trim() && draft.answer.trim();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave();
      }}
      className="space-y-3 bg-teal-50/40 px-5 py-4"
    >
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-gray-700">Question</span>
        <input
          autoFocus
          value={draft.question}
          maxLength={300}
          onChange={(e) => onChange({ ...draft, question: e.target.value })}
          className="w-full rounded-lg border border-gray-200 px-3 py-2"
        />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Answer</span>
          <textarea
            value={draft.answer}
            maxLength={5000}
            rows={7}
            onChange={(e) => onChange({ ...draft, answer: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2"
          />
        </label>
        <div className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Preview</span>
          <div className="min-h-[9.5rem] rounded-lg border border-gray-100 bg-white px-3 py-2 text-gray-600">
            {draft.answer.trim() ? <FaqAnswer text={draft.answer} /> : <span className="text-gray-400">Nothing yet</span>}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Category</span>
          <select
            value={draft.categoryId}
            onChange={(e) => onChange({ ...draft, categoryId: e.target.value })}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Link name (optional)</span>
          <input
            value={draft.slug}
            maxLength={60}
            placeholder="made from the question"
            onChange={(e) => onChange({ ...draft, slug: e.target.value })}
            className="rounded-lg border border-gray-200 px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(e) => onChange({ ...draft, published: e.target.checked })}
          />
          Published
        </label>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-gray-500">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!valid || saving}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </form>
  );
}
