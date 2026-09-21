# Upllyft Performance Audit

**Date:** 2026-09-20
**Scope:** all web frontends (`apps/web-*`, `apps/landing`), shared packages (`packages/*`), NestJS API (`apps/api`).
**Method:** read-only code investigation plus direct measurement on a local run of the full stack (API on port 3001 against the Supabase branch database, seven Next dev servers, and a `next start` production build of web-main on port 3100). No application code was changed for this audit.

**Measurement environment (matters for absolute numbers):** Windows 10, 4 logical CPUs, 16 GB RAM, with seven Next dev servers running concurrently. Database is Supabase `eu-north-1`, reached from India: **136 ms round trip per query** (measured with `psql \timing`, 3 runs: 136.1 / 136.9 / 137.0 ms). Production API-to-DB latency will differ, but every *query-count* multiplier reported below applies unchanged.

Throughout: **[M]** = measured, **[E]** = estimated or inferred from code.

---

## 1. What actually exists

### 1.1 Directory structure (real)

```
upllyft/
├── apps/
│   ├── api/            NestJS 11 on Express 4, Prisma 6, Socket.IO      (port 3001)
│   ├── landing/        Next 16.1.6 marketing site, isolated, three.js   (port 3008)
│   ├── web-main/       Hub: dashboard, feed, profile, admin console      (port 3000)  60 pages
│   ├── web-community/  Posts, Q&A, events, crisis                        (port 3002)  22 pages
│   ├── web-screening/  Developmental screenings, reports                 (port 3003)   8 pages
│   ├── web-booking/    Therapist marketplace, sessions                   (port 3004)  22 pages
│   ├── web-resources/  Worksheets, assignments, library                  (port 3005)  10 pages
│   ├── web-cases/      Case management, IEPs (has route groups)          (port 3006)  36 pages
│   ├── web-admin/      Clinic admin                                      (port 3007)  11 pages
│   └── mobile/         Expo 54 / RN 0.81 / expo-router 6 (own axios client)
├── packages/
│   ├── ui/             @upllyft/ui   — 37 components, 3 layouts, raw TS, 157-export barrel
│   ├── api-client/     @upllyft/api-client — axios, AuthProvider, notifications, nav-config
│   ├── types/          @upllyft/types — types only
│   └── config/         tsconfig/eslint presets + orphaned Tailwind v3 config
├── turbo.json          build/dev/lint/type-check, no `inputs`, no remote cache
└── pnpm-workspace.yaml apps/*, packages/*
```

### 1.2 Per-app stack

| App | Framework | Router | State | Data fetching | Styling | Build | Route folders / pages |
|---|---|---|---|---|---|---|---|
| web-main | Next 16.1.6, React 19.2.3 | App Router + no-op `src/proxy.ts` | TanStack Query 5.90.20, custom `MiraProvider` | TanStack + axios; 48 `useQuery`, 65 `useEffect` | Tailwind 4.1.18, framer-motion, lucide 0.563 | `next build` (Turbopack default) | 24 / 60 |
| web-community | same | App Router | TanStack Query | 29 `useQuery` | Tailwind 4, react-markdown | same | 7 / 22 |
| web-screening | same | App Router | TanStack Query | 16 `useQuery` | Tailwind 4, recharts | same, `proxyTimeout: 120_000` | 3 / 8 |
| web-booking | same | App Router | TanStack Query | 26 `useQuery` | Tailwind 4, date-fns, lucide 0.575 | same | 10 / 22 |
| web-resources | same | App Router | TanStack Query | 28 `useQuery` | Tailwind 4 | same | 9 / 10 |
| web-cases | same | App Router, route groups `(cases)`/`(nursery)` | TanStack Query | 60 `useQuery`, 100 `useMutation` | Tailwind 4, RHF, zod 3, lucide 0.468 | same | 3 / 36 |
| web-admin | same | App Router | TanStack installed, **1** `useQuery` | 26 raw `useEffect`+`Promise.all` | Tailwind 4, recharts, lucide 0.468 | same | 7 / 11 |
| landing | same | App Router (`app/`, not `src/app`) | none | none | Tailwind 4, framer-motion, **three.js + R3F + drei** | same | 0 / 1 |
| api | NestJS ^11.1.6 on **Express** (not Fastify, despite CLAUDE.md) | — | — | Prisma ^6.18 | — | `nest build` w/ 4 GB heap | ~105 controllers |
| mobile | Expo ~54, RN 0.81.5, React 19.1.0 | expo-router | RHF + zod 4 | raw axios, socket.io-client | RN StyleSheet | `expo start` | — |

**Rendering strategy [M]:** 154 of 159 `page.tsx` files begin with `'use client'`. The only server components are the seven root `layout.tsx` files. No route handlers, no server `fetch`, no `generateStaticParams`, no `loading.tsx`/`error.tsx` anywhere. Each app is a client-side SPA that uses the App Router purely as a file-system router.

### 1.3 How the frontends are composed at runtime

**Verdict: seven independent Vercel deployments on seven subdomains, stitched together only by a shared auth cookie and hard `<a href>` links.** No Module Federation, no multi-zones, no microfrontends, no iframes.

Evidence:

- `packages/api-client/src/nav-config.ts:3-11` defines seven absolute origins:
  ```ts
  export const APP_URLS = {
    main:      process.env.NEXT_PUBLIC_APP_MAIN_URL      || (isProd ? 'https://app.safehaven-upllyft.com'       : 'http://localhost:3000'),
    community: process.env.NEXT_PUBLIC_APP_COMMUNITY_URL || (isProd ? 'https://community.safehaven-upllyft.com' : 'http://localhost:3002'),
    ...
  ```
- Each app's `vercel.json` is a separate project: `"buildCommand": "cd ../.. && pnpm turbo build --filter=@upllyft/web-main"` (`apps/web-main/vercel.json:2`). No `rewrites`, `routes`, or `regions` in any of the 8 files.
- All seven product `next.config.ts` files are byte-identical apart from web-screening's `proxyTimeout` and contain no `basePath`/`assetPrefix` (`apps/web-main/next.config.ts:13-41`).
- `X-Frame-Options: DENY` on every route (`next.config.ts:7`) rules out iframe composition.
- Repo-wide grep for `basePath|assetPrefix|@vercel/microfrontends|ModuleFederation|<iframe|microfrontends.json` returns nothing.
- Cross-app session: `packages/api-client/src/client.ts:10-22` writes the JWT into a `.safehaven-upllyft.com` parent-domain cookie and mirrors it into per-origin `localStorage`.
- **Every API call is proxied through each app's own Next server**: `next.config.ts:33-40` rewrites `/api/:path*` to the API origin and `client.ts:63` sets `baseURL: '/api'`. In production that is browser → Vercel function → Railway → back, for every request including the 30 s notification poll.

### 1.4 Shared dependencies and duplication [M]

Resolved versions per workspace (`pnpm ls -r --depth 0`):

| Package | Versions in lockfile | Where |
|---|---|---|
| `lucide-react` | **0.468.0, 0.563.0, 0.575.0** | admin+cases 0.468; main+`@upllyft/ui` 0.563; booking 0.575 |
| `zod` | 3.25.76, 4.3.6 | cases (3), mobile (4) — separate bundles, harmless |
| `@hookform/resolvers` | 3.10.0, 5.2.2 | cases, mobile — harmless |
| `react` / `react-dom` | 19.2.3, 19.1.0 | all web 19.2.3; mobile 19.1.0 — harmless |
| `@radix-ui/react-dialog` | 1.1.x ×3 peer variants | landing declares its own; ui declares its own |
| `next`, `@tanstack/react-query`, `tailwindcss`, `axios` | single version each | ✅ |

**Bundled more than once at runtime:** web-admin, web-cases and web-booking each resolve a different `lucide-react` than `@upllyft/ui` does, so those three apps ship **two copies of the icon library** (their own plus the one inside the shared header) **[E — inferred from the resolution table; not decompiled from chunks]**.

**Duplicated across apps by design:** every one of the seven apps ships its own copy of React, the Next runtime, 17 Radix packages, TanStack Query, axios, `@upllyft/ui` and `@upllyft/api-client`. Measured per-app totals are in §2.1. A user who visits four apps downloads and hydrates the same framework four times.

Other duplication: `Mira.png` (1,648 KB) is checked in **6 times** (`public/`, web-main, web-community, web-booking, web-resources, web-screening); the `@theme` teal palette is copy-pasted into all seven `globals.css`; `providers.tsx` is byte-identical in six apps; `formatTimeAgo` is copy-pasted into 4+ page files. `lottie-react` is declared in `apps/web-main/package.json` but imported nowhere.

---

## 2. Measurements

### 2.1 Production builds (`next build`, Turbopack, one app at a time) [M]

Times are wall-clock on the audit machine with seven dev servers competing for 4 cores; treat them as relative. Sizes are exact.

| App | Build time | Compile step | `.next/static` | JS chunks | JS raw | JS gzip |
|---|---|---|---|---|---|---|
| web-main | 410 s (cold Turbopack cache + tsc of the largest app) | 78 s | 2,285 KB | 78 | 1,892 KB | **561 KB** |
| web-community | 78 s | 16.7 s | 1,777 KB | 35 | 1,492 KB | 443 KB |
| web-booking | 31 s | 12.1 s | 1,896 KB | 32 | 1,620 KB | 474 KB |
| web-screening | 39 s | 14.6 s | 1,821 KB | 24 | 1,566 KB | 453 KB |
| web-resources | 27 s | 7.0 s | 1,239 KB | 20 | 1,003 KB | 303 KB |
| web-cases | 27 s | ~9 s | 1,779 KB | 54 | 1,442 KB | 434 KB |
| web-admin | 24 s | ~8 s | 1,796 KB | 23 | 1,565 KB | 450 KB |
| landing | 92 s | 17.3 s | 2,037 KB | 13 | 1,683 KB | 476 KB |

Note: four builds (booking, resources, cases, admin) initially failed on a type error introduced by a fix made earlier today (SUPERADMIN role vs. the shared `UserRole` enum). The enum was corrected and those apps rebuilt; that is the only code touched during this session and it is unrelated to performance.

### 2.2 Bundle composition [M for sizes, E for attribution]

Turbopack production chunks are hashed and minified, so attribution was done by matching library signature strings inside each chunk rather than by an analyzer plugin (installing `@next/bundle-analyzer` would have required editing `next.config.ts` and a webpack build, which was out of scope). Sizes are exact; the "why" column is inferred from the import graph.

**15 largest modules across the suite (raw KB / gzip KB):**

| # | Module | Size | Apps | Why it is there |
|---|---|---|---|---|
| 1 | three.js + @react-three/fiber + drei + postprocessing | 805 / 210 (+93/23 +22/7) | landing | 3D hero on the single marketing page, imported statically in a `'use client'` page |
| 2 | recharts | 366 / 97 (screening), 373 / 99 (admin) | web-screening, web-admin | Imported statically at `apps/web-screening/src/app/page.tsx:49` (the app's **home** route) and in three web-admin pages; no `next/dynamic` anywhere |
| 3 | `@upllyft/ui` barrel + 17 Radix packages + lucide-react | 230–314 / 67–96 | **all 7 apps** | `AppHeader` is imported from a 157-export barrel with no `sideEffects: false` (`packages/ui/src/index.ts`, `packages/ui/package.json`); every page pays for the whole design system |
| 4 | Next app-router runtime + react-dom | 219 / 68 + 109 / 30 + 48 / 11 | all | Framework; unavoidable per app, but paid **7×** across the suite |
| 5 | framer-motion | 132 / 44 | web-main, every route | `MiraFab`/`MiraPanel` mounted unconditionally in `apps/web-main/src/app/providers.tsx:28-29` |
| 6 | react-markdown + micromark/remark/hast | 132 / 39 | web-community | Static import in `posts/create/page.tsx:5`; route-scoped but not lazy |
| 7 | polyfills chunk | 110 / 39 | all | Next's legacy-browser polyfill, served with `noModule` — **not** downloaded by modern browsers (verified in the served HTML) |
| 8 | axios + `@upllyft/api-client` | 70 / 25 | all | Importing `APP_URLS` (a constants file with zero imports) drags in the whole client via the barrel `packages/api-client/src/index.ts:8` |
| 9 | TanStack Query | ~40 / 12 + query hooks 25–60 / 7–15 | all | Legitimate; hooks are spread across many small chunks |
| 10 | date-fns | inside 70 / 18 and 63 / 16 chunks | web-booking | Named imports, tree-shaken; fine |
| 11 | zod 3 + react-hook-form | inside route chunks | web-cases | Forms; legitimate |
| 12 | second copy of lucide-react | [E] | web-admin, web-cases, web-booking | Version mismatch with `@upllyft/ui` (§1.4) |
| 13 | monolithic page chunks: onboarding (1,780 lines), screening home (1,313), community home (1,186), screening report (1,151) | route-own chunks up to ~50 KB gz | main, screening, community | Single `'use client'` files; nothing renders until the whole chunk executes |
| 14 | `NotificationBell` + `CommandPalette` + `MiraNudge` | inside the ui barrel chunk | all | Exported from the barrel, so present even in apps that never render them |
| 15 | `lottie-react` | 0 (not bundled) | web-main | Declared, never imported; dead dependency |

### 2.3 Chunks loaded on first paint vs. on route change [M]

Measured on the **production** build of web-main (`next start`, port 3100), logged in, browser cache disabled unless stated:

| Scenario | Requests | JS files | JS wire | CSS | API calls | DCL | Last byte |
|---|---|---|---|---|---|---|---|
| Dashboard `/`, cold | 24 | **14** | **301 KB** | 1 (17 KB) | 6 | 280 ms | **5,902 ms** |
| Dashboard `/`, warm (all JS from cache) | 24 | 14 | 0 KB | 1 | 6 | 35 ms | **4,946 ms** |
| `/feed`, cold | 22 | 13 | 296 KB | 1 | 6 | 169 ms | 5,130 ms |
| `/settings`, warm | 20 | 13 | 0 KB | 1 | 4 | 29 ms | 4,580 ms |
| **Route change via header (Feed, Profile)** | same as a full load | 13–14 | 0 KB (cached) | 1 | 6 | — | 4–5 s |

Key reading: with JS fully cached, the page still takes **~5 s** to finish loading. The bytes are not the problem; the **re-bootstrap** is. Every header link is a full document load (see §3.A), so "route change" and "initial load" are the same event.

A true client-side transition (only possible on the few `next/link` sites) would fetch **1–3 route-own chunks, 5–50 KB gz [E]** and no auth calls.

Static asset headers from `next start` [M]: JS chunks `Cache-Control: public, max-age=31536000, immutable` + gzip ✅; HTML `s-maxage=31536000` with prerender ✅; `Mira.png` **1,687,819 bytes, `Cache-Control: public, max-age=0`** ✗.

### 2.4 API hot paths: latency, query counts, compression [M]

Direct to the API (`127.0.0.1:3001`), admin account, `pg_stat_statements` delta per single request (counts include ~3 pooler bookkeeping statements per connection checkout: `get_auth`, `DEALLOCATE ALL`, `DISCARD ALL`):

| Endpoint | HTTP time | DB statements | Raw bytes | Notes |
|---|---|---|---|---|
| `GET /auth/me` | **1.89 s** | 9 | 3,553 | Blocks first paint in every app; 4-level `include`, no `select` |
| `GET /profile/me` | 1.64 s | 8 | 378 (proxied) | Called on every web-main page via root-mounted Mira panel |
| `GET /notifications/unread-count` | 0.86 s | 5 | 97 | Polled every 30 s per tab, per app |
| `GET /notifications?limit=20` | 0.85 s | 7 | 535 | |
| `GET /posts?limit=10` | 2.49 s | 12 | 28,732 (limit 20) | Per-post `vote`/`bookmark` lookups are batched by Prisma into 2 `IN` queries, so this is *not* the 22-query N+1 the code suggests, but the payload carries `embedding Float[]` for every post before an interceptor strips it |
| `GET /feeds/personalized?limit=10` | **4.92 s** | **39** | 9,651 | Per-candidate scoring; the 5-minute cache is actually a **300 ms** cache (§5) |
| `GET /marketplace/therapists?limit=9` | 1.25 s | 9 | 39,321 (unpaged) | Full therapist profiles incl. `emiratesId`, `stripeAccountId` |
| `GET /admin/stats` | **4.17 s** | 19 | 190 | 8 full-table `COUNT(*)`, 4 serial tiers |
| `GET /community/browse?limit=3` | 2.58 s | 12 | 1,571 | |
| `GET /mira/conversations` | 1.15 s | 6 | — | Unbounded `findMany`; dashboard reads `data[0]` only |
| `GET /marketplace/bookings?status=CONFIRMED` | 1.52 s | 7 | — | Unbounded; client slices to 5 |

**Compression [M]:** the API sets **no `Content-Encoding`** even when `Accept-Encoding: gzip, br` is sent (raw `Content-Length: 28732` for `/posts`). Only a weak Express `ETag` and `Vary: Origin`; **no `Cache-Control` on any data endpoint**. In the current topology the Next proxy re-compresses responses on the way through (3,553 → 1,971 bytes for `/auth/me`), which is the only reason the browser sees gzip at all.

**Per-page API waterfall [M, dev and prod identical in shape]:**

```
    65 →  2243   GET /api/profile/me        ┐ tier 1 — nothing else starts until /auth/me resolves
    66 →  2389   GET /api/auth/me           ┘
  2410 →  3359   GET /api/notifications/unread-count   ┐
  2411 →  4290   GET /api/marketplace/bookings?...     │ tier 2 — parallel
  2411 →  4984   GET /api/posts?limit=4                │
  2412 →  3858   GET /api/mira/conversations           ┘
```

Two serial tiers, 2.2 s + 2.6 s. This exact waterfall repeats on **every** header click and on every hop between apps. (In dev the `unread-count` call appears twice; that is React StrictMode double-invoking the effect and is not present in production.)

---

## 3. Navigation diagnosis

| Hypothesis | Verdict | Evidence |
|---|---|---|
| **A. Full page reload instead of client transition** | **CONFIRMED — root cause** | `packages/ui/src/layouts/AppHeader.tsx` has no `next/link` import; logo (`:114`), top nav (`:131`), dropdown children (`:148`), **app-local nav (`:163`)**, account menu (`:231,239,245,254,261`), mobile drawer (`:297,316,331`) are all `<a href>` with absolute URLs from `nav-config.ts`. Sidebars too: `apps/web-main/src/app/admin/layout.tsx:158`, `apps/web-admin/src/components/admin-sidebar.tsx:107`, `apps/web-cases/src/components/case-detail-sidebar.tsx:87,109`, `apps/web-main/src/app/feed/page.tsx:185`. Shared cards: `packages/ui/src/components/PostCard.tsx:67`, `ModuleCard.tsx:23`, `WorksheetCard.tsx:110`, `TherapistCard.tsx:95`. Hard reloads: `NotificationBell.tsx:75` (`window.location.href = actionUrl`), `web-admin/src/app/outcomes/page.tsx:285`, `web-resources/src/app/assignments/page.tsx:249`, and a **hard-coded `http://localhost:3004`** at `web-admin/src/app/therapists/schedule/page.tsx:409`. `next/link` adoption: web-cases 0, web-admin 0, web-resources 0, web-main 6 files. |
| **B. No route-level code splitting / lazy loading** | **CONFIRMED** | 0 `next/dynamic`, 0 `React.lazy`, 0 `loading.tsx`/`error.tsx` in all apps. recharts static at `web-screening/src/app/page.tsx:49`, `web-admin/src/app/{outcomes:39,reports:30,patients/[id]:40}`; framer-motion at `web-main/src/components/mira/mira-{fab:4,panel:4}.tsx` mounted in `providers.tsx:28-29`. No `experimental.optimizePackageImports`. |
| **C. No prefetching** | **CONFIRMED** | 0 hits for `prefetch`, `prefetchQuery`, `HydrationBoundary`, `dehydrate`. No server components with data. `router.push` (used 173×) never prefetches. |
| **D. Shared shell re-mounting** | **CONFIRMED** | `<AppHeader>` is rendered *inside* 20+ web-main `page.tsx` files (`app/page.tsx:93`, `feed/page.tsx:166`, `profile/page.tsx:47`, `settings/page.tsx:135`, …); `CommunityShell`/`BookingShell`/`AdminShell`/`ResourcesShell`/`ScreeningShell` are opened inside every page rather than a layout. Only `web-cases/src/app/(cases)/layout.tsx:33` does it right. Every transition remounts header → `NotificationBell` → `useNotifications` → new `unread-count` request + new 30 s timer. |
| **E. Auth/session re-fetched per route** | **CONFIRMED** | `packages/api-client/src/hooks/useAuth.tsx:42-96`: plain `useState`/`useEffect`, no query cache, runs once per document load — which, given A, is nearly every navigation. Expired-token path is 3 serial requests (`/auth/me` 401 → `/auth/refresh` → `/auth/me`, `:71-89`). Request interceptor rebuilds a `RegExp` and parses `document.cookie` per request (`client.ts:29-32,83-98`). `apps/web-main/src/proxy.ts` matches every non-asset request and returns `NextResponse.next()` unconditionally. |
| **F. Blocking fetches in guards / page tops** | **CONFIRMED** | Dashboard `apps/web-main/src/app/page.tsx:77-83` returns a full-screen spinner until `isLoading || !isAuthenticated || !onboardingChecked`; `getOnboardingStatus()` (`:57`) runs only after auth, and `ParentDashboard`'s 4 queries only after that — **3 serial tiers**. Every shell (`booking-shell.tsx:12-18`, `community-shell.tsx:15-21`, `screening-shell.tsx`, `resources-shell.tsx`, `(cases)/layout.tsx:12-18`) blanks the whole viewport on `isLoading`. `(cases)/[id]/layout.tsx:37,50-69` hides the sidebar and tab strip while the case loads. `role-guard.tsx:20-32`, `community-shell.tsx:24`, `(cases)/layout.tsx:21,27` redirect **during render**. |
| **G. Waterfalls** | **CONFIRMED** (frontend) + **CONFIRMED** (backend) | Frontend: §2.4 waterfall. Backend: `profile.service.ts:27,42`, `users.service.ts:15,90`, `admin.service.ts:58,67,75,82`, `cases.service.ts:209,250`, `booking.controller.ts:49,54`, `matching.service.ts:21-60` (3 serial awaits before the main query) — independent awaits not in `Promise.all`. |
| **H. No caching / repeated identical calls** | **PARTIAL** | TanStack is used well in 5 apps but `staleTime: 60_000` with `refetchOnWindowFocus` and `refetchOnMount` left at default `true` (`apps/web-*/src/app/providers.tsx:13-16`), so every tab focus and every shell remount refetches. `/auth/me` and `/notifications/unread-count` live outside the cache entirely. web-admin has 26 raw `useEffect` fetches and **1** `useQuery`. `/profile/me` is requested on every web-main page because `mira-panel.tsx:16` calls `useMyProfile()` from the root provider tree. Server side: no `Cache-Control`, no Redis, and the in-memory caches have a **units bug** (§5). |

**Summary of a single "click Feed in the header" today [M]:** full document load → 13 JS files (cached) → hydrate → `/auth/me` + `/profile/me` (2.2 s) → `unread-count` + page queries (2.6 s) → content. Roughly **5 s of which ~4.8 s is API waiting**, on a warm cache.

---

## 4. Runtime and rendering

Global facts [M, repo-wide grep]: `React.memo` **0** uses; `useTransition`/`useDeferredValue` **0**; virtualization libraries **0**; `next/image` **0** (45 raw `<img>`, none with `loading`, `width`/`height`); `next/script` **0**; `next/font` used only in landing.

| Area | Finding | Evidence |
|---|---|---|
| Context re-renders | `MiraProvider` value is a fresh object literal each render with 18 fields incl. `messages`; `setMessages` runs **per streamed SSE token**; `ParentDashboard` subscribes to the whole context for `mira.open` → the dashboard re-renders hundreds of times per Mira reply | `apps/web-main/src/components/mira/mira-context.tsx:113-121,282-305`; `components/dashboard/parent-dashboard.tsx:24` |
| | `AuthProvider` value not memoized (63 consumers; callbacks are memoized, so low impact today) | `packages/api-client/src/hooks/useAuth.tsx:143-152` |
| | `useNotifications` returns a new object each render; `deleteNotif` depends on `[notifications]` | `useNotifications.tsx:99-125` |
| Root-level timers on every page of every app | 30 s `setInterval` poll (`useNotifications.tsx:59`); 30 s decorative pulse in `SOSButton.tsx:19` (mounted twice per page in community); neither pauses on hidden tabs | `packages/ui/src/layouts/AppHeader.tsx:181,204` |
| Expensive lists | Feed: `onVoteChange={() => refetch()}` on an **infinite query** — one upvote refetches every loaded page sequentially, even though `post-card.tsx:35` already applies an optimistic update | `apps/web-main/src/app/feed/page.tsx:314` |
| | Feed search is undebounced and part of the `queryKey` → a network request per keystroke that discards the accumulated pages | `feed/page.tsx:106,293` |
| | `data.pages.flatMap(...)` un-memoized on every render | `feed/page.tsx:160` |
| | Cases sidebar fetches `limit: 100` then 5 `.filter()` passes per render for six badge numbers | `apps/web-cases/src/components/cases-sidebar.tsx:35-45` |
| | find-care fetches 50 therapists + 50 clinics to compute one count | `apps/web-booking/src/app/find-care/page.tsx:66-77` |
| | Discovery renders 100 un-memoized cards; any filter click re-renders all | `apps/web-booking/src/app/discovery/page.tsx:400` |
| | Community `PostCard` is 200+ lines with 4 `useState` + 4 mutation hooks per card, not memoized | `apps/web-community/src/app/page.tsx:282` |
| Sync work on mount | Same `localStorage.getItem` + `JSON.parse` executed twice in two `useState` initializers; `JSON.stringify` + `setItem` of the whole answer map on **every** tap | `apps/web-screening/src/app/[id]/questionnaire/page.tsx:55,67,79-86` |
| | `localStorage` reads inside `useState` initializers (render-time + hydration mismatch) | `parent-dashboard.tsx:25,34`; `moments-shell.tsx:49`; `find-care/page.tsx:46`; `book/[therapistId]/page.tsx:180`; `packages/ui/src/mira-nudge.tsx:32` |
| | 141 `toLocale*String` call sites construct a throwaway `Intl.DateTimeFormat` per row | `NotificationBell.tsx:51`; `web-admin/src/app/patients/page.tsx:46,56` |
| Images | `Mira.png` 1,648 KB rendered at 40–56 px, `max-age=0`, in 5 apps | `packages/ui/src/mira-nudge.tsx:70`; `parent-dashboard.tsx:216`; `mira-avatar.tsx:23` |
| | No `images` config in any product `next.config.ts`; landing has the deprecated empty `images.domains` | `apps/landing/next.config.ts:6-8` |
| | Unsized remote banners/avatars (CLS) | `web-cases/src/components/case-list.tsx:42`; `web-community/src/app/events/[id]/page.tsx:121`; `web-booking/src/app/discovery/page.tsx:433` |
| Fonts | All 7 product apps declare `--font-sans: "Inter"` but load no font file, so they silently render `system-ui`. Zero font bytes today; fixing the design bug must use `next/font` or it will add a render-blocking request | `apps/web-main/src/app/globals.css:18`; all others |
| Third-party scripts | None. No analytics, no chat widget, no Stripe.js, no Maps. Firebase and socket.io are server/mobile only. ✅ | — |
| CSS | Tailwind v4, global CSS ≤ 7 KB per app, 2-deep import chain, no unused frameworks. ✅ Orphaned `packages/config/tailwind.config.js` | — |
| `@upllyft/ui` barrel | 157 exports over raw TS, **no `sideEffects: false`** → `import { cn } from '@upllyft/ui'` reaches 17 Radix packages, lucide, `AppHeader`, axios | `packages/ui/src/index.ts`; `packages/ui/package.json` |

---

## 5. Backend and network

JWT strategy is DB-free (`apps/api/src/auth/strategies/jwt.strategy.ts:26-45`) and all guards are in-memory ✅. Everything else on the hot path has a problem.

| Area | Finding | Evidence |
|---|---|---|
| **Cache TTL units bug** | `cache-manager` v5 takes **milliseconds**; every call passes `300` intending 5 minutes → all in-memory caches expire in **300 ms**. The per-post personalization score cache that is supposed to make `/feeds/personalized` viable is effectively off, which is why it costs 39 statements / 4.9 s per request | `apps/api/src/feeds/feeds.service.ts:79`; `personalization.service.ts:176`; `feeds.module.ts:15`; `posts.module.ts:21`; `ai.module.ts:12` |
| Personalized feed | Per candidate post (default 60): `userInterests.findMany` + `userPreferences.findUnique` (with a **`create` inside a GET**) + `follow.findUnique` + `feedInteraction.count` with a relation filter and no supporting index; plus `calculateUserInterests` loads 100 full posts **with embeddings** and fans out `userInterests.upsert` writes | `feed-algorithm.service.ts:15-26`; `personalization.service.ts:16-21,58-83,109,132-150` |
| `/auth/me` | No `select`; 4-level `include`; returns `User.embedding Float[]` and `password`, which a global interceptor then deep-clones the response to strip | `auth.service.ts:554-563`; `common/interceptors/exclude-fields.interceptor.ts:22-69` (registered globally at `app.module.ts:271-275`) |
| `/posts`, `/questions` | `post.findMany` without `select` → `embedding`, full `content`, `metadata`, `insights`, `moderationNotes` per post. `questions.service.ts:696-724` does a true 2-per-question N+1 (`findUnique` + `findFirst`, the latter not batchable). `console.log(JSON.stringify(where))` per request at `questions.service.ts:217` | `posts.controller.ts:561-607` |
| Unbounded queries | `therapist.controller.ts:90` drops `take` whenever `childId`/`concern` is present (the screening→booking path); `booking.service.ts:489-504,517-528`; `mira.service.ts:527-537` | |
| Missing composite indexes [E from schema] | `Notification(userId, read)` — polled every 30 s per tab; `Notification(userId, createdAt)`; `Post(isPublished, createdAt)`; `Post(communityId, createdAt)`; `User.updatedAt` (used by two `COUNT`s); `Booking(therapistId, status)`, `(patientId, status)`; `Case(primaryTherapistId, status)`; `CaseTherapist(therapistId, removedAt)`; `Question.moderationStatus` (no index at all); `Event(status, isCancelled, startDate)`; `TherapistProfile(isActive, acceptingBookings)`; `FeedInteraction(userId, action)`; `MiraConversation(userId, updatedAt)`. Three **redundant** `@@index` on columns already `@unique` (`schema.prisma:200,205,206`) | `apps/api/prisma/schema.prisma:783-785,467-469,200-206,2043-2047,2917-2921,1104-1110,398-405,1845-1847,548,4462-4464` |
| Compression / caching | No `compression` middleware (not even a dependency); no `Cache-Control` on any endpoint; `helmet` installed but never used; `cache-manager-redis-store` installed but never used; **no Redis anywhere** (only Supabase clients) | `apps/api/src/main.ts`; `package.json:46,69-70,86` |
| Per-request overhead | `express-session` with default **MemoryStore** (leaks, single-process) for JWT-authenticated routes; `passport.session()` on every request; 10 MB body limits on all routes; `LoggingInterceptor` generating a UUID and logging request+response; `ExcludeFieldsInterceptor` deep-cloning every response; in-memory `ThrottlerGuard` (per replica) | `main.ts:52-75,119-127`; `app.module.ts:262-275` |
| Prisma clients | `PrismaService` registered **4 times** (`prisma.module.ts:7`, `app.module.ts:257`, `billing.module.ts:9`, `organizations.module.ts:10`) → 4 `PrismaClient` instances, 4 pools, "Database connected successfully" printed 4× at boot [M] | |
| Writes inside GETs | `profile.service.ts:50,67,91-102` (auto-heal + completeness update), `personalization.service.ts:58-83,109` | |
| Static uploads | Avatars written to `./uploads/avatars` and returned as `/uploads/...` URLs, but **no static handler is registered** — they 404, and the Railway filesystem is ephemeral | `users.controller.ts:83-110`; `verification.service.ts:20,43` |
| Socket.IO | Gateways are DB-free on connect ✅, but rooms are held in a per-process `Map` with **no Redis adapter**, so multi-replica broadcasts silently drop; this is why the 30 s HTTP poll cannot be retired. `cors: { origin: '*', credentials: true }` on gateways | `notification.gateway.ts:19-30`; `messaging.gateway.ts:18-21` |
| Frontend network config | Every `/api/*` call is proxied through the Next server (extra hop + function invocation); no `Cache-Control` in `headers()`; no `images`; no `regions` in any `vercel.json` | `apps/web-*/next.config.ts:33-40`; `apps/*/vercel.json` |
| CDN / fingerprinting | Next static chunks are fingerprinted and `immutable` ✅ (measured); public assets like `Mira.png` are `max-age=0` ✗ | §2.3 |

---

## 6. Architecture verdict

**The seven-app split is not justified by the code, and it is the single largest contributor to the navigation problem.**

**What it costs today [M unless noted]:**

- **Duplicated bundles:** seven copies of React + Next runtime + Radix + TanStack + axios + `@upllyft/ui`, ~300–350 KB gzip of shared framework per app. A parent doing the core journey (hub → screening → booking → resources) downloads ~1.2 MB gz of identical code four times and hydrates four separate React trees.
- **Duplicated runtime:** each hop re-runs `AuthProvider` → `/auth/me` (1.9 s) + `/profile/me` + `unread-count`, discards the TanStack cache, restarts timers. That is ~2.2 s of pure re-bootstrap per cross-app hop, before any page data.
- **Cross-app navigation penalty:** every hop is a full document load; there is no way to prefetch the destination app's chunks or data. The header, the one thing meant to unify the product, is what makes every click a reload.
- **Operational drag:** 7 Vercel projects, 7 `vercel.json`, 8 `NEXT_PUBLIC_*_URL` variables, 7 byte-identical `next.config.ts`/`providers.tsx`/`globals.css`, a parent-domain cookie dance in `client.ts` with explicit cross-subdomain logout reconciliation, and a shared-package graph that is type-checked and bundled 7× per CI run.

**Do the boundaries justify it?** No evidence that they do:

- One repository, one CI workflow, one `pnpm-lock.yaml`, identical pinned versions everywhere, one shared design system, one shared auth client, one API. There is no sign of independent teams, independent release cadences, or differing tech choices — which are the only reasons to accept the cost of separate apps.
- The apps are not domain-isolated in practice: web-main hosts an `/admin` console *and* there is a web-admin app; `/profile/me` is called by main, booking and screening; the header links every app to every other.
- The one app that benefits from the split (landing, with three.js) already has zero shared dependencies and could stay separate regardless.

**Options**

| | (a) Keep and optimize | (b) Merge into one Next app with route-level splitting | (c) Restructure the composition layer (multi-zones / Vercel microfrontends on one domain) |
|---|---|---|---|
| What changes | Fix links, layouts, auth cache, API; leave seven deploys | Move `web-*/src/app/*` under one `apps/web/src/app/{community,screening,booking,...}` route groups; one `providers.tsx`, one header, one deploy; landing stays separate | Keep seven apps, put them behind one domain with path-based routing so cookies/URLs simplify |
| Intra-app navigation | Fixed (client transitions) | Fixed | Fixed (same work as a) |
| Cross-app navigation | Still a full reload + re-auth (~1 s after API fixes [E]) | **Becomes an ordinary client transition** with prefetch | Still a full reload across zone boundaries; multi-zones do not soft-navigate between zones |
| Bundle duplication | Unchanged (7× framework) | Eliminated; shared chunks load once | Unchanged |
| Effort | Small–medium | Large but **mechanical**: the apps already share stack, config, providers, header and auth; the work is moving files, de-duplicating 6 identical providers, rewriting `APP_URLS` to relative paths (125 references, 40 files), and resolving route-name collisions (`/admin` in main vs web-admin, `/[id]` in resources/screening) | Medium, adds a routing layer and a new failure mode; solves the cookie problem but not the performance one |
| Risk | Low | Medium (big diff, but each app can be moved one at a time behind the existing `APP_URLS` indirection) | Medium |

**Recommendation: (b), sequenced behind Phase 1.** Do the quick wins first because every one of them carries over into the merged app unchanged. Then merge the six product apps into one Next application (landing stays separate). Option (c) spends effort on the composition layer without removing the cost that composition imposes; option (a) leaves a ~1 s floor on every cross-app click and 7× the bundle forever. Push-back, stated plainly: this codebase is one product built by what looks like one team, and it is paying microservice-frontend costs without getting microservice-frontend benefits.

If you do have separate teams that ship these apps on independent cadences, tell me — that is the one fact that would change this recommendation to (a) plus Vercel microfrontends for prefetch.

---

## 7. Prioritized fix table

Impact scale: H = user-visible seconds or major bytes on every page; M = noticeable on specific flows; L = hygiene. Effort: S < 1 day, M = days, L = weeks. Sorted by impact-to-effort within each phase.

### Phase 1 — quick wins, no architectural change

| # | Issue | Evidence (file:line) | Est. impact | Effort | Risk | Phase |
|---|---|---|---|---|---|---|
| 1 | Cache TTL is 300 ms, not 5 min (cache-manager v5 uses ms) | `apps/api/src/feeds/feeds.service.ts:79`, `personalization.service.ts:176`, `feeds.module.ts:15`, `posts.module.ts:21`, `ai.module.ts:12` | H — personalized feed 4.9 s → sub-second on cache hit [E] | S | L | 1 |
| 2 | Header and sidebars use `<a href>` with absolute URLs for **same-app** routes | `packages/ui/src/layouts/AppHeader.tsx:114,131,148,163,231-261`; `nav-config.ts:58-88`; `web-main/src/app/admin/layout.tsx:158`; `web-admin/src/components/admin-sidebar.tsx:107`; `web-cases/src/components/case-detail-sidebar.tsx:87` | H — intra-app clicks go from ~5 s reload to a client transition; removes `/auth/me` + `/profile/me` + `unread-count` from every click | S–M (emit relative `href` when `item.app === currentApp`, render `next/link`) | L | 1 |
| 3 | `Mira.png` 1.6 MB at 56 px, `max-age=0`, duplicated 6× | `apps/*/public/Mira.png`; `packages/ui/src/mira-nudge.tsx:70`; `parent-dashboard.tsx:216` | H — −1.6 MB per cold load on the main parent surfaces | S (resize to ≤112 px WebP, one copy) | L | 1 |
| 4 | No `compression` on the API; no `Cache-Control` | `apps/api/src/main.ts` (absent) | H once the proxy hop is removed (#12); M today | S | L | 1 |
| 5 | `/auth/me` has no `select`; returns embedding + password + 4-level include | `apps/api/src/auth/auth.service.ts:554-563` | H — the endpoint that gates every first paint; fewer statements, ~10× smaller row | S | L | 1 |
| 6 | `post.findMany` without `select` ships `embedding Float[]` per post; global deep-clone interceptor strips it after the fact | `posts.controller.ts:561`; `exclude-fields.interceptor.ts:22-69` | H — feed payload and CPU per response | S | L | 1 |
| 7 | `onVoteChange={() => refetch()}` on an infinite query | `apps/web-main/src/app/feed/page.tsx:314` | M — one vote = N sequential page refetches | S (delete; optimistic update exists at `post-card.tsx:35`) | L | 1 |
| 8 | `@upllyft/ui` barrel has no `sideEffects: false`; no `optimizePackageImports` | `packages/ui/package.json`; all `next.config.ts` | M — first-load JS in all 7 apps [E: 50–150 KB gz] | S | L (verify `styles.css` import still applies) | 1 |
| 9 | `MiraFab`/`MiraPanel` (framer-motion, 44 KB gz) and `useMyProfile()` mounted on every web-main route | `apps/web-main/src/app/providers.tsx:28-29`; `mira-panel.tsx:4,16` | M — −44 KB gz and −1 API call per page | S (`next/dynamic`, lazy profile) | L | 1 |
| 10 | recharts imported statically on the screening **home** page and 3 admin pages | `web-screening/src/app/page.tsx:49`; `web-admin/src/app/{outcomes:39,reports:30,patients/[id]:40}` | M — −97 KB gz on those first loads | S (`next/dynamic`) | L | 1 |
| 11 | TanStack defaults: `refetchOnWindowFocus`/`refetchOnMount` true, 60 s staleTime; `/auth/me` and `unread-count` outside the cache | `apps/web-*/src/app/providers.tsx:13-16`; `useAuth.tsx:42-96`; `useNotifications.tsx:57-63` | M — stops refetch storms on tab focus and shell remount | S | L | 1 |
| 12 | Every API call proxied through the Next server (`/api/:path*` rewrite) | `apps/web-*/next.config.ts:33-40`; `packages/api-client/src/client.ts:63` | H in production (one network leg + function invocation per request) [E — not measurable locally] | S (point `baseURL` at the API origin; CORS allowlist already exists in `main.ts:98-117`) | M (cookie/CORS in prod; Google OAuth redirect already bypasses the proxy) | 1 |
| 13 | Missing composite index `Notification(userId, read)` for the 30 s poll; `User.updatedAt`; `Post(isPublished, createdAt)` | `schema.prisma:783-785,200-206,467` | M | S | L (additive migrations; note migration history is broken, use `db push` or manual SQL) | 1 |
| 14 | Unbounded `findMany` on bookings, mira conversations, therapists-with-fit | `booking.service.ts:489`; `mira.service.ts:527`; `therapist.controller.ts:90` | M — grows with data | S | L | 1 |
| 15 | Feed search undebounced and inside `queryKey`; `flatMap` un-memoized | `feed/page.tsx:106,160,293` | M | S | L | 1 |
| 16 | `MiraProvider` value un-memoized; `setMessages` per SSE token re-renders the dashboard | `mira-context.tsx:113-121,282-305`; `parent-dashboard.tsx:24` | M — jank during every Mira reply | S (`useMemo` + split `isOpen` into its own context) | L | 1 |
| 17 | Questionnaire double `localStorage` parse on mount and full `JSON.stringify` per tap | `web-screening/src/app/[id]/questionnaire/page.tsx:55,67,79-86` | M on the screening flow | S | L | 1 |
| 18 | Sequential independent awaits on hot services | `admin.service.ts:67,75,82`; `profile.service.ts:27,42`; `users.service.ts:15,90`; `cases.service.ts:209,250` | M — −1 to −3 DB round trips each | S | L | 1 |
| 19 | `questions` true N+1 (`findFirst` per question) | `questions.service.ts:696-724` | M | S | L | 1 |
| 20 | Dead weight: `lottie-react` unused; `helmet`/`cache-manager-redis-store` installed unused; `console.log(JSON.stringify(where))` per request; no-op `proxy.ts` on every web-main request | `web-main/package.json`; `api/package.json:70,86`; `questions.service.ts:217`; `web-main/src/proxy.ts` | L | S | L | 1 |
| 21 | Hard-coded `http://localhost:3004` in shipped code; hard reload on every notification click | `web-admin/src/app/therapists/schedule/page.tsx:409`; `NotificationBell.tsx:75` | L (correctness) | S | L | 1 |

### Phase 2 — structural

| # | Issue | Evidence (file:line) | Est. impact | Effort | Risk | Phase |
|---|---|---|---|---|---|---|
| 22 | Header / shells rendered inside pages instead of layouts (6 of 7 apps) | `web-main/src/app/{page:93,feed/page:166,profile/page:47,settings/page:135,…}`; `community-shell`, `booking-shell`, `admin-shell`, `resources-shell`, `screening-shell` opened per page; good example `web-cases/src/app/(cases)/layout.tsx:33` | H — shell persists across transitions; kills per-click `unread-count` and timer restarts | M | L | 2 |
| 23 | Full-screen spinner gates and serial effect chains on dashboard and all shells; no `loading.tsx` | `web-main/src/app/page.tsx:18-83`; `booking-shell.tsx:12-18`; `(cases)/[id]/layout.tsx:50-69` | H — content paints while data loads instead of after 2–3 serial tiers | M (skeletons in `loading.tsx`, run onboarding/org checks in parallel with dashboard queries) | L | 2 |
| 24 | `/auth/me` + user bootstrap outside the query cache; 3-request refresh waterfall | `useAuth.tsx:42-96` | M — survives soft navigation; shareable | M | M (touches every app) | 2 |
| 25 | `ExcludeFieldsInterceptor` + `express-session` MemoryStore + `passport.session()` + 10 MB body parsers on every request | `main.ts:52-75`; `app.module.ts:271-275` | M — per-request CPU and memory; session store is a leak | M (scope session to the OAuth routes only; delete the interceptor once #5/#6 land) | M | 2 |
| 26 | Four `PrismaClient` instances / pools | `prisma.module.ts:7`; `app.module.ts:257`; `billing.module.ts:9`; `organizations.module.ts:10` | M — connection exhaustion risk on Supabase | S–M | M (DI graph) | 2 |
| 27 | Personalized feed does ~4 queries per candidate post plus writes inside a GET | `feed-algorithm.service.ts:15-26`; `personalization.service.ts:58-83,109,132-150` | H for the For-You feed even after #1 (cold path) | M (batch by `in:`, move interest recalculation to the cron that already exists) | M | 2 |
| 28 | web-admin uses raw `useEffect` fetching (26 sites, 1 `useQuery`) | `web-admin/src/app/*` | M — no cache/dedup in the admin app | M | L | 2 |
| 29 | Remaining composite indexes (Booking, Case, CaseTherapist, Question, Event, TherapistProfile, FeedInteraction, MiraConversation); remove 3 redundant indexes | `schema.prisma` (§5 table) | M | M | L | 2 |
| 30 | Socket.IO without a Redis adapter; in-process throttler; no Redis at all | `notification.gateway.ts:30`; `app.module.ts:262-266` | M — allows retiring the 30 s poll; correctness on >1 replica | M | M (infra) | 2 |
| 31 | `next/image` + `images.remotePatterns`; sized banners/avatars | all `next.config.ts`; 45 `<img>` sites | M — CLS, format negotiation | M | L | 2 |
| 32 | Uploads written to disk with no static handler (404) | `users.controller.ts:83-110`; `verification.service.ts:20,43` | L (correctness) | S–M (move to Supabase storage like other media) | L | 2 |
| 33 | List memoization / virtualization on discovery (100 cards), feed, community `PostCard` | `discovery/page.tsx:400`; `web-community/src/app/page.tsx:282` | L–M | M | L | 2 |

### Phase 3 — architectural

| # | Issue | Evidence (file:line) | Est. impact | Effort | Risk | Phase |
|---|---|---|---|---|---|---|
| 34 | Seven separate Next apps for one product: 7× framework bundle, full reload + re-auth on every cross-app hop, 7 deploys, cookie-domain glue | `nav-config.ts:3-11`; `apps/*/vercel.json`; byte-identical `next.config.ts`/`providers.tsx` ×7; `client.ts:10-22` | H — cross-app hops become client transitions; ~1 MB gz less per multi-app session; one deploy | L | M (route-name collisions, `APP_URLS` rewrite, incremental per-app move) | 3 |
| 35 | Zero server-rendered data; everything waits for hydration + auth | 154/159 pages `'use client'`; 0 `HydrationBoundary` | H for first paint — render the authenticated shell and first data on the server once the app is unified and cookies are readable server-side | L | M | 3 |
| 36 | `proxy.ts` cannot verify auth (comment says JWT is in memory; it is actually in a cookie) — server-side redirects and per-route guards could replace the client spinner gates | `web-main/src/proxy.ts:14-16` | M | M | M | 3 |

---

## 7a. Phase 1 implementation results (2026-09-21, branch `perf/phase-1`)

All Phase 1 items except #12 (direct API calls) were implemented; #12 is wired but opt-in via `NEXT_PUBLIC_API_DIRECT=1` because it changes production topology. Measured on the same machine and database as §2, same admin account.

| Measurement | Before | After |
|---|---|---|
| Header click "Hub" from `/feed` (production build) | full document load: 13 JS, 6 API calls incl. `/auth/me`, ~4–5 s | **soft navigation: 0 documents, 0 JS, 0 `/auth/me`, 4 data calls** |
| `GET /feeds/personalized?limit=10` | 4.92 s, 39 statements, every call | 1.92 s / 14 statements cold; **4 ms / 3 statements cached** |
| `GET /admin/stats` | 4.17 s, 4 serial tiers | **0.89 s**, 19 statements in one tier |
| `GET /profile/me` | 1.64 s | 0.99 s |
| `GET /questions?limit=20` | 2 extra statements per question | 11 statements total |
| API response encoding | none (raw JSON) | `Content-Encoding: br`; `/auth/me` 3,553 → 1,462 B, `/posts` 28,732 → 9,350 B on the wire |
| `embedding Float[]` fetched from Postgres | on every user/post/question/answer read | never, unless a query opts in (global Prisma `omit`) |
| `Mira.png` | 1,687,819 B ×6 | **33,853 B** ×6 |
| Indexes | — | `Notification(userId, read)`, `Post(isPublished, createdAt DESC)`, `User(updatedAt)` created (live on the branch DB, migration file added) |
| Type-checks | — | API, `@upllyft/ui`, `@upllyft/api-client`, all 7 web apps pass; web-main production build passes |

Not changed by Phase 1 (by design, Phase 2): `/auth/me` itself is still ~1.9 s and still gates first paint; `NotificationBell` still refetches `unread-count` on soft navigation because the header is mounted per page (#22).

Follow-ups required before merge: run `pnpm install` to record `compression` (added) and `lottie-react` (removed) in `pnpm-lock.yaml`; the `apps/api/node_modules/compression` junction is a local workaround. The API has no unit tests covering the touched services (only one spec file exists in the whole API).

## 7b. Phase 2 implementation results (2026-09-21, branch `perf/phase-1`)

Implemented items #22, #23, #24 (header into layouts, skeleton loading instead of spinner gates, auth in a cache).

**What changed**

- Every app's root layout now mounts a persistent `AppFrame` with the header (community's frame also owns the floating SOS button and crisis dialog; admin's owns the sidebar). The per-page `*Shell` wrappers were kept as thin auth guards with a content-only skeleton, so the 68 pages that use them needed no edits. web-main's 20 direct `<AppHeader>` renders were removed; the header is hidden on auth/onboarding routes and on `/admin` and `/org`, which have their own chrome.
- `AuthProvider` hydrates synchronously from a stored snapshot of the last known user (24 h TTL, only when tokens exist) and revalidates `/auth/me` in the background; it skips the doomed `/auth/me` call when the access token is already expired and goes straight to refresh. `AppHeader` renders a same-height placeholder while a cold session resolves.
- `loading.tsx` added to all seven apps; dashboard, feed, shells, the web-admin role guard and the web-cases layout show content skeletons instead of full-screen spinners; render-time `router.replace` calls moved into effects. The dashboard's onboarding check runs in parallel with the dashboard queries and is cached for 30 min.

**Measured (production build of web-main, same machine/DB)**

| Scenario | Phase 1 | Phase 2 |
|---|---|---|
| Full reload of dashboard, returning user | header + content after `/auth/me` (~2.2 s); data calls start after it (second tier at ~2.4 s) | header and content in the DOM at the first 250 ms sample; **all 6 API calls start together at +76 ms** (`/auth/me` no longer gates them) |
| Header "Hub" click from `/feed` | soft nav, 4 API calls incl. `unread-count` (header remounted) | soft nav, **3 API calls, no `unread-count`** (header persists) |
| Header "Admin" click | soft nav, 5 admin calls | soft nav, 5 admin calls, no `unread-count` |
| Type-checks / builds | — | API, both packages, all 7 apps pass; web-main and web-community production builds pass |

## 7c. Phase 2 backend items (2026-09-21, branch `perf/phase-1`)

Implemented #26 (single Prisma client), #25 partially (session store scoped), and #29 (remaining composite indexes).

| Item | Change | Verification |
|---|---|---|
| Four `PrismaClient` instances | Removed the duplicate `PrismaService` registrations from `app.module.ts`, `billing.module.ts` and `organizations.module.ts`; the global `PrismaModule` is now the only provider | Boot log prints "Database connected successfully" **once** (was 4×); all routes still resolve their Prisma dependency; smoke test 33/36 unchanged |
| `express-session` MemoryStore + `passport.session()` on every request | Both are now mounted only under `/api/auth` and `/api/captcha`, the only prefixes whose controllers read `@Session()` (Google OAuth handshake, registration captcha, logout). `passport.initialize()` stays global for the JWT strategy | Captcha endpoints still 200 and set the session cookie; Google OAuth routes are under `/api/auth`; logout 200; non-auth routes send no `Set-Cookie` |
| Remaining composite indexes | 13 indexes added: `Notification(userId, createdAt)`, `Post(communityId, createdAt)`, `Event(status, isCancelled, startDate)`, `FeedInteraction(userId, action)`, `Question(moderationStatus)`, `Question(moderationStatus, status)`, `therapist_profiles(isActive, acceptingBookings, overallRating)`, `bookings(therapistId, status)`, `bookings(patientId, status)`, `cases(primaryTherapistId, status)`, `cases(createdAt)`, `case_therapists(therapistId, removedAt)`, `mira_conversations(userId, updatedAt)`. Three indexes that duplicated `@unique` constraints on `User` (`email`, `resetPasswordToken`, `googleId`) dropped | Created `CONCURRENTLY` on the branch DB; `prisma migrate diff` shows schema and DB agree (only the pre-existing unrelated extras remain); migration file added |

Not done from #25: the 10 MB JSON/urlencoded body limits are unchanged (which routes legitimately need large bodies was not established) and the `ExcludeFieldsInterceptor` is kept because it still strips `originalContent`. Not done from Phase 2: #27 (feed scoring batching), #28 (web-admin data fetching), #30 (Socket.IO Redis adapter, infra), #31 (`next/image`), #32 (uploads), #33 (list memoisation).

## 8. What I measured vs. estimated

**Measured:** all build times and output sizes (§2.1); chunk sizes and gzip sizes (§2.2); request counts, bytes, and API waterfalls on dev and production builds (§2.3, §2.4); API latency, raw payload sizes and response headers (§2.4); DB statement counts per endpoint via `pg_stat_statements` deltas (§2.4); DB round-trip latency; static-asset cache headers; dependency versions per workspace; all repo-wide counts (`'use client'`, `next/link`, `useQuery`, `React.memo`, `<img>`, etc.).

**Estimated:** library attribution inside hashed chunks (signature matching, not a dependency graph); the "second copy of lucide" claim; the byte savings quoted for #8/#9/#10; the size of a hypothetical client-side transition; production proxy-hop cost (my API and Next server were on the same machine, so the extra leg was ~free here); index effectiveness (from schema and query shape, not `EXPLAIN`); absolute production timings, since local DB latency (136 ms) will not match Railway↔Supabase.

**Not measured:** Core Web Vitals (no RUM/analytics installed); anything on the mobile app; production Vercel/Railway region topology.

---

## 9. Questions I could not answer from the code

1. **Team structure and release cadence.** Are the seven web apps owned and shipped by different teams on independent schedules? This is the only fact that would change the §6 recommendation from "merge" to "keep + microfrontends".
2. **Production topology.** Which regions are the Vercel projects, the Railway API and the Supabase database in? The API→DB round trip in production determines how much of the 1.9 s `/auth/me` is query count versus distance.
3. **Replica count.** Does the Railway API run more than one instance? That decides how urgent the in-memory session store, throttler and Socket.IO rooms are (§5) and whether the 30 s poll can be replaced by sockets.
4. **Is Redis provisioned in production?** It is in `.env` and in `package.json` but unused by the code.
5. **Do you have any field data** (Vercel Analytics / Speed Insights / Sentry performance)? Nothing is installed; the numbers above are lab numbers from one machine.
6. **Is the personalized "For You" feed a product priority?** It is by far the most expensive endpoint (39 statements, 4.9 s); if it is not central, the cheapest fix is defaulting the feed to `RECENT` until Phase 2 lands.
7. **Which apps share users in one session most often?** If real usage is mostly hub ↔ screening ↔ booking, that is the order in which to merge them under option (b).
8. **Is `web-admin` (clinic admin) meant to coexist with the `/admin` console inside web-main**, or is one of them legacy? They would collide on `/admin` in a merged app.
