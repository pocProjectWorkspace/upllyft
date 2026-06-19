"use client";

import { ScrollReveal } from "@/components/ui/ScrollReveal";

const stats = [
  {
    number: "1 in 6",
    label:
      "children has a neurodevelopmental condition that affects daily functioning",
  },
  {
    number: "73%",
    label:
      "of families in the UAE report difficulty accessing consistent specialist therapy",
  },
  {
    number: "18 months",
    label:
      "average wait time from first concern to formal diagnosis in the region",
  },
];

export function ProblemStatement() {
  return (
    <section className="bg-brand-midnight py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 md:grid-cols-3 md:gap-8">
          {stats.map((stat, i) => (
            <ScrollReveal key={stat.number} delay={i * 0.1}>
              <div className="text-center md:text-left">
                <p className="text-6xl font-bold text-brand-teal font-display lg:text-7xl">
                  {stat.number}
                </p>
                <p className="mt-4 text-base leading-relaxed text-white/60 font-body">
                  {stat.label}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.3}>
          <blockquote className="mt-16 max-w-4xl border-l-2 border-brand-teal/40 pl-6 text-lg leading-relaxed text-white/70 font-body sm:text-xl">
            &ldquo;The support system for neurodivergent children is fragmented.
            Clinics work in silos. Parents receive contradictory advice. Schools
            don&rsquo;t communicate with therapists. Upllyft is not trying to fix
            this with an app. We&rsquo;re building the connective tissue the system
            never had.&rdquo;
          </blockquote>
        </ScrollReveal>
      </div>
    </section>
  );
}
