# Clinic Management — Manual QA Checklist

How to manually verify the UAE clinic-management changes (Phases 0–4 backend + front-end UI) on a local dev server.

## 0. Start the local stack

Port `3001` may be taken by another project, so we run the API on **3011** and point the web apps at it.

```bash
# 1) API (NestJS) on 3011
cd apps/api && PORT=3011 node dist/main.js          # or: pnpm --filter @upllyft/api start

# 2) Web apps (each in its own terminal), pointed at the API on 3011
NEXT_PUBLIC_API_URL=http://localhost:3011 pnpm --filter @upllyft/web-cases dev    # → http://localhost:3006
NEXT_PUBLIC_API_URL=http://localhost:3011 pnpm --filter @upllyft/web-booking dev  # → http://localhost:3004
NEXT_PUBLIC_API_URL=http://localhost:3011 pnpm --filter @upllyft/web-main dev     # → http://localhost:3000
```

**Login:** use a therapist / clinic-admin account (case features are role-guarded). Open a case from the list, then use the left **case-detail sidebar** to reach the new tabs.

> Most new screens read/write live data. If a clinic/case has no seeded payer/guardian/etc. yet, the screens show empty states — use the **Add** buttons to create data and watch it persist + the badges update.

---

## 1. web-cases — case detail (http://localhost:3006)

Open a case → left sidebar now has new items. Verify each:

### Identity & Guardians (Admin group)
- [ ] **Capture identity** → choose Emirates ID, enter a number + expiry → Save. Number shows **masked** (e.g. `••••5678`), never in full.
- [ ] **Mark verified** → green "Verified" badge appears.
- [ ] **Add guardian** → name, relationship, toggle **authority to consent** / primary / emergency, access level → appears as a card with the right badges. Edit + delete work.

### Payer & Pre-auth (Admin group)
- [ ] **Add policy** (insurer/sponsor, policy no., validity, co-pay) → shows as a card with Active badge.
- [ ] **Request pre-auth** against that policy → row appears `PENDING` with `0 / N` sessions.
- [ ] **Approve** (number, approved sessions, validity) → badge → `APPROVED`. **Deny** with a reason → `DENIED` + reason shown.
- [ ] **Renew** an approved pre-auth → a new `PENDING` renewal is created.

### Triage (Clinical group)
- [ ] **New triage** (risk level + summary) → card appears `PENDING`.
- [ ] **Decide** (decision + notes) → status `DECIDED`, decision badge shown.

### MDT Reviews (Clinical group)
- [ ] **Schedule MDT** (date) → `SCHEDULED` card.
- [ ] **Complete** with a summary → `COMPLETED`.

### Reviews (Clinical group)
- [ ] **New review** (trigger) → `DUE` card. **Complete** with an outcome → `COMPLETED`.
- [ ] (Background) the daily cron also auto-creates reviews from plan/auth/IEP dates — not testable instantly.

### Documents — report approval
- [ ] Generate or add a document → it shows a **status badge** (existing docs are `APPROVED`; new ones start `DRAFT`).
- [ ] On a DRAFT: **Submit for approval** → `PENDING APPROVAL`. Then **Approve** → `APPROVED`, or **Reject** (reason) → `REJECTED`.
- [ ] **Share** a document: sharing a **non-APPROVED** report is blocked by the API (you'll see an error toast); sharing an APPROVED one works (also requires an active SHARING/REPORT_SHARING consent — see Consents).
- [ ] On an APPROVED report: **Create parent version** (title) → a parent-audience copy is created.

### Consents
- [ ] **Grant consent** now has **Purpose** + **Recipient** fields and the new types (Telehealth, Report Sharing, Communication, Data Processing). Granted consents display purpose/recipient.

### Incidents (Admin group)
- [ ] **Raise incident** (category incl. Safeguarding, urgency, description) → card; EMERGENCY+open is highlighted red.
- [ ] **Close** with an action plan → `CLOSED`.

### Discharge (Admin group)
- [ ] Enter **clinical** + **admin** reasons + retention days → **Discharge case** → shows how many future appointments were cancelled + any open billing. Case status → `DISCHARGED`.
- [ ] After discharge: **Archive** and **Reactivate** work (status flips; no duplicate case).

### Leads inbox (case-list sidebar → "Leads")
- [ ] Visible to a **clinic-admin** account. Lists leads; change a lead's **status** via the dropdown. (Empty if no leads/clinic.)

---

## 2. web-booking — reception readiness (http://localhost:3004)

- [ ] Open a **clinic** booking detail (one with a `clinicId`). A **"Pre-visit readiness"** panel appears under the header showing **Ready/Blocked** + a blocker list (payment, clearance, pre-auth, consent, credential).
- [ ] **Mark cleared** / **Approve exception** updates the clearance badge.
- [ ] Consumer (non-clinic) bookings should **not** show the panel.

---

## 3. web-main — parent portal (http://localhost:3000/care)

- [ ] Log in as a **parent**. Go to `/care`.
- [ ] **Pre-visit checklist** lists each child's tasks; **Mark done** flips a task to `COMPLETE`.
- [ ] **My reports** lists documents shared with you (parent-audience / approved). Empty if nothing shared yet.

---

## 4. Backend enforcement spot-checks (optional, via API)

- [ ] Assign a therapist with an **expired/unverified licence** to a case → rejected.
- [ ] Record a **diagnosis** as a non-`canDiagnose` therapist → rejected.
- [ ] Start a clinic encounter (check-in → IN_SESSION) while clearance is `PENDING/BLOCKED` → rejected.
- [ ] A `BILLING`-role user opening a clinical case → forbidden.

---

## Known limitations (by design / not yet built)
- Screens are wired to the live API and type-check clean, but **not yet exhaustively browser-tested with seeded data**.
- **Scaffolded** (data persists, richer behaviour later): pathway auto-generator, EHR PDF/FHIR export generation, AI triage summary, room/resource scheduling, recurring-session generation, finer per-child/clinic RBAC.
- **Prod note:** set `CLINIC_PHI_KEY` (32-byte base64) in the deployed API env before identity capture works in production.
