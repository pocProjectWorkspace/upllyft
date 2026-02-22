# F16 — PDPL Data Handling Review
## UAE Personal Data Protection Law · Checklist + code fixes

> **Day 15** · API + policy  
> This is a review + remediation task, not a feature build.  
> Output: a completed checklist committed to the repo at `docs/pdpl-compliance.md`.

---

## Context

Upllyft handles sensitive health data for children in the UAE. The UAE Personal Data Protection Law (PDPL, Federal Decree-Law No. 45 of 2021) applies. This review identifies what needs to change before the platform handles real patient data. This is not a full legal audit — it's a practical developer checklist to catch the obvious gaps before go-live.

**This task should be done alongside F8–F15, not sequentially after them.**

---

## What PDPL Requires (Relevant to Upllyft)

| Requirement | What it means for the codebase |
|---|---|
| Lawful basis for processing | Consent must be recorded before health data is processed |
| Sensitive data classification | Health data (screenings, session notes) requires explicit consent |
| Data minimisation | Only collect what's needed — audit fields being stored |
| Right to access | Parent can request all data held about them |
| Right to deletion | Parent can request deletion of their account and data |
| Data breach notification | Must notify within 72 hours — need a process |
| Cross-border transfer restrictions | If using US-hosted services (AWS, Supabase), document it |
| Retention limits | Define how long data is kept after account closure |
| Audit logging | Record who accessed sensitive data and when |

---

## Review Tasks

Work through each section. For each gap found, either fix it in the codebase or document it as an accepted risk with a mitigation plan.

### Section 1 — Consent Before Data Collection

- [ ] Verify that a `ConsentForm` with `status: SIGNED` exists for a patient before any session notes are created (add a guard in `charting.service.ts` `createSession()`)
- [ ] Verify the onboarding flow collects explicit agreement to terms of service and privacy policy (check the onboarding step 1 UI in web-main)
- [ ] Ensure the consent form template (DocuSign) explicitly names the types of data collected: screening results, session notes, communications

### Section 2 — Data Fields Audit

- [ ] Review every Prisma model — remove any field that is collected but never used
- [ ] Confirm that `Session.soapObjective / soapAssessment / soapSubjective / soapPlan` are encrypted at rest (Postgres column-level encryption or Supabase vault) — if not, document this as a Phase 3 item
- [ ] Confirm that `Message.body` is not logged in any API request logs
- [ ] Confirm that no PII (names, emails, DOBs) is written to console logs anywhere in `apps/api/src/`

Search the API codebase:
```bash
grep -r "console.log" apps/api/src/ | grep -i "email\|name\|dob\|phone"
```

### Section 3 — Right to Access + Deletion

- [ ] Add `GET /admin/users/:id/data-export` endpoint — returns a JSON bundle of all data held for a user: profile, screenings, session notes, messages, invoices, consent records
- [ ] Add `DELETE /admin/users/:id/data` endpoint — soft-deletes the user and anonymises their records (replace PII with `[deleted]`, keep aggregate data for clinical audit trail)
- [ ] Document the process for handling a parent's deletion request in `docs/pdpl-compliance.md`

### Section 4 — Audit Logging

- [ ] Add a lightweight audit log to the API: whenever a `Session` or `ConsentForm` is accessed, write a record to an `AuditLog` table: `{ userId (accessor), resourceType, resourceId, action, timestamp }`
- [ ] Confirm the admin UI (web-admin) is behind HTTPS in production (Vercel handles this — document it)

### Section 5 — Cross-Border Data Transfer

- [ ] Document which cloud services are used and where data is stored:
  - Supabase region (confirm EU or UAE — if US, document transfer mechanism)
  - OpenAI API (US-based) — note that session context is sent to OpenAI for Mira scribe; consider anonymising before sending (replace child name with "the child")
  - Stripe (US-based) — only payment data, minimal PII
- [ ] Add this disclosure to the privacy policy template

### Section 6 — Retention Policy

- [ ] Define and document in `docs/pdpl-compliance.md`:
  - Active accounts: data retained indefinitely
  - Closed accounts: clinical records retained 7 years (UAE medical records standard), PII anonymised after 90 days
  - Messages: retained 3 years
- [ ] Create a placeholder cron job in the API that will enforce retention — even if it only logs "would delete X records" for now

### Section 7 — Breach Response Process

- [ ] Document in `docs/pdpl-compliance.md` the steps to follow if a breach is detected:
  1. Identify scope (which users affected, what data)
  2. Notify UAE National Cybersecurity Council within 72 hours
  3. Notify affected users
  4. Preserve logs
- [ ] Identify who is responsible for executing this (name a role, not a person)

---

## Output

Commit `docs/pdpl-compliance.md` to the repository. Structure it as:

```markdown
# Upllyft PDPL Compliance Checklist
Last reviewed: [date]
Reviewed by: [name]

## Status: [IN PROGRESS / PASSED / REQUIRES LEGAL REVIEW]

## Section 1 — Consent ...
## Section 2 — Data Fields ...
...

## Accepted Risks
(List anything not yet addressed with justification and target date)

## Phase 3 Items
(List encryption, formal DPO appointment, etc.)
```

---

## Acceptance Criteria

- [ ] `docs/pdpl-compliance.md` exists in the repo and covers all 7 sections
- [ ] No PII appears in API console logs (grep check passes)
- [ ] `GET /admin/users/:id/data-export` returns a complete data bundle for a user
- [ ] `DELETE /admin/users/:id/data` anonymises PII and soft-deletes the user
- [ ] `AuditLog` model exists and is written to when Session or ConsentForm is accessed
- [ ] OpenAI calls in Mira scribe replace child name with "the child" before sending
- [ ] Retention policy is documented
- [ ] Breach response process is documented with a named responsible role
- [ ] All accepted risks have a target remediation date
