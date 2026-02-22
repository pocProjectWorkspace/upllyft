# 04 — Today's Tracking Board

## Context

Every clinic has a "board" — a live view of what's happening right now. Who's in session, who's waiting, who's done for the day. Think of it like an airport departures board for therapy sessions. This is the page the front desk keeps open all day.

## What to Build

### Tracking Board (`/tracking`)

A real-time (or near-real-time) view of today's clinic operations.

**Layout: Kanban-style columns**

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│   WAITING    │  IN SESSION  │  COMPLETED   │  CANCELLED   │
│              │              │              │              │
│  ┌────────┐  │  ┌────────┐  │  ┌────────┐  │  ┌────────┐  │
│  │ Child A │  │  │ Child C │  │  │ Child E │  │  │ Child G │  │
│  │ 10:00am │  │  │ w/ Dr.X │  │  │ w/ Dr.Y │  │  │ No show │  │
│  │ Dr. X   │  │  │ Started │  │  │ Done at │  │  │         │  │
│  │         │  │  │ 10:05am │  │  │ 11:30am │  │  │         │  │
│  └────────┘  │  └────────┘  │  └────────┘  │  └────────┘  │
│  ┌────────┐  │  ┌────────┐  │  ┌────────┐  │              │
│  │ Child B │  │  │ Child D │  │  │ Child F │  │              │
│  │ 10:30am │  │  │ w/ Dr.Z │  │  │ w/ Dr.X │  │              │
│  └────────┘  │  └────────┘  │  └────────┘  │              │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

### Card Content

Each card represents one appointment for today:

| Field | Source |
|-------|--------|
| Patient (child) name | booking → child |
| Parent name | booking → user |
| Therapist name | booking → therapist |
| Scheduled time | booking.startTime |
| Session type | booking.sessionType (if exists) |
| Status | Waiting / In Session / Completed / Cancelled / No Show |
| Duration | elapsed time for in-session, total for completed |

### Board Interactions

- **Drag & drop** between columns (optional, nice-to-have) OR status change buttons on each card
- **Click card** → expand to show more detail (patient contact, session notes link, etc.)
- **Mark as arrived** → moves from Waiting to ready state
- **Start session** → moves to In Session, starts timer
- **Complete session** → moves to Completed, links to SOAP note (Feature 05)
- **No show / Cancel** → moves to Cancelled with reason

### Summary Bar (Top)

```
Today: Feb 21, 2026  |  Total: 24 appointments  |  Completed: 8  |  In Session: 3  |  Waiting: 6  |  Cancelled: 2  |  Remaining: 5
```

### Auto-Refresh

Poll the API every 30–60 seconds to keep the board current. No need for WebSocket for v1 — polling is fine for a clinic with < 50 appointments/day.

## API Endpoints Needed

```
GET    /api/admin/tracking/today          — all today's appointments with status
PATCH  /api/admin/tracking/:bookingId     — update appointment status
```

### Response Shape

```typescript
interface TrackingAppointment {
  id: string;
  scheduledTime: string;          // ISO datetime
  endTime: string;                // ISO datetime
  status: 'SCHEDULED' | 'WAITING' | 'IN_SESSION' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  actualStartTime?: string;       // when session actually started
  actualEndTime?: string;         // when session actually ended
  child: {
    id: string;
    firstName: string;
    lastName: string;
    age: number;
  };
  parent: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  therapist: {
    id: string;
    firstName: string;
    lastName: string;
  };
  sessionType?: string;
  notes?: string;                 // receptionist notes
}
```

### Data Model Changes

The booking model may need a `trackingStatus` field or the existing booking status can be extended. Check the current booking model first.

```prisma
enum TrackingStatus {
  SCHEDULED
  WAITING
  IN_SESSION
  COMPLETED
  CANCELLED
  NO_SHOW
}
```

## UI Components

```
/tracking page:
├── TrackingSummaryBar    — today's stats
├── TrackingBoard         — kanban container
├── TrackingColumn        — single column (Waiting, In Session, etc.)
├── TrackingCard          — individual appointment card
├── TrackingCardExpanded  — expanded detail view
├── StatusChangeButtons   — quick action buttons per card
└── DateSelector          — view other days (default: today)
```

## Design Notes

- This page should feel alive — use subtle animations for status transitions
- Color code columns: Waiting (amber), In Session (blue), Completed (green), Cancelled (gray)
- Cards should be compact — clinic staff scans dozens at a glance
- The time should be prominent on each card
- Consider a simple sound/visual cue when a new patient arrives (optional)
- Desktop-optimized — this runs on the front desk monitor

## Success Criteria

- [ ] `/tracking` shows today's appointments in kanban columns
- [ ] Cards show patient, therapist, time, and status
- [ ] Status can be changed via buttons (waiting → in session → completed)
- [ ] Summary bar shows accurate counts
- [ ] Auto-refresh updates the board without full page reload
- [ ] Clicking a card shows expanded detail
- [ ] No-show and cancellation flows work
- [ ] Empty state handled (no appointments today)
- [ ] Can navigate to other dates (but defaults to today)
