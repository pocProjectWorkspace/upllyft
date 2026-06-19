# Claude Code Prompt: Upllyft Landing Page — `apps/landing`

## Context

This is a Turborepo monorepo. The existing apps (`apps/web`, `apps/clinic`, or similar) handle authenticated
experiences for different user roles. **Do not touch existing apps.**

You are creating a new standalone marketing app: `apps/landing`.

This app has **no authentication, no login, no "explore the app" CTA** — because the core product is still
in active development. Treat it entirely as investor- and partner-grade marketing collateral that happens to
live on the web. It must work as a standalone Next.js app deployable to Vercel or any Node-compatible host.

---

## Project: Upllyft

**What Upllyft is:**
Upllyft is an AI-powered neurodevelopmental therapy and rehabilitation platform built for the MENA region
and beyond. It connects children with neurodevelopmental conditions (autism, ADHD, dyslexia, cerebral palsy,
developmental delays) to licensed therapists, school counsellors, and specialist clinics — with AI tools that
reduce administrative overhead, improve outcome tracking, and keep parents genuinely in the loop.

**Signed partnership:** Upllyft has signed an MOU with **Al Noor Training Centre for Persons with
Disabilities, Dubai** — one of the UAE's most respected institutions for disability support and rehabilitation.
This is a marquee credibility signal and must appear prominently on the landing page.

**Stage:** Pre-launch / Build phase. No public product access yet. The landing page is awareness, credibility,
and waitlist capture only.

---

## Task

Create `apps/landing` inside the existing Turborepo monorepo. This is a **Next.js 14 app** (App Router,
TypeScript, Tailwind CSS) with a world-class marketing landing page. The page must feel like it belongs
alongside the best healthtech and edtech brands globally — think Calm, Headspace, or BetterHelp meets the
visual sophistication of Linear or Stripe.

---

## Step 1 — Scaffold the app

```bash
# From monorepo root
cd apps
npx create-next-app@latest landing \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"
```

Update `turbo.json` to include `landing` in the pipeline if not auto-detected.

Add `apps/landing` to the root `pnpm-workspace.yaml` (or `package.json` workspaces) if not already included.

---

## Step 2 — Install dependencies

```bash
cd apps/landing
pnpm add @react-three/fiber @react-three/drei three
pnpm add @react-three/postprocessing
pnpm add framer-motion
pnpm add @radix-ui/react-dialog @radix-ui/react-accordion
pnpm add react-intersection-observer
pnpm add next-themes
pnpm add class-variance-authority clsx tailwind-merge
pnpm add @types/three -D
```

---

## Step 3 — Design System

### Color palette

```ts
// tailwind.config.ts
colors: {
  brand: {
    violet:   '#6B3FA0',   // primary — deep purposeful purple
    teal:     '#00B5AD',   // secondary — hope, growth, care
    gold:     '#E8A838',   // accent — warmth, achievement, celebration
    midnight: '#0D0D1A',   // dark bg
    cloud:    '#F4F2FF',   // light bg
    mist:     '#E8E4F4',   // subtle surfaces
  },
  persona: {
    parent:    '#FF7B54',  // warm orange — nurturing
    therapist: '#4ECDC4',  // teal — clinical trust
    school:    '#45B7D1',  // sky blue — learning
    partner:   '#96CEB4',  // sage — institutional
  }
}
```

### Typography

Use **Playfair Display** (display/hero) + **DM Sans** (body/UI). Load via `next/font/google`.

```ts
import { Playfair_Display, DM_Sans } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-display' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-body' })
```

Apply both variables to `<html>` tag in `app/layout.tsx`. Configure Tailwind to use them as
`font-display` and `font-body` utilities.

---

## Step 4 — Page Architecture

All sections live in `app/page.tsx` as a composed stack of section components. Use `'use client'` at
the page level. Individual 3D canvas components are isolated client components.

```
app/
  layout.tsx
  page.tsx
  globals.css
components/
  three/
    HeroCanvas.tsx        ← Three.js 3D scene
    NeuralNetCanvas.tsx   ← abstract floating neural net for "How it works"
    GlobeCanvas.tsx       ← rotating globe for partnerships section
  sections/
    Nav.tsx
    Hero.tsx
    TrustBar.tsx
    ProblemStatement.tsx
    HowItWorks.tsx
    Personas.tsx
    Features.tsx
    Partnerships.tsx
    Vision.tsx
    WaitlistCTA.tsx
    Footer.tsx
  ui/
    Button.tsx
    Badge.tsx
    Card.tsx
    Tag.tsx
```

---

## Step 5 — Section-by-Section Implementation

### 5.1 — Nav

Fixed, blurred glass navbar. Logo left. Navigation links right: "What We Do", "Who It's For",
"Partnerships", "Our Vision". No login button. One CTA button: **"Join the Waitlist"** — scrolls to
the waitlist form. Hides on scroll down, reappears on scroll up.

```tsx
// components/sections/Nav.tsx — implement hide-on-scroll using useScrollDirection hook
```

---

### 5.2 — Hero

**This is the centrepiece. Make it extraordinary.**

Layout: Full viewport height. Dark background (`brand.midnight`). Subtle radial gradient from violet to
transparent at centre. Large hero text overlaid on a 3D canvas that fills the background.

**Hero text (left-aligned, large):**
```
Every child deserves
to be understood.
```
Subheading: `Upllyft brings AI, therapy, and care together — so no child falls through the gap.`

**3D Scene (`components/three/HeroCanvas.tsx`):**

Create a `Canvas` from `@react-three/fiber` that renders:
- A slowly rotating, semi-transparent neural web of interconnected nodes and edges — representing
  neural pathways and connection. Use `@react-three/drei`'s `Points` or custom `LineSegments`.
- Nodes are small glowing spheres (`MeshStandardMaterial` with emissive in violet/teal).
- Lines connecting them pulse gently (animated opacity using `useFrame`).
- Slow camera drift — use `OrbitControls` with `autoRotate` and very low `autoRotateSpeed`.
- Add soft `PointLight` in violet and teal from opposite sides.
- `Bloom` post-processing from `@react-three/postprocessing` for glow effect.
- The scene should feel like a living, breathing brain network — not a tech logo.

**Animation:** On mount, hero text slides in from bottom with staggered delay using Framer Motion.
The subheading fades in 300ms after the headline. A single pill badge above the headline appears first:
`🤝 MOU Signed · Al Noor Training Centre, Dubai` — styled in `brand.gold` on a dark muted background.

No primary CTA button in the hero — the scroll is the invitation.

---

### 5.3 — TrustBar

A thin horizontal bar below the hero. Light background. Reads:
`"In partnership with"` followed by a stylised wordmark for **Al Noor Training Centre for Persons with
Disabilities** — use text + a simple icon if no SVG logo is available. Add a separator, then:
`"Built for MENA. Designed for every child."`

---

### 5.4 — ProblemStatement

Dark section. Three columns of hard truths, each with a large number stat and a tight explanatory line.
Use real or realistic estimates for MENA neurodevelopmental context:

| Stat | Label |
|------|-------|
| 1 in 6 | children has a neurodevelopmental condition that affects daily functioning |
| 73% | of families in the UAE report difficulty accessing consistent specialist therapy |
| 18 months | average wait time from first concern to formal diagnosis in the region |

Below the stats: a single paragraph of honest, non-promotional prose:
> "The support system for neurodivergent children is fragmented. Clinics work in silos. Parents
> receive contradictory advice. Schools don't communicate with therapists. Upllyft is not trying
> to fix this with an app. We're building the connective tissue the system never had."

Typography: large numbers in `font-display` (Playfair), Tailwind `text-7xl`, coloured in `brand.teal`.

---

### 5.5 — HowItWorks

Three-step horizontal process (desktop) / vertical (mobile).

Use a **floating neural net 3D canvas** (`NeuralNetCanvas.tsx`) as a decorative background element —
rendered at 40% opacity, non-interactive, to the right side of the section.

Steps:
1. **Connect** — A child's profile is created. Parents, therapists, and school contacts are linked
   to one shared, consent-gated record.
2. **Track** — Session notes, therapy goals, SOAP notes, and daily mood check-ins flow into a
   unified timeline — visible to every authorised stakeholder.
3. **Grow** — Mira, Upllyft's AI layer, surfaces patterns, flags regressions early, and generates
   plain-language progress summaries for parents who don't have a clinical background.

Each step: icon (use a simple geometric SVG, not emoji), bold title, 2-sentence description.
Animate each card into view on scroll using `useInView` from `react-intersection-observer`.

---

### 5.6 — Personas

**This is the second centrepiece of the page.**

Four persona tabs (desktop) or a vertically stacked accordion (mobile):

#### Tab UI Design
Horizontal pill tabs at the top. Active tab has a coloured underline matching the persona colour.
Content area below animates on tab switch using Framer Motion `AnimatePresence` + `motion.div`
with `initial={{ opacity: 0, y: 20 }}` and `animate={{ opacity: 1, y: 0 }}`.

#### Persona 1 — Parents (`persona.parent`)

**Headline:** `You're not meant to navigate this alone.`

**Description:** You're the expert on your child. We built Upllyft so the professionals around them
finally know what you know — and so you finally know what they're doing.

**Capabilities:**
- Real-time session summaries in plain language (not clinical jargon)
- Progress timeline: see exactly what's been worked on, week by week
- Direct messaging with your child's therapist and school counsellor — in one place
- Mira AI answers your "what does this mean?" questions at 2am when the anxiety kicks in
- Consent control: you decide exactly who sees what
- Daily mood and behaviour check-ins your child can complete in under 2 minutes

**Visual:** Warm illustration or photo placeholder — a parent and child moment. Colour: `persona.parent`.

---

#### Persona 2 — Therapists & Clinicians (`persona.therapist`)

**Headline:** `Less paperwork. More therapy.`

**Description:** You spent years training to help children — not to transcribe session notes and
chase parent sign-offs. Upllyft handles the administrative layer so you can stay clinical.

**Capabilities:**
- AI-assisted SOAP note generation (Mira Scribe): speak your session notes, get a structured draft
- Outcome tracking dashboards: IEP goals, therapy milestones, regression alerts
- Caseload view: all your patients, their last session, next appointment, outstanding tasks — in one screen
- Consent and documentation management (PDPL-compliant)
- Cross-discipline visibility: see what the OT, speech therapist, and school counsellor are each doing
- Invoicing and session scheduling (Phase 2)

**Visual:** Clinical confidence. Clean UI screenshot mockup or abstract. Colour: `persona.therapist`.

---

#### Persona 3 — Schools & Counsellors (`persona.school`)

**Headline:** `Finally, a line between the classroom and the clinic.`

**Description:** You see children every day. You're often the first to notice something's different —
but the information rarely flows back to you. Upllyft closes that loop.

**Capabilities:**
- Shared child profile: see therapy goals and progress without needing clinic system access
- Flag behaviour patterns directly from the school record — therapists are notified instantly
- IEP goal alignment: school targets and therapy targets in one place
- Confidential, consent-gated communication channel with families and clinicians
- Aggregate reporting for SEND coordinators and school leadership (anonymised)

**Visual:** School setting, calm and purposeful. Colour: `persona.school`.

---

#### Persona 4 — Institutions & Partners (`persona.partner`)

**Headline:** `Infrastructure for the region's most important work.`

**Description:** Whether you run a specialist centre, a rehabilitation hospital, or a national
disability programme — Upllyft is designed to work at scale. We are actively pursuing institutional
partnerships across the UAE and MENA.

**Capabilities:**
- White-label deployment: your brand, your centre, Upllyft's infrastructure
- Multi-clinic management: standardise care quality across sites
- Population-level outcome reporting: measure programme effectiveness over time
- PDPL and UAE MOHAP alignment-ready
- MOU partnership track: fast-track integration for established institutions
- Priority access: Al Noor Training Centre is our inaugural partner

**Visual:** Institutional confidence. Geometric abstract. Colour: `persona.partner`.
Subtle gold badge: `🤝 Al Noor Training Centre — MOU Partner`

---

### 5.7 — Partnerships

Dark section with a subtle background 3D globe (`GlobeCanvas.tsx`):
- Use `@react-three/drei`'s `Sphere` as the base globe wireframe
- Render `Line` arcs from Dubai to 2-3 other cities (Riyadh, Cairo, London) using `QuadraticBezierLine`
- Slow autoRotate. Teal glow on the sphere wireframe.

Section headline: `"Built for the region. Open to the world."`

Content:
- Al Noor Partnership callout card: logo area (text wordmark if no asset), MOU description:
  *"Upllyft and Al Noor Training Centre for Persons with Disabilities, Dubai have signed a
  Memorandum of Understanding to co-develop and pilot Upllyft's platform across Al Noor's
  programmes — serving hundreds of children and families across Dubai."*
- Three smaller "partnership interest" cards for future slots (greyed out, labelled "In Discussion"):
  type labels like *Hospital*, *Ministry*, *School Network* — signals pipeline without naming specifics.

CTA: `"Interested in a partnership?"` → opens a simple email modal (Radix Dialog):
Pre-fills subject line `Upllyft Partnership Enquiry` and a mailto link to `partnerships@upllyft.com`.
No form submission backend required yet.

---

### 5.8 — Vision

Light section. Full-bleed, generous padding.

**Headline (Playfair, large):**
```
One platform.
Every child. Every stakeholder.
Every step of the journey.
```

Three belief statements in a grid:

| Icon | Belief |
|------|--------|
| 🧠 | Neurodivergent children are not broken. The system around them is. We're fixing the system. |
| 🌍 | MENA has 650 million people and almost no scaled neurodevelopmental tech. That changes now. |
| 🔐 | Families trust us with the most sensitive information they have. We earn that trust through consent-first architecture, not just policy. |

Footer quote (pulled quote style, large italic Playfair):
> "We are not building an app. We are building the infrastructure that a generation of children
> — and the professionals who care for them — have never had access to."

---

### 5.9 — WaitlistCTA

Full-width section. Gradient background from `brand.violet` to `brand.teal`. Light text.

**Headline:** `Be part of what's coming.`
**Subheading:** `We're onboarding our first cohort of clinics, schools, and families in 2025.
If you want early access — or just want to follow the journey — leave your details.`

**Form:** Simple email input + role selector dropdown (Parent / Therapist / School / Clinic / Other)
+ Submit button.

**Implementation:** Use a `<form>` that submits to a simple API route `app/api/waitlist/route.ts`
that logs the submission to console (or writes to a JSON file) — **no external service required yet**.
Display a thank-you state on submit. Keep it honest: *"We'll be in touch before public launch."*

---

### 5.10 — Footer

Clean, minimal. Three columns:
- **Left:** Upllyft wordmark + tagline: `Therapy infrastructure for every child.`
- **Centre:** Links: What We Do / Who It's For / Partnerships / Vision / Join Waitlist
- **Right:** `© 2025 Upllyft. All rights reserved.` + `Privacy Policy` placeholder link +
  `Al Noor MOU Partner` badge in small gold text.

No social icons unless they exist. No fake link farms.

---

## Step 6 — Animation Principles

Apply these globally:

1. **Scroll reveals:** Every section animates in on scroll. Use `useInView` with `triggerOnce: true`.
   Default: `opacity: 0 → 1`, `y: 30 → 0`, duration `0.6s`, ease `easeOut`. Stagger children by `0.1s`.

2. **Three.js canvases:** Use `Suspense` with a fallback `<div>` of matching background colour.
   All canvases are `pointer-events: none`. Wrap in `ErrorBoundary` so a 3D failure doesn't break
   the page — the page must work without WebGL.

3. **Framer Motion layout:** Page-level `<AnimatePresence>`. Persona tab content uses
   `mode="wait"` for clean transitions.

4. **Performance:** All Three.js scenes use `frameloop="demand"` where the scene is static,
   `frameloop="always"` only for the hero. Use `React.lazy` + `next/dynamic` for all canvas
   components with `ssr: false`.

```tsx
const HeroCanvas = dynamic(() => import('@/components/three/HeroCanvas'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-brand-midnight" />,
})
```

---

## Step 7 — Responsive Behaviour

- **Mobile-first Tailwind.** Desktop enhancements with `md:` and `lg:` prefixes.
- Persona tabs → vertical accordion on mobile (Radix Accordion).
- HowItWorks 3-column → vertical stack on mobile.
- 3D canvases: hidden on `sm` breakpoint (`hidden md:block`) — replace with static gradient bg.
- Globe canvas: hidden on mobile.
- Nav: hamburger menu on mobile with slide-in sheet (Radix Dialog or simple `useState` toggle).

---

## Step 8 — SEO & Meta

In `app/layout.tsx`:

```tsx
export const metadata: Metadata = {
  title: 'Upllyft — AI-Powered Therapy Platform for Neurodivergent Children',
  description: 'Upllyft connects parents, therapists, and schools around every child with a neurodevelopmental condition. Built for MENA. MOU Partner: Al Noor Training Centre, Dubai.',
  openGraph: {
    title: 'Upllyft',
    description: 'Therapy infrastructure for every child.',
    url: 'https://upllyft.com',
    siteName: 'Upllyft',
    type: 'website',
  },
  themeColor: '#6B3FA0',
}
```

---

## Step 9 — Environment & Config

`apps/landing/.env.local`:
```
NEXT_PUBLIC_SITE_URL=https://upllyft.com
WAITLIST_EMAIL_NOTIFY=hello@upllyft.com
```

`apps/landing/next.config.ts`:
```ts
const nextConfig = {
  transpilePackages: [], // add any shared packages if needed
  images: {
    domains: [],
  },
}
export default nextConfig
```

---

## Step 10 — Vercel Deployment Config

Add `apps/landing/vercel.json`:
```json
{
  "buildCommand": "cd ../.. && pnpm turbo run build --filter=landing",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

---

## Execution Notes for Claude Code

- Work section by section. Do not generate placeholder text — use the copy provided in this prompt verbatim or lightly refined.
- Prioritise the Hero (5.2) and Personas (5.6) sections — these carry the most weight.
- The 3D scenes should be genuinely beautiful — not just spinning geometry. Think about what represents neural connection, child growth, and care.
- Do not add login buttons, "Sign up", "Try free", or any authenticated-product-entry CTA. The waitlist form is the only conversion point.
- The Al Noor partnership is real and prestigious. Treat it with the weight it deserves — not as a logo dump but as a narrative anchor.
- Every component must be TypeScript-strict with proper type annotations. No `any`.
- Use `cn()` from `clsx` + `tailwind-merge` for conditional class merging throughout.
- Test the page with `pnpm dev` from the monorepo root using the Turbo pipeline.

---

## Final Quality Check

Before considering the task complete, verify:

- [ ] `pnpm build` from root succeeds with no TypeScript errors
- [ ] `apps/landing` runs independently with `pnpm dev`
- [ ] All Three.js canvases have `Suspense` + `ErrorBoundary` wrappers
- [ ] Page is fully readable and navigable with JavaScript disabled (SSR content visible)
- [ ] Waitlist form submits and shows thank-you state
- [ ] Mobile layout looks professional at 375px viewport
- [ ] No broken links, no placeholder "TODO" text visible on page
- [ ] Lighthouse Performance score > 80 (check with `next build && next start`)
