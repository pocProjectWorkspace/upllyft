import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
}

export function Card({ children, hover = false, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${
        hover ? 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
