"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/Badge";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import dynamic from "next/dynamic";

const HeroCanvas = dynamic(() => import("@/components/three/HeroCanvas"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-brand-midnight" />,
});

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-brand-midnight">
      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(107,63,160,0.15)_0%,_transparent_70%)]" />

      {/* 3D Canvas background */}
      <div className="absolute inset-0 hidden md:block">
        <ErrorBoundary
          fallback={<div className="absolute inset-0 bg-brand-midnight" />}
        >
          <Suspense
            fallback={<div className="absolute inset-0 bg-brand-midnight" />}
          >
            <HeroCanvas />
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Mobile gradient fallback */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,181,173,0.1)_0%,_transparent_60%)] md:hidden" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Badge color="muted">
            MOU Signed &middot; Al Noor Training Centre, Dubai
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-8 max-w-4xl text-5xl leading-tight font-bold tracking-tight text-white sm:text-6xl lg:text-8xl font-display"
        >
          Every child deserves
          <br />
          to be understood.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-6 max-w-2xl text-lg leading-relaxed text-white/60 sm:text-xl font-body"
        >
          Upllyft brings AI, therapy, and care together — so no child falls
          through the gap.
        </motion.p>
      </div>
    </section>
  );
}
