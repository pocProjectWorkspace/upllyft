# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Upllyft is a Turborepo + pnpm monorepo for a neurodivergent community platform: parents, therapists, educators, clinics and nurseries. **Mira** (Mindful Intelligent Response Assistant) is the parent-facing AI guide. Toolchain is pinned: Node `20.11.0` (`.nvmrc`), `pnpm@10.23.0` (root `package.json`).

## Monorepo Layout

```
apps/
├── api/             NestJS 11 on Express (NOT Fastify), Prisma 6, Socket.IO     port 3001
├── web-main/        THE HUB — dashboard, feed, profile, admin console, plus     port 3000
│                    every product section (see "Hub merge" below)
├── landing/         Marketing site, isolated (three.js)                          port 3008
└── mobile/          Expo 54 / RN 0.81, expo-router; own axios client in lib/api.ts
packages/
├── ui/              @upllyft/ui — shared React components (web only)
├── api-client/      @upllyft/api-client — axios client, token refresh, AuthProvider, APP_URLS/nav
├── types/           @upllyft/types — shared TS types
└── config/          @upllyft/config — shared tsconfig / eslint / tailwind
```

Shared packages export raw `.ts` from `src/index.ts` with no build step; apps list them in `transpilePackages`. **The API cannot import `@upllyft/types`** (Nest's build does not resolve raw TS), so shared contracts are mirrored inside the API and guarded by parity scripts (see "Tenancy").

### Hub merge (branch `perf/phase-1`, Sept 2026)

All six product frontends now live inside `apps/web-main`:

| Section | Route prefix | Code namespace in web-main |
|---|---|---|
| community | `/community` | `src/community/{components,hooks,lib}` |
| screening | `/screening` | `src/screening/...` |
| booking | `/booking` | `src/booking/...` |
| resources | `/resources` | `src/resources/...` |
| cases | `/cases` | `src/cases/...` |
| clinic admin | `/clinic` (not `/admin`, which is the platform console) | `src/clinic/...` |

- The former standalone apps (`apps/web-community`, `web-screening`, `web-booking`, `web-resources`, `web-cases`, `web-admin`) were retired in the cutover. If any of those directories still exist, they are dead code: do not edit them. Routes live under `src/app/<prefix>/`, imports use `@/<prefix>/...`, each section has its own nested `layout.tsx`, and per-page `*Shell` wrappers remain as client auth guards.
- `src/components/app-frame.tsx` maps prefixes to `currentApp` for the shared header.
- `APP_URLS.<app>` in `packages/api-client/src/nav-config.ts` is always `${NEXT_PUBLIC_APP_MAIN_URL}<prefix>`. There are no per-app URL variables or merge flags any more. The API's Mira links use the same prefixes off `FRONTEND_URL`.
- `next.config.ts` 308-redirects the retired `*.safehaven-upllyft.com` hosts to the matching hub prefix once those domains are attached to the web-main Vercel project.
- `src/proxy.ts` redirects logged-out visitors (no `upllyft_access_token` / `upllyft_refresh_token` cookie) at the edge for protected prefixes. The root layout is async and reads cookies to start `/auth/me` server-side, so **every web-main route is dynamic**.
- Remote images go through `components/app-image.tsx`; the optimizer host allowlist is in `next.config.ts`.
- The cutover history and measurements are in `PERFORMANCE_AUDIT.md` §7.

## Commands

```bash
pnpm install
pnpm dev                    # every app in parallel (heavy); prefer filters below
pnpm build | lint | type-check | clean

# API + hub (the usual pair)
pnpm --filter @upllyft/api --filter @upllyft/web-main dev
pnpm --filter @upllyft/api dev          # nest start --watch
pnpm --filter @upllyft/web-main dev     # next dev --port 3000
cd apps/mobile && pnpm start            # expo
```

### API

```bash
pnpm --filter @upllyft/api prisma:generate
pnpm --filter @upllyft/api prisma:studio
pnpm --filter @upllyft/api type-check    # runs check:tenancy guards FIRST, then tsc
pnpm --filter @upllyft/api check:tenancy # scripts/check-no-child-clinicid.mjs + check-capability-parity.mjs + check-journey-domain-parity.mjs

# Unit tests (jest.config.js, rootDir=src, *.spec.ts) — only a handful exist
pnpm --filter @upllyft/api test
cd apps/api && npx jest src/feeds/feed-algorithm.service.spec.ts      # single file
cd apps/api && npx jest -t "pattern"                                   # single test name

# E2E (test/jest-e2e.json, test/*.e2e-spec.ts) — hits the REAL DATABASE_URL, serial, 120 s timeout
pnpm --filter @upllyft/api test:e2e
cd apps/api && npx jest --config ./test/jest-e2e.json test/concerns.e2e-spec.ts

# Seeds
pnpm --filter @upllyft/api db:seed            # base
pnpm --filter @upllyft/api db:seed:all        # base + events + qa + crisis
pnpm --filter @upllyft/api db:seed:cases      # also: clinical, demo, org, org:content, nursery-demo
```

E2E fixtures (`test/helpers/fixtures.ts`) namespace every row to a per-run tag on `@ancc.internal` and delete only that namespace. The DB holds real families' data; never write tests that touch existing rows.

### Database / migrations

- `prisma migrate dev` **does not work**: the shadow DB lacks pgvector (`Unsupported("vector")`), and the history has a gap (`20260203000000_add_onboarding_settings` alters `platform_settings`, which no migration creates).
- **Fresh local DB:** create the `vector` extension, then `cd apps/api && pnpm exec prisma db push --schema=prisma/schema.prisma --skip-generate`.
- **Shared/branch DB:** never `db push` (it drops out-of-schema columns). Add a migration folder by hand (`prisma migrate dev --create-only`, edit the SQL) and apply with `prisma:migrate:deploy`. `start:prod` runs `migrate deploy` before `node dist/main`.
- Schema is ~5.6k lines at `apps/api/prisma/schema.prisma`; `prisma/migrations/` also holds loose `.sql` files that were applied manually.

### CI (`.github/workflows/ci.yml`, PRs to `main`)

`pnpm type-check` is the **blocking** gate. `lint` and `build` run but are `continue-on-error`. Keep type-check clean.

## Backend Architecture (`apps/api`)

- One NestJS module per feature in `src/<feature>/`; ~80 modules. Global prefix `api`, **except `/health` which lives at the root**. Swagger at `/api/docs`.
- **Express** adapter: `express-session`, `cookie-parser`, `compression` (SSE excluded). Sessions are mounted only on the Google OAuth and captcha routes; everything else is JWT.
- **Auth is opt-in per controller** (`@UseGuards(JwtAuthGuard)`). There is no global guard and no `@Public` decorator; a new controller without the guard is public.
- `Role` enum: `USER` (parent), `THERAPIST`, `EDUCATOR`, `ORGANIZATION`, `ADMIN`, `SUPERADMIN`, `MODERATOR`, `BILLING`. `RolesGuard` lets **SUPERADMIN bypass every `@Roles()` check**; the seeded admin is SUPERADMIN. Front-end role checks must accept both `ADMIN` and `SUPERADMIN` or super admins get bounced.
- Config: `ConfigModule` reads `apps/api/.env` (and `apps/.env`), **not the repo-root `.env`**. Copy from `apps/api/.env.example`.
- **Boot hard-fails without** non-empty `STRIPE_SECRET_KEY` and `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (SDK constructors throw inside DI). Placeholders are fine in dev. Missing OpenAI/Anthropic keys only log a warning.
- Boot is slow (minutes on Windows) because of eager top-level imports of large SDKs, not DB or DI.
- **Redis is optional but required for more than one replica.** When `REDIS_URL` or `REDIS_HOST` is set, `src/common/redis/` installs a Socket.IO Redis adapter (room emits fan out across instances) and a Redis-backed throttler storage (shared rate limits). Without it both stay in-process and the boot log says so. The feed/post caches stay per-instance either way.
- Integrations: OpenAI + Anthropic (`src/ai`, `src/mira`, `src/worksheets`), Stripe Connect (`src/marketplace/payment`), Supabase storage (`src/common/storage`, content-type derived from file bytes), MailerSend/SendGrid/SES, Firebase push.
- Notification email: urgent/high go out immediately, the rest in a daily (`@Cron` 03:30 UTC) or weekly digest per user setting, claimed via `emailedAt` so replicas don't double-send. `EMAIL_SEND_DISABLED=true` logs instead of sending; use it locally and in tests.
- **Railway blocks outbound SMTP** (ports 25/465/587/2525) below the Pro plan, so production email must use an HTTPS provider: `EMAIL_PROVIDER=brevo` + `BREVO_API_KEY`. `smtp`/`mailersend` only work locally. Bulk emails (therapist import) queue in `email_outbox` under `EMAIL_DAILY_LIMIT` (Brevo free = 300/day) minus `EMAIL_DAILY_RESERVE`.
- Build uses `node --max-old-space-size=4096`.

### Backend rules established by the performance work (PERFORMANCE_AUDIT.md §7a–7g)

- **One `PrismaClient`.** `PrismaService` is provided once by the global `PrismaModule`; never add it to a feature module's `providers` (that used to create four pools).
- **Global Prisma `omit`** (`src/prisma/prisma.service.ts`) drops `embedding` on `user`/`post`/`question`/`answer` and `originalContent` on `answer` from every query. Opt in with `select: { embedding: true }` or `omit: { embedding: false }`. There is no response interceptor any more, so anything a query returns goes to the client.
- **`cache-manager` v5 TTLs are milliseconds.** `ttl: 300_000` is five minutes; `ttl: 300` is 300 ms.
- **Body limits** are 1 MB globally; `/api/crisis` and `/api/admin` keep 10 MB via prefix-scoped parsers mounted first in `main.ts`.
- **Feed personalisation is read-only on GET** and batched. `feed-algorithm.service.spec.ts` pins ≤ 9 Prisma calls for 30 candidates and no writes; keep it green when touching `feeds/`.
- Uploads go to Supabase via `StorageService`: avatars to the public `avatars` bucket, verification documents to the private `credentials` bucket with one-hour signed URLs on read. Legacy `/uploads/...` rows are returned unchanged.
- Hot-path composite indexes were added by hand and `CONCURRENTLY` on the shared DB, then recorded as migration files (`20260920120000_*`, `20260921090000_*`). Follow the same pattern for new indexes.

### Tenancy (read `docs/tenancy-and-multi-setting-model.md` before touching children/facilities)

One `Child` record; every party holds a scoped, consented, time-bounded lens via `ChildAffiliation`, not a foreign key.

- **Never add a new read/write of `Child.clinicId`.** It is deprecated and dual-written during migration. Use `childInFacility()` / `childOnRoster()` / `therapistInFacility()` / `attachChildToFacility()` from `src/common/child-scope.ts`. `scripts/check-no-child-clinicid.mjs` keeps a shrink-only baseline of allowed files and fails `type-check` otherwise.
- Facility types `CLINIC | NURSERY | SCHOOL` get capabilities from a single map (`src/common/facility-capabilities.ts`, mirrored from `packages/types/src/facility.ts`; `check-capability-parity.mjs` fails the build if they diverge). Do not branch on `facility.type` in services; check `facilityCan()` / `scopeAllowedFor()` at the choke points.
- Same mirror convention: `src/clinical-templates/clinical-types.ts` ↔ `packages/types/src/clinical-template.ts`. Change one, change the other.
- `JOURNEY_DOMAINS` (Resources journey areas) exists three times: `apps/api/src/resource-journey/domains.ts`, `packages/types/src/resource-journey.ts`, `apps/mobile/lib/journey.ts`. `check-journey-domain-parity.mjs` fails `type-check` if they differ.
- `resolveClinicScope()` pulls `clinicId` off the JWT; `Facility.id === Clinic.id` was preserved by the backfill so that id is also the facilityId.

## Frontend Architecture

- Next.js 16 App Router, React 19, Tailwind v4, Radix UI. TanStack Query for server state, React Hook Form + Zod for forms.
- Each app's `next.config.ts` rewrites `/api/:path*` → `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`). `/api/auth/google` is a redirect, not a rewrite, so OAuth session cookies work.
- `<AuthProvider baseURL="/api">` from `@upllyft/api-client` wraps each app. Tokens live in both cookies and localStorage; cookies are shared across `localhost` ports in dev and scoped to `.safehaven-upllyft.com` in prod.
- `turbo.json` `globalEnv` lists every `NEXT_PUBLIC_*` URL/flag plus `API_INTERNAL_URL` and `SERVER_AUTH_TIMEOUT_MS`; add new build-time env there or Turbo will cache stale builds.
- `NEXT_PUBLIC_API_DIRECT=1` (with `NEXT_PUBLIC_API_URL`) makes the browser call the API origin directly instead of the `/api` rewrite. Off by default; it changes production topology (CORS, cookies).
- `NEXT_PUBLIC_BOOKING_ENABLED=true` turns booking on. It is **off in production**: gate every "Book session" control on `BOOKING_ENABLED` from `src/booking/lib/booking-availability.tsx` and render `<BookingComingSoon>` otherwise. The flag is read at build time, so changing it needs a redeploy.
- Deployment: web apps on Vercel (`apps/*/vercel.json`, one project each), API on Railway, database and file storage on Supabase (`eu-north-1`). API-to-DB distance dominates `/auth/me` latency.
- Brand: teal gradient (teal-400 → teal-600), rounded corners, subtle shadows.

### Frontend rules established by the performance work (PERFORMANCE_AUDIT.md §7a–7h)

- **Header lives only in the root `AppFrame`** (`components/app-frame.tsx`). Never render `<AppHeader>` inside a page. It is hidden under `/login`, `/register`, `/forgot-password`, `/reset-password`, `/callback`, `/onboarding`, `/admin` and `/org`, which own their chrome.
- **Same-app navigation must be a client transition.** Use `next/link` or the `NavigationProvider`/`toLocalHref` helpers from `@upllyft/api-client` with relative hrefs. Absolute `APP_URLS.*` hrefs are only for cross-app links (and, with the merge, those are mostly relative too). A hard `<a href>` costs a full reload plus `/auth/me`.
- **Data fetching goes through TanStack Query**, not `useEffect` + `useState`. The clinic section keeps its keys in `src/clinic/lib/query-keys.ts`; list pages use `placeholderData: keepPreviousData`, polls use `refetchInterval`, tabs use `enabled`. `QueryClient` defaults: `staleTime` 2 min, `gcTime` 30 min, `refetchOnWindowFocus: false`, `retry: 1`.
- **No full-screen spinner gates.** Use `loading.tsx` and content skeletons; keep `router.replace` inside effects, never in render.
- **Auth hydration** (`packages/api-client/src/hooks/useAuth.tsx`): a localStorage snapshot of the last user (24 h TTL) is applied in a `useLayoutEffect` after mount, not in the state initialiser (that caused React hydration error 418). The root layout starts `/auth/me` on the server (`lib/server-user.ts`, timeout `SERVER_AUTH_TIMEOUT_MS`, default 2.5 s) and passes the **promise** to `AuthProvider`; a `null` result falls back to the normal client flow. Login honours `?next=` via `lib/safe-next.ts`.
- Heavy client-only widgets (Mira FAB/panel with framer-motion, recharts pages) load through `next/dynamic` with `ssr: false` so they stay out of the first-load bundle.
- Lists of cards are `React.memo` with stable callbacks; flattened infinite-query pages are `useMemo`'d. No virtualisation library is in use.
- Static assets must be sized for use: `Mira.png` was cut from 1.6 MB to 34 KB; do not commit multi-megabyte images into `public/`.

### @upllyft/ui API (differs from shadcn conventions — read the source)

- `Avatar`: `<Avatar src name size="md" />`, no sub-components
- `Card`: plain div wrapper, no CardHeader/CardTitle/CardContent
- `Badge`: `color` prop (green, blue, yellow, red, gray, purple), not `variant`
- `Button`: variants primary, secondary, outline, ghost (no destructive)
- `MiraNudge`: `<MiraNudge nudgeId message chipText mainAppUrl={APP_URLS.main} childName />`; inside web-main pass `onAskMira` instead of `mainAppUrl`. Gate to `user.role === 'USER'` (parents); booking pages define a local `MiraNudgeForParent` wrapper for this.

### Mira

- API: `apps/api/src/mira/` — SSE stream at `POST /mira/chat-stream`, conversation CRUD.
- Web: `apps/web-main/src/components/mira/` — `MiraProvider`/`useMira()` (`mira-context.tsx`), slide-over panel, FAB. Opens on `?openMira=true&message=...`.
- Onboarding step 5 stores `mira_onboarding_handoff` in localStorage; `MiraProvider` auto-opens on dashboard mount.
- `public/Mira.png` must exist in any app that renders the avatar.

## Reference Docs

- `PERFORMANCE_AUDIT.md` — measured audit and the phase-1/2/hub-merge work log (§7 = what is done / still open)
- `docs/AUDIT-2026-09-19.md` — platform audit findings
- `docs/tenancy-and-multi-setting-model.md`, `docs/clinic-management-*.md` — clinic/nursery data model and build plans
- `docs/{vercel,railway,aws-fargate}-deployment-guide.md` — deployment
- `AGENTS.md` — Vercel best-practice defaults
