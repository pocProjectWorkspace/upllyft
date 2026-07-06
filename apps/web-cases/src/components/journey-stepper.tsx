'use client';

import { usePathname } from 'next/navigation';
import { Check } from 'lucide-react';

// Linear Care Journey spine. `journeyStage` on the case maps to the current node.
const STAGES = [
  { key: 'INTAKE', label: 'Client Intake', seg: 'intake' },
  { key: 'TRIAGE', label: 'Triage', seg: 'triage' },
  { key: 'CONSULTATION', label: 'Consultation', seg: 'consultation' },
  { key: 'IN_THERAPY', label: 'Sessions', seg: 'sessions' },
  { key: 'IN_ASSESSMENT', label: 'Assessment', seg: 'reviews' },
] as const;

const STAGE_INDEX: Record<string, number> = {
  INTAKE: 0,
  TRIAGE: 1,
  CONSULTATION: 2,
  IN_THERAPY: 3,
  IN_ASSESSMENT: 4,
  DISCHARGED: 5,
};

export function JourneyStepper({
  caseId,
  journeyStage,
}: {
  caseId: string;
  journeyStage?: string;
}) {
  const pathname = usePathname();
  const currentIdx = STAGE_INDEX[journeyStage ?? 'INTAKE'] ?? 0;
  const activeSeg = pathname.split('/').filter(Boolean).pop();

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-1">
      {STAGES.map((s, i) => {
        const done = i < currentIdx;
        const current = i === currentIdx;
        const onThisPage = activeSeg === s.seg;
        return (
          <div key={s.key} className="flex items-center shrink-0">
            <a
              href={`/${caseId}/${s.seg}`}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                onThisPage
                  ? 'bg-teal-600 text-white'
                  : current
                    ? 'bg-teal-50 text-teal-700'
                    : done
                      ? 'text-teal-700 hover:bg-teal-50'
                      : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              <span
                className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                  onThisPage
                    ? 'bg-white/25'
                    : done
                      ? 'bg-teal-600 text-white'
                      : current
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                }`}
              >
                {done ? <Check className="h-2.5 w-2.5" /> : i + 1}
              </span>
              {s.label}
            </a>
            {i < STAGES.length - 1 && (
              <span className={`mx-0.5 h-px w-4 ${done ? 'bg-teal-300' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
