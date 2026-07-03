'use client';

import { use, useState } from 'react';
import { Card } from '@upllyft/ui';
import { FileText, ClipboardList } from 'lucide-react';
import { CreateSessionForm } from '@/components/create-session-form';
import { TemplatedSessionForm } from '@/components/clinical/templated-session-form';

export default function NewSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [mode, setMode] = useState<'choose' | 'soap' | 'template'>('choose');

  if (mode === 'soap') return <CreateSessionForm caseId={id} />;
  if (mode === 'template') return <TemplatedSessionForm caseId={id} />;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">New session note</h1>
      <p className="text-gray-500 mb-6">How would you like to document this session?</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <Card
          className="p-5 cursor-pointer hover:shadow-md hover:border-teal-300 transition"
          onClick={() => setMode('soap')}
        >
          <FileText className="h-6 w-6 text-teal-600 mb-2" />
          <p className="font-semibold text-gray-900">Quick SOAP note</p>
          <p className="text-sm text-gray-500">Fast, free-text S/O/A/P with goal progress and AI scribe.</p>
        </Card>
        <Card
          className="p-5 cursor-pointer hover:shadow-md hover:border-teal-300 transition"
          onClick={() => setMode('template')}
        >
          <ClipboardList className="h-6 w-6 text-teal-600 mb-2" />
          <p className="font-semibold text-gray-900">Discipline template</p>
          <p className="text-sm text-gray-500">Structured session-note template (Speech, OT, ABA, Psychology, …).</p>
        </Card>
      </div>
    </div>
  );
}
