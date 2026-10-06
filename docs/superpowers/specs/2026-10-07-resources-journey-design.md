# Resources Journey — design

Date: 2026-10-07 · Source design: "Upllyft Resources Journey" (bundled HTML export)

## Goal

Give parents one child-centred place to find activities that fit their child, keep a
child's own library, log how each try went, and watch independence grow — and give
therapists a way to assign anything from the library and follow what they assigned.

## Decisions (agreed in brainstorming)

| Topic | Decision |
|---|---|
| Content | Merge AI **worksheets** and uploaded **library resources** into one library |
| Areas | The design's 8: `comm social daily fine gross learn sensory behav`. Screening's vision & hearing shows on the screening card but drives no matching |
| Placement | New journey replaces `/resources` for parents (`USER`) only; other roles keep the current page |
| Share targets | Therapists the parent booked (CONFIRMED/COMPLETED) for this child, or who assigned this child a resource |
| Share model | Live read-only view, revocable; therapists see it on `/resources/shared` |
| Storage | New `ChildResource`, `ActivityLog`, `ProgressShare` tables (option 1) |
| Therapists | Assign any resource with goal / target date / area; see status + logs of what they assigned; worksheet creation asks for journey fields and can assign at once |
| Mira | Real resource cards resolved server-side; log-from-chat with a confirm tap; journey deep links (web only) |
| Mobile | Daily-use core: library, child's library, log sheet, read-only progress. No share/chart/Mira |

## 1. Data model

### Area vocabulary
API `src/resource-journey/domains.ts` mirrored in `packages/types/src/resource-journey.ts`;
`scripts/check-journey-domain-parity.mjs` fails `check:tenancy` on drift.

| key | label | worksheet `targetDomains` | screening domain |
|---|---|---|---|
| comm | Communication | COMMUNICATION | speechLanguage |
| social | Social-emotional | SOCIAL_EMOTIONAL | socialEmotional |
| daily | Daily living | SELF_CARE | adaptiveSelfCare |
| fine | Fine motor | FINE_MOTOR | fineMotor |
| gross | Gross motor | GROSS_MOTOR | grossMotor |
| learn | Learning | COGNITIVE | cognitiveLearning |
| sensory | Sensory | — | sensoryProcessing |
| behav | Behaviour | — | — |

Screening card per-area status from `Assessment.domainScores` (RED → Focus area,
YELLOW → Keep an eye, GREEN → On track); flagged areas also from `flaggedDomains`.

### Schema changes (one additive, idempotent migration)
- `LibraryResource` + `domains String[]`, `ageMin Int?`, `ageMax Int?`, `durationMinutes Int?`, `practises String?`, `forText String?`
- `Worksheet` + `durationMinutes Int?`, `practises String?`, `forText String?`
- `ChildResource` — `childId`, `kind` (WORKSHEET|LIBRARY), `worksheetId?`, `libraryResourceId?`,
  `source` (SAVED|ASSIGNED), `savedById`, `assignedById?`, `goal?`, `targetDate?`, `assignedArea?`,
  `masteredOverride Boolean?`, `unassignedAt?`, timestamps. Unique per (child, worksheet) and (child, library resource).
- `ActivityLog` — `childResourceId`, `childId`, `loggedById`, `date`, `help` 0–2, `engagement` 0–2, `note?`, `createdAt`
- `ProgressShare` — `childId`, `parentId`, `therapistUserId`, `periodDays Int?` (null = all), `includeNotes`, `createdAt`, `revokedAt?`
- Backfill: every `WorksheetAssignment` → ASSIGNED `ChildResource`; every completed `WorksheetCompletion` → `ActivityLog`
  (helpLevel NONE→2, MINIMAL/MODERATE→1, SIGNIFICANT→0, null→1; engagementRating 1–2→0, 3→1, 4–5→2, null→1).

### Status rules
- Mastered override wins; else no logs → **To try**; ≥3 logs with help 2 → **Mastered**;
  ≥2 logs and latest help ≥1 → **Getting there**; else **Practising**.

### Access
- Child routes: the child's profile owner or a `Guardian` with `hasAuthorityToConsent` (403 otherwise).
- Therapist reads: only via an unrevoked share (within its period; notes only if included),
  or items they assigned themselves.

## 2. API — `src/resource-journey` module (all routes `JwtAuthGuard`)

Parent:
- `GET children/:childId/library?q&type&domain&ageFit&matchOnly&page&limit`
- `GET children/:childId/screening-summary`
- `GET|POST children/:childId/items`, `PATCH|DELETE items/:itemId`
- `POST children/:childId/logs`
- `GET children/:childId/progress?days=`
- `GET children/:childId/share-targets`, `GET|POST children/:childId/shares`, `DELETE shares/:shareId`

Therapist:
- `GET shared-with-me`, `GET shared-with-me/:shareId/progress`
- `GET my-clients`, `GET assignable`, `POST clients/:childId/assign`,
  `GET clients/:childId/assigned`, `DELETE assigned/:itemId`

Existing endpoints changed: worksheet assignment also writes the `ChildResource` (same transaction);
library upload/edit accept the tag fields; worksheet create/update accept `durationMinutes/practises/forText`.

Library item shape: `{ kind, id, title, type, domains, durationMinutes, ageMin, ageMax, practises,
forText, source, matchesScreening, savedItemId, status }`. Ranking: screening match, age fit, newest.
Query count is constant (pinned by a unit test).

## 3. Web (web-main)
`/resources` → `ResourceJourney` for parents (URL state `?child&tab&area`), existing page for others.
Components in `src/resources/journey/`: frame + child picker, library tab (screening card, filters,
memoised cards), child's library tab (status chips, help squares, Mira gap hint), progress tab (privacy
banner, stats, lazily-loaded recharts weekly chart, timeline), log dialog, share dialog, query hooks.
`/resources/shared` for therapists. Upload manager gains tag fields.

## 5. Therapists
`/resources/create` gains a "For families" step (areas, ages, duration, practises, for) and an optional
"Assign now" to a client. `/resources/assignments` rebuilt: client list + assigned items with status,
help squares, notes, and an "Assign a resource" picker (goal, target date, area). Parent notified on assign.
Clients = children with CONFIRMED/COMPLETED bookings with the therapist, case-team children, or prior assignments.

## 6. Mira (web)
Child journey summary added to Mira's context. Structured extraction may return
`resource_request {areas, query}` (resolved server-side into ≤3 real library cards) and
`log_request {resourceHint, help?, engagement?, date?}` (matched to a saved item by title; ambiguous →
pick-list). Nothing is written until the parent taps Save log. Resource actions become journey deep links.

## 7. Mobile (Expo)
Parents: child picker; Library, child's library, read-only Progress; log bottom sheet; resource detail.
Other roles keep the current list. Hooks follow the app's existing useState/useEffect pattern.
Release via EAS production build + submit (version 1.1.0) — run by the account owner.

## Testing
Unit: domain mapping, status rules, access, library merge + query count, logging validation, backfill
mapping, Mira resolution/log matching, therapist assign scope. E2E: save → 3 logs → Mastered; share →
therapist reads → revoke → 404. Gates: `pnpm type-check`, web `next build`, mobile `tsc`.

## Rollout
1. Migration on the dev branch DB, then prod before merge. 2. One PR; CI green; merge → Railway + Vercel.
3. Prod smoke test. 4. EAS build/submit by the account owner. Untagged uploaded files show under "All"
until an admin tags them.
