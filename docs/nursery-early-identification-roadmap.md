# Nursery — Early-Identification Roadmap (F7–F11)

_Status: **all five shipped.** F7+F8 (PR #30) and F9+F10+F11 delivered 2026-07-16. This doc is kept as the design rationale._

## Context

The nursery build so far (F1–F6, all shipped) is not a nursery-management system — it is an
**early-identification funnel**:

> enrol → observe (F5) → screen, multi-informant (F4) → concern detected (F6) →
> AI-coached, non-diagnostic parent conversation → referral to a licensed therapist (F1)

The differentiation ("the moat") is two things the incumbents don't have: **concordance**
(parent-vs-educator _disagreement_ treated as signal) and the **AI-coached conversation**. But
the funnel currently **hands off at referral** and does nothing in between, and it has no
defined entry instrument or exit record. The middle (what the setting itself does about a
concern) and the edges (a top-of-funnel review, and the leaving-nursery handover) are open.

These five features extend that spine. They do **not** move Upllyft toward being a general
nursery-management system.

### Competitive landscape (neurodivergence / early-ID lens)

| Camp | Examples | Owns | Neglects |
|---|---|---|---|
| EYFS/childcare ops | Famly, Blossom, Tapestry, Brightwheel, Kinderly, Storypark | Daily diary, learning journeys, parent app, registers, billing, basic cohort tracking | SEND is a passive, single-observer bolt-on. No concordance, no coaching, no diagnostic-pathway intelligence |
| Validated screeners | ASQ-3 / ASQ:SE-2, WellComm, M-CHAT | Strong normed instruments | Standalone; no workflow, no multi-informant logic, no "what next" |
| SEND / provision tools | Evidence for Learning, BSquared, provision-map tools | The support cycle, provision mapping, progress tracking | Start _after_ identification; school-oriented, not early-years |

**White space = the active, intelligent identification→support→outcome spine that all three neglect.**

## Posture & invariants (apply to every feature below)

1. **Intelligence layer, not system of record.** Integrate with whatever ops platform the
   nursery runs; do not rebuild daily-diary / attendance / billing. (Same posture as the
   clinic module.)
2. **Reuse over rebuild.** Reuse existing engines and shapes wherever the tenancy invariant
   allows (see each feature's reuse map).
3. **Tenancy invariant — nursery entities anchor to `ChildAffiliation`, never to a `Case`.**
   A nursery has no Case. `IEP` / `MilestonePlan` are `caseId`-bound and therefore cannot be
   reused as entities — only their _shapes_. New nursery models follow the F5/F6 pattern:
   own model, `affiliationId` as the consent anchor, `facilityId` for scope.
4. **Consent gate on every path.** `assertFacilityMember` first (404 for non-members, no
   enumeration oracle), then `assertChildAccess` with the right capability + `ASSESSMENT` or
   `DATA_PROCESSING` consent. Writes require an ACTIVE consented enrolment; revocation stops
   new writes but the parent keeps what was shared.
5. **International / geography-agnostic.** No feature depends on a single country's statute.
   Country-specific labels, mandatory timings, and export formats are driven by
   `docs/regional-configuration-spec.md` / the `config` module, so a UK statutory wrapper (or
   any other) can sit on top later without touching the core.

---

## F7 — Support plans & the structured support cycle (Assess → Plan → Do → Review)

**The missing "Do → Review" after F6.** When a concern is shared, the setting is expected to
run in-setting support: a small number of targeted outcomes, chosen interventions, and a
review cycle that checks whether they worked. This is the SENDCo's core recurring workflow and
the natural node immediately after the coached conversation.

- **New models (nursery-scoped):**
  - `SupportPlan` — `affiliationId` (anchor), `facilityId`, `status` (DRAFT/ACTIVE/UNDER_REVIEW/CLOSED),
    `version`/`previousVersionId` (mirror IEP versioning), `reviewDate`, optional `concernId`
    (the plan that a concern led to). Author = INCLUSION_LEAD.
  - `SupportOutcome` — the targeted outcomes (mirror `IEPGoal`: `domain`, `outcomeText`,
    `baselineValue`, `targetDate`, `reviewIntervalDays`, `status`, `currentProgress`).
  - `SupportReview` — one row per APDR review point: `reviewedAt`, `progressNote`,
    per-outcome progress, decision (continue / adjust / escalate-to-referral / close).
- **Reuse:** `GoalBankItem` (domain-scoped, **not** case-bound) for suggested outcomes; the
  IEP `title/version/status/reviewDate` and `IEPGoal` measurability shape; the F6 evidence
  snapshot as the plan's starting rationale.
- **Gate:** `canRaiseConcern`/a new `canPlanSupport` capability; ACTIVE + consent.
- **Depends on:** F5/F6 (evidence, concern). **Foundational** — F8/F10/F11 attach to it.

## F8 — Targeted interventions & parent home strategies

**The "Do" content the outcomes point to.** Evidence-based activities mapped to a child's
flagged domains (communication games, social stories, sensory/self-regulation strategies),
plus simple home activities a parent can run — turning identification into action on both sides.

- **Reuse (heavy — ~80% exists):** `Worksheet` is already caseless-capable (`caseId String?`),
  domain-tagged (`targetDomains`), screening-linked (`screeningId`), AI-generated
  (`dataSource`), assignable to a parent (`WorksheetAssignment.assignedToId`, `parentNotes`,
  `completions`), and has **`WorksheetEffectiveness`** (`preScore`/`postScore`/`progressDelta`
  per domain, `goalId`) — i.e. response measurement is built. Mira + the web-resources
  AI-worksheet engine generate the content.
- **New (thin):** a nursery-scoped assignment path (keyworker → parent, gated through the
  consent gate and anchored to the affiliation), and a link table from `SupportOutcome` →
  assigned intervention so a plan's "Do" is explicit and its effectiveness rolls up to F10.
- **Gate:** consent gate on the assignment; parent always sees their own child's assignments.
- **Depends on:** F7 (outcomes to attach to) — but can also attach directly to a domain/concern.

## F9 — Early developmental review (~24–30 months)

**A defined top-of-funnel instrument.** A generic early developmental review at around two —
the age at which delays first become reliably visible — covering communication, social-
emotional, and physical development. Feeds the same identification engine. (This is the
_universal_ well-child-review concept; a country's statutory version, e.g. England's Progress
Check at Age Two + integrated review, is a **regional-config wrapper**, not the core.)

- **Reuse:** the F4 `Assessment` / educator-screening engine and scoring; the multi-informant
  concordance service; the age-band questionnaire structure.
- **New (thin):** a review "type" and its item set (age-banded), an optional shareable summary
  for an onward health contact (format regionally configurable).
- **Gate:** same `ASSESSMENT`-consent path as F4.
- **Depends on:** F4. Largely independent — could be sequenced earlier if inflow is the priority.

## F10 — Setting-level early-identification dashboard (+ equity)

**The leadership view.** For the OWNER / ORGANIZATION role: how many children are flagged per
domain, how support plans and interventions are progressing, and — the piece no incumbent does —
**over-/under-identification monitoring** (are boys, EAL children, summer-borns, or any cohort
being flagged disproportionately). Doubles as inspection/quality evidence (framed generically,
not to any one regulator).

- **Reuse:** aggregate over existing data — `Observation`, `Assessment`/concordance, `Concern`,
  `SupportPlan`/`SupportReview` (F7), `WorksheetEffectiveness` (F8). Mostly queries + a web view.
- **New:** aggregation endpoints (facility-scoped, no cross-tenant leakage — re-check the
  `clinic-outcomes` unscoped-count lesson) and the org-role dashboard UI.
- **Gate:** OWNER/ADMIN/ORGANIZATION only; strictly facility/org-scoped counts.
- **Depends on:** F7/F8 for impact data to be meaningful.

## F11 — Onward handover record (school transition / multi-agency)

**Protect the identification investment at the exit.** When a child leaves the nursery — for
school, or into a diagnostic pathway — assemble their identification+support story
(observations, screenings, concerns, plans, what worked) into a single structured record for
the receiving school _or_ a clinician. This also subsumes the "multi-agency evidence pack"
idea: the nursery already holds all the evidence; packaging it is the feature.

- **Reuse:** the F6 evidence-snapshot pattern; the report/PDF generation used for assessments;
  everything F7–F10 produced.
- **New:** a `HandoverRecord` assembler + a shareable export (recipient and format regionally
  configurable), guardian-consented before it leaves the setting.
- **Gate:** consent-gated share (guardian approves the onward disclosure), like F6's share.
- **Depends on:** F7–F10 (it summarises them). **Capstone.**

## Proposed sequence

**F7 → F8 → F9 → F10 → F11.** Rationale: first strengthen what happens _after_ identification
(the support spine + its content), then widen what comes _in_ (F9), then give leaders the view
(F10), then protect the _exit_ (F11). F9 is fairly independent and can move earlier if
top-of-funnel inflow is the higher priority.

## Cross-cutting

- **Regional config:** statutory labels, mandatory timings, and export formats for F9/F11 live
  in the `config` module per `docs/regional-configuration-spec.md` — off by default, so the
  core stays international.
- **Consent & tenancy:** every new model anchors to `ChildAffiliation`; every path runs the
  consent gate; facility-scoped reads re-check on every access (revocation bites).
- **Verification (per feature, established pattern):** hand-written idempotent SQL migration
  applied to dev+prod _before_ the code deploy; an e2e spec under `apps/api/test/` following
  the F4/F5/F6 fixtures pattern (gate tests: remove each gate, prove the door shuts; parent vs
  staff visibility; revocation); type-check; then deploy (API on Railway, web on Vercel — both
  now verifiable from here).
