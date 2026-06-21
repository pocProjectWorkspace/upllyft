"use client";

import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  color?: "violet" | "teal" | "gold" | "muted";
}

export function Badge({ children, className, color = "violet" }: BadgeProps) {
  const colors = {
    violet: "bg-brand-violet/20 text-brand-violet border-brand-violet/30",
    teal: "bg-brand-teal/20 text-brand-teal border-brand-teal/30",
    gold: "bg-brand-gold/20 text-brand-gold border-brand-gold/30",
    muted: "bg-white/10 text-brand-gold border-brand-gold/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium font-body",
        colors[color],
        className
      )}
    >
      {children}
    </span>
  );
}
