'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/use-cases';
import { SessionNoteForm } from '@/components/create-session-form';
import { Skeleton } from '@upllyft/ui';

export default function EditSessionPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id: caseId, sessionId } = use(params);
  const router = useRouter();
  const { data: session, isLoading } = useSession(caseId, sessionId);

  // Redirect to detail view if session is already signed
  useEffect(() => {
    if (session && session.noteStatus === 'SIGNED') {
      router.replace(`/${caseId}/sessions/${sessionId}`);
    }
  }, [session, caseId, sessionId, router]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Session not found</p>
      </div>
    );
  }

  if (session.noteStatus === 'SIGNED') {
    return null; // Will redirect via useEffect
  }

  return (
    <SessionNoteForm
      caseId={caseId}
      sessionId={sessionId}
      initialData={session}
    />
  );
}
