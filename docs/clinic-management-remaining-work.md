# Clinic Management — Remaining Work Checklist (vs. UAE Care-Delivery Spec)

**Status:** June 2026 · after Phases 0–3 (backend) shipped on `feature/clinic-phase0-uae`.
**Legend:** ✅ done (data + API + enforcement) · 🟡 partial / scaffold · ❌ not built · 🖥️ needs UI

> Everything shipped so far is **backend** (NestJS API + Prisma + enforcement/cron). **No front-end UI** has been built for any of it — that is the single largest remaining effort (see §B).

## A. Stage-by-stage (backend)
| Stage | Backend | Remaining |
|---|---|---|
| 0 Facility/licence/scope | ✅ | — |
| 1 Enquiry/referral (Lead) | ✅ | — |
| 2 Registration/identity/payer | ✅ | 🟡 duplicate-detection query not wired into existing registration |
| 3 Intake/consent/PHI | ✅ | ❌ dynamic intake **form builder** (`FormTemplate`); ❌ multilingual forms |
| 4 Booking/payment/insurance/pre-auth | ✅ | ❌ modality-specific confirmation templates (in-person vs telehealth) |
| 5 Triage/allocation | ✅ | 🟡 **pathway auto-generator** (spawn forms/tasks/appointments) is a stub; 🟡 AI triage summary not wired to AI |
| 6 Check-in/encounter/telehealth | ✅ | 🟡 telehealth metadata not wired into the actual video-session start |
| 7 Initial consultation | 🟡 | ❌ next-step recommendation → downstream workflow/payer triggers; ❌ configurable discipline note templates |
| 8 Assessment planning | 🟡 | ❌ assessment-plan builder; ❌ multi-slot **room/resource scheduler**; ❌ external contributor (school/teacher) links |
| 9 Assessment execution | ✅ | — (scope-gated diagnosis, addenda, EHR reconcile done) |
| 10 MDT/report approval | ✅ | — (approval gate + parent version done) |
| 11 Care plan/goals | ✅ | 🟡 **recurring session generation** from plan not implemented |
| 12 Intervention | 🟡 | ❌ recurring sessions; 🟡 no-show → package-deduction/billing sync not wired |
| 13 Monitoring/review | ✅ | — (CaseReview + scheduler cron done) |
| **14 Referral/escalation/incident/safeguarding** | ❌ | **Phase 4** — `CaseIncident`, `ExternalShare` (consent-gated, time-bound), routing/closure |
| **15 Discharge/retention** | 🟡 | **Phase 4** — split clinical/admin reasons, financial closure + future-appointment check, explicit reactivation, soft archive/retention |
| Bilingual (Arabic/RTL) | ❌ | mostly front-end i18n; minor locale fields |

## B. Front-end UI (not started) 🖥️
The spec assumes clinic staff *operate* these flows. Needed in `web-cases` / `web-booking` (+ patient portal in `web-main`):
- Lead inbox + qualify/convert; triage queue (clinical lead); pathway config.
- Patient identity + guardian management; pre-visit checklist (staff + parent portal).
- Payer/insurance + pre-auth screens; pre-visit **blocker dashboard**; financial-clearance actions.
- Encounter/telehealth capture; MDT review + **report approval** UI; care-plan/goal builder; review queue.
- Incident/escalation console; discharge workflow; consent management.
- Billing-coordinator restricted views.

## C. Cross-cutting / hardening
- **Fine-grained RBAC** on new endpoints (currently `JwtAuthGuard` only) — child/clinic-scoped access guards.
- **EHR export**: actual PDF/FHIR generation + NABIDH adapter (currently model + reconcile pointer only).
- `CLINIC_PHI_KEY` set in the deployed (Railway) env before go-live.
- Seed/config: default consent templates, pathway templates, service catalogue per clinic.
- Tests for the new modules.

## D. Recommended order
1. **Phase 4 backend** (Stage 14 incident/safeguarding + Stage 15 discharge/retention) — completes the backend care journey. *(in progress)*
2. **Front-end UI** — the large remaining build; sequence by stage (lead→triage→encounter→report→billing→incident/discharge).
3. **Hardening** — RBAC, EHR generation, tests, seeds, i18n.
