# Upllyft Clinic Module — Overview

## What This Is

Upllyft already covers ~60% of what a clinic EHR like Medplum offers. The gap is a **clinic-facing admin layer** and **session documentation workflows**. This document set defines what to build to walk into a clinic pitch with a 20-minute demo that makes them say _"this replaces our current system."_

## Current State (What's Already Built)

| Area | What Exists |
|------|-------------|
| **Patient/Parent Onboarding** | web-main 5-step onboarding, child profiles, Mira-guided flow |
| **Therapist Profiles** | web-booking marketplace with bios, specialties, availability |
| **Parent Booking** | Full booking flow in web-booking (port 3004) |
| **Case Management** | web-cases (port 3006) — IEP goals, milestones, case files |
| **Screening** | web-screening (port 3003) — full UFMF assessment + reports |
| **AI (Mira)** | Streaming chat, cross-app nudges, worksheet generation |
| **Auth** | JWT + refresh tokens, Google OAuth, role-based nav |
| **Payments** | Stripe Connect wired in web-booking |
| **Email** | MailerSend / SendGrid configured |
| **Community** | web-community with posts, Q&A, events, crisis section |

## What's Missing for a Clinic Pitch

The clinic admin has **zero visibility** today. There's no way for a clinic manager to see all patients, all therapists' schedules, or what happened in today's sessions. Therapists can manage cases but can't write structured session notes (SOAP format).

## Phase 1 — The Pitch Demo (Weeks 1–2)

**Goal:** A working demo covering the clinic's daily operations.

| # | Feature | Where It Lives | Effort | Spec File |
|---|---------|---------------|--------|-----------|
| 1 | Clinic Admin App Scaffold | New app: `web-admin` (port 3007) | 1 day | `01-ADMIN-SCAFFOLD.md` |
| 2 | Patient Directory + Intake Queue | web-admin | 2 days | `02-PATIENT-DIRECTORY.md` |
| 3 | Therapist Directory + Schedule View | web-admin | 2 days | `03-THERAPIST-DIRECTORY.md` |
| 4 | Today's Tracking Board | web-admin | 2 days | `04-TRACKING-BOARD.md` |
| 5 | SOAP Session Note Form | web-cases (enhanced) | 3 days | `05-SOAP-NOTES.md` |
| 6 | Intake → Case Auto-Creation | API automation | 1 day | `06-INTAKE-AUTOMATION.md` |
| 7 | Outcome Snapshot Dashboard | web-admin | 2 days | `07-OUTCOME-SNAPSHOT.md` |

**Total estimated effort: ~13 days (2 dev-weeks)**

## Phase 2 — Signed Contract (Weeks 3–5)

These make the clinic operationally dependent on Upllyft:

- Consent form with e-signature (DocuSign pattern from EGA)
- Credential / licence upload for therapists
- Invoice UI per session
- Revenue dashboard for clinic admin
- Parent ↔ therapist secure messaging
- Longitudinal score chart (screening trends over time)
- Mira scribe mode (AI-assisted session notes)
- Push notification wiring (session reminders)
- UAE PDPL data handling review

## Phase 3 — Future / Post-Launch

Items to have a credible answer for but not build now: insurance/coverage billing, multi-clinic support, HL7/FHIR interoperability, clinician-administered assessments, telehealth video.

## Architecture Context

```
Repo: ~/Desktop/Workspace/upllyft (Turborepo monorepo)

Existing Apps:
├── apps/api          (port 3001) — NestJS API
├── apps/web-main     (port 3000) — Dashboard, Feed, Profile, Settings, Admin
├── apps/web-community(port 3002) — Community feed, groups, events
├── apps/web-screening(port 3003) — Assessments, Clinical Insights
├── apps/web-booking  (port 3004) — Therapist marketplace, bookings
├── apps/web-resources(port 3005) — Worksheets, learning
├── apps/web-cases    (port 3006) — Case management (therapists)
└── apps/mobile       — React Native

New App (Phase 1):
└── apps/web-admin    (port 3007) — Clinic admin dashboard ← BUILD THIS

Shared Packages:
├── @upllyft/ui       — Shared components (teal-600 design system)
├── @upllyft/types    — TypeScript types
├── @upllyft/api-client — Auth, API client, hooks
└── @upllyft/config   — Tailwind, TSConfig, ESLint
```

## Key Insight

> You don't need Medplum at all. Upllyft already has the data model and infrastructure — the missing pieces are UI workflows in a new web-admin app and enhancements to web-cases. FHIR compliance and interoperability are Phase 3 problems, not Phase 1 problems.

## How to Use These Specs

Each `01-XX.md` through `07-XX.md` file is a self-contained feature spec designed to be handed to Claude Code in a single session. The recommended workflow:

1. Read this overview first
2. Build features in order (01 must come first as it scaffolds the app)
3. Each spec includes: context, data model, API endpoints, UI components, and success criteria
4. Commit after each feature: `git add . && git commit -m "clinic: feature-name"`
