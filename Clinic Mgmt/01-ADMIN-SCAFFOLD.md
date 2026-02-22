# 01 — Clinic Admin App Scaffold (`web-admin`)

## Context

No clinic-facing admin app exists today. All admin functionality is scattered across web-main's admin routes (user management, org settings). The clinic needs a dedicated app where the clinic manager / receptionist / senior therapist can oversee daily operations.

This feature scaffolds the app shell — subsequent features (02–07) add pages into it.

## What to Build

A new Next.js app at `apps/web-admin` (port 3007) with:

- Shared auth via `@upllyft/api-client` (same cross-app localStorage token pattern)
- Role guard: only `ADMIN` and `THERAPIST` roles can access (redirect others to web-main)
- Persistent sidebar navigation (not the horizontal nav parents see)
- Design system from `@upllyft/ui` — teal-600 primary, but with a more data-dense layout suitable for clinic staff

## Technical Spec

### App Setup

```
apps/web-admin/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with sidebar
│   │   ├── page.tsx            # Dashboard home (redirect or summary)
│   │   ├── patients/           # Feature 02
│   │   ├── therapists/         # Feature 03
│   │   ├── tracking/           # Feature 04
│   │   └── outcomes/           # Feature 07
│   ├── components/
│   │   ├── admin-sidebar.tsx   # Sidebar navigation
│   │   ├── admin-header.tsx    # Top bar with user info, clinic name
│   │   └── role-guard.tsx      # Access control wrapper
│   └── lib/
│       └── admin-api.ts        # Admin-specific API functions
├── next.config.js
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

### Sidebar Navigation

```
📊 Dashboard        → /
👥 Patients         → /patients          (Feature 02)
🩺 Therapists       → /therapists        (Feature 03)
📋 Today's Board    → /tracking          (Feature 04)
📈 Outcomes         → /outcomes          (Feature 07)
💬 Messages         → /messages          (Phase 2)
💰 Billing          → /billing           (Phase 2)
⚙️ Settings         → /settings          (Phase 2)
```

### Role Guard Logic

```typescript
// Only ADMIN and THERAPIST roles can access web-admin
// ADMIN sees everything
// THERAPIST sees: Dashboard, their own patients, tracking board, outcomes
// USER/PARENT role → redirect to NEXT_PUBLIC_MAIN_URL
```

### Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_MAIN_URL=http://localhost:3000
NEXT_PUBLIC_BOOKING_URL=http://localhost:3004
NEXT_PUBLIC_CASES_URL=http://localhost:3006
NEXT_PUBLIC_SCREENING_URL=http://localhost:3003
```

### Dashboard Home Page (`/`)

A summary view showing:
- Today's appointment count
- Patients awaiting intake
- Active cases count
- Quick links to other sections

Keep it simple — this is a landing page, not the main feature.

## Reference

- Copy app setup pattern from any existing app (e.g., `web-community`)
- Use `@upllyft/ui` components
- Follow the Turborepo app conventions already in the monorepo
- Design system reference: `~/Desktop/Workspace/upllyft/docs/design-system.html`

## Success Criteria

- [ ] App runs on `localhost:3007`
- [ ] Sidebar navigation renders with all placeholder routes
- [ ] Auth works — login redirects to web-main login, token is shared
- [ ] ADMIN role sees full sidebar
- [ ] THERAPIST role sees restricted sidebar
- [ ] PARENT/USER role is redirected away
- [ ] Dashboard home page shows summary cards (can be placeholder data)
- [ ] `pnpm build` succeeds for the entire monorepo
