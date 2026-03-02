# Regional Configuration: India vs UAE Launch

> **Status:** Implemented
> **Priority:** High
> **Estimated scope:** ~10 new files, ~14 modified files
> **Last updated:** 2026-03-02

---

## Problem

Upllyft is launching in both India and UAE, but the platform currently has no regional awareness. The two markets require fundamentally different service models:

| | India | UAE |
|---|---|---|
| **Service model** | Individual therapist marketplace | Clinic directory (freelance not allowed) |
| **Currency** | INR | AED |
| **Contact info** | Local India support | Local UAE support |
| **Stripe country** | IN | AE |

Parents from other countries should still access community, screening, resources, and Mira — but booking is region-locked for now.

---

## Design Principles

1. **Config-driven, not code-branching** — No scattered `if (country === 'AE')` checks. One config map, one hook, everywhere consumes properties.
2. **Region lives on User** — Parents don't always belong to an org/clinic. Country is collected during onboarding and stored on the User model.
3. **One fork point** — web-booking landing page routes to therapist marketplace or clinic directory based on region. Both paths converge at `/book/[therapistId]`.
4. **Existing flows untouched** — The India path IS the current therapist marketplace. Zero changes to it.

---

## Region Resolution

```
User.country
  → 'IN'  → India config (THERAPIST_MARKETPLACE)
  → 'AE'  → UAE config (CLINIC_DIRECTORY)
  → other → User.preferredRegion (if they picked one)
              → IN or AE → that config
              → null     → booking disabled, everything else works
```

### Collection points
- **Onboarding (new step 2):** "Where are you located?" with India/UAE cards + "Other" option
- **web-booking region gate:** If no region set, inline picker before marketplace
- **Profile settings:** Can change country/region anytime

---

## Architecture

### Static Region Config (`packages/types/src/region.ts`)

```typescript
type SupportedCountry = 'IN' | 'AE';
type ServiceModel = 'THERAPIST_MARKETPLACE' | 'CLINIC_DIRECTORY';

interface RegionConfig {
  country: SupportedCountry;
  label: string;              // "India", "United Arab Emirates"
  currency: string;           // "INR", "AED"
  currencySymbol: string;     // "₹", "د.إ"
  locale: string;             // "en-IN", "en-AE"
  stripeCountry: string;      // "IN", "AE"
  serviceModel: ServiceModel;
  contactPhone: string;
  contactEmail: string;
  timezone: string;           // "Asia/Kolkata", "Asia/Dubai"
}
```

### `useRegion()` Hook (`packages/api-client/src/hooks/useRegion.tsx`)

```typescript
function useRegion(): {
  region: RegionConfig | null;
  serviceModel: ServiceModel | null;
  currency: string;
  isSupported: boolean;
  isRegionResolved: boolean;
}
```

Reads `user.country` and `user.preferredRegion` from `useAuth()`, resolves to a RegionConfig.

---

## Implementation Phases

### Phase 1: Types & Config Foundation
| File | Action | Description |
|------|--------|-------------|
| `packages/types/src/region.ts` | **Create** | Region config types, constants, helpers |
| `packages/types/src/index.ts` | Modify | Export region types |
| `packages/types/src/user.ts` | Modify | Add `country?: string` and `preferredRegion?: string` to User |
| `packages/types/src/organization.ts` | Modify | Add `region?: string` to Organization |

### Phase 2: Database Schema
| File | Action | Description |
|------|--------|-------------|
| `apps/api/prisma/schema.prisma` | Modify | Add `country`, `preferredRegion` to User; `region` to Organization; enrich Clinic with `country`, `description`, `rating`, `specializations`, `isPublic` |

Migration: `pnpm --filter @upllyft/api prisma:migrate --name add-regional-fields`

### Phase 3: API Backend
| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/onboarding/dto/complete-onboarding.dto.ts` | Modify | Add `country?: string` field |
| `apps/api/src/onboarding/onboarding.service.ts` | Modify | Save `country` to User model during onboarding |
| `apps/api/src/users/users.controller.ts` | Modify | Add `PATCH /users/me/region` endpoint |
| `apps/api/src/marketplace/clinic/clinic-marketplace.controller.ts` | **Create** | `GET /marketplace/clinics` (search) and `GET /marketplace/clinics/:id` (detail) |
| `apps/api/src/marketplace/clinic/clinic-marketplace.service.ts` | **Create** | Clinic search (by country, specialization, search) and detail (with therapists) |
| `apps/api/src/marketplace/clinic/clinic-marketplace.module.ts` | **Create** | NestJS module |
| `apps/api/src/app.module.ts` | Modify | Import ClinicMarketplaceModule |
| `apps/api/src/marketplace/payment/stripe-connect.service.ts` | Modify | Replace hardcoded `country: 'US'` and `currency: 'usd'` with params |

### Phase 4: Frontend Hook
| File | Action | Description |
|------|--------|-------------|
| `packages/api-client/src/hooks/useRegion.tsx` | **Create** | `useRegion()` hook |
| `packages/api-client/src/index.ts` | Modify | Export useRegion |

### Phase 5: Onboarding Country Step
| File | Action | Description |
|------|--------|-------------|
| `apps/web-main/src/app/onboarding/page.tsx` | Modify | Insert new Step 2 (country selection), shift all steps +1, `TOTAL_STEPS=6` |
| `apps/web-main/src/lib/api/profiles.ts` | Modify | Add `country` to `CompleteOnboardingPayload` |

**New Step 2 UI:**
- "Where are you located?"
- Two prominent cards: India / UAE
- "Other country" option → shows region picker + "Booking available in India and UAE for now"

### Phase 6: web-booking Regional Routing
| File | Action | Description |
|------|--------|-------------|
| `apps/web-booking/src/lib/api/clinics.ts` | **Create** | Clinic API client types + functions |
| `apps/web-booking/src/hooks/use-clinics.ts` | **Create** | TanStack Query hooks for clinics |
| `apps/web-booking/src/app/clinics/page.tsx` | **Create** | Clinic browse page (mirrors therapist marketplace layout) |
| `apps/web-booking/src/app/clinics/[id]/page.tsx` | **Create** | Clinic detail with therapist list |
| `apps/web-booking/src/components/region-gate.tsx` | **Create** | Region picker for unsupported countries |
| `apps/web-booking/src/app/page.tsx` | Modify | Add region routing: CLINIC_DIRECTORY → redirect `/clinics`, no region → show RegionGate |
| `apps/web-booking/src/components/booking-shell.tsx` | Modify | Conditional nav: "Find Clinics" vs "Find Therapists" |

---

## Booking Flow by Region

### India (THERAPIST_MARKETPLACE)
```
web-booking/
  → / (therapist marketplace, EXISTING — untouched)
  → /therapists/[id] (therapist detail, EXISTING)
  → /book/[therapistId] (booking wizard, EXISTING)
```

### UAE (CLINIC_DIRECTORY)
```
web-booking/
  → / → auto-redirect to /clinics
  → /clinics (NEW: clinic browse)
  → /clinics/[id] (NEW: clinic detail with therapist list)
  → /book/[therapistId] (EXISTING booking wizard — both paths converge here)
```

### Unsupported Country
```
web-booking/
  → / → RegionGate (NEW: pick India or UAE)
  → Pick India → therapist marketplace
  → Pick UAE → clinic directory
  → Skip → "Coming soon in your area" (community, screening, resources, Mira still work)
```

---

## Files Untouched (Preserved As-Is)

- `apps/web-booking/src/app/book/[therapistId]/page.tsx` — booking wizard
- `apps/web-booking/src/app/therapists/[id]/page.tsx` — therapist detail page
- `apps/web-booking/src/hooks/use-marketplace.ts` — therapist search hooks

---

## Dependency Order

```
Phase 1 (Types)
  ├── Phase 2 (DB Schema)
  │     └── Phase 3 (API Backend)
  │           ├── Phase 5 (Onboarding) — needs 3.2
  │           └── Phase 6 (web-booking) — needs 3.4
  └── Phase 4 (useRegion hook)
        └── Phase 6 (web-booking) — needs Phase 4
```

Phases 5 and 6 can run in parallel once Phases 3 and 4 are done.

---

## Verification Checklist

### India flow
- [ ] Register → onboarding → select India → `User.country = 'IN'`
- [ ] web-booking → therapist marketplace (unchanged)
- [ ] Prices in INR
- [ ] Full booking flow works

### UAE flow
- [ ] Register → onboarding → select UAE → `User.country = 'AE'`
- [ ] web-booking → redirects to `/clinics`
- [ ] Browse clinics → select → see therapists → "Book Now" → `/book/[therapistId]`
- [ ] Prices in AED

### Unsupported country flow
- [ ] Register → onboarding → select "Other"
- [ ] web-booking → region picker shown
- [ ] Select India → `User.preferredRegion = 'IN'` → therapist marketplace
- [ ] Skip → "Coming soon" message, other features work

### Stripe
- [ ] Therapist account creation uses correct country code
- [ ] Transfers use correct currency from booking record

---

## Future Considerations (Not in scope now)

- **DB-based RegionConfig** — When expanding to 10+ regions, migrate the static config to a database table with admin management
- **i18n / Localization** — Arabic UI for UAE, Hindi for India
- **Tax/compliance rules** — GST for India, VAT for UAE
- **Region-specific content** — Different community content, provider directories per region
