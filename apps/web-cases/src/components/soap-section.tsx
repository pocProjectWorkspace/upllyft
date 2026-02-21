'use client';

import { useState } from 'react';
import { Button } from '@upllyft/ui';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface SOAPSectionProps {
  letter: 'S' | 'O' | 'A' | 'P';
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const letterColors: Record<string, string> = {
  S: 'bg-blue-100 text-blue-700',
  O: 'bg-emerald-100 text-emerald-700',
  A: 'bg-amber-100 text-amber-700',
  P: 'bg-purple-100 text-purple-700',
};

export function SOAPSection({ letter, title, defaultOpen = true, children }: SOAPSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span
            className={`h-7 w-7 rounded-md flex items-center justify-center text-sm font-bold ${letterColors[letter]}`}
          >
            {letter}
          </span>
          <span className="font-medium text-gray-900">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-gray-400 hover:text-teal-600"
            onClick={(e) => {
              e.stopPropagation();
              // Placeholder for future Mira integration
            }}
            disabled
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Generate with Mira
          </Button>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>
      {isOpen && <div className="p-4">{children}</div>}
    </div>
  );
}
