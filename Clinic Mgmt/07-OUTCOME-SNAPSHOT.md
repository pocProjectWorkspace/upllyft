# 07 — Outcome Snapshot Dashboard

## Context

This is the "wow" page in the clinic pitch. A clinic director wants to see: _are the children getting better?_ This page pulls together screening scores, goal progress from sessions, and milestone completions into a single outcome view — per patient and across the clinic.

This lives in **web-admin** (`/outcomes`) but also has a per-patient version accessible from the Patient Detail page (Feature 02).

## What to Build

### Clinic-Wide Outcomes (`/outcomes`)

A dashboard showing aggregate outcomes across all active patients.

**Summary Cards (top row):**

| Card | Data |
|------|------|
| Active Patients | Count of children with clinicStatus = ACTIVE |
| Total Sessions This Month | Count from sessions table |
| Goals Progressing | % of goals rated "Progressing" or "Achieved" in latest session |
| Average Screening Improvement | % change in screening scores from first to latest screening |

**Section 1: Goal Progress Overview**

A visual breakdown of all goal progress ratings across the clinic:

```
Achieved:    ████████░░░░░░░░░░░░  18%
Progressing: ████████████████░░░░  42%
Maintaining: ████████████░░░░░░░░  28%
Regression:  ████░░░░░░░░░░░░░░░░  12%
```

Data source: `goalProgress` field from Session notes (Feature 05).

**Section 2: Screening Score Trends**

For children with multiple screenings, show improvement trends by domain:

- Bar chart: Average domain scores (first screening vs latest screening)
- Highlight domains with most improvement
- Domains: Motor, Communication, Social, Cognitive, Self-Help, etc. (from developmental screening)

**Section 3: Patient Outcome Table**

| Patient | Age | Therapist | Sessions | Goals (P/M/R) | Screening Δ | Last Session |
|---------|-----|-----------|----------|----------------|-------------|--------------|
| Child A | 4   | Dr. X     | 12       | 3/1/0          | +15%        | Feb 20       |
| Child B | 6   | Dr. Y     | 8        | 2/2/1          | +8%         | Feb 19       |

- P/M/R = Progressing / Maintaining / Regression counts
- Screening Δ = overall score change from first to latest
- Sortable by any column
- Click patient → goes to patient detail (Feature 02)

### Per-Patient Outcome View (embedded in Patient Detail)

A section within `/patients/[id]` showing:

**Goal Progress Timeline:**
- Each goal as a row
- Columns = sessions (chronological)
- Cell color = progress rating at that session
- Visual: heatmap-style grid showing progress over time

```
Goal                    | S1  | S2  | S3  | S4  | S5  |
Fine motor control      | 🟡  | 🟡  | 🟢  | 🟢  | 🟢  |
Social interaction      | 🔴  | 🟡  | 🟡  | 🟢  | 🟢  |
Verbal communication    | 🟡  | 🟡  | 🟡  | 🟡  | 🟢  |

🔴 Regression  🟡 Maintaining  🟢 Progressing  ⭐ Achieved
```

**Screening Score Chart:**
- Line chart showing screening domain scores over time (if multiple screenings)
- Each domain as a separate line
- X-axis = screening dates, Y-axis = score

**Milestone Timeline:**
- Chronological list of milestones achieved from web-cases
- Shows date achieved and which goal it relates to

## API Endpoints Needed

```
GET /api/admin/outcomes/summary           — clinic-wide summary stats
GET /api/admin/outcomes/goals             — aggregate goal progress data
GET /api/admin/outcomes/screening-trends  — aggregate screening trends
GET /api/admin/outcomes/patients          — patient outcome table (paginated)
GET /api/admin/outcomes/patient/:childId  — single patient outcome detail
```

### Response Shape (clinic summary)

```typescript
interface ClinicOutcomeSummary {
  activePatients: number;
  sessionsThisMonth: number;
  goalProgress: {
    achieved: number;
    progressing: number;
    maintaining: number;
    regression: number;
    total: number;
  };
  averageScreeningImprovement: number; // percentage
}
```

### Response Shape (patient outcome)

```typescript
interface PatientOutcome {
  child: { id: string; name: string; age: number };
  therapist: { id: string; name: string };
  sessionCount: number;
  goalBreakdown: { progressing: number; maintaining: number; regression: number; achieved: number };
  screeningDelta: number | null;  // null if only one screening
  lastSessionDate: string;
  goalTimeline: Array<{
    goalId: string;
    goalTitle: string;
    ratings: Array<{ sessionId: string; sessionDate: string; rating: string }>;
  }>;
  screeningScores: Array<{
    date: string;
    domains: Record<string, number>;  // { motor: 85, communication: 72, ... }
  }>;
  milestones: Array<{
    id: string;
    title: string;
    achievedAt: string;
    goalId?: string;
  }>;
}
```

## UI Components

```
/outcomes page:
├── OutcomeSummaryCards    — top row stat cards
├── GoalProgressChart     — horizontal bar chart of goal ratings
├── ScreeningTrendsChart  — bar chart: first vs latest scores by domain
├── PatientOutcomeTable   — sortable table with all patients
└── OutcomeFilters        — filter by therapist, date range

Patient detail (embedded):
├── GoalProgressHeatmap   — sessions × goals color grid
├── ScreeningLineChart    — domain scores over time
└── MilestoneTimeline     — chronological achievement list
```

## Design Notes

- This is the page you show the clinic director — make it polished
- Use charts from recharts (already available in the monorepo)
- Summary cards should use large, clear numbers with subtle trend indicators (↑ 12%)
- The goal progress bar chart should be the visual centerpiece
- The patient table should feel like a leaderboard — clinics love seeing measurable improvement
- Color coding: green (progressing/achieved), amber (maintaining), red (regression)
- The heatmap on the patient detail is powerful — it tells a story at a glance
- Consider a "Print Report" button that generates a clean PDF (Phase 2 full impl, but layout should be print-ready)

## Dependencies

This feature depends on:
- **Feature 02** (Patient Directory) — for patient data and detail page
- **Feature 05** (SOAP Notes) — for `goalProgress` data from sessions
- **web-screening** — for developmental screening scores
- **web-cases** — for milestones and goal data

Without session notes (Feature 05) the goal progress sections will be empty. That's fine — the screening trends and milestone data still have value, and the goal progress will populate as therapists start using SOAP notes.

## Success Criteria

- [ ] `/outcomes` shows clinic-wide summary cards with correct counts
- [ ] Goal progress aggregate chart renders with correct data
- [ ] Screening trends chart shows first vs latest comparison
- [ ] Patient outcome table is sortable and clickable
- [ ] Per-patient outcome section renders on patient detail page
- [ ] Goal progress heatmap works (even if sparse data)
- [ ] Screening line chart renders for patients with multiple screenings
- [ ] Milestone timeline shows chronological achievements
- [ ] Empty states handled gracefully (no sessions yet, one screening only, etc.)
- [ ] Charts use recharts and follow the design system colors
