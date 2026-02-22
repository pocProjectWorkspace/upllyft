# 02 — Patient Directory + Intake Queue

## Context

Clinic staff currently have no way to see all patients in one place. Parents register via web-main, children are added to profiles, but there's no clinic-side directory. The receptionist needs to see who's registered, who's in the intake queue, and basic demographic info at a glance.

In Upllyft's model: **User** (parent) is the account holder, **Child** is the actual patient. The directory should be child-centric since clinics think in terms of patients (children), not account holders.

## What to Build

### Patient Directory (`/patients`)

A searchable, filterable table of all children (patients) registered on the platform.

**Columns:**
| Column | Source |
|--------|--------|
| Patient Name | child.firstName + child.lastName |
| Age | calculated from child.dateOfBirth |
| Parent/Guardian | user.firstName + user.lastName |
| Contact | user.email, user.phone |
| Status | Intake / Active / Discharged / On Hold |
| Assigned Therapist | from case assignment (if any) |
| Last Activity | most recent session or screening date |
| Registered Date | child.createdAt |

**Filters:**
- Status (multi-select)
- Assigned Therapist (dropdown)
- Age range
- Search by name (patient or parent)

**Actions per row:**
- View profile → opens patient detail page
- Assign therapist → quick assign modal
- Create case → triggers Feature 06 flow

### Intake Queue (`/patients?status=intake`)

A filtered view of the directory showing only patients in `Intake` status — children who have registered but don't yet have a case or therapist assigned.

**Intake queue card view** (alternative to table for this filter):
- Child name + age
- Parent name + contact
- Registration date
- Screening status (completed / not started)
- "Assign & Create Case" CTA button

### Patient Detail Page (`/patients/[id]`)

A read-only summary pulling data from across the platform:

**Sections:**
- **Demographics:** Name, DOB, age, gender, parent info, contact
- **Screening Summary:** Latest UFMF scores by domain (pull from web-screening data)
- **Active Cases:** List of cases with therapist, status, goal count
- **Session History:** List of sessions (dates, therapist, type) — will be populated once Feature 05 (SOAP notes) is built
- **Milestones:** Key milestones from web-cases
- **AI Insights:** Link to latest Mira insight if exists

## API Endpoints Needed

```
GET    /api/admin/patients              — paginated list with filters
GET    /api/admin/patients/:childId     — single patient detail (aggregated)
PATCH  /api/admin/patients/:childId     — update status
POST   /api/admin/patients/:childId/assign — assign therapist to patient
```

### Data Model Changes

The `Child` model in Prisma likely needs a `clinicStatus` field:

```prisma
enum ClinicStatus {
  INTAKE
  ACTIVE
  ON_HOLD
  DISCHARGED
}

model Child {
  // ... existing fields
  clinicStatus  ClinicStatus  @default(INTAKE)
}
```

Check the existing schema first — if a similar field exists, use it. Don't duplicate.

## UI Components

```
/patients page:
├── PatientTable          — sortable data table with pagination
├── PatientFilters        — filter bar (status, therapist, age, search)
├── IntakeQueueCards      — card view for intake filter
├── AssignTherapistModal  — quick therapist assignment
└── PatientStatusBadge    — color-coded status chips

/patients/[id] page:
├── PatientHeader         — name, age, status, parent info
├── ScreeningSummary      — domain scores from latest UFMF
├── CasesList             — active cases with therapist
├── SessionTimeline       — chronological session list
├── MilestoneTracker      — key milestones
└── QuickActions          — assign therapist, create case, change status
```

## Design Notes

- Use `@upllyft/ui` Table component if it exists, otherwise build a reusable one
- Status badges: Intake (amber), Active (green), On Hold (gray), Discharged (red)
- The table should feel snappy — clinic staff will use this dozens of times per day
- Mobile-responsive but optimized for desktop (clinic staff use laptops)

## Success Criteria

- [ ] `/patients` shows paginated list of all children with correct columns
- [ ] Search by patient or parent name works
- [ ] Filter by status, therapist, and age works
- [ ] Intake queue view shows only intake-status patients
- [ ] Patient detail page aggregates data from across modules
- [ ] Assign therapist modal works and updates the record
- [ ] Status can be changed (intake → active, etc.)
- [ ] Empty states handled (no patients, no screenings, no cases)
