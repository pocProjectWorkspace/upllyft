# Clinic Management — Data-Model Design (Phases 3–4)

**Status:** Draft v1 · June 2026
**Companion to:** `clinic-management-gap-analysis-and-build-plan.md` and `clinic-management-data-model-design.md` (Phases 0–2).
**Schema:** `apps/api/prisma/schema.prisma` (PostgreSQL + pgvector; cuid; `@@map` snake_case).
**Posture (locked):** workflow + engagement layer integrated with the clinic EHR — authoritative clinical artifacts are *exported* to the EHR (`ehrRef`/`exportedToEhrAt`), not legally locked/retained here.

Covers **Phase 3 (clinical orchestration)** and **Phase 4 (safety, discharge, retention, bilingual)**. Builds on the Phase 0–2 foundations (licence/scope enforcement, identity/guardian, consent-as-control, payer/pre-auth).

---

## Phase 3 — Clinical orchestration

### 3.1 Lead / enquiry funnel  *(Stage 1)*
```prisma
enum LeadChannel { WEBSITE WHATSAPP SOCIAL PHONE REFERRAL INSURER WALK_IN OTHER }
enum LeadStatus  { NEW CONTACTED QUALIFIED WAITLISTED CONVERTED OUT_OF_SCOPE DUPLICATE CLOSED }

model Lead {
  id              String      @id @default(cuid())
  clinicId        String
  clinic          Clinic      @relation("ClinicLeads", fields: [clinicId], references: [id])
  channel         LeadChannel @default(WEBSITE)
  status          LeadStatus  @default(NEW)
  // enquiry payload
  concern         String?
  childAge        String?
  preferredBranch String?
  language        String?
  payerIndication PayerType?              // self-pay/insurance hint (Phase 2 enum)
  contactName     String?
  contactPhone    String?
  contactEmail    String?
  // referrer (structured, for analytics) — Stage 1.2/1.4
  referralSource  String?
  referrerName    String?
  referrerOrg     String?
  referrerContact String?
  referrerConsentId String?               // consent-gated external referral (CaseConsent / ExternalShare)
  // ops
  assignedToId    String?
  assignedTo      User?       @relation("LeadAssignee", fields: [assignedToId], references: [id])
  qualifiedAt     DateTime?
  closeReason     String?                 // structured close (Stage 1.3)
  convertedChildId String?    @unique     // link once converted to a patient
  convertedChild  Child?      @relation("LeadConversion", fields: [convertedChildId], references: [id])
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([clinicId])
  @@index([status])
  @@index([channel])
  @@map("leads")
}
```
> Leads precede `Child` (no more conflating enquiries with patients). Walk-in stays as-is but can also originate a `Lead` for funnel analytics.

### 3.2 Clinical-lead role, triage & care pathways  *(Stage 5)*
```prisma
enum ClinicRole     { THERAPIST CLINICAL_LEAD MEDICAL_DIRECTOR CARE_COORDINATOR }
enum TriageStatus   { PENDING IN_REVIEW DECIDED }
enum TriageDecision { PROCEED REQUEST_MORE_INFO URGENT_REFERRAL ALTERNATE_SERVICE OUT_OF_SCOPE }
enum RiskLevel      { NONE LOW MODERATE HIGH }
```

**`TherapistProfile` — add governance role:**
```prisma
  clinicRole  ClinicRole  @default(THERAPIST)   // who may triage / approve MDT / clear escalations
```

**`TriageReview` — new model** (clinical-lead reviews intake/risk before allocation):
```prisma
model TriageReview {
  id                  String         @id @default(cuid())
  caseId              String?
  case                Case?          @relation(fields: [caseId], references: [id])
  leadId              String?
  reviewedById        String
  reviewedBy          User           @relation("TriageReviewer", fields: [reviewedById], references: [id])
  status              TriageStatus   @default(PENDING)
  decision            TriageDecision?
  riskLevel           RiskLevel      @default(NONE)
  aiSummary           String?                       // assistive, non-diagnostic
  notes               String?
  pathwayTemplateId   String?
  pathwayTemplate     PathwayTemplate? @relation(fields: [pathwayTemplateId], references: [id])
  acknowledgedByGuardianAt DateTime?                 // Stage 5.5
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt

  @@index([caseId])
  @@index([status])
  @@map("triage_reviews")
}
```

**`PathwayTemplate` — new model** (clinic-configured pathway that auto-generates tasks/forms/appointment types):
```prisma
model PathwayTemplate {
  id           String         @id @default(cuid())
  clinicId     String?
  clinic       Clinic?        @relation("ClinicPathways", fields: [clinicId], references: [id])
  name         String
  serviceCodes String[]       @default([])
  // declarative spec: which intake forms, task types, appointment/session types to spawn
  generates    Json
  isActive     Boolean        @default(true)
  triageReviews TriageReview[]
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  @@index([clinicId])
  @@map("pathway_templates")
}
```
> **Allocation** continues to use `AllocationGuard` (Phase 0) for licence/scope; `CaseTherapist` already records the licensed assignee (traceability). Add `Case.pathwayTemplateId` (optional) to record the chosen pathway.

### 3.3 Telehealth encounter metadata  *(Stage 6.2 — DHA telehealth standard)*
```prisma
enum TelehealthPlatform { GOOGLE_MEET ZOOM MS_TEAMS WHATSAPP OTHER }

model TelehealthEncounter {
  id                String             @id @default(cuid())
  sessionId         String             @unique
  session           CaseSession        @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  platform          TelehealthPlatform @default(GOOGLE_MEET)
  clinicianLicence  String?            // captured at encounter (DHA requirement)
  clinicianLocation String?            // emirate/city
  patientLocation   String?            // patient's location during session
  telehealthConsentId String?          // CaseConsent of type TELEHEALTH
  startedAt         DateTime?
  endedAt           DateTime?
  createdAt         DateTime           @default(now())

  @@map("telehealth_encounters")
}
```
> A telehealth session cannot start unless a `TELEHEALTH` consent is active (ConsentService) and these fields are captured.

### 3.4 MDT review + report-approval gate  *(Stage 10)*
```prisma
enum MdtReviewStatus { SCHEDULED COMPLETED CANCELLED }
enum ReportStatus    { DRAFT PENDING_APPROVAL APPROVED REJECTED }
enum ReportAudience  { PROFESSIONAL PARENT }

model MdtReview {
  id            String          @id @default(cuid())
  caseId        String
  case          Case            @relation(fields: [caseId], references: [id], onDelete: Cascade)
  scheduledAt   DateTime?
  status        MdtReviewStatus @default(SCHEDULED)
  summary       String?                          // consensus / decision record
  conductedById String?
  conductedBy   User?           @relation("MdtConductor", fields: [conductedById], references: [id])
  attendees     MdtAttendee[]
  reports       CaseDocument[]                    // reports produced from this review
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  @@index([caseId])
  @@map("mdt_reviews")
}

model MdtAttendee {
  id          String    @id @default(cuid())
  mdtReviewId String
  mdtReview   MdtReview @relation(fields: [mdtReviewId], references: [id], onDelete: Cascade)
  userId      String
  user        User      @relation("MdtAttendee", fields: [userId], references: [id])
  required    Boolean   @default(true)
  attended    Boolean   @default(false)
  approvedAt  DateTime?                           // sign-off log (Stage 10.1/10.2)

  @@unique([mdtReviewId, userId])
  @@index([mdtReviewId])
  @@map("mdt_attendees")
}
```

**`CaseDocument` — report-approval + dual-audience + access logging:**
```prisma
  status              ReportStatus   @default(DRAFT)
  audience            ReportAudience @default(PROFESSIONAL)
  approvedById        String?
  approvedAt          DateTime?
  rejectionReason     String?
  // parent-friendly variant linked to its professional source (Stage 10.3)
  parentVersionId     String?        @unique
  parentVersion       CaseDocument?  @relation("ReportParentVersion", fields: [parentVersionId], references: [id])
  professionalVersion CaseDocument?  @relation("ReportParentVersion")
  mdtReviewId         String?
  mdtReview           MdtReview?     @relation(fields: [mdtReviewId], references: [id])
  // access logging (mirrors AssessmentReport.downloadCount pattern)
  downloadCount       Int            @default(0)
  lastDownloadedAt    DateTime?
  // EHR export pointer (engagement-layer)
  ehrRef              String?
  exportedToEhrAt     DateTime?
```
> **Gate (service):** `shareDocument` rejects unless `status == APPROVED` AND an active `REPORT_SHARING`/`SHARING` consent exists for the recipient. Every read/download writes an `AuditLog` row and bumps `downloadCount`.

### 3.5 Care-plan activation, goal measurability, review triggers & clinical flags  *(Stages 11–13)*

**`TreatmentPlan` — activate the dead stub:**
```prisma
  frequency          String?        // e.g. "2x/week"
  sessionsPlanned    Int?
  reviewIntervalDays Int?
  activatedAt        DateTime?
  parentAcceptedAt   DateTime?       // reuse IEP dual-approval pattern
  reviews            CaseReview[]
```

**`IEPGoal` — measurability fields  *(Stage 11.2)*:**
```prisma
  frequency          String?
  baselineValue      Float?
  reviewIntervalDays Int?
```

**`CaseSession` — clinical flags + plan link + addendum + EHR pointer:**
```prisma
  treatmentPlanId String?            // tie recurring sessions to plan/package (Stage 12.1)
  clinicalFlag    Boolean            @default(false)   // Stage 12.5
  flagType        ClinicalFlagType?
  flagReason      String?
  telehealthEncounter TelehealthEncounter?
  addendums       SessionAddendum[]                    // Stage 9.5 — amend signed notes via addendum
  ehrRef          String?
  exportedToEhrAt DateTime?
```

```prisma
enum ClinicalFlagType { REGRESSION NEW_RISK POOR_PROGRESS PLAN_REVIEW }

model SessionAddendum {
  id        String      @id @default(cuid())
  sessionId String
  session   CaseSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  authorId  String
  author    User        @relation("SessionAddendumAuthor", fields: [authorId], references: [id])
  content   String
  createdAt DateTime    @default(now())

  @@index([sessionId])
  @@map("session_addendums")
}
```

**`CaseReview` — new model** (the review-trigger engine's records  *(Stage 13)*):
```prisma
enum ReviewTriggerType { PLAN_DATE SESSION_COUNT AUTH_EXPIRY GOAL_PROGRESS CLINICAL_FLAG MANUAL }
enum ReviewStatus      { DUE IN_PROGRESS COMPLETED }

model CaseReview {
  id              String            @id @default(cuid())
  caseId          String
  case            Case              @relation(fields: [caseId], references: [id], onDelete: Cascade)
  treatmentPlanId String?
  treatmentPlan   TreatmentPlan?    @relation(fields: [treatmentPlanId], references: [id])
  triggerType     ReviewTriggerType
  status          ReviewStatus      @default(DUE)
  dueAt           DateTime?
  completedById   String?
  completedBy     User?             @relation("CaseReviewCompleter", fields: [completedById], references: [id])
  outcome         String?           // continue / revise / intensify / reduce / pause / discharge
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([caseId])
  @@index([status])
  @@map("case_reviews")
}
```
> A `ReviewSchedulerJob` (cron) creates `CaseReview(status=DUE)` rows from: `TreatmentPlan.reviewIntervalDays`/`IEP.reviewDate`, session counts vs `sessionsPlanned`, `PreAuthorization.validUntil`/sessions exhausted (Phase 2), goal progress, and `CaseSession.clinicalFlag`. Clinical flags create a `CLINICAL_FLAG` review immediately.

### 3.6 EHR export module  *(Stages 6.4, 9.4, 10.x, 15)*
```prisma
enum EhrExportFormat { PDF FHIR STRUCTURED_JSON }
enum EhrExportStatus { PENDING EXPORTED RECONCILED FAILED }

model EhrExport {
  id           String          @id @default(cuid())
  clinicId     String
  clinic       Clinic          @relation("ClinicEhrExports", fields: [clinicId], references: [id])
  resourceType String          // 'CaseSession' | 'CaseDocument' | 'AssessmentReport' | 'DischargeSummary'
  resourceId   String
  format       EhrExportFormat  @default(PDF)
  status       EhrExportStatus  @default(PENDING)
  payloadUrl   String?
  ehrRef       String?          // identifier returned by the clinic EHR / NABIDH
  exportedById String?
  exportedBy   User?            @relation("EhrExporter", fields: [exportedById], references: [id])
  reconciledAt DateTime?
  error        String?
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  @@index([clinicId])
  @@index([resourceType, resourceId])
  @@index([status])
  @@map("ehr_exports")
}
```
> v1 = **PDF / structured-JSON export + manual reconcile**; FHIR / NABIDH adapter slots in behind the same model later. Source artifacts carry `ehrRef`/`exportedToEhrAt` pointers.

---

## Phase 4 — Safety, discharge, retention & bilingual

### 4.1 Incident / escalation + consent-gated external sharing  *(Stage 14)*
```prisma
enum IncidentCategory     { MEDICAL_INSTABILITY MENTAL_HEALTH_RISK SAFEGUARDING SEVERE_BEHAVIOUR ABUSE_NEGLECT OUT_OF_SCOPE OTHER }
enum IncidentUrgency      { EMERGENCY URGENT ROUTINE }
enum IncidentStatus       { OPEN IN_REVIEW ACTION_TAKEN CLOSED }
enum ExternalRecipientType { SCHOOL PHYSICIAN SPECIALIST HOSPITAL INSURER OTHER_PROVIDER PARENT }

model CaseIncident {
  id               String           @id @default(cuid())
  caseId           String?
  case             Case?            @relation(fields: [caseId], references: [id])
  childId          String?
  raisedById       String
  raisedBy         User             @relation("IncidentRaiser", fields: [raisedById], references: [id])
  raisedFromModule String?          // 'session' | 'reception' | 'portal' | 'triage' (startable anywhere — Stage 14.1)
  category         IncidentCategory
  urgency          IncidentUrgency  @default(ROUTINE)
  status           IncidentStatus   @default(OPEN)
  ownerId          String?
  owner            User?            @relation("IncidentOwner", fields: [ownerId], references: [id])
  description      String
  clinicalDecision String?
  actionPlan       String?
  closedAt         DateTime?
  closedById       String?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  @@index([caseId])
  @@index([status])
  @@index([urgency])
  @@map("case_incidents")
}

// Consent-gated, time-bound external share (referral-out, school/insurer share).
// Also serves Stage 1.4 (referrer access) and Stage 10.5 (report release to externals).
model ExternalShare {
  id            String                @id @default(cuid())
  caseId        String?
  case          Case?                 @relation(fields: [caseId], references: [id])
  recipientName String
  recipientType ExternalRecipientType
  consentId     String                // must reference an active CaseConsent of correct type/recipient
  token         String                @unique   // scoped, single-purpose access token
  expiresAt     DateTime
  revokedAt     DateTime?
  accessCount   Int                   @default(0)
  lastAccessedAt DateTime?
  createdById   String
  createdBy     User                  @relation("ExternalShareCreator", fields: [createdById], references: [id])
  createdAt     DateTime              @default(now())

  @@index([caseId])
  @@index([token])
  @@map("external_shares")
}
```
> Incidents are **startable from any module** (`raisedFromModule`), routed by `urgency`, owned, and tracked to `CLOSED`; an open-incident dashboard surfaces unresolved ones. Every external share is consent-checked, token-scoped, time-bound, and access-logged.

### 4.2 Discharge, reactivation & soft retention  *(Stage 15)*

**`Case` — field additions** (split reasons, archive, reactivation; **no destructive retention — EHR owns the legal record**):
```prisma
  clinicalDischargeReason String?       // Stage 15.1 — separate from admin reason
  adminDischargeReason    String?
  dischargeSummaryDocId   String?        // links to approved CaseDocument(DISCHARGE_SUMMARY)
  archivedAt              DateTime?      // soft archive (not deletion)
  retentionUntil          DateTime?      // policy date; enforcement = access-lock, not delete
  reactivatedAt           DateTime?
  reactivatedFromId       String?        // prior closed case, to avoid duplicate registration (Stage 15.4)
  // back-refs (Phase 3/4)
  triageReviews           TriageReview[]
  mdtReviews              MdtReview[]
  reviews                 CaseReview[]
  incidents               CaseIncident[]
  externalShares          ExternalShare[]
  preAuthorizations       PreAuthorization[]   // (declared with Phase 2)
```
> **Discharge service logic (no new schema):** on discharge, reconcile open `CaseBilling`/`Invoice`, auto-check & cancel future `Booking`s, and produce the discharge summary (export to EHR). **Reactivation** reopens the same case (`status ACTIVE`, set `reactivatedAt`) — no duplicate `Child`/`Case`.

### 4.3 Bilingual (Arabic / English + RTL)  *(checklist — Medium)*
Primarily an **app-layer i18n** concern (the apps are `lang="en"` only today) — not a large schema change. Minimal data-model support:
- `Child.primaryLanguage` already exists; add `Lead.language` (above) and use it to pick form/notification locale.
- `ConsentVersion` (Phase 1) and `PathwayTemplate.generates` / `FormTemplate` (Phase 1 plan) can hold **locale-keyed** content (`{ en: ..., ar: ... }`) so consents/forms/reports render bilingually.
- Add `locale` to outbound notification/communication records where stored.
- Front-end: add `next-intl`/i18n + RTL styling (engineering task, tracked separately).

---

## Back-reference additions required on existing models
- **`Clinic`**: `leads Lead[] @relation("ClinicLeads")`, `pathwayTemplates PathwayTemplate[] @relation("ClinicPathways")`, `ehrExports EhrExport[] @relation("ClinicEhrExports")`.
- **`Case`**: `triageReviews`, `mdtReviews`, `reviews CaseReview[]`, `incidents CaseIncident[]`, `externalShares` *(shown above)*, plus `pathwayTemplateId`.
- **`CaseSession`**: `telehealthEncounter`, `addendums`, `treatmentPlanId`, flag + ehr fields *(shown above)*.
- **`CaseDocument`**: report-approval/audience/parentVersion/mdtReview/download/ehr fields *(shown above)*.
- **`TreatmentPlan`**: activation fields + `reviews CaseReview[]`.
- **`IEPGoal`**: measurability fields.
- **`TherapistProfile`**: `clinicRole`.
- **`Child`**: `leads Lead[] @relation("LeadConversion")` (inverse of `convertedChild`).
- **`User`**: named relations for new authorship/ownership fields — `LeadAssignee`, `TriageReviewer`, `MdtConductor`, `MdtAttendee`, `CaseReviewCompleter`, `SessionAddendumAuthor`, `EhrExporter`, `IncidentRaiser`, `IncidentOwner`, `ExternalShareCreator`.

---

## Enforcement / job summary (code, not schema)
| Mechanism | Role | Closes |
|---|---|---|
| `ReviewSchedulerJob` (cron) | Generates `CaseReview(DUE)` from plan dates, session counts, pre-auth expiry, goal progress, flags | 13.1 |
| `ReportApprovalGate` | Blocks share/export of `CaseDocument` unless `APPROVED` + consent | 10.4, 10.5 |
| `ConsentService.assertActiveConsent` (Phase 1) | Telehealth start, external shares, report release | 6.2, 10.5, 14.3 |
| `TelehealthGate` | Requires active `TELEHEALTH` consent + metadata capture before session start | 6.2 |
| `IncidentRouter` | Routes by urgency, assigns owner, surfaces unresolved | 14.1–14.4 |
| `DischargeService` | Billing reconcile + future-booking cancel + discharge-summary export | 15.3 |
| `PathwayGenerator` | Triage decision → spawns intake forms, tasks, appointment/session types from `PathwayTemplate.generates` | 5.2 |
| `EhrExportService` | PDF/structured export + reconcile pointer; FHIR/NABIDH adapter later | 6.4, 9.4, 15 |

## Stage → addition coverage (Phases 3–4)
| Stage gap | Addition |
|---|---|
| 1 lead funnel | `Lead` + LeadChannel/LeadStatus |
| 5 triage/clinical-lead/pathway | `TherapistProfile.clinicRole`, `TriageReview`, `PathwayTemplate` |
| 6.2 telehealth metadata | `TelehealthEncounter` + TelehealthGate |
| 9.5 addendum | `SessionAddendum` |
| 10 MDT + report approval | `MdtReview`/`MdtAttendee` + `CaseDocument` status/audience/parentVersion |
| 11 care-plan activation/goals | `TreatmentPlan` activation fields, `IEPGoal` measurability |
| 12 intervention flags/recurrence | `CaseSession.treatmentPlanId/clinicalFlag` |
| 13 review triggers | `CaseReview` + ReviewSchedulerJob |
| 14 incident/escalation/external share | `CaseIncident`, `ExternalShare` |
| 15 discharge/reactivation/retention | `Case` discharge/archive/reactivation fields + DischargeService |
| EHR handoff | `EhrExport` + `ehrRef` pointers |
| bilingual | locale-keyed content + i18n (app layer) |

---

## Migration & rollout notes
- Same **pgvector `--create-only`** caveat (per `CLAUDE.md`); hand-edit SQL then apply.
- Ship per sub-section; each is an independent migration. Suggested order: 3.1 Lead → 3.2 triage/role → 3.4 MDT/report-gate → 3.5 review engine → 3.3 telehealth → 3.6 EHR export → 4.1 incident → 4.2 discharge → 4.3 bilingual.
- Backfill: `TherapistProfile.clinicRole = THERAPIST`; existing `CaseDocument.status = APPROVED` (grandfather already-shared docs); `CaseSession.clinicalFlag = false`.
- `prisma generate` + build/type-check after each migration.

## Combined picture
With Phases 0–4, Upllyft covers the full UAE care journey **as a workflow + engagement layer**: lead → registration/identity/guardian → consent (enforced) → payer/pre-auth → booking → triage → check-in/telehealth (with metadata) → consultation/assessment (scope-gated, signed, addendable) → MDT + approved reports → care plan (activated) → intervention → triggered reviews → incident/escalation → discharge/reactivation — with everything authoritative **exported to the clinic EHR** rather than retained as the legal record.
