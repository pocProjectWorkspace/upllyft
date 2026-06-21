"use client";

import { ScrollReveal } from "@/components/ui/ScrollReveal";

export function TrustBar() {
  return (
    <section className="border-y border-brand-mist bg-brand-cloud">
      <ScrollReveal>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-4 px-6 py-6 text-center sm:flex-row sm:gap-6">
          <span className="text-sm font-medium text-brand-violet/60 font-body">
            In partnership with
          </span>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-violet/10">
              <svg
                className="h-4 w-4 text-brand-violet"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                />
              </svg>
            </div>
            <span className="text-base font-semibold text-brand-violet font-body">
              Al Noor Training Centre for Persons with Disabilities
            </span>
          </div>
          <span className="hidden h-4 w-px bg-brand-violet/20 sm:block" />
          <span className="text-sm text-brand-violet/50 font-body">
            Built for MENA. Designed for every child.
          </span>
        </div>
      </ScrollReveal>
    </section>
  );
}
