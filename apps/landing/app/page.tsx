"use client";

import { Nav } from "@/components/sections/Nav";
import { Hero } from "@/components/sections/Hero";
import { TrustBar } from "@/components/sections/TrustBar";
import { ProblemStatement } from "@/components/sections/ProblemStatement";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Personas } from "@/components/sections/Personas";
import { Partnerships } from "@/components/sections/Partnerships";
import { Vision } from "@/components/sections/Vision";
import { WaitlistCTA } from "@/components/sections/WaitlistCTA";
import { Footer } from "@/components/sections/Footer";

export default function Home() {
  return (
    <main>
      <Nav />
      <Hero />
      <TrustBar />
      <ProblemStatement />
      <HowItWorks />
      <Personas />
      <Partnerships />
      <Vision />
      <WaitlistCTA />
      <Footer />
    </main>
  );
}
