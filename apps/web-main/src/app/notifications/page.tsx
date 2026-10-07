'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  deleteNotification,
  getNotifications,
  markAllAsRead,
  markAsRead,
  useRequireAuth,
  type Notification,
} from '@upllyft/api-client';
import { Skeleton } from '@upllyft/ui';

type Filter = 'all' | 'unread';

function when(date: string) {
  const d = new Date(date);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days} d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Every notification, newest first — the bell's "View all". */
export default function NotificationsPage() {
  const { isReady } = useRequireAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');

  const query = useInfiniteQuery({
    queryKey: ['notifications', 'page', filter],
    queryFn: ({ pageParam }) => getNotifications({ page: pageParam, limit: 20, filter }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    enabled: isReady,
  });
  const items = query.data?.pages.flatMap((p) => p.data) ?? [];

  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  const readOne = useMutation({ mutationFn: markAsRead, onSettled: refresh });
  const readAll = useMutation({ mutationFn: markAllAsRead, onSettled: refresh });
  const remove = useMutation({ mutationFn: deleteNotification, onSettled: refresh });

  const open = (n: Notification) => {
    if (!n.read) readOne.mutate(n.id);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-1 text-sm text-gray-500">
            Choose which ones also arrive by email in{' '}
            <Link href="/settings?tab=notifications" className="font-medium text-teal-700 hover:underline">
              Settings
            </Link>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={() => readAll.mutate()}
          disabled={readAll.isPending}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-teal-300 disabled:opacity-50"
        >
          Mark all as read
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              filter === f ? 'bg-teal-600 text-white' : 'border border-gray-200 bg-white text-gray-700 hover:border-teal-300'
            }`}
          >
            {f === 'all' ? 'All' : 'Unread'}
          </button>
        ))}
      </div>

      {query.isLoading || !isReady ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
          <p className="font-semibold text-gray-900">{filter === 'unread' ? 'You’re all caught up' : 'No notifications yet'}</p>
          <p className="mt-1 text-sm text-gray-500">New activity, assignments and reminders will show up here.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const body = (
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${n.read ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>{n.title}</p>
                <p className="mt-0.5 text-sm text-gray-500">{n.message}</p>
                <p className="mt-1 text-xs text-gray-400">{when(n.createdAt)}</p>
              </div>
            );
            return (
              <li
                key={n.id}
                className={`flex items-start gap-3 rounded-2xl border p-4 ${n.read ? 'border-gray-100 bg-white' : 'border-teal-100 bg-teal-50/50'}`}
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-teal-500'}`} />
                {n.actionUrl ? (
                  <Link href={n.actionUrl} onClick={() => open(n)} className="flex min-w-0 flex-1 hover:opacity-80">
                    {body}
                  </Link>
                ) : (
                  <button type="button" onClick={() => open(n)} className="flex min-w-0 flex-1 text-left">
                    {body}
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Delete notification"
                  onClick={() => remove.mutate(n.id)}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-red-600"
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {query.hasNextPage && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
            className="text-sm font-semibold text-teal-700 hover:underline disabled:opacity-50"
          >
            {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
