# Clinic Management — Data-Model Design (Phases 0–2)

**Status:** Draft v1 · June 2026
**Companion to:** `docs/clinic-management-gap-analysis-and-build-plan.md`
**Schema:** `apps/api/prisma/schema.prisma` (PostgreSQL + pgvector; cuid ids; `@@map` snake_case tables)
**Posture (locked):** Upllyft is a **workflow + engagement layer integrated with the clinic EHR**, not the system-of-record. Authoritative clinical artifacts are *exported* to the EHR; Upllyft keeps a working copy + a pointer (`ehrRef`/`exportedToEhrAt`) rather than EHR-grade legal locking/retention.

This document specifies the Prisma additions for **Phase 0 (enforce + authority)**, **Phase 1 (identity/guardian/consent)**, and **Phase 2 (payer/insurance)**. Phase 3–4 models (Lead, Triage, Telehealth metadata, MDT, Incident/Escalation) are noted at the end and designed in a follow-up.

---

## Conventions & ground rules
- `String @id @default(cuid())`; `@@map("snake_case")`; `@@index` on every FK; `createdAt/updatedAt`.
- **No destructive retention** — the EHR is the legal record. Closure = soft archive (`archivedAt`) + access logs.
- **PHI fields** (`emiratesId`, `passportNumber`, insurance card refs) are stored **encrypted at the application layer** (Prisma middleware / column encryption) — schema holds ciphertext strings; never log plaintext.
- **Audit** reuses existing `AuditLog` (PDPL, app-wide) + `CaseAuditLog` (case-scoped). Every PHI read/export/share writes a row.
- Each addition below is tagged with the **stage/gap** it closes.

---

## Phase 0 — Facility, licence authority & scope enforcement

### New enums
```prisma
enum LicenseAuthority {
  DHA    // Dubai Health Authority
  DOH    // Department of Health – Abu Dhabi
  MOHAP  // Ministry of Health and Prevention (other emirates)
  OTHER
}

enum Emirate {
  ABU_DHABI
  DUBAI
  SHARJAH
  AJMAN
  UMM_AL_QUWAIN
  RAS_AL_KHAIMAH
  FUJAIRAH
}

enum FacilityComplianceStatus {
  DRAFT
  IN_REVIEW
  ACTIVE
  SUSPENDED
}
```

### `Clinic` — field additions  *(Stage 0.1 — authority context + compliance gate)*
```prisma
  // --- UAE regulatory context ---
  licenseAuthority     LicenseAuthority?
  emirate              Emirate?
  complianceStatus     FacilityComplianceStatus @default(DRAFT)
  complianceReviewedAt DateTime?
  complianceReviewedBy String?
  // --- EHR integration (engagement-layer posture) ---
  ehrSystemName        String?   // e.g. "Bayanati", "InstaHMS"
  nabidhFacilityCode   String?
  consentTemplates     ConsentTemplate[]   // back-ref (Phase 1)
```
> **Behaviour change:** public visibility / case creation must require `complianceStatus == ACTIVE` (service-level gate). Keep `isPublic` but AND it with compliance in the resolver. **Backfill decision:** grandfather existing clinics to `ACTIVE`, or set `IN_REVIEW` for a one-time review pass (recommend `ACTIVE` to avoid disruption, flagged for review).

### `TherapistProfile` — field additions  *(Stage 0.2 / 9.2 — authority + clinical scope)*
```prisma
  licenseAuthority  LicenseAuthority?
  canDiagnose       Boolean   @default(false)   // scope gate for diagnosis fields
  scopeOfPractice   String[]  @default([])      // disciplines they may document, e.g. ["SPEECH","OT"]
```
> `licenceNumber`, `licenceExpiry`, `credentialStatus` already exist — Phase 0 makes them **enforced** (below), not new.

### Enforcement points (code, not schema)
| Mechanism | What it does | Closes |
|---|---|---|
| `LicenceExpiryJob` (cron, daily) | Sets `credentialStatus = EXPIRED` where `licenceExpiry < now()` | 0.2 |
| `AllocationGuard` | Rejects `createCase` / `addTherapist` / clinic booking assignment when therapist `credentialStatus != VERIFIED` or licence expired | 0.2, 5.3, 4.2 |
| `DiagnosisScopeGuard` | Field-level: only `canDiagnose` therapists may write `Case.diagnosis` (and future diagnosis fields) | 0.7, 9.2 |
| `ComplianceGate` | `Clinic.isPublic` + case creation require `complianceStatus == ACTIVE` | 0.1 |

---

## Phase 1 — Identity, guardian & consent-as-access-control

### New enums
```prisma
enum IdentityDocType { EMIRATES_ID PASSPORT BIRTH_CERTIFICATE OTHER }

enum GuardianRelationship { MOTHER FATHER LEGAL_GUARDIAN GRANDPARENT SIBLING OTHER }
enum GuardianAccessLevel  { FULL LIMITED VIEW_ONLY NONE }

enum PreVisitTaskType   { INTAKE_FORM CONSENT IDENTITY DOCUMENT PAYMENT PREAUTH QUESTIONNAIRE }
enum PreVisitTaskStatus { PENDING IN_PROGRESS COMPLETE WAIVED }
```

### `Child` — identity field additions  *(Stage 2.1–2.2)*
```prisma
  emiratesId         String?         // ENCRYPTED at app layer
  emiratesIdExpiry   DateTime?
  passportNumber     String?         // ENCRYPTED at app layer
  identityType       IdentityDocType?
  identityVerified   Boolean   @default(false)
  identityVerifiedAt DateTime?
  identityVerifiedBy String?
  // back-refs for new Phase-1/2 models:
  guardians          Guardian[]
  identityDocuments  PatientIdentityDocument[]
  preVisitTasks      PreVisitTask[]
  insurancePolicies  InsurancePolicy[]
```
> Add a duplicate-detection query at registration: match on (`firstName`+`dateOfBirth`), normalized phone, or `emiratesId` → return candidates before insert. *(Stage 2.1)*

### `PatientIdentityDocument` — new model  *(Stage 2.2 — restricted, audited ID storage)*
```prisma
model PatientIdentityDocument {
  id           String         @id @default(cuid())
  childId      String
  child        Child          @relation(fields: [childId], references: [id], onDelete: Cascade)
  type         IdentityDocType
  fileUrl      String         // stored in a RESTRICTED bucket; access via guard + audited read
  uploadedById String
  uploadedBy   User           @relation("UploadedIdentityDocs", fields: [uploadedById], references: [id])
  createdAt    DateTime       @default(now())

  @@index([childId])
  @@map("patient_identity_documents")
}
```

### `Guardian` — new model  *(Stage 2.3 — authority to consent + per-guardian access)*
```prisma
model Guardian {
  id                    String               @id @default(cuid())
  childId               String
  child                 Child                @relation(fields: [childId], references: [id], onDelete: Cascade)
  userId                String?              // linked portal account, if any
  user                  User?                @relation("GuardianUser", fields: [userId], references: [id])
  fullName              String
  relationship          GuardianRelationship
  hasAuthorityToConsent Boolean              @default(false)
  isPrimaryContact      Boolean              @default(false)
  isEmergencyContact    Boolean              @default(false)
  phone                 String?
  email                 String?
  accessLevel           GuardianAccessLevel  @default(VIEW_ONLY)
  consentsGranted       CaseConsent[]        @relation("ConsentGuardian")
  createdAt             DateTime             @default(now())
  updatedAt             DateTime             @updatedAt

  @@index([childId])
  @@map("guardians")
}
```

### Consent overhaul  *(Stages 0.5, 3.3 — versioned, immutable, actionable)*

**Extend `ConsentType` enum** (add to existing TREATMENT/SHARING/ASSESSMENT/RECORDING/RESEARCH):
```prisma
  TELEHEALTH
  REPORT_SHARING
  COMMUNICATION
  DATA_PROCESSING
```

**New `ConsentTemplate` + `ConsentVersion`** (clinic-configured, version-immutable):
```prisma
model ConsentTemplate {
  id        String           @id @default(cuid())
  clinicId  String?
  clinic    Clinic?          @relation(fields: [clinicId], references: [id])
  type      ConsentType
  name      String
  isActive  Boolean          @default(true)
  versions  ConsentVersion[]
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  @@index([clinicId])
  @@index([type])
  @@map("consent_templates")
}

model ConsentVersion {
  id          String          @id @default(cuid())
  templateId  String
  template    ConsentTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  version     Int
  purpose     String          // why the data is used (DHA consent requirement)
  bodyUrl     String?         // rendered, immutable consent document
  bodyHash    String?         // integrity check
  publishedAt DateTime        @default(now())
  consents    CaseConsent[]   // signatures referencing this version

  @@unique([templateId, version])
  @@map("consent_versions")
}
```
> **Immutability rule (service-enforced):** once a `ConsentVersion` is referenced by any signed `CaseConsent`, it cannot be edited — publishing a change creates a new `version`.

**Extend `CaseConsent`** (turn it from a stored record into an enforceable grant):
```prisma
  consentVersionId    String?
  consentVersion      ConsentVersion? @relation(fields: [consentVersionId], references: [id])
  purpose             String?
  recipient           String?         // who is authorised, e.g. "School: GEMS", "Insurer: Daman"
  scope               Json?           // structured: which data/actions are authorised
  grantedByGuardianId String?
  grantedByGuardian   Guardian?       @relation("ConsentGuardian", fields: [grantedByGuardianId], references: [id])
  consentFormId       String?         // link to the DocuSign envelope record (ConsentForm)
```

**Enforcement:** a `ConsentService.assertActiveConsent(caseId, type, recipient?)` helper, called by:
- `CaseAccessGuard` before serving PHI/documents *(Stage 3 — consent as access control)*
- document/report **share** endpoints *(Stages 10.5, 14.3)*
- telehealth session start *(Stage 6.2)*
- media uploads check `RECORDING` consent *(Stage 3.4)*

### `PreVisitTask` — new model  *(Stages 2.5, 4.5 — single pre-visit checklist)*
```prisma
model PreVisitTask {
  id          String            @id @default(cuid())
  childId     String
  child       Child             @relation(fields: [childId], references: [id], onDelete: Cascade)
  caseId      String?
  bookingId   String?
  type        PreVisitTaskType
  status      PreVisitTaskStatus @default(PENDING)
  label       String
  dueAt       DateTime?
  completedAt DateTime?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@index([childId])
  @@index([status])
  @@map("pre_visit_tasks")
}
```
> Powers the patient-portal checklist AND the reception pre-visit blocker dashboard (Stage 4.5) — both read the same task set.

---

## Phase 2 — Payer / insurance / pre-authorisation

### New enums
```prisma
enum PayerType { SELF_PAY INSURANCE EMPLOYER SCHOOL_SPONSOR NGO_SPONSOR OTHER_THIRD_PARTY }
enum PreAuthStatus { NOT_REQUIRED PENDING APPROVED DENIED EXPIRED }
enum FinancialClearanceStatus { NOT_REQUIRED PENDING CLEARED EXCEPTION_APPROVED BLOCKED }
enum SessionModality { IN_PERSON TELEHEALTH HYBRID }
```

### `InsurancePolicy` — new model  *(Stage 2.4 — payer profile)*
```prisma
model InsurancePolicy {
  id               String             @id @default(cuid())
  childId          String
  child            Child              @relation(fields: [childId], references: [id], onDelete: Cascade)
  payerType        PayerType          @default(INSURANCE)
  insurerName      String?
  sponsorName      String?            // employer / school / NGO when payerType is a sponsor
  policyNumber     String?
  memberId         String?
  cardDocumentUrl  String?            // RESTRICTED, audited
  validFrom        DateTime?
  validUntil       DateTime?
  coPayPercent     Float?
  isActive         Boolean            @default(true)
  preAuthorizations PreAuthorization[]
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt

  @@index([childId])
  @@map("insurance_policies")
}
```

### `PreAuthorization` — new model  *(Stages 4.3, 11.4, 13.4 — auth lifecycle + renewal)*
```prisma
model PreAuthorization {
  id               String            @id @default(cuid())
  policyId         String
  policy           InsurancePolicy   @relation(fields: [policyId], references: [id], onDelete: Cascade)
  caseId           String?
  case             Case?             @relation(fields: [caseId], references: [id])
  serviceCode      String?
  preAuthNumber    String?
  status           PreAuthStatus     @default(PENDING)
  approvedSessions Int?
  usedSessions     Int               @default(0)
  validFrom        DateTime?
  validUntil       DateTime?
  denialReason     String?
  renewedFromId    String?           @unique   // renewal chain (self-relation)
  renewedFrom      PreAuthorization? @relation("PreAuthRenewal", fields: [renewedFromId], references: [id])
  renewal          PreAuthorization? @relation("PreAuthRenewal")
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  @@index([policyId])
  @@index([caseId])
  @@index([status])
  @@map("pre_authorizations")
}
```

### `SessionType` — field additions  *(Stage 0.4 — service config)*
```prisma
  modality          SessionModality @default(IN_PERSON)
  serviceCode       String?
  payerRoute        PayerType?      // default route hint
  requiresPreAuth   Boolean         @default(false)
  insuranceEligible Boolean         @default(false)
```

### `Booking` — field additions  *(Stage 4 — modality + payer + clearance)*
```prisma
  modality              SessionModality?
  paymentRoute          PayerType                @default(SELF_PAY)
  financialClearance    FinancialClearanceStatus @default(NOT_REQUIRED)
  clearanceApprovedById String?
  preAuthorizationId    String?
  depositAmount         Float?
```
> **Note:** `Booking.currency` defaults to `"USD"` today — for UAE clinic bookings this should be `"AED"`. Recommend a clinic-context default rather than a global change (flag).

### `CaseBilling` & `Invoice` — field additions  *(Stages 11.4, 13.4, 15.3 — payer-aware billing)*
```prisma
  // CaseBilling
  payerType          PayerType  @default(SELF_PAY)
  insurancePolicyId  String?
  preAuthorizationId String?
  // Invoice
  payerType          PayerType  @default(SELF_PAY)
  insurancePolicyId  String?
```

### Enforcement points
| Mechanism | What it does | Closes |
|---|---|---|
| `FinancialClearanceGuard` | Blocks booking `CONFIRMED` / encounter start unless `CLEARED` or `EXCEPTION_APPROVED` (override audited) | 4.3, 4.5, 6.1 |
| `PreAuthCounter` | Increments `PreAuthorization.usedSessions` on each signed session; blocks when `usedSessions >= approvedSessions` | 11.4, 12.1 |
| `PreAuthExpiryJob` (cron) | Alerts when `validUntil` is near or sessions are exhausted; flags renewal | 13.1, 13.4 |
| Payer-denial flow | `status = DENIED` triggers self-pay-transition task | 13.4 |

---

## Back-reference additions required on existing models
Prisma needs the inverse relation declared on the referenced model. Add:
- **`Child`**: `guardians`, `identityDocuments`, `preVisitTasks`, `insurancePolicies` *(shown above)*.
- **`Clinic`**: `consentTemplates ConsentTemplate[]` *(shown above)*.
- **`Case`**: `preAuthorizations PreAuthorization[]`.
- **`User`**: `@relation("UploadedIdentityDocs")` (PatientIdentityDocument), `@relation("GuardianUser")` (Guardian).
- **`ConsentForm`**: optional `caseConsents CaseConsent[]` if linking signatures back.

---

## Migration & rollout notes
1. **pgvector shadow-DB caveat** (per `CLAUDE.md`): shadow-database migrations fail with the vector extension. Generate with `pnpm --filter @upllyft/api prisma:migrate --create-only`, hand-edit the SQL, then apply.
2. **Encryption**: implement app-layer encryption (Prisma middleware) for `Child.emiratesId/passportNumber` and `InsurancePolicy.cardDocumentUrl` before any data entry.
3. **Backfill**: `Clinic.complianceStatus` → `ACTIVE` for existing clinics (grandfather); `Booking`/billing `payerType` → `SELF_PAY`; `SessionType.modality` → `IN_PERSON`.
4. **Ship order**: Phase 0 first (enums + Clinic/TherapistProfile fields + enforcement — low risk, high value), then Phase 1 (identity/guardian/consent), then Phase 2 (payer). Each is an independent migration.
5. **Validation**: `prisma generate` + a type-check/build after each phase migration.

---

## Stage → addition coverage (quick map)
| Stage gap | Addition |
|---|---|
| 0.1 authority/compliance | `Clinic.licenseAuthority/emirate/complianceStatus` + ComplianceGate |
| 0.2 licence enforcement | LicenceExpiryJob + AllocationGuard (uses existing fields) |
| 0.4 service config | `SessionType.modality/serviceCode/payerRoute/requiresPreAuth/insuranceEligible` |
| 0.5/3.3 consent | `ConsentTemplate`/`ConsentVersion` + `CaseConsent` purpose/recipient/version + ConsentService |
| 0.7/9.2 scope | `TherapistProfile.canDiagnose/scopeOfPractice` + DiagnosisScopeGuard |
| 2.2 identity | `Child` Emirates-ID fields + `PatientIdentityDocument` |
| 2.3 guardian | `Guardian` model |
| 2.5/4.5 checklist | `PreVisitTask` |
| 2.4/4.3 payer | `InsurancePolicy` + `PreAuthorization` + Booking/SessionType/billing fields |
| 4 clearance | `Booking.financialClearance` + FinancialClearanceGuard |
| 13 renewal | `PreAuthorization` renewal chain + PreAuthExpiryJob |

---

## Not in this design (Phase 3–4 — next document)
`Lead`/enquiry funnel + `LeadStatus`/`LeadChannel`; `TriageQueue` + clinical-lead role; `TelehealthEncounter` metadata model; `MdtReview` + report-approval gate (`CaseDocument.status`); `CaseIncident`/`Escalation` (+ risk categories); review-trigger engine wiring for the (currently dead) `TreatmentPlan`; EHR export module (PDF→FHIR/NABIDH). These build on the Phase 0–2 foundations above.
