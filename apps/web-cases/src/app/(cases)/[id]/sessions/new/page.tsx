'use client';

import { use } from 'react';
import { CreateSessionForm } from '@/components/create-session-form';

export default function NewSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <CreateSessionForm caseId={id} />;
}
