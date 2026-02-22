# Upllyft — Phase 2: Clinic Operations
## Overview & Build Sequence

> **Goal:** The clinic runs day-to-day on Upllyft — not just demos it.  
> **Prerequisite:** Phase 1 gate checklist fully passed.  
> **When done:** Consent collected digitally, therapists credentialled, sessions invoiced, messaging live, outcomes trending, Mira helps write notes, push notifications firing.

---

## What Gets Built

| # | Feature | File | Days | Primary App |
|---|---|---|---|---|
| 1 | Consent forms + e-signature | `F8_CONSENT_FORMS.md` | 1–2 | web-admin + API |
| 2 | Therapist credential upload | `F9_CREDENTIALS.md` | 3 | web-admin + API |
| 3 | Invoice UI per session | `F10_INVOICES.md` | 4–5 | web-booking + API |
| 4 | Revenue dashboard | `F11_REVENUE_DASHBOARD.md` | 6–7 | web-admin + API |
| 5 | Parent ↔ therapist messaging | `F12_MESSAGING.md` | 8–10 | web-main + API |
| 6 | Longitudinal score chart | `F13_SCORE_TRENDS.md` | 11 | web-screening |
| 7 | Mira scribe mode | `F14_MIRA_SCRIBE.md` | 12–13 | web-cases + API |
| 8 | Push notification wiring | `F15_PUSH_NOTIFICATIONS.md` | 14 | API + mobile |
| 9 | PDPL data handling review | `F16_PDPL_REVIEW.md` | 15 | API + policy |

---

## New Monorepo Changes

```
apps/api/src/
├── consent/          ← NEW module
├── billing/          ← NEW module (invoices + revenue)
├── messaging/        ← NEW module
└── notifications/    ← NEW module (enhance existing if present)

apps/web-admin/       ← Enhanced: consent panel, credentials, revenue dashboard
apps/web-booking/     ← Enhanced: invoice view per session
apps/web-main/        ← Enhanced: messaging inbox
apps/web-screening/   ← Enhanced: longitudinal chart
apps/web-cases/       ← Enhanced: Mira scribe button on SOAP form
```

---

## New Prisma Models — Run ONE Migration Before Starting

Add all 6 models at once, then run a single migration:

```
ConsentForm    — DocuSign envelope tracking (F8)
Credential     — therapist licence documents (F9)
Invoice        — per-session billing record (F10)
Conversation   — messaging thread (F12)
Message        — individual message (F12)
DeviceToken    — FCM push token per user (F15)
```

```bash
pnpm --filter @upllyft/api prisma:migrate
# Name: phase2_consent_billing_messaging_notifications
pnpm --filter @upllyft/api prisma:generate
```

---

## New External Services

| Service | Purpose | How |
|---|---|---|
| DocuSign | e-signature for consent | `docusign-esign` npm package, JWT Grant auth |
| Firebase Cloud Messaging | Push to mobile | `firebase-admin` (already in API — just wire it) |
| Socket.IO | Real-time messaging | Already installed in API gateway |

---

## Dependency Order

F8, F9, F12, F13 are fully independent — build in parallel.  
F10 (invoices) before F11 (revenue dashboard).  
F14 (Mira scribe) requires Phase 1 F6 (SOAP notes) to be complete.  
F15 (push) enhances existing flows — build last.  
F16 (PDPL) is a review task, not a build — run it alongside the others.

---

## Row-Level Access Rules (new in Phase 2)

No new roles. Add ownership checks at the service layer:

- Therapist → only their own patients' consents, credentials, invoices, conversations
- Parent → only their own consents, invoices, conversations
- ADMIN → read access to everything

---

## Phase 2 Gate Checklist

- [ ] Admin can send a consent form to a parent from the patient record
- [ ] Parent signs consent in-browser; status updates to SIGNED
- [ ] Therapist credential document uploads and generates a signed download URL
- [ ] Invoice auto-creates when a session note is signed
- [ ] Parent can view their session invoices in web-booking
- [ ] Revenue dashboard shows clinic totals and per-therapist breakdown
- [ ] Parent and therapist can send messages in web-main
- [ ] Unread count badge shows on messaging nav icon
- [ ] Screening score trend chart shows multiple scores over time
- [ ] Mira scribe button appears on DRAFT SOAP notes only
- [ ] Mira generates a draft for all 4 SOAP sections; therapist can edit and sign
- [ ] Push notification fires when a session is booked
- [ ] Push notification fires 24h before a session
- [ ] PDPL checklist complete and committed to repo
