"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import * as Accordion from "@radix-ui/react-accordion";

interface Persona {
  id: string;
  label: string;
  color: string;
  borderColor: string;
  bgColor: string;
  headline: string;
  description: string;
  capabilities: string[];
  badge?: string;
}

const personas: Persona[] = [
  {
    id: "parents",
    label: "Parents",
    color: "text-persona-parent",
    borderColor: "border-persona-parent",
    bgColor: "bg-persona-parent/10",
    headline: "You're not meant to navigate this alone.",
    description:
      "You're the expert on your child. We built Upllyft so the professionals around them finally know what you know — and so you finally know what they're doing.",
    capabilities: [
      "Real-time session summaries in plain language (not clinical jargon)",
      "Progress timeline: see exactly what's been worked on, week by week",
      "Direct messaging with your child's therapist and school counsellor — in one place",
      "Mira AI answers your \"what does this mean?\" questions at 2am when the anxiety kicks in",
      "Consent control: you decide exactly who sees what",
      "Daily mood and behaviour check-ins your child can complete in under 2 minutes",
    ],
  },
  {
    id: "therapists",
    label: "Therapists",
    color: "text-persona-therapist",
    borderColor: "border-persona-therapist",
    bgColor: "bg-persona-therapist/10",
    headline: "Less paperwork. More therapy.",
    description:
      "You spent years training to help children — not to transcribe session notes and chase parent sign-offs. Upllyft handles the administrative layer so you can stay clinical.",
    capabilities: [
      "AI-assisted SOAP note generation (Mira Scribe): speak your session notes, get a structured draft",
      "Outcome tracking dashboards: IEP goals, therapy milestones, regression alerts",
      "Caseload view: all your patients, their last session, next appointment, outstanding tasks — in one screen",
      "Consent and documentation management (PDPL-compliant)",
      "Cross-discipline visibility: see what the OT, speech therapist, and school counsellor are each doing",
      "Invoicing and session scheduling (Phase 2)",
    ],
  },
  {
    id: "schools",
    label: "Schools",
    color: "text-persona-school",
    borderColor: "border-persona-school",
    bgColor: "bg-persona-school/10",
    headline: "Finally, a line between the classroom and the clinic.",
    description:
      "You see children every day. You're often the first to notice something's different — but the information rarely flows back to you. Upllyft closes that loop.",
    capabilities: [
      "Shared child profile: see therapy goals and progress without needing clinic system access",
      "Flag behaviour patterns directly from the school record — therapists are notified instantly",
      "IEP goal alignment: school targets and therapy targets in one place",
      "Confidential, consent-gated communication channel with families and clinicians",
      "Aggregate reporting for SEND coordinators and school leadership (anonymised)",
    ],
  },
  {
    id: "partners",
    label: "Institutions",
    color: "text-persona-partner",
    borderColor: "border-persona-partner",
    bgColor: "bg-persona-partner/10",
    headline: "Infrastructure for the region's most important work.",
    description:
      "Whether you run a specialist centre, a rehabilitation hospital, or a national disability programme — Upllyft is designed to work at scale. We are actively pursuing institutional partnerships across the UAE and MENA.",
    capabilities: [
      "White-label deployment: your brand, your centre, Upllyft's infrastructure",
      "Multi-clinic management: standardise care quality across sites",
      "Population-level outcome reporting: measure programme effectiveness over time",
      "PDPL and UAE MOHAP alignment-ready",
      "MOU partnership track: fast-track integration for established institutions",
      "Priority access: Al Noor Training Centre is our inaugural partner",
    ],
    badge: "Al Noor Training Centre — MOU Partner",
  },
];

function PersonaContent({ persona }: { persona: Persona }) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <h3
          className={cn(
            "text-3xl font-bold font-display sm:text-4xl",
            persona.color
          )}
        >
          {persona.headline}
        </h3>
        <p className="mt-4 text-lg leading-relaxed text-brand-midnight/70 font-body">
          {persona.description}
        </p>
        {persona.badge && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-gold/10 px-4 py-1.5 text-sm font-medium text-brand-gold border border-brand-gold/20">
            {persona.badge}
          </div>
        )}
      </div>
      <div>
        <ul className="space-y-3">
          {persona.capabilities.map((cap) => (
            <li key={cap} className="flex gap-3 text-brand-midnight/70 font-body">
              <svg
                className={cn("mt-1 h-5 w-5 shrink-0", persona.color)}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-base">{cap}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Personas() {
  const [activeTab, setActiveTab] = useState("parents");

  const active = personas.find((p) => p.id === activeTab) ?? personas[0];

  return (
    <section id="personas" className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal>
          <h2 className="text-center text-4xl font-bold text-brand-midnight font-display sm:text-5xl">
            Built for everyone in the circle of care
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-brand-midnight/60 font-body">
            Every stakeholder sees what they need — nothing more, nothing less.
          </p>
        </ScrollReveal>

        {/* Desktop Tabs */}
        <ScrollReveal delay={0.2}>
          <div className="mt-12 hidden md:block">
            <div className="flex justify-center gap-2">
              {personas.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActiveTab(p.id)}
                  className={cn(
                    "relative rounded-full px-6 py-3 text-sm font-medium transition-all font-body cursor-pointer",
                    activeTab === p.id
                      ? cn("bg-white shadow-lg", p.color)
                      : "text-brand-midnight/50 hover:text-brand-midnight/80"
                  )}
                >
                  {p.label}
                  {activeTab === p.id && (
                    <motion.div
                      layoutId="persona-underline"
                      className={cn(
                        "absolute bottom-0 left-2 right-2 h-0.5 rounded-full",
                        p.borderColor.replace("border-", "bg-")
                      )}
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="mt-12 rounded-3xl border border-brand-mist bg-brand-cloud/50 p-8 sm:p-12">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <PersonaContent persona={active} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </ScrollReveal>

        {/* Mobile Accordion */}
        <div className="mt-12 md:hidden">
          <Accordion.Root type="single" defaultValue="parents" collapsible>
            {personas.map((p) => (
              <Accordion.Item key={p.id} value={p.id}>
                <Accordion.Trigger
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-6 py-4 text-left text-lg font-semibold transition-colors font-body cursor-pointer",
                    p.color,
                    p.bgColor
                  )}
                >
                  {p.label}
                  <svg
                    className="h-5 w-5 transition-transform data-[state=open]:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </Accordion.Trigger>
                <Accordion.Content className="overflow-hidden data-[state=open]:animate-accordion-open data-[state=closed]:animate-accordion-close">
                  <div className="px-2 py-6">
                    <PersonaContent persona={p} />
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </div>
      </div>
    </section>
  );
}
