"use client";

import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const roles = ["Parent", "Therapist", "School", "Clinic", "Other"] as const;

export function WaitlistCTA() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !role) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      if (!res.ok) {
        throw new Error("Failed to submit");
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      id="waitlist"
      className="bg-gradient-to-br from-brand-violet to-brand-teal py-24 sm:py-32"
    >
      <div className="mx-auto max-w-3xl px-6 text-center">
        <ScrollReveal>
          <h2 className="text-4xl font-bold text-white font-display sm:text-5xl">
            Be part of what&rsquo;s coming.
          </h2>
          <p className="mt-4 text-lg text-white/80 font-body">
            We&rsquo;re onboarding our first cohort of clinics, schools, and
            families in 2025. If you want early access — or just want to follow
            the journey — leave your details.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="thanks"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-12 rounded-2xl bg-white/10 p-8 backdrop-blur-sm"
              >
                <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-white/20">
                  <svg
                    className="h-8 w-8 text-white"
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
                </div>
                <p className="mt-4 text-xl font-semibold text-white font-display">
                  You&rsquo;re on the list.
                </p>
                <p className="mt-2 text-white/70 font-body">
                  We&rsquo;ll be in touch before public launch.
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                exit={{ opacity: 0 }}
                className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-3"
              >
                <div className="flex-1">
                  <label htmlFor="waitlist-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="waitlist-email"
                    type="email"
                    required
                    placeholder="Your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-full bg-white/10 px-6 py-3 text-white placeholder-white/40 backdrop-blur-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 font-body"
                  />
                </div>
                <div>
                  <label htmlFor="waitlist-role" className="sr-only">
                    Role
                  </label>
                  <select
                    id="waitlist-role"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-full bg-white/10 px-6 py-3 text-white backdrop-blur-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 font-body appearance-none sm:w-auto cursor-pointer"
                  >
                    <option value="" disabled className="text-gray-900">
                      I am a...
                    </option>
                    {roles.map((r) => (
                      <option key={r} value={r} className="text-gray-900">
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-white text-brand-violet hover:bg-white/90 shadow-lg"
                >
                  {submitting ? "Joining..." : "Join Waitlist"}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          {error && (
            <p className="mt-4 text-sm text-white/80 font-body">{error}</p>
          )}
        </ScrollReveal>
      </div>
    </section>
  );
}
