import type { ReactNode } from 'react';

const colorMap = {
  teal: 'bg-teal-100 text-teal-700',
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  gray: 'bg-gray-100 text-gray-700',
} as const;

export interface BadgeProps {
  children: ReactNode;
  color?: keyof typeof colorMap;
  className?: string;
}

export function Badge({ children, color = 'teal', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorMap[color]} ${className}`}
    >
      {children}
    </span>
  );
}
