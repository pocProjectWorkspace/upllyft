"use client";

import { ScrollReveal } from "@/components/ui/ScrollReveal";

const beliefs = [
  {
    icon: (
      <svg className="h-8 w-8 text-brand-violet" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
    text: "Neurodivergent children are not broken. The system around them is. We're fixing the system.",
  },
  {
    icon: (
      <svg className="h-8 w-8 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    text: "MENA has 650 million people and almost no scaled neurodevelopmental tech. That changes now.",
  },
  {
    icon: (
      <svg className="h-8 w-8 text-brand-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    text: "Families trust us with the most sensitive information they have. We earn that trust through consent-first architecture, not just policy.",
  },
];

export function Vision() {
  return (
    <section id="vision" className="bg-brand-cloud py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal>
          <h2 className="max-w-3xl text-4xl font-bold leading-tight text-brand-midnight font-display sm:text-5xl lg:text-6xl">
            One platform.
            <br />
            Every child. Every stakeholder.
            <br />
            Every step of the journey.
          </h2>
        </ScrollReveal>

        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {beliefs.map((belief, i) => (
            <ScrollReveal key={i} delay={i * 0.1}>
              <div className="rounded-2xl border border-brand-mist bg-white p-8">
                <div className="mb-6">{belief.icon}</div>
                <p className="text-lg leading-relaxed text-brand-midnight/80 font-body">
                  {belief.text}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.4}>
          <blockquote className="mt-20 max-w-4xl text-center mx-auto">
            <p className="text-2xl leading-relaxed text-brand-midnight/80 font-display italic sm:text-3xl">
              &ldquo;We are not building an app. We are building the
              infrastructure that a generation of children — and the
              professionals who care for them — have never had access
              to.&rdquo;
            </p>
          </blockquote>
        </ScrollReveal>
      </div>
    </section>
  );
}
