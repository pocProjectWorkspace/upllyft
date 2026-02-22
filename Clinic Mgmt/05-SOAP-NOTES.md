# 05 — SOAP Session Note Form

## Context

This is the **single biggest clinical gap** in Upllyft today. Therapists can manage cases in web-cases (goals, milestones, IEPs) but they cannot document individual sessions. Every clinic requires session documentation — it's both a clinical best practice and a legal/insurance requirement.

SOAP (Subjective, Objective, Assessment, Plan) is the standard format for therapy session notes. This feature adds a per-session encounter record linked to a case and a booking.

**This feature lives in `web-cases` (port 3006), not web-admin.** The therapist writes notes in web-cases; the admin views them in web-admin (read-only).

## What to Build

### Session Note Form (`/cases/[caseId]/sessions/new`)

A structured form the therapist fills out after (or during) each session.

**SOAP Fields:**

| Section | Field | Type | Required |
|---------|-------|------|----------|
| **Header** | Session Date | date picker | Yes |
| | Session Duration (mins) | number | Yes |
| | Session Type | dropdown: In-person / Teletherapy / Home Visit | Yes |
| | Linked Booking | auto-linked if opened from tracking board | No |
| **S — Subjective** | Parent/caregiver report | textarea | No |
| | Child's mood/presentation | textarea | No |
| | Concerns raised | textarea | No |
| **O — Objective** | Activities conducted | textarea | Yes |
| | Child's responses/behavior | textarea | Yes |
| | Standardised scores (if any) | number inputs | No |
| | Materials used | tag input | No |
| **A — Assessment** | Progress toward goals | textarea | Yes |
| | Goal linkage | multi-select from case goals | No |
| | Clinical observations | textarea | No |
| | Risk/concern flags | checkbox + text | No |
| **P — Plan** | Next session focus | textarea | Yes |
| | Home activities assigned | textarea | No |
| | Referral/escalation needed | checkbox + text | No |
| | Next session date | date picker | No |
| **Meta** | Status | Draft / Signed | Auto |
| | Signed at | timestamp (when therapist signs off) | Auto |

### Session List View (`/cases/[caseId]/sessions`)

A chronological list of all sessions for a case, showing:
- Date, duration, type
- Therapist name
- Status (Draft / Signed)
- Preview of Assessment section (first ~100 chars)
- Click → opens full note

### Session Detail View (`/cases/[caseId]/sessions/[sessionId]`)

Read-only view of a completed session note with all SOAP sections formatted cleanly. Includes:
- Print/PDF button (Phase 2 for full implementation, but the layout should be print-friendly)
- Edit button (only if status is Draft)

### Goal Progress Linking

When the therapist fills in the Assessment section, they can select which case goals this session addressed and rate progress:

```
Goal: "Improve fine motor control"     Progress: ○ Regression  ● Maintaining  ○ Progressing  ○ Achieved
Goal: "Increase social interaction"    Progress: ○ Regression  ○ Maintaining  ● Progressing  ○ Achieved
```

This data feeds into Feature 07 (Outcome Snapshot).

## API Endpoints Needed

```
POST   /api/sessions                        — create session note
GET    /api/sessions?caseId=xxx             — list sessions for a case
GET    /api/sessions/:id                    — get single session
PATCH  /api/sessions/:id                    — update session (draft)
POST   /api/sessions/:id/sign               — sign off (locks the note)
GET    /api/admin/sessions?date=xxx         — admin: all sessions for a date
```

### Data Model

```prisma
model Session {
  id              String        @id @default(uuid())
  caseId          String
  case            Case          @relation(fields: [caseId], references: [id])
  therapistId     String
  therapist       User          @relation(fields: [therapistId], references: [id])
  bookingId       String?       // optional link to a booking
  
  sessionDate     DateTime
  duration        Int           // minutes
  sessionType     SessionType
  
  // SOAP sections
  subjective      Json?         // { parentReport, childPresentation, concerns }
  objective       Json?         // { activities, responses, scores, materials }
  assessment      Json?         // { progressNotes, clinicalObservations, riskFlags }
  plan            Json?         // { nextFocus, homeActivities, referralNeeded, nextDate }
  
  // Goal progress
  goalProgress    Json?         // [{ goalId, rating: 'PROGRESSING' | 'MAINTAINING' | ... }]
  
  status          SessionStatus @default(DRAFT)
  signedAt        DateTime?
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

enum SessionType {
  IN_PERSON
  TELETHERAPY
  HOME_VISIT
}

enum SessionStatus {
  DRAFT
  SIGNED
}
```

**Check the existing schema first** — web-cases may already have a Session model. If so, extend it rather than creating a new one.

## UI Components (in web-cases)

```
/cases/[caseId]/sessions page:
├── SessionList           — chronological list with status badges
├── SessionCard           — preview card for each session
└── NewSessionButton      — CTA to create new note

/cases/[caseId]/sessions/new page:
├── SessionNoteForm       — the main SOAP form
├── SOAPSection           — collapsible section component (reused 4x)
├── GoalProgressLinker    — multi-select goals + progress rating
├── SessionHeader         — date, duration, type inputs
├── SaveDraftButton       — saves without signing
├── SignOffButton         — locks the note with confirmation dialog
└── AutoSaveIndicator     — shows "Saved" / "Saving..." status

/cases/[caseId]/sessions/[id] page:
├── SessionNoteView       — read-only formatted view
├── SOAPSectionView       — read-only section display
├── GoalProgressView      — progress ratings display
└── SessionActions        — edit (if draft), print, back to list
```

## Design Notes

- The form should auto-save drafts every 30 seconds
- Use collapsible sections so the form doesn't feel overwhelming
- Textareas should auto-expand as the therapist types
- The Sign Off action should have a confirmation: "Once signed, this note cannot be edited. Continue?"
- Keep the form clean and spacious — therapists are often typing this between back-to-back sessions
- Plan for Mira scribe integration (Phase 2): leave a "Generate with Mira" button placeholder in each section

## Navigation Integration

Add a "Sessions" tab to the existing case detail page in web-cases. The case detail probably already has tabs like Goals, Milestones, etc. — Sessions becomes a new tab.

## Success Criteria

- [ ] Sessions tab appears on case detail page
- [ ] New session note form with all SOAP fields works
- [ ] Draft auto-save works (saves every 30 seconds)
- [ ] Manual save as draft works
- [ ] Sign off locks the note and sets signedAt timestamp
- [ ] Session list shows all sessions for a case in order
- [ ] Session detail view renders all sections cleanly
- [ ] Goal progress linking works — can select goals and rate progress
- [ ] Signed notes cannot be edited
- [ ] Empty state handled (no sessions yet for this case)
