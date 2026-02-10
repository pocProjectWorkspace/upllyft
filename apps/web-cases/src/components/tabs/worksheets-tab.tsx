'use client';

import { useCaseWorksheets } from '@/hooks/use-cases';
import { formatDate } from '@/lib/utils';
import { APP_URLS } from '@upllyft/api-client';
import { Card, Badge, Skeleton } from '@upllyft/ui';
import { BookOpen, Download, ExternalLink } from 'lucide-react';

const subTypeLabels: Record<string, string> = {
  fine_motor: 'Fine Motor',
  gross_motor: 'Gross Motor',
  social_skills: 'Social Skills',
  communication: 'Communication',
  cognitive: 'Cognitive',
  sensory: 'Sensory',
  daily_living: 'Daily Living',
  visual_schedule: 'Visual Schedule',
  social_story: 'Social Story',
  emotion_thermometer: 'Emotion Thermometer',
  weekly_plan: 'Weekly Plan',
  daily_routine: 'Daily Routine',
};

const typeColors: Record<string, string> = {
  ACTIVITY: 'blue',
  VISUAL_SUPPORT: 'purple',
  STRUCTURED_PLAN: 'green',
};

export function WorksheetsTab({ caseId }: { caseId: string }) {
  const { data: worksheets, isLoading } = useCaseWorksheets(caseId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  const items = Array.isArray(worksheets) ? worksheets : [];

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <h3 className="text-base font-medium text-gray-900 mb-1">No worksheets linked</h3>
        <p className="text-sm text-gray-500 mb-4">
          Worksheets assigned to this case will appear here.
        </p>
        <a
          href={APP_URLS.resources}
          className="text-sm text-teal-600 hover:text-teal-700 font-medium inline-flex items-center gap-1"
        >
          Go to Learning Resources <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Worksheets ({items.length})
      </h2>
      <div className="space-y-3">
        {items.map((w: Record<string, unknown>) => {
          const wId = typeof w.id === 'string' ? w.id : String(w.id);
          const title = typeof w.title === 'string' ? w.title : 'Untitled';
          const type = typeof w.type === 'string' ? w.type : '';
          const subType = typeof w.subType === 'string' ? w.subType : '';
          const status = typeof w.status === 'string' ? w.status : '';
          const pdfUrl = typeof w.pdfUrl === 'string' ? w.pdfUrl : null;
          const createdAt = typeof w.createdAt === 'string' ? w.createdAt : '';
          const difficulty = typeof w.difficulty === 'string' ? w.difficulty : '';

          return (
            <Card key={wId} className="p-4 border border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900">{title}</h3>
                    <Badge color={typeColors[type] ?? 'gray'}>
                      {type.replace('_', ' ')}
                    </Badge>
                    {subType && (
                      <Badge color="gray">
                        {subTypeLabels[subType] ?? subType}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {difficulty && <span>{difficulty}</span>}
                    <span>{formatDate(createdAt)}</span>
                    {status === 'PUBLISHED' && (
                      <span className="text-green-600">Published</span>
                    )}
                  </div>
                </div>
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-teal-600 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
