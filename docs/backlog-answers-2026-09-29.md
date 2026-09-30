# Backlog answers — #5, #10, #14 (29 Sept 2026)

Answers to three questions from the Upllyft Backlog (Notion export of 17 Sept 2026),
taken from the code on branch `perf/phase-1`. File references are to that branch.

---

## #5 — Is Upllyft on a different domain, hosted on a separate instance?

**Short answer: one web app now, one API, one database. The old per-product domains are
being retired and redirect into the one app.**

| Layer | Where it runs | Notes |
|---|---|---|
| Web (parents, therapists, clinics, admin) | **One** Next.js app, `apps/web-main`, on Vercel at `app.safehaven-upllyft.com` | Community, screening, booking, resources, cases and clinic admin used to be six separate apps on their own subdomains. Since 26 Sept 2026 they are sections of this one app: `/community`, `/screening`, `/booking`, `/resources`, `/cases`, `/clinic`. |
| Marketing site | `apps/landing`, its own Vercel project | Separate on purpose. |
| API | One NestJS service on Railway | Serves web and mobile. |
| Database + file storage | Supabase, `eu-north-1` | Shared by everything. |
| Mobile | Expo app, calls the same API | |

**The old subdomains** (`community.`, `screening.`, `booking.`, `resources.`, `cases.`,
`admin.safehaven-upllyft.com`) are redirected to the matching section of the one app
(`apps/web-main/next.config.ts`, `LEGACY_HOSTS`). As of 26 Sept: booking, resources, cases
and admin already redirect; community and screening still served the old apps.

**Still to do (manual, not code):**
1. Point `community.` and `screening.` at the hub too (Vercel env var on those two projects).
2. Move the six custom domains onto the `upllyft-web-main` Vercel project so the redirects
   in the hub take over, then retire the six old Vercel projects.
3. Delete the dead `apps/web-community`, `web-screening`, `web-booking`, `web-resources`,
   `web-cases`, `web-admin` folders from the repo.

**Decision needed:** whether Upllyft should move off `safehaven-upllyft.com` to its own
domain. Nothing in the code blocks that; it is a DNS + env change
(`NEXT_PUBLIC_APP_MAIN_URL`, `FRONTEND_URL`, cookie domain).

---

## #10 — What data does Mira use to answer parents?

Code: `apps/api/src/mira/mira.service.ts` (`gatherContext`, `buildSystemMessage`).
Every message a parent sends goes through these steps:

**1. The conversation so far.** The last 10 messages of this conversation.

**2. The child — only if a child is selected in the Mira panel.**
- Age (years + months) and gender.
- Conditions on the child's profile: condition type, specific diagnosis, severity, primary
  challenges, strengths, developmental concerns, learning difficulties.
- **The latest completed screening**: overall score, flagged domains, per-domain scores.
- The child's **name is NOT sent** — it is replaced with "the child" before anything leaves
  our servers (PDPL).

If no child is selected, Mira has none of this and answers generically. The panel starts
with **no child selected** when opened from the floating button; it only pre-selects a
child when opened from the parent dashboard.

**3. Platform matches for the message.** Mira asks a small model to pull 3–5 keywords from
the parent's message, then searches:
- **Therapists/educators** — verified only, matched on their specialisation. Up to 3.
- **Communities** — by tag, name or description. Up to 2.
- **Organisations** — that run a matching community. Up to 2.
- **Community posts** — published and moderator-approved only. Top 3 by upvotes.

**4. Links** to screening, booking, community, resources and insights.

**What Mira does NOT use:** other children in the family, past screenings (only the
latest), case notes, session notes, therapist reports, bookings, messages, the parent's
location, uploaded documents or the resource library.

**Where it goes:** OpenAI. `gpt-4o` writes the reply; smaller models extract keywords, the
follow-up chips/cards, and the conversation title. So the child's age, gender, conditions,
diagnoses and screening scores are sent to OpenAI (without the name). Conversations are
stored in our database (`MiraConversation` / `MiraMessage`).

**Issues found while documenting this:**
- ✅ **Fixed (30 Sept): Mira did not check that the child belongs to the parent.** The API
  took a `childId` from the request and loaded that child's conditions and screening with
  no ownership check, so a logged-in user who sent another family's child id got answers
  built on that child's data. Now `MiraService.assertOwnChild` allows only the child on
  the caller's own profile or one they are a listed guardian of, before a conversation
  is saved or anything is sent to OpenAI (403 otherwise; the stream endpoint checks
  before opening). Covered by `apps/api/test/mira-child-access.e2e-spec.ts`.
- Therapist suggestions ignore the parent's country, so a UAE parent can be pointed at an
  India-based therapist and vice versa.
- The prompt tells Mira to "always use the child's name", but the name is deliberately
  removed, so replies say "the child".
- The prompt is written for Indian families ("chai", "in-laws"); most current users are in
  the UAE.

---

## #14 — Does Mira's opening look the same for every first question?

**Yes — by design, and noticeably so.**

- **Before the first message**, every parent sees the same screen: "Hi, *name*! I'm Mira",
  the same line of text and the same four starter questions
  (`apps/web-main/src/components/mira/mira-panel.tsx`, `WelcomeState`). Nothing changes by
  child, age, screening result or country.
- **The first reply** follows one instruction in the prompt: validate the parent's feelings
  first, and *'Say "I hear you." Acknowledge that this is hard.'* So almost every first
  reply opens with the same empathy line ("I hear you… that sounds really hard…") whether
  the parent asked something worrying or something simple like "what milestones should I
  expect at 2?". The wording varies a little, but the shape is the same.

**Suggested changes (small, prompt + one component):**
1. Only lead with empathy when the message expresses worry; answer factual questions directly.
2. Drop the fixed "Say 'I hear you'" line and ask Mira not to start two replies the same way.
3. Make the starter questions depend on the child (age, flagged screening domains) and
   pre-select the child when the parent has only one.
4. Fix the name rule (see #10) so Mira doesn't say "the child".

A quick check: ask Mira five different first questions with and without a child selected
and compare the opening sentences.
