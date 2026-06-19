'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRequireAuth } from '@upllyft/api-client';
import { Card, Badge, Button, Skeleton } from '@upllyft/ui';
import { useRouter } from 'next/navigation';
import { getMyProfile } from '@/lib/api/profiles';
import {
  getPreVisitTasks,
  updatePreVisitTask,
  getMySharedDocuments,
  type PreVisitTask,
} from '@/lib/api/care';

const TASK_COLOR: Record<string, string> = {
  PENDING: 'yellow',
  IN_PROGRESS: 'blue',
  COMPLETE: 'green',
  WAIVED: 'gray',
};

export default function CarePage() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const router = useRouter();

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['care', 'profile'],
    queryFn: getMyProfile,
    enabled: isReady && isAuthenticated,
  });
  const { data: docs, isLoading: loadingDocs } = useQuery({
    queryKey: ['care', 'shared-documents'],
    queryFn: getMySharedDocuments,
    enabled: isReady && isAuthenticated,
  });

  const children = (profile as any)?.children ?? [];

  if (!isReady) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button onClick={() => router.push('/')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 text-sm">
        <span aria-hidden>&larr;</span> Back to dashboard
      </button>

      <h1 className="text-2xl font-semibold text-gray-900">Your care portal</h1>
      <p className="text-sm text-gray-500 mb-6">Pre-visit tasks and reports shared with you.</p>

      {/* Pre-visit checklists */}
      <section className="space-y-4 mb-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          Pre-visit checklist
        </h2>
        {loadingProfile ? (
          <Skeleton className="h-24 w-full" />
        ) : !children.length ? (
          <Card className="p-6 text-center text-sm text-gray-500">No children on your profile yet.</Card>
        ) : (
          children.map((child: any) => (
            <ChildPreVisit key={child.id} childId={child.id} childName={child.name || child.firstName || 'Child'} />
          ))
        )}
      </section>

      {/* Shared reports */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          My reports
        </h2>
        {loadingDocs ? (
          <Skeleton className="h-20 w-full" />
        ) : !docs?.length ? (
          <Card className="p-6 text-center text-sm text-gray-500">No reports have been shared with you yet.</Card>
        ) : (
          <div className="space-y-2">
            {docs.map((d) => {
              const title = d.document?.title || d.title || 'Report';
              return (
                <Card key={d.id} className="p-4 flex items-center gap-3">
                  <span className="font-medium text-gray-900">{title}</span>
                  {d.document?.type && <Badge color={'gray' as any}>{d.document.type}</Badge>}
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function ChildPreVisit({ childId, childName }: { childId: string; childName: string }) {
  const qc = useQueryClient();
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['care', 'previsit', childId],
    queryFn: () => getPreVisitTasks(childId),
  });
  const complete = useMutation({
    mutationFn: (taskId: string) => updatePreVisitTask(childId, taskId, 'COMPLETE'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['care', 'previsit', childId] }),
  });

  return (
    <Card className="p-5">
      <h3 className="font-semibold text-gray-900 mb-3">{childName}</h3>
      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : !tasks?.length ? (
        <p className="text-sm text-gray-500">No pending tasks.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t: PreVisitTask) => (
            <li key={t.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge color={(TASK_COLOR[t.status] || 'gray') as any}>{t.status}</Badge>
                <span className="text-sm text-gray-800">{t.label}</span>
              </div>
              {t.status !== 'COMPLETE' && t.status !== 'WAIVED' && (
                <Button size="sm" variant="outline" disabled={complete.isPending} onClick={() => complete.mutate(t.id)}>
                  Mark done
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
