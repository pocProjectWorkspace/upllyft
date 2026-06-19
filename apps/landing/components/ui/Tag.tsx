"use client";

import { cn } from "@/lib/utils";

interface TagProps {
  children: React.ReactNode;
  className?: string;
}

export function Tag({ children, className }: TagProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full bg-brand-mist px-3 py-1 text-xs font-medium text-brand-violet",
        className
      )}
    >
      {children}
    </span>
  );
}
