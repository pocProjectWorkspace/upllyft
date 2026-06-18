# Upllyft Clinic Management — Gap Analysis & Build Plan (UAE Care Delivery)

**Status:** Draft v1 · June 2026
**Source spec:** `docs/Upllyft_UAE_Detailed_Care_Delivery_Process_Map_FINAL.docx` (collated from UAE practitioners & clinic owners; 16 stages, 0–15, + build-validation checklist).
**Codebase analyzed:** `upllyft` monorepo → `cases.safehaven-upllyft.com` (Prisma schema ~3,432 lines; `case-*` / `clinic-*` / `marketplace` / `assessments` / `consent` API modules; `web-cases` & `web-booking` UI).

---

## 0. Architectural decision (locked)

**Upllyft is a compliant workflow + engagement layer integrated with the clinic's EHR. It is NOT the system-of-record / EHR.**

The clinic's EHR remains the **legal medical record**. This deliberately keeps Upllyft out of the heaviest clinical-governance and retention compliance, and re-scopes several requirements in the source spec.

### What Upllyft OWNS (build here)
Leads & enquiry · registration/identity/guardian (engagement copy) · consent capture & enforcement · payer/pre-authorisation coordination · booking & scheduling · triage & allocation · check-in · telehealth session orchestration + metadata · task/checklist tracking · care-plan & goal tracking · session/progress notes (working copy) · parent engagement & communications · progress reporting · incident/escalation workflow · audit of all the above.

### What Upllyft EXPORTS / hands off to the clinic EHR (do not duplicate as legal record)
Authoritative signed clinical notes · final diagnosis · approved clinical reports · long-term record retention/archival. Upllyft produces these and **exports** them (PDF now; FHIR / DHA NABIDH-ready later) and links/reconciles, rather than acting as the durable legal store.

### What is now OUT OF SCOPE (lives in the EHR)
EHR-grade record locking & legally-mandated retention/anonymisation · being the certified diagnosis authority · medico-legal report immutability as the system-of-record.

### Still REQUIRED even as a workflow layer (DHA non-negotiables)
Consent (purpose/recipient/version + as an access gate) · Emirates-ID identity + guardian authority · telehealth encounter metadata · audit logging · licence/scope enforcement at allocation. These protect Upllyft legally regardless of EHR posture.

> **Legend used below:** ✅ Exists · 🟡 Partial · ❌ Missing · ↪️ EXPORT (produce in Upllyft, hand to EHR) · ⛔ OUT-OF-SCOPE (lives in EHR).

---

## 1. Consolidated gap analysis by stage

### Stage 0 — Facility, licence & integration readiness
| Requirement | Status | Evidence | Bridge |
|---|---|---|---|
| Facility + licence-authority context (DHA/DOH/MOHAP) + emirate; active only after review | 🟡 | `Clinic` (schema ~L3398) has `licenseNo` but **no authority, no emirate, no status**; `isPublic @default(true)` | Add `Clinic.licenseAuthority` enum, `emirate`, `complianceStatus` (DRAFT→IN_REVIEW→ACTIVE→SUSPENDED); gate visibility/case-creation on ACTIVE |
| Professionals: licence no./authority/role/specialty/scope/language/availability **+ expiry**; expired licence blocks assignment | 🟡 | `TherapistProfile.licenceNumber/licenceExpiry/credentialStatus`, `languages[]` exist but **never read at allocation** (`cases.service.createCase`, `addTherapist`) | Add `licenceAuthority`; expiry-derivation job → `EXPIRED`; allocation guard requires `VERIFIED` |
| System-of-record posture / EHR/NABIDH/FHIR | 🟡→↪️ | No NABIDH/FHIR/EHR/residency anywhere | **Decided: engagement layer.** Build a PDF/structured **export** module; NABIDH/FHIR adapter later; document posture |
| Service catalogue: types, telehealth vs in-person, payer route, package pricing, pre-auth flag per service | 🟡 | `SessionType` is generic (name/duration/price); no modality/payer/pre-auth flags | Extend `SessionType` with `modality`, `payerRoute`, `requiresPreAuth`, `insuranceEligible` |
| Consent packs config (general/PHI/telehealth/report-sharing/guardian/communication), versioning, e-sign, immutable | 🟡 | Two systems: `CaseConsent` (validity, no version/sig) + `ConsentForm` (DocuSign e-sign). Missing telehealth/report-sharing/communication types; no version/immutability | Add versioned immutable `ConsentTemplate`/`ConsentVersion`; expand `ConsentType` |
| Note/report templates, MDT approval config, retention, RBAC matrix, PHI/report audit | 🟡 | `IEPTemplate`, `SessionNoteFormat`, single-approver only; retention = dry-run placeholder; `CaseAccessGuard` route-level | Add MDT approval model; config permission matrix; (retention now ⛔ EHR's job — keep export+audit) |
| Professional scope controls (restrict diagnosis to authorised roles) | ❌ | `Case.diagnosis` free `String?` writable by any assigned therapist | Add `canDiagnose`/scoped specialty capability; field-level guard |

### Stage 1 — Discovery, enquiry & referral
| Requirement | Status | Evidence | Bridge |
|---|---|---|---|
| Multi-channel lead capture (web/WhatsApp/social/referral/insurer/walk-in) | ❌ | No `Lead`/`Enquiry` model; leads conflated with patients; only walk-in exists | Add `Lead` model (channel enum, status, payload) preceding `Child`; convert on qualify |
| Lead source + structured referrer for analytics | 🟡 | `Child.referralSource`/`Case.referralSource` are single free-text | Structured `referrer{name,org,contact}` + normalized source on `Lead` |
| Qualify/waitlist/close with structured reasons | ❌ | No lead lifecycle | `LeadStatus` enum + reason fields + queue UI |
| Consent-gated external referral record w/ restricted referrer access | ❌ | `Provider` is public directory; `CaseShare` is internal only | External-referral entity w/ scoped, consent-gated, time-bound token |
| Walk-in quick registration | ✅ | `clinic-patients.createWalkinPatient`, `Child.walkinCreatedByAdmin` | (only add duplicate check) |

### Stage 2 — Registration, identity & payer
| Requirement | Status | Evidence | Bridge |
|---|---|---|---|
| Profile create + duplicate detection (name/DOB/mobile/ID) | 🟡 | Walk-in checks **email only** | Add match query (name+DOB, phone, Emirates-ID) returning candidates |
| **Emirates ID / passport** capture + restricted/audited storage | ❌ | No field on `Child`/`UserProfile` (only `nationality`/`placeOfBirth`) | Add encrypted identity fields + ID-document type + row-level audit |
| Legal **guardian** record (relationship, authority-to-consent, emergency contact, per-guardian access) | 🟡 | `UserProfile.relationshipToChild` free text; no authority flag | Add `Guardian` model linked to `Child` |
| **Payer route** (self-pay/insurance/employer/school-NGO sponsor) + card upload + pre-auth checklist | ❌ | No payer model; billing is status-only | Add `Payer` + insurance entities (see Stage 4) |
| Patient portal w/ single pre-visit checklist | ❌ | `PreSessionQuestionnaire` is booking-specific, not a unified checklist | Add `PreVisitTask`/`IntakeChecklist` surfaced in portal |

### Stage 3 — Intake, consent, PHI & documents
| Requirement | Status | Evidence | Bridge |
|---|---|---|---|
| Dynamic intake by service/age/location + multilingual | 🟡 | Age-group screening JSON + conditional wizard; **English-only**, form defs in code | Externalize `FormTemplate` (service+age+location+locale); add i18n/Arabic/RTL |
| Structured history + risk flags routed to clinical lead | 🟡 | Rich `Child` history + `Assessment.flaggedDomains`; routes to **all admins**, no clinical-lead role | Add clinical-lead role + risk-triggered escalation |
| e-Consent w/ purpose+recipient+version+validity + guardian e-sign + audit | 🟡 | DocuSign e-sign + validity windows exist; **no purpose/recipient/version** | Add those fields to consent records |
| Consent as actionable **access-control** (not just stored form) | 🟡 | `case-sessions` DOES require signed consent before notes ✅; but `CaseAccessGuard` doesn't check consent before serving docs | Make access guards verify active, in-validity consent of right type/recipient |
| Secure upload + role-based access + media consent + audit | 🟡 | `CaseDocument` + guard + `CaseShare` + audit ✅; no media-consent check | Add `mediaConsent` checked against `RECORDING` consent |
| Completeness review + explicit "ready for triage" handoff | ❌ | `completenessScore` scores profile fill, not intake readiness | Add intake-completeness gate + `READY_FOR_TRIAGE` transition notifying clinical lead |

### Stage 4 — Booking, payment, insurance, confirmation
| Requirement | Status | Evidence | Bridge |
|---|---|---|---|
| Service selection + booking engine | 🟡 | 3-step wizard ✅; no service-code catalog; package = single therapist/type | Add service-code catalog + multi-discipline package |
| Booking conditional on clinical approval OR payer auth | 🟡 | `PENDING_ACCEPTANCE` clinical-accept gate exists (pay-first); no payer path | Add `PENDING_PREAUTH`/`PENDING_CLINICAL_APPROVAL` states that hold slot without payment |
| Allocation checks licence/scope, availability, room/branch, telehealth eligibility, language | 🟡 | **Availability only**; licence/scope/room/language dormant | Allocation guards + Room/Resource entity + language match |
| Coexisting payment routes (self-pay deposit/full, **insurance pre-auth**, sponsor, package) | 🟡 | Stripe self-pay + package balance only | `PaymentRoute` enum + per-booking payer record + deposit + sponsor flow |
| Financial clearance gating + approval-controlled exceptions | 🟡 | Stripe payment gating only; no pre-auth/override | `financialClearance` flag + admin override audit |
| Confirmation differing in-person vs telehealth (+ checklist, cancellation policy) | ❌ | Email **hardcoded to Google Meet**; no modality field | Add `modality` + modality-specific templates + checklist |
| Pre-visit blocker dashboard | ❌ | Only reception `trackingStatus` | Build readiness view aggregating payment/pre-auth/consent/credential |
| **Insurance / pre-auth data model** | ❌ | Absent entirely (only UI copy) | Net-new `InsurancePolicy` + `PreAuthorization` models |

### Stage 5 — Triage & allocation
| Requirement | Status | Evidence | Bridge |
|---|---|---|---|
| Clinical-lead triage reviewing intake/risk before allocation | ❌ | No triage concept; no clinical-lead role | Triage queue + clinical-lead role |
| AI intake summary (assistive, non-diagnostic) | 🟡 | AI services exist (`case-ai`, `agents/clinical-insights`) | Wire an assistive triage summary |
| Pathway decision auto-generates tasks/forms/appointment types | ❌ | None | Pathway templates → task/form/appointment generation |
| Allocation engine traceable to licensed user + caseload + payer/network | 🟡 | Manual assign (`CaseTherapist`); no licence/caseload/payer rules | Allocation engine + guards |
| Safety red-flag escalation pauses pathway | ❌ | No escalation (see Stage 14) | See Stage 14 |
| Patient acknowledgement of pathway captured | ❌ | None | Add acknowledgement record |

### Stage 6 — Check-in & encounter start
| Requirement | Status | Evidence | Bridge |
|---|---|---|---|
| Check-in verifying identity/guardian/payer/consent; blocker can prevent start | 🟡 | `trackingStatus`/`checkedInAt` physical check-in ✅; no blocker gating | Add readiness gate at check-in |
| **Telehealth encounter metadata** (platform, clinician licence, patient+clinician location, date/time, telehealth consent) | ❌ | Only `googleMeetLink`; no metadata | Add telehealth encounter metadata per DHA telehealth standard |
| Encounter note auto-fills professional licence/role | 🟡 | `CaseSession` notes ✅; no licence auto-fill | Auto-populate licence/role into note |
| EHR/HIS export or FHIR-ready fields | ❌→↪️ | None | **Export** module (PDF now, FHIR later) |

### Stage 7 — Initial consultation
| Requirement | Status | Evidence | Bridge |
|---|---|---|---|
| Consultation note; intake populates without overwriting | 🟡 | Notes + AI summary ✅ | Add intake-populate-but-editable |
| Discipline-specific observation templates configurable by facility | 🟡 | `SessionNoteFormat` (SOAP/DAP/…) not discipline/facility-configurable | Configurable templates per discipline/facility |
| Next-step recommendation triggers downstream workflow + payer tasks | ❌ | None | Recommendation → task/appointment/payer triggers |
| Visit summary shared respecting consent/comm prefs | 🟡 | Sharing exists; not consent-gated | Gate on consent + comm prefs |

### Stage 8 — Assessment planning
| Requirement | Status | Evidence | Bridge |
|---|---|---|---|
| Assessment-plan builder; scope/disciplines/sequence approved by clinical lead; change tracking | ❌ | No builder; no clinical-lead approval | Assessment-plan model + approval + change log |
| Multi-slot scheduler across professionals + rooms | 🟡 | Single-therapist scheduling; no room model | Multi-slot + Room/Resource |
| Per-task documentation destination (Upllyft vs EHR) | ❌→↪️ | None | Mark destination per task; export hooks |
| External contributor (school/teacher) time-bound links | ❌ | No inbound contributor flow | Time-bound contributor links + consent |
| Financial clearance before assessment | 🟡 | No pre-auth | See Stage 4 |

### Stage 9 — Assessment execution
| Requirement | Status | Evidence | Bridge |
|---|---|---|---|
| Per-discipline signed notes capturing licence/role | 🟡 | Signed notes ✅ (immutable after SIGNED); licence not captured | Capture licence/role on signed note |
| **Scope-gated diagnosis** (block diagnosis for unauthorised roles) | ❌ | `Case.diagnosis` free, any therapist | Field-level scope guard |
| Completion/blocker tracking | 🟡 | Status tracking partial | Assessment tracker + blockers-by-owner |
| Export/reconcile with EHR | ❌→↪️ | None | Export + reconcile checklist |
| Note lock + **addendum** + version control + audit | 🟡 | Sign-locks notes ✅; **no addendum/version** on session notes (IEP has versions) | Add addendum workflow to session/assessment notes |

### Stage 10 — MDT review, report & release
| Requirement | Status | Evidence | Bridge |
|---|---|---|---|
| MDT scheduling + attendance/approval logs | ❌ | No MDT model (only `IEP.meetingNotes` free field) | Add `MdtReview` (scheduledAt, attendees, status, approvals) |
| Integrated report builder; parent-friendly **and** professional versions | 🟡 | `document-ai.generateReport` → professional only | Add `audience` param / second pass for parent version |
| Report **approval gate** (no release before approval) | ❌ | `CaseDocument` has no status; instantly shareable | Add `CaseDocument.status` DRAFT→PENDING→APPROVED; block share unless APPROVED |
| Consent-gated release + access/download logs | 🟡 | `CaseShare` + audit ✅; not consent-checked; reads not logged | Gate on `SHARING` consent; log views/downloads |

> Note: the *authoritative* report is ↪️ exported to the EHR. Upllyft's approval gate protects what it shares with parents/referrers.

### Stage 11 — Care plan, goals, payer/package activation
| Requirement | Status | Evidence | Bridge |
|---|---|---|---|
| Feedback session documented separately | 🟡 | `CaseSession.sessionType` free string | Add feedback session type |
| Structured goals (baseline/target/frequency/review), measurable across sessions | 🟡 | `IEPGoal` + `SessionGoalProgress` ✅; missing frequency/review-interval/baseline-value | Add those fields |
| Care plan generates appointments/tasks/review milestones | ❌ | **`TreatmentPlan` is a dead schema stub (zero code)** | Wire `TreatmentPlan` service to spawn sessions/tasks/milestones |
| Payer/package activation + authorisation-expiry alerts | ❌ | Package logic only in marketplace, not case-linked; `expiresAt` unused | Link package to case; expiry cron → alerts |
| Parent acceptance logged | 🟡 | `IEP.approvedByParentAt` pattern ✅ (reuse) | Reuse dual-approval on care plan |

### Stage 12 — Intervention delivery
| Requirement | Status | Evidence | Bridge |
|---|---|---|---|
| Recurring sessions tied to plan + package | 🟡 | `CaseSession` ✅; no recurrence/plan/package tie | Recurring-series generation from plan |
| Signed session/progress notes | ✅ | SOAP/DAP/Narrative + sign-lock | — |
| Home program + caregiver coaching + completion confirmation | 🟡 | `WorksheetAssignment` completion ✅; no caregiver-coaching record | Add coaching note + completion ack |
| No-show/cancellation + package deduction + billing sync | 🟡 | `AttendanceStatus` tracked; deduction not invoked on case no-show; billing manual | Auto deduct + sync `CaseBilling` on attendance change |
| Clinical flags trigger review | ❌ | No flag field | Add `clinicalFlag` → review queue |

### Stage 13 — Monitoring, review & authorisation renewal
| Requirement | Status | Evidence | Bridge |
|---|---|---|---|
| Review triggers (plan date/session count/auth expiry/goal/flag) | ❌ | `IEP.reviewDate` inert; no review cron | Scheduled trigger engine |
| Structured progress summary | 🟡 | AI report + analytics dashboards ✅ | Persist structured review records |
| Plan revision w/ version history | ✅ | `IEP`/`MilestonePlan` `previousVersionId`/`nextVersion` | — |
| Authorisation renewal | ❌ | No auth entity | Add authorisation model + renewal |
| Payer-denial alternative workflow | ❌ | No payer concept | Add claim/denial states + fallback |

### Stage 14 — Referral, escalation & incident/safety
| Requirement | Status | Evidence | Bridge |
|---|---|---|---|
| Escalation startable from any module | ❌ | No clinic escalation entity (`CrisisIncident` = community module, not reusable) | Add global `Escalation`/`CaseIncident` model |
| Incident log: urgency + owner + risk categories (safeguarding/medical/behaviour) | ❌ | None | Add fields + risk-category enum |
| Consent-gated external share + audit | 🟡 | `CaseShare` + audit ✅; not consent-gated/no external links | Consent-checked external links |
| Follow-up tracked to closure; unresolved highlighted | ❌ | No entity | Status lifecycle + dashboard |

### Stage 15 — Discharge, transition & retention
| Requirement | Status | Evidence | Bridge |
|---|---|---|---|
| Discharge w/ separate clinical vs admin reasons | 🟡 | Single free-text `Case.dischargeReason` | Split fields |
| Discharge summary from structured goals/sessions | ✅↪️ | `generateReport('discharge')` ✅ | Export to EHR |
| Financial closure + future-appointment check | ❌ | Status change only | Reconcile billing + scan/cancel future bookings |
| Reactivation without duplicate registration | 🟡 | ARCHIVED→ACTIVE supported via raw patch | Explicit reactivation flow/UI |
| Retention/archive + record locking + access logs | 🟡→⛔ | `RetentionService` dry-run placeholder | **Legal retention is EHR's job;** Upllyft keeps export + access logs + soft archive |

---

## 2. Cross-cutting themes (what recurs)

1. **Payer/insurance dimension is entirely absent** (Stages 2,4,11,13) — biggest single build.
2. **No regulatory/identity spine** — no DHA/DOH/MOHAP authority, emirate, Emirates-ID, or structured guardian-with-consent-authority.
3. **Licence/scope stored but never enforced** — dormant `licenceExpiry`/`credentialStatus`/`languages`; `diagnosis` has no scope guard. *Low-effort, high-value.*
4. **No orchestration layer** — no triage, review-trigger engine, or escalation workflow. Data exists; nothing acts on it.
5. **Consent is mostly a stored form** — needs purpose/recipient/version and to become an access gate (one place already enforces it: session-note creation).
6. **Telehealth & bilingual** — video link without compliant encounter metadata; English-only.

## 3. Foundations to reuse (don't rebuild)
- Signed-note immutability + consent-checked session-note creation.
- IEP dual parent/therapist approval + **version history** (`previousVersionId`/`nextVersion`) — reuse for care-plan acceptance, report approval, plan revisions.
- Pervasive audit (`AuditLog` PDPL + `CaseAuditLog`), DocuSign e-sign, per-session measurable goal progress, clinic multi-tenancy + reception check-in, `AED` currency.

---

## 4. Phased build plan

**Phase 0 — Decide & enforce (foundational, fast):**
- Posture documented (engagement layer) ✅ this doc.
- `Clinic.licenseAuthority` + `emirate` + `complianceStatus` gating visibility/case-creation.
- Enforce dormant data: licence-expiry derivation job + allocation guard (reject expired/unverified); field-level scope guard on `diagnosis`.

**Phase 1 — Identity, guardian, consent-as-control:**
- Emirates-ID/passport (encrypted, audited) + identity doc type.
- `Guardian` model (relationship, authority-to-consent, emergency contact, access rights).
- Consent: add `purpose/recipient/version`, immutable versions, more types; wire access guards to check active consent.

**Phase 2 — Payer/insurance (largest):**
- `InsurancePolicy` + `PreAuthorization` models; `PaymentRoute` enum; link to `Booking`/`Invoice`/`CaseBilling`/care plan.
- Financial-clearance gating + pre-visit blocker dashboard; authorisation-expiry alerts; payer-denial fallback.

**Phase 3 — Clinical orchestration:**
- `Lead` model + qualify/waitlist/close; triage queue + clinical-lead role + allocation engine.
- Telehealth encounter metadata (DHA telehealth standard).
- `MdtReview` + report-approval gate + parent-friendly report variant + consent-gated logged release.
- Wire `TreatmentPlan` → generate sessions/tasks/review milestones; review-trigger engine; clinical-flag → review.
- **Export module** (PDF/structured; FHIR/NABIDH-ready) for handoff to EHR.

**Phase 4 — Safety, discharge, close-out:**
- `CaseIncident`/`Escalation` (risk categories incl. safeguarding, owner, urgency, closure) startable from any module.
- Discharge financial closure + future-appointment check; explicit reactivation; soft archive + access logs (legal retention = EHR).
- Bilingual (Arabic/RTL).

---

## 5. Open decisions (to confirm; not blockers)
- **EHR integration depth for v1:** recommend PDF/structured **export + manual reconcile** first; NABIDH/FHIR adapter later.
- **Which artifacts are "owned" vs "exported"** per the Stage-0 boundary above — confirm the split with a pilot clinic.
- **Multi-emirate scope for v1:** spec is DHA-strongest; confirm whether v1 targets Dubai/DHA only.

---

## 6. Next deliverable
Detailed **data-model design** (Prisma schema additions) for Phase 0–1 (and the Phase-2 payer/insurance models), with new models, enums, fields, relations, and the enforcement points (guards/jobs) that activate them.
