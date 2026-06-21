"use client";

import { Suspense } from "react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import dynamic from "next/dynamic";

const NeuralNetCanvas = dynamic(
  () => import("@/components/three/NeuralNetCanvas"),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0" />,
  }
);

const steps = [
  {
    number: "01",
    title: "Connect",
    description:
      "A child's profile is created. Parents, therapists, and school contacts are linked to one shared, consent-gated record.",
    icon: (
      <svg
        className="h-8 w-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.04a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.343 8.85"
        />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Track",
    description:
      "Session notes, therapy goals, SOAP notes, and daily mood check-ins flow into a unified timeline — visible to every authorised stakeholder.",
    icon: (
      <svg
        className="h-8 w-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
        />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Grow",
    description:
      "Mira, Upllyft's AI layer, surfaces patterns, flags regressions early, and generates plain-language progress summaries for parents who don't have a clinical background.",
    icon: (
      <svg
        className="h-8 w-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
        />
      </svg>
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden bg-brand-cloud py-24 sm:py-32">
      {/* Decorative 3D background */}
      <div className="absolute right-0 top-0 hidden h-full w-1/2 opacity-40 md:block">
        <ErrorBoundary>
          <Suspense fallback={<div />}>
            <NeuralNetCanvas />
          </Suspense>
        </ErrorBoundary>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <ScrollReveal>
          <h2 className="text-4xl font-bold text-brand-midnight font-display sm:text-5xl">
            How it works
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-brand-midnight/60 font-body">
            Three steps to connected care.
          </p>
        </ScrollReveal>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <ScrollReveal key={step.number} delay={i * 0.1}>
              <div className="group rounded-2xl border border-brand-mist bg-white p-8 transition-shadow hover:shadow-xl">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-violet/10 text-brand-violet transition-colors group-hover:bg-brand-violet group-hover:text-white">
                  {step.icon}
                </div>
                <p className="mt-6 text-sm font-medium text-brand-violet/50 font-body">
                  {step.number}
                </p>
                <h3 className="mt-2 text-2xl font-bold text-brand-midnight font-display">
                  {step.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-brand-midnight/60 font-body">
                  {step.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
