'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@upllyft/ui';
import { Check } from 'lucide-react';
import type { ClinicalSection, ClinicalField } from '@upllyft/types';
import { DynamicField } from './dynamic-field';

/** Field types that read best full-width; everything else pairs 2-up on md+. */
const FULL_WIDTH = new Set(['longtext', 'table', 'smartgoal', 'checklist', 'consent', 'multiselect', 'heading']);

function hasValue(v: unknown): boolean {
  if (v == null || v === '') return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v as object).length > 0;
  return true;
}

/** filled / total (excluding static headings) for a section. */
function sectionProgress(section: ClinicalSection, answers: Record<string, unknown>) {
  const fields = (section.fields ?? []).filter((f) => f.type !== 'heading');
  const filled = fields.filter((f) => hasValue(answers[f.id])).length;
  return { filled, total: fields.length };
}

/** "A. Report identifiers" -> { badge: "A", title: "Report identifiers" } */
function parseTitle(title: string, index: number) {
  const m = title.match(/^([A-Za-z0-9]+)\.\s*(.*)$/);
  if (m) return { badge: m[1].toUpperCase(), title: m[2] };
  return { badge: String.fromCharCode(65 + index), title };
}

interface Props {
  sections: ClinicalSection[];
  answers: Record<string, unknown>;
  onChange: (fieldId: string, value: unknown) => void;
  readOnly?: boolean;
}

export function DynamicForm({ sections, answers, onChange, readOnly }: Props) {
  const [active, setActive] = useState(sections[0]?.id);

  // Scroll-spy: highlight the section nearest the top of the viewport.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id.replace('sec-', ''));
      },
      { rootMargin: '-15% 0px -75% 0px', threshold: 0 },
    );
    sections.forEach((s) => {
      const el = document.getElementById('sec-' + s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  const overall = useMemo(() => {
    let filled = 0, total = 0;
    for (const s of sections) {
      const p = sectionProgress(s, answers);
      filled += p.filled;
      total += p.total;
    }
    return total ? Math.round((filled / total) * 100) : 0;
  }, [sections, answers]);

  const jump = (id: string) => {
    document.getElementById('sec-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActive(id);
  };

  return (
    <div className="lg:grid lg:grid-cols-12 lg:gap-6">
      {/* Section navigator (sticky) */}
      <aside className="hidden lg:block lg:col-span-3">
        <div className="sticky top-20">
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Sections</span>
              <span className="text-xs font-semibold text-teal-600">{overall}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-600 transition-all" style={{ width: `${overall}%` }} />
            </div>
          </div>
          <nav className="space-y-0.5">
            {sections.map((s, i) => {
              const { badge, title } = parseTitle(s.title, i);
              const { filled, total } = sectionProgress(s, answers);
              const done = total > 0 && filled >= total;
              const isActive = active === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => jump(s.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-sm transition-colors ${
                    isActive ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`h-6 w-6 shrink-0 rounded-md flex items-center justify-center text-[11px] font-bold ${
                      done ? 'bg-teal-600 text-white' : isActive ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : badge}
                  </span>
                  <span className="flex-1 truncate">{title}</span>
                  {total > 0 && (
                    <span className={`text-[11px] tabular-nums ${done ? 'text-teal-500' : 'text-gray-400'}`}>{filled}/{total}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Sections */}
      <div className="lg:col-span-9 space-y-5">
        {/* mobile progress */}
        <div className="lg:hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Progress</span>
            <span className="text-xs font-semibold text-teal-600">{overall}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-600 transition-all" style={{ width: `${overall}%` }} />
          </div>
        </div>

        {sections.map((s, i) => {
          const { badge, title } = parseTitle(s.title, i);
          const { filled, total } = sectionProgress(s, answers);
          return (
            <Card key={s.id} id={'sec-' + s.id} className="p-6 scroll-mt-24 border-gray-100">
              <div className="flex items-center gap-3 mb-1 pb-4 border-b border-gray-100">
                <span className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                  {badge}
                </span>
                <div className="flex-1">
                  <h2 className="text-base font-semibold text-gray-900 leading-tight">{title}</h2>
                  {s.description && <p className="text-xs text-gray-400 mt-0.5">{s.description}</p>}
                </div>
                {total > 0 && (
                  <span className="text-xs text-gray-400 tabular-nums shrink-0">{filled}/{total}</span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5 mt-5">
                {s.fields.map((field: ClinicalField) => (
                  <div key={field.id} className={FULL_WIDTH.has(field.type) ? 'md:col-span-2' : ''}>
                    <DynamicField
                      field={field}
                      value={answers[field.id]}
                      onChange={(v) => onChange(field.id, v)}
                      readOnly={readOnly}
                    />
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
