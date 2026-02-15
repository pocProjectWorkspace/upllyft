'use client';

import type { FeedDensity } from '@/lib/api/feeds';

interface FeedDensityToggleProps {
  density: FeedDensity;
  onChange: (density: FeedDensity) => void;
}

const densities: { id: FeedDensity; label: string; icon: React.ReactNode }[] = [
  {
    id: 'compact',
    label: 'Compact',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    id: 'comfortable',
    label: 'Comfortable',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
  },
  {
    id: 'spacious',
    label: 'Spacious',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 18h16" />
      </svg>
    ),
  },
];

export function FeedDensityToggle({ density, onChange }: FeedDensityToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
      {densities.map((d) => (
        <button
          key={d.id}
          onClick={() => onChange(d.id)}
          title={d.label}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            density === d.id
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          {d.icon}
          <span className="hidden sm:inline">{d.label}</span>
        </button>
      ))}
    </div>
  );
}
