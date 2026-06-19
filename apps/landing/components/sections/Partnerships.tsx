"use client";

import { Suspense, useState } from "react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import * as Dialog from "@radix-ui/react-dialog";
import dynamic from "next/dynamic";

const GlobeCanvas = dynamic(() => import("@/components/three/GlobeCanvas"), {
  ssr: false,
  loading: () => <div className="absolute inset-0" />,
});

const futurePartners = [
  { type: "Hospital", label: "Rehabilitation Hospital" },
  { type: "Ministry", label: "Government Programme" },
  { type: "School Network", label: "School Network" },
];

export function Partnerships() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <section id="partnerships" className="relative overflow-hidden bg-brand-midnight py-24 sm:py-32">
      {/* Globe background */}
      <div className="absolute inset-0 hidden opacity-30 md:block">
        <ErrorBoundary>
          <Suspense fallback={<div />}>
            <GlobeCanvas />
          </Suspense>
        </ErrorBoundary>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <ScrollReveal>
          <h2 className="text-4xl font-bold text-white font-display sm:text-5xl">
            Built for the region. Open to the world.
          </h2>
        </ScrollReveal>

        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          {/* Al Noor card */}
          <ScrollReveal delay={0.1}>
            <div className="rounded-2xl border border-brand-gold/20 bg-white/5 p-8 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gold/20">
                  <svg
                    className="h-6 w-6 text-brand-gold"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-bold text-white font-display">
                    Al Noor Training Centre
                  </p>
                  <p className="text-sm text-brand-gold font-body">
                    for Persons with Disabilities, Dubai
                  </p>
                </div>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-gold/10 px-3 py-1 text-xs font-medium text-brand-gold border border-brand-gold/20">
                MOU Partner
              </div>
              <p className="mt-6 text-base leading-relaxed text-white/70 font-body">
                Upllyft and Al Noor Training Centre for Persons with
                Disabilities, Dubai have signed a Memorandum of Understanding to
                co-develop and pilot Upllyft&rsquo;s platform across Al
                Noor&rsquo;s programmes — serving hundreds of children and
                families across Dubai.
              </p>
            </div>
          </ScrollReveal>

          {/* Future partner cards */}
          <div className="space-y-4">
            {futurePartners.map((p, i) => (
              <ScrollReveal key={p.type} delay={0.2 + i * 0.1}>
                <Card className="flex items-center justify-between opacity-60">
                  <div>
                    <p className="text-sm font-medium text-white/40 font-body">
                      {p.type}
                    </p>
                    <p className="text-base font-medium text-white/60 font-body">
                      {p.label}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/30 font-body">
                    In Discussion
                  </span>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>

        <ScrollReveal delay={0.4}>
          <div className="mt-12 text-center">
            <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
              <Dialog.Trigger asChild>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 hover:text-white">
                  Interested in a partnership?
                </Button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-brand-mist bg-white p-8 shadow-2xl">
                  <Dialog.Title className="text-2xl font-bold text-brand-midnight font-display">
                    Partnership Enquiry
                  </Dialog.Title>
                  <Dialog.Description className="mt-2 text-brand-midnight/60 font-body">
                    We&rsquo;d love to hear from you. Send us an email to start
                    the conversation.
                  </Dialog.Description>
                  <a
                    href="mailto:partnerships@upllyft.com?subject=Upllyft%20Partnership%20Enquiry"
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-violet px-6 py-3 text-base font-medium text-white transition-colors hover:bg-brand-violet/90 font-body"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                      />
                    </svg>
                    partnerships@upllyft.com
                  </a>
                  <Dialog.Close asChild>
                    <button
                      className="absolute right-4 top-4 rounded-full p-2 text-brand-midnight/40 hover:text-brand-midnight cursor-pointer"
                      aria-label="Close"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </Dialog.Close>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
