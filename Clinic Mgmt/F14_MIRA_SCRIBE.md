# F14 — Mira Scribe Mode
## AI-assisted SOAP note drafting · Context-aware · Therapist reviews and signs

> **Days 12–13** · web-cases + API  
> Prerequisite: Phase 1 F6 (SOAP session notes) complete. Mira API endpoint (`/mira/chat-stream`) working.

---

## Context

Therapists spend significant time writing session notes. Mira scribe mode generates a draft for all four SOAP sections based on available context about the child and the case. The therapist reviews, edits, and signs — Mira never locks a note. This is the "AI assistant" story in the clinic pitch.

Scribe mode appears only on DRAFT session notes. Signed notes are read-only.

---

## API Endpoint

Add to the existing mira module (`apps/api/src/mira/`) — no new module needed.

| Method | Route | Guard | Purpose |
|---|---|---|---|
| POST | `/mira/scribe` | JWT + THERAPIST or ADMIN | Generate SOAP draft from session context |

### `POST /mira/scribe` — request body
```typescript
{
  sessionId: string,
  // The API fetches all context internally — therapist doesn't pass raw data
}
```

### Server logic
1. Fetch the `Session` record → get `caseId`, `patientId`, `therapistId`, `date`, existing SOAP content (may be empty or partial)
2. Fetch the `Case` → get IEP goals, active milestones
3. Fetch the patient's `IntakeQueue` → get concerns and goals from onboarding
4. Fetch the last 3 signed `Session` records for this case → get their `soapAssessment` and `soapPlan` for continuity context
5. Construct a system prompt:

```
You are a clinical assistant helping a therapist at a neurodivergent support clinic write a session note.
Generate a SOAP note draft based on the context below. Be professional, concise, and clinically appropriate.
Use first-person for the therapist's observations. Do not fabricate clinical observations — write in a style
that invites the therapist to fill in specific details.

Child: {childName}, {age}
Concerns: {concerns}
Active Goals: {goals}
Recent session assessments: {last3Assessments}
Today's session: {date}, {durationMinutes} minutes
Existing note content (if any): {existingSOAP}
```

6. Call OpenAI with the system prompt and request a JSON response:
```typescript
{
  soapSubjective: string,
  soapObjective: string,
  soapAssessment: string,
  soapPlan: string,
}
```
7. Store the draft in `Session.aiDraft` (JSON field)
8. Return the four SOAP strings

### Response
```typescript
{
  soapSubjective: string,
  soapObjective: string,
  soapAssessment: string,
  soapPlan: string,
}
```

This is a standard POST — not streaming. The therapist waits ~3–5 seconds for the full draft.

---

## web-cases UI

### Where it lives
The SOAP note form from Phase 1 F6 (`/sessions/[id]`). Modify the existing component — do not create a new page.

### What to add

**Scribe button**  
Shown only when `session.status === 'DRAFT'`.  
Placement: top-right of the SOAP form, next to the "Sign & Lock" button.  
Label: "✨ Draft with Mira"  
Style: secondary/outline button (not the primary teal — that stays for Sign & Lock)

**Loading state**  
When clicked: button shows "Mira is drafting..." with a spinner. Disable the Sign button and all textareas during generation.

**Draft injection**  
On success: populate all four SOAP section textareas with the returned draft content.  
Scroll to the first section.  
Show a dismissible banner: _"Mira has drafted this note. Review carefully and edit before signing."_

**Partial draft**  
If the therapist has already typed content in some sections, the scribe should overwrite — but warn first:  
_"Mira will replace your existing draft. Continue?"_ → confirm modal.

**Error state**  
If the API call fails: show a non-blocking toast — _"Mira couldn't generate a draft right now. Please try again."_  
Do not clear existing content on error.

### API hook shape
```typescript
useMiraScribe() → mutation
  mutate({ sessionId })
  → { soapSubjective, soapObjective, soapAssessment, soapPlan }
```

---

## Acceptance Criteria

- [ ] "Draft with Mira" button appears on DRAFT session notes only
- [ ] Button is hidden on SIGNED session notes
- [ ] Clicking the button calls `POST /mira/scribe` with the sessionId
- [ ] All four SOAP sections are populated with the returned draft
- [ ] Loading spinner is shown during generation; form is disabled
- [ ] If existing content is present, a confirmation modal appears before overwriting
- [ ] A dismissible banner informs the therapist the note was AI-drafted
- [ ] The therapist can edit all four sections after drafting
- [ ] The therapist can sign the note after editing (normal sign flow unchanged)
- [ ] `Session.aiDraft` is saved in the DB with the generated content
- [ ] API error shows a toast without clearing existing form content
- [ ] `POST /mira/scribe` called by a USER (parent) role returns 403
