# Tenancy & Multi-Setting Model — Design

**Status:** Draft v1 · July 2026
**Companion to:** `docs/clinic-management-gap-analysis-and-build-plan.md`, `docs/clinic-management-data-model-design.md`
**Schema:** `apps/api/prisma/schema.prisma`
**Driver:** Nurseries want to use Upllyft for early identification of developmental delays. A nursery is neither a clinic nor a parent, and the current model has no room for it.

---

## 0. Decision (locked)

> **There is one child record. Every party — parent, clinic, nursery, therapist — holds a scoped, consented, time-bounded *lens* onto it. Tenancy is modelled on the lens, not on the product line.**

B2C and B2B are two go-to-market motions over **one** model, not two architectures. The parent is not a separate product; the parent is the *guardian lens*, and it is the widest one.

The corollary that drives every schema change below:

> **A child's relationship to a facility is many-to-many, time-bounded and consent-scoped. It is not a nullable foreign key.**

---

## 1. Current state — why the existing model can't absorb a nursery

Two disjoint tenancy concepts exist today, joined only by a nullable FK:

| | `Organization` (schema:1433) | `Clinic` (schema:4486) |
|---|---|---|
| Purpose | Community / marketplace tenant | Clinical tenant |
| Owns | communities, events, members, bookingPackages, sessionTypes, therapistLinks | therapists, bookings, cases, **children**, invoices, consentTemplates, leads, pathwayTemplates |
| Regulatory | none | `licenseAuthority`, `emirate`, `complianceStatus`, `nabidhFacilityCode` |
| Clinical surface | **zero** | full |
| Type discriminator | **none** | none |

### The four blockers

| # | Blocker | Evidence | Consequence for nursery |
|---|---|---|---|
| 1 | **`Child.clinicId` is a single nullable FK** | schema:1316 | A child enrolled at a nursery *and* referred to a clinic cannot be both. This breaks the referral loop — i.e. the core proposition. **This is the root blocker; the rest are downstream.** |
| 2 | **`Clinic.adminId` is `@unique`** | schema:4486 | One clinic per admin, one admin per clinic. A nursery *group* (or a clinic group) cannot exist. |
| 3 | **Regulatory spine is healthcare-only** | `enum LicenseAuthority { DHA, DOH, MOHAP, OTHER }` schema:3809 | Nurseries are licensed by KHDA / ADEK / MOE. And `complianceStatus === ACTIVE` currently **gates case creation** (`cases.service.ts:129`) — so a nursery-as-Clinic either fakes a DHA licence or forces us to loosen a gate that protects clinic compliance. |
| 4 | **Capability differences would be enforced by branching** | — | A nursery must never create a case, write a clinical note, or record a diagnosis. `if (facility.type === 'NURSERY')` scattered through services is exactly the antipattern `docs/regional-configuration-spec.md` already rejects ("config-driven, not code-branching"). |

### Scoping posture (addressed in Phase A)

The pre-Phase-A code scoped clinic data by convention rather than by construction: several read paths authorised on **role** instead of on a relationship to the child, and the clinic scope was applied optionally, so an absent scope widened a query instead of rejecting it. That is tolerable with a single tenant and unacceptable with two.

Phase A made scope resolution **fail-closed** and made child access **relationship-based**. Details are tracked internally rather than here.

Also addressed: organization endpoints that exposed member data without a membership check, and `Case.organizationId` / `Case.clinicId` being written but never read as filters — so no tenant could enumerate its own cases.

> **A tenancy model is only good if the unsafe query is the hard one to write.** That is the bar the design below has to clear: under the affiliation model there is no path to a child that does not route through an affiliation.

---

## 2. Target model — four concepts

```
Organization ──1:N──> Facility ──1:N──> Room
     │                    │
     │                    ├──1:N──> ChildAffiliation ──N:1──> Child
     │                    │                                     │
     └──1:N──> OrgMember  └──1:N──> FacilityMember          Guardian
                                                                │
                                                          ChildConsent
```

| Concept | What it is | Maps from |
|---|---|---|
| **`Organization`** | The **account**. Signs the contract, gets billed, owns branding and members. Every B2B customer is an Organization — including a single-site clinic. | existing `Organization` + `kind` discriminator |
| **`Facility`** | A **typed site** where children are seen. Carries the licence appropriate to *its* regulator. | generalised `Clinic` |
| **`ChildAffiliation`** | The **time-bounded, consent-scoped link** between a Child and a Facility. A child has N, concurrently. | replaces `Child.clinicId` |
| **`FacilityMember`** | Staff ↔ facility, with a scoped role. | replaces `Clinic.adminId` + `TherapistProfile.clinicId` |

**Precedent to copy:** `TherapistOrganizationLink` (schema:1738) is already a proper many-to-many with approval status and terms. `ChildAffiliation` is that same idea applied to the relationship that actually matters.

---

## 3. New enums

```prisma
enum OrgKind {
  CLINIC_GROUP
  NURSERY_GROUP
  SCHOOL_GROUP
  NGO
  PLATFORM
}

enum FacilityType {
  CLINIC
  NURSERY
  SCHOOL
}

// extends the existing LicenseAuthority (do not fork it)
enum LicenseAuthority {
  DHA        // Dubai Health Authority
  DOH        // Department of Health – Abu Dhabi
  MOHAP      // Ministry of Health and Prevention
  KHDA       // Knowledge & Human Development Authority (Dubai — nurseries/schools)
  ADEK       // Abu Dhabi Dept. of Education & Knowledge
  MOE        // Ministry of Education
  OTHER
}

enum AffiliationType {
  PATIENT     // clinical: has cases, notes, diagnosis
  ENROLLED    // educational: observations only
}

enum AffiliationStatus {
  PENDING_CONSENT   // facility has added the child; guardian has not yet consented
  ACTIVE
  ENDED
}

/// What a facility may see about an affiliated child.
/// Ordered least → most. A facility can never exceed its FacilityType ceiling.
enum DataScope {
  OBSERVATIONS_ONLY   // nursery default: own observations + own screenings
  SCREENING_SHARED    // + screening results the guardian has shared back
  CLINICAL_SUMMARY    // + strategies/recommendations, NEVER the diagnosis
  FULL_CLINICAL       // clinic default
}
```

---

## 4. New & changed models

### `Organization` — additions
```prisma
  kind       OrgKind    @default(CLINIC_GROUP)
  facilities Facility[]
```

### `Facility` — generalised from `Clinic`
```prisma
model Facility {
  id             String       @id @default(cuid())
  organizationId String                                    // NOW REQUIRED
  organization   Organization @relation(fields: [organizationId], references: [id])

  type           FacilityType
  name           String
  slug           String       @unique

  // regulatory — authority is type-appropriate (see §5 validation)
  licenseNo            String?
  licenseAuthority     LicenseAuthority?
  emirate              Emirate?
  complianceStatus     FacilityComplianceStatus @default(DRAFT)

  members        FacilityMember[]
  rooms          Room[]
  affiliations   ChildAffiliation[]

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([organizationId])
  @@index([type])
  @@map("facilities")
}
```
`adminId @unique` is **dropped** — administration derives from `FacilityMember`. A group may have many sites; a person may administer several.

### `ChildAffiliation` — the load-bearing model
```prisma
model ChildAffiliation {
  id          String            @id @default(cuid())
  childId     String
  child       Child             @relation(fields: [childId], references: [id], onDelete: Cascade)
  facilityId  String
  facility    Facility          @relation(fields: [facilityId], references: [id], onDelete: Cascade)

  type        AffiliationType
  status      AffiliationStatus @default(PENDING_CONSENT)
  dataScope   DataScope         @default(OBSERVATIONS_ONLY)

  startedAt   DateTime          @default(now())
  endedAt     DateTime?

  roomId      String?
  room        Room?             @relation(fields: [roomId], references: [id])
  keyworkerId String?                                       // FacilityMember.id
  keyworker   FacilityMember?   @relation(fields: [keyworkerId], references: [id])

  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@unique([childId, facilityId, startedAt])
  @@index([childId])
  @@index([facilityId, status])
  @@index([roomId])
  @@map("child_affiliations")
}
```
A child holds N affiliations concurrently. **Nursery affiliations default to `OBSERVATIONS_ONLY`** — that is *how* we guarantee a nursery never sees a diagnosis: structurally, not by remembering to check.

### `Room` — the cohort/roster primitive
```prisma
model Room {
  id           String             @id @default(cuid())
  facilityId   String
  facility     Facility           @relation(fields: [facilityId], references: [id], onDelete: Cascade)
  name         String                                       // "Butterflies"
  ageBandLabel String?                                      // "2–3 years"
  affiliations ChildAffiliation[]
  members      FacilityMember[]   @relation("RoomStaff")

  @@index([facilityId])
  @@map("rooms")
}
```
Only meaningful for `NURSERY` / `SCHOOL`. Gives us the roster with **no new tenancy concept**.

### `FacilityMember`
```prisma
enum FacilityRole {
  OWNER
  ADMIN
  CLINICAL_LEAD
  THERAPIST
  INCLUSION_LEAD    // nursery SENCO — owns the flag → conversation → referral pathway
  KEYWORKER         // nursery room staff — observes, cannot screen unaided
  RECEPTION
  BILLING
}

model FacilityMember {
  id         String       @id @default(cuid())
  facilityId String
  userId     String
  role       FacilityRole
  status     MemberStatus @default(ACTIVE)
  rooms      Room[]       @relation("RoomStaff")
  // ...
  @@unique([userId, facilityId])
  @@index([facilityId, role])
  @@map("facility_members")
}
```

---

## 5. Capabilities — config, not branches

Derived from `FacilityType`. Lives in **code** (`packages/types/src/facility.ts`), not the DB — same shape as `packages/types/src/region.ts`, so it will feel native.

```typescript
export const FACILITY_CAPABILITIES = {
  CLINIC:  { canCreateCase: true,  canDiagnose: true,  canWriteClinicalNotes: true,
             canScreen: true, canObserve: true, canRaiseConcern: true, canBill: true,
             maxDataScope: 'FULL_CLINICAL' },
  NURSERY: { canCreateCase: false, canDiagnose: false, canWriteClinicalNotes: false,
             canScreen: true, canObserve: true, canRaiseConcern: true, canBill: false,
             maxDataScope: 'CLINICAL_SUMMARY' },
  SCHOOL:  { /* as NURSERY */ },
} as const satisfies Record<FacilityType, FacilityCapabilities>;
```

Enforced by one guard — `@RequiresCapability('canCreateCase')` — mirroring the existing `@CaseAccess(level)` / `SetMetadata` pattern in `cases/guards/case-access.guard.ts`.

**Two invariants:**
1. `ChildAffiliation.dataScope` may never exceed `FACILITY_CAPABILITIES[facility.type].maxDataScope`. Enforce on write.
2. `licenseAuthority` must be type-appropriate: `CLINIC → {DHA, DOH, MOHAP}`, `NURSERY|SCHOOL → {KHDA, ADEK, MOE}`. Enforce on write. This keeps the clinic compliance gate intact rather than loosening it.

---

## 6. Consent — generalise from Case to Affiliation

`CaseConsent` (schema:3305) already has the right shape — granted by a `Guardian`, for a `purpose`, with a `recipient`, versioned via `ConsentVersion`, revocable, time-bounded. It is merely scoped to a **Case**, which a nursery will never have.

**Change:** re-point it at the affiliation.

```prisma
model ChildConsent {              // generalises CaseConsent
  childId          String
  guardianId       String          // must have Guardian.hasAuthorityToConsent
  affiliationId    String?         // the facility this grant is TO
  caseId           String?         // retained for clinical consents
  type             ConsentType     // existing enum — already has ASSESSMENT, SHARING, DATA_PROCESSING
  purpose          String
  scope            Json
  consentVersionId String
  validFrom        DateTime
  validUntil       DateTime?
  revokedAt        DateTime?
}
```

`ConsentTemplate` moves from `clinicId` → `facilityId` (nurseries need their own consent packs — enrolment-time, bulk, per-child).

### The access resolver

One function answers every access question in the product:

```
canAccess(actor, child, resource) =
     actor is a Guardian with authority            → allow at Guardian.accessLevel
  || actor has ACTIVE FacilityMember on facility F
     AND child has ACTIVE ChildAffiliation to F
     AND an unrevoked, in-validity ChildConsent covers (F, resource.type)
     AND resource.type ≤ affiliation.dataScope
     AND FACILITY_CAPABILITIES[F.type] permits the action
                                                    → allow
  otherwise                                         → deny
```

**The scoping concerns from §1 close as a side-effect** — not because each call site was patched, but because there is no longer a path to a child that doesn't route through an affiliation. The unsafe query becomes the hard one to write.

---

## 7. Migration plan — additive

Prod migrations are currently applied **by hand via psql** (the migration runner is broken — see `docs/` + project memory). A big-bang rename is therefore unacceptably risky. Go additive; drop old columns last.

| Phase | Work | Risk |
|---|---|---|
| **A — Scoping hardening (do first, independent of everything)** | Make clinic scope resolution fail-closed; make child access relationship-based rather than role-based; require membership on organization reads. | Low. **Gates the pilot regardless of what else we build.** |
| **B — Introduce** | Add `Facility`, `ChildAffiliation`, `Room`, `FacilityMember`, `OrgKind`, capability map. Extend `LicenseAuthority`. Nothing reads them yet. | Low — purely additive. |
| **C — Backfill** | `Clinic` → `Facility(type: CLINIC)` (1:1, keep ids). `Child.clinicId` → `ChildAffiliation(type: PATIENT, scope: FULL_CLINICAL, status: ACTIVE)`. `Clinic.adminId` → `FacilityMember(OWNER)`. `TherapistProfile.clinicId` → `FacilityMember(THERAPIST)`. Dual-write both models. | Medium — verify row counts match before cutting readers over. |
| **D — Migrate readers** | Module by module: `clinic-patients` → `clinic-outcomes` → `cases` → `bookings`. Each switches from `clinicId` to affiliation joins. Lint rule / CI check banning **new** reads of `Child.clinicId`. | Medium — the discipline risk of the additive path is new code reaching for the old FK. The lint rule is not optional. |
| **E — Consent** | `CaseConsent` → `ChildConsent` with `affiliationId`. `ConsentTemplate.clinicId` → `facilityId`. Wire the resolver into the guards. | Medium. |
| **F — Drop** | Remove `Child.clinicId`, `Clinic.adminId`, `Clinic` table. | Low, once D+E are done and dual-write has been clean for a release. |

Nursery features (roster, educator screening, observation capture, the concern → conversation pathway, inclusion dashboard) build on **B + C** and do not need to wait for F.

---

## 8. Open decisions

1. **Is a nursery ever a `PATIENT` affiliation?** Assumed no — nurseries observe, clinics treat. If a nursery employs an in-house SLT, they need a `CLINIC` facility under the same Organization, not a widened `NURSERY`. Confirm.
2. **`User.role` vs membership.** `ORGANIZATION` in the platform `Role` enum is referenced by **zero** authorization logic — it's dead. The clean end state is `User.role ∈ {USER, ADMIN, SUPERADMIN}` (platform identity only) with all B2B authority derived from membership rows. That's a further refactor; not required for the nursery pilot, but we should stop adding to `Role`.
3. **Does the parent have to be a platform user?** Most nursery children won't have a parent on Upllyft. `ChildAffiliation.status = PENDING_CONSENT` supports nursery-created children awaiting a guardian claim — reuse the `Lead` / `walkinCreatedByAdmin` precedent. Confirm the claim flow.
4. **Screening instrument validity.** Out of scope for tenancy, but blocking for the nursery pitch: the item bank is hand-authored ("Upllyft Developmental Screening v1") while the V2 report spec claims "ASQ-3 methodology". Population screening in a nursery invites a procurement question we cannot currently answer. Needs a separate decision.
