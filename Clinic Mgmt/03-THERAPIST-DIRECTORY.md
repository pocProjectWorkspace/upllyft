# 03 — Therapist Directory + Schedule View

## Context

web-booking already has therapist profiles visible to parents (marketplace). But the clinic admin has no way to see all therapists, their credentials, their full schedules, or manage their availability. The clinic manager needs a staff directory and a consolidated calendar view.

## What to Build

### Therapist Directory (`/therapists`)

A list/grid of all therapists registered on the platform.

**Card/Row info:**
| Field | Source |
|-------|--------|
| Name + Photo | user profile |
| Specialties | therapist profile tags |
| Active Cases | count from web-cases |
| Today's Appointments | count from bookings for today |
| Availability Status | Available / Busy / Off Today |
| Credential Status | Verified / Pending / Expired (new field, Feature 03) |

**Filters:**
- Specialty (multi-select)
- Availability status
- Credential status
- Search by name

### Therapist Detail (`/therapists/[id]`)

**Sections:**
- **Profile:** Name, bio, specialties, contact, join date
- **Credentials:** Licence number, expiry, uploaded documents (placeholder for Phase 2 upload)
- **Caseload:** List of active cases with patient name, status, last session
- **Schedule:** Weekly calendar view of their appointments
- **Performance:** Session count this month, avg sessions/week (simple counts for now)

### Schedule View (`/therapists/schedule`)

A consolidated calendar showing ALL therapists' appointments for the day/week.

**Views:**
- **Day view (default):** Time slots on Y-axis, therapists on X-axis — grid showing who's seeing whom when
- **Week view:** Mini calendar per therapist showing occupied slots
- **List view:** Simple chronological list of all appointments

**Each appointment cell shows:**
- Patient (child) name
- Session type (if available)
- Time slot
- Status (confirmed / pending / completed)

## API Endpoints Needed

```
GET    /api/admin/therapists                    — list all therapists with summary stats
GET    /api/admin/therapists/:id                — single therapist detail
GET    /api/admin/therapists/:id/schedule       — therapist's appointments for date range
GET    /api/admin/schedule                      — all therapists' appointments (consolidated)
PATCH  /api/admin/therapists/:id/credentials    — update credential info (Phase 2 full impl)
```

### Query Parameters for Schedule

```
?date=2026-02-21           — specific day
?startDate=...&endDate=... — date range
?therapistId=...           — filter to one therapist
```

## Data Model Considerations

Check if therapist profiles already have credential fields. If not, extend:

```prisma
model TherapistProfile {
  // ... existing fields
  licenceNumber     String?
  licenceExpiry     DateTime?
  credentialStatus  CredentialStatus  @default(PENDING)
}

enum CredentialStatus {
  PENDING
  VERIFIED
  EXPIRED
}
```

## UI Components

```
/therapists page:
├── TherapistGrid         — card grid of therapists
├── TherapistFilters      — filter bar
└── TherapistCard         — individual card with key stats

/therapists/[id] page:
├── TherapistHeader       — photo, name, specialties, status
├── CredentialSection     — licence info, document placeholders
├── CaseloadTable         — active cases list
├── WeeklyCalendar        — their personal schedule
└── PerformanceStats      — simple session counts

/therapists/schedule page:
├── ScheduleGrid          — day view: therapists × time slots
├── ScheduleWeekView      — week view: mini calendars
├── ScheduleListView      — simple list
├── DateNavigator         — prev/next day, date picker
├── ViewToggle            — day / week / list toggle
└── AppointmentCell       — individual appointment in grid
```

## Design Notes

- The schedule grid is the hero component — this is what the receptionist looks at all day
- Use color coding per therapist for quick visual scanning
- Appointment cells should be clickable → navigate to the booking/session detail
- The day view grid should handle overlapping appointments gracefully
- Default to today's date on load

## Success Criteria

- [ ] `/therapists` shows all therapists with summary stats
- [ ] Therapist detail page shows caseload and personal schedule
- [ ] `/therapists/schedule` shows consolidated day view across all therapists
- [ ] Day/week/list toggle works
- [ ] Date navigation works (prev/next day, date picker)
- [ ] Clicking an appointment navigates to detail
- [ ] Empty states handled (no appointments today, new therapist with no cases)
- [ ] Credential status displays (even if management is Phase 2)
