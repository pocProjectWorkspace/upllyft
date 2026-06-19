# Clinic Management — Front-End Build Plan

**Goal:** surface the Phase 0–4 backend (already built + deployed) in the existing Next.js apps so clinic staff and parents can actually operate the UAE care journey.

**Where things live**
- **`web-cases`** (`cases.safehaven-upllyft.com`) — clinician/case-manager workspace. Existing: case list + case-detail with tabs (overview, sessions, ieps/goals, milestones, documents, consents, billing, audit). **Most new work goes here** as new tabs + new top-level pages.
- **`web-booking`** — reception/scheduling + clinic tracking/check-in. Add financial-clearance + pre-visit readiness here.
- **`web-main`** — parent hub. Add pre-visit checklist, consent signing, approved-report viewing.
- **API access:** `@upllyft/api-client` `apiClient`; typed functions per domain in each app's `src/lib/api/*.ts` (today: `cases.ts`). We add `clinic-intake.ts`, `payer.ts`, `orchestration.ts`, `safety.ts`.

---

## 0. Foundations (do first)
- **API client modules** in `web-cases/src/lib/api/`: typed wrappers for every endpoint built in Phases 1–4 (guardians, identity, pre-visit-tasks, consent-templates, insurance-policies, pre-authorizations, booking readiness/clearance, leads, triage, pathways, mdt-reviews, telehealth, case-reviews, treatment-plan activate, session flag/addenda, ehr-exports, incidents, external-shares, discharge).
- **Role-aware nav**: extend `cases-shell`/sidebar to show new sections by role (clinician vs clinical-lead vs billing vs reception). Billing role = payer screens only (mirrors backend `CaseAccessGuard`).
- Shared UI: status pills (consent/clearance/report/incident), audience badge, masked-PHI display.

## 1. Case-detail — new & enhanced tabs (`web-cases`)
| Tab | Backend | What it shows/does |
|---|---|---|
| **Identity & Guardians** (new) | `children/:id/identity`, `/guardians` | Capture Emirates-ID/passport (masked), verify; add/edit guardians + authority-to-consent + access level |
| **Payer & Pre-auth** (new) | `children/:id/insurance-policies`, `pre-authorizations` | Insurance policies; pre-auth create/decision/renew; used/approved sessions; expiry alerts |
| **Triage** (new) | `triage`, `pathway-templates` | Clinical-lead triage review, risk level, pathway assignment, guardian acknowledgement |
| **MDT & Reports** (new) | `mdt-reviews`, document approval | Schedule MDT, attendance/approval log; **report approval gate** (submit→approve/reject), parent-version |
| **Reviews** (new) | `case-reviews` | Due/in-progress reviews (from cron + flags); complete with outcome |
| **Incidents** (new) | `incidents` | Raise incident (safeguarding/medical/behaviour), urgency, owner, close; **startable from any tab** |
| **Discharge** (new) | `cases/:id/discharge` | Split clinical/admin reasons; preview future-appointment cancel + open billing; archive/reactivate |
| **Consents** (enhance) | versioned `CaseConsent` + templates | Show purpose/recipient/version; grant against a published template version |
| **Documents** (enhance) | report status fields | Approval status badge; block share button unless APPROVED; parent vs professional version |
| **Sessions** (enhance) | telehealth/flag/addendum | Telehealth metadata capture; clinical-flag button; signed-note **addendum** thread |

## 2. New top-level pages (`web-cases`)
- **Leads inbox** — `/leads`: channel/status funnel, qualify/waitlist/close, convert→patient.
- **Triage queue** — `/triage`: clinical-lead worklist of pending triage (across cases/leads).
- **Incidents console** — `/incidents`: open incidents by urgency, owner, closure; safeguarding highlighted.
- **Pathway templates** — `/settings/pathways`: configure pathway `generates` spec.
- **Consent templates** — `/settings/consents`: manage templates + publish immutable versions.

## 3. Reception / scheduling (`web-booking`)
- **Pre-visit readiness panel** on the tracking/check-in screen — `bookings/:id/readiness`: shows blockers (payment, pre-auth, consent, credential, identity).
- **Financial-clearance action** — `bookings/:id/clearance`: set CLEARED / approved-exception; check-in blocked until cleared (backend already enforces).

## 4. Parent portal (`web-main`)
- **Pre-visit checklist** — `children/:id/pre-visit-tasks`: single task list (intake/consent/identity/payment).
- **Consent signing** — grant/sign consents (ties to DocuSign + versioned templates).
- **My reports** — view APPROVED, parent-audience reports shared with me.

---

## Suggested build sequence (MVP-first)
1. **Foundations** — API client modules + role-aware nav. *(unblocks everything)*
2. **Payer & Pre-auth tab** + **reception readiness/clearance** — highest operational value (UAE insurance).
3. **Identity & Guardians tab** + **consents enhancement** — compliance basics.
4. **Report approval** (Documents/MDT) — the governance headline.
5. **Triage queue + Leads inbox** — front-of-funnel.
6. **Reviews + Incidents + Discharge** — close the loop.
7. **Parent portal** bits.

Each slice: add the `lib/api` functions → build the tab/page → wire actions → verify against the running API.

---

## Notes / decisions to confirm
- **Design system**: reuse `@upllyft/ui` (teal brand) for consistency with the rest of the product (not the new light marketing theme — that's the separate landing repo).
- **RBAC in UI** mirrors backend guards; finer backend RBAC (child/clinic scoping) is a parallel hardening task.
- Some screens depend on scaffolded backend pieces (pathway generator, EHR PDF/FHIR) — those render the data/records now; richer behavior lands with the backend hardening.
