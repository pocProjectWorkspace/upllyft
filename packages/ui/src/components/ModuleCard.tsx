import type { ReactNode } from 'react';
import { Card } from './Card';

export interface ModuleCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  href: string;
  gradient: string;
  className?: string;
}

export function ModuleCard({
  icon,
  title,
  description,
  href,
  gradient,
  className = '',
}: ModuleCardProps) {
  return (
    <Card hover className={`p-6 group ${className}`}>
      <a href={href} className="block">
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-4`}
        >
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">
          {title}
        </h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </a>
    </Card>
  );
}
