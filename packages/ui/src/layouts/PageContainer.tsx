import type { ReactNode } from 'react';

export interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 py-6 ${className}`}>
      {children}
    </div>
  );
}
