import type { ReactNode } from 'react';
import { Card } from './Card';

export interface StatCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  trend?: { value: number; isPositive: boolean };
  className?: string;
}

export function StatCard({ icon, value, label, trend, className = '' }: StatCardProps) {
  return (
    <Card className={`p-5 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="p-2 bg-teal-50 rounded-xl text-teal-600">{icon}</div>
        {trend && (
          <span
            className={`text-xs font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}
          >
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </Card>
  );
}
