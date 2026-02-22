# 06 — Intake → Case Auto-Creation Trigger

## Context

Today, when a parent registers and adds a child, nothing happens on the clinic side. A therapist has to manually create a case in web-cases. In a clinic workflow, the intake process should automatically:

1. Create a patient record (child appears in the Patient Directory)
2. Notify the clinic admin of a new intake
3. When a therapist is assigned, auto-create a case file

This feature is an **API-level automation** — no new UI pages, just backend logic and a few UI triggers.

## What to Build

### Automation Flow

```
Parent registers + adds child
        │
        ▼
Child gets clinicStatus = INTAKE (Feature 02)
        │
        ▼
Notification sent to admin: "New patient intake: [child name]"
        │
        ▼
Admin assigns therapist via Patient Directory (Feature 02)
        │
        ▼
API auto-creates a Case with:
  - child linked
  - therapist linked
  - status = ACTIVE
  - default case name: "[Child Name] — Initial Assessment"
  - clinicStatus changes from INTAKE → ACTIVE
        │
        ▼
Notification sent to therapist: "New case assigned: [child name]"
        │
        ▼
Therapist sees case in web-cases immediately
```

### API Implementation

**Option A: NestJS Event Listener (preferred)**

```typescript
// When therapist is assigned to a patient
@OnEvent('patient.therapist-assigned')
async handleTherapistAssigned(payload: {
  childId: string;
  therapistId: string;
  assignedBy: string;
}) {
  // 1. Check if case already exists for this child + therapist
  // 2. If not, create one
  // 3. Update child clinicStatus to ACTIVE
  // 4. Send notification to therapist
}
```

**Option B: Direct in the assign endpoint**

If event infrastructure isn't in place, put the logic directly in the `POST /api/admin/patients/:childId/assign` endpoint from Feature 02.

### What Gets Auto-Created

```typescript
const newCase = {
  childId: payload.childId,
  therapistId: payload.therapistId,
  title: `${child.firstName} ${child.lastName} — Initial Assessment`,
  status: 'ACTIVE',
  createdBy: payload.assignedBy,  // admin who assigned
  // Copy relevant data from onboarding:
  concerns: child.concerns,       // from parent onboarding
  goals: child.goals,             // from parent onboarding
};
```

### Notifications to Create

| Event | Recipient | Channel | Message |
|-------|-----------|---------|---------|
| New child registered | ADMIN | In-app + email | "New patient intake: [child name], registered by [parent name]" |
| Therapist assigned | THERAPIST | In-app + email | "New case assigned: [child name]. View case →" |
| Therapist assigned | PARENT | In-app + email | "Great news! [therapist name] has been assigned to [child name]'s care." |
| Case auto-created | ADMIN | In-app | "Case created for [child name] with [therapist name]" |

### Edge Cases to Handle

- **Child already has a case with this therapist** → don't create duplicate, show warning
- **Child already has an active case with another therapist** → allow multiple cases (MDT scenario) but confirm with admin
- **Therapist re-assigned** → don't delete old case, create new one if needed
- **Parent adds second child** → each child gets their own intake flow

### Screening Data Carry-Forward

If the child has completed a UFMF screening before being assigned, the case should reference it:

```typescript
// When creating case, check for screening
const latestScreening = await this.screeningService.getLatest(childId);
if (latestScreening) {
  newCase.screeningId = latestScreening.id;
  // Optionally auto-generate initial goals from screening recommendations
}
```

## Files to Modify

```
apps/api/src/
├── modules/admin/
│   └── admin.service.ts          — add assign-therapist logic
├── modules/cases/
│   └── cases.service.ts          — add auto-create-case method
├── modules/notifications/
│   └── notifications.service.ts  — add new notification types
└── events/
    └── patient.events.ts         — define event payloads (if using events)
```

## Testing Script

```bash
# 1. Register a parent + child via web-main
# 2. Check patient directory in web-admin — child should appear as INTAKE
# 3. Assign therapist via admin UI
# 4. Check web-cases as the therapist — case should exist
# 5. Check notifications for both admin and therapist
```

## Success Criteria

- [ ] When admin assigns therapist to a patient, a case is auto-created
- [ ] Child's clinicStatus changes from INTAKE to ACTIVE
- [ ] Case title auto-generates from child name
- [ ] Screening data is linked to the case if available
- [ ] Notification sent to therapist about new case
- [ ] Notification sent to parent about therapist assignment
- [ ] Duplicate case prevention works
- [ ] Therapist can see the new case immediately in web-cases
