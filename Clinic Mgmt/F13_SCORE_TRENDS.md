# F13 — Longitudinal Score Chart
## Screening history trend · Domain breakdown · web-screening enhancement

> **Day 11** · web-screening  
> Prerequisite: At least 2 completed screenings exist for at least one user in the DB.  
> No new Prisma models or API endpoints needed — uses existing screening data.

---

## Context

The current screening report shows a single snapshot. Clinics need to see whether a child is improving over time. This feature adds a longitudinal trend view to web-screening — showing score history across multiple screenings, both overall and by domain. This is also the data that feeds the outcome snapshot in web-admin (Phase 1 F7).

---

## Existing Data to Use

Existing models (do not modify):
- `ScreeningResult` (or equivalent) — has `userId`, `completedAt`, `totalScore`, and domain scores
- Find the exact model name and fields by checking `apps/api/prisma/schema.prisma`

---

## API Endpoint

Add to the existing screening controller/service — no new module needed.

| Method | Route | Guard | Purpose |
|---|---|---|---|
| GET | `/screening/history/:userId` | JWT (own or ADMIN/THERAPIST) | All screening results for a user, ordered by date |

### Response shape
```typescript
{
  userId: string,
  childName: string,
  results: [
    {
      id: string,
      completedAt: string,      // ISO date
      totalScore: number,
      domains: [
        { name: string, score: number, maxScore: number }
      ]
    }
  ]
}
```

Ordered by `completedAt ASC` so the chart renders chronologically.

Access rule: caller must be the patient's parent (`userId === request.user.id`), OR role is `THERAPIST` or `ADMIN`. Otherwise 403.

---

## web-screening UI

### Where it lives
Enhance the existing screening dashboard or report pages — do not create new routes.  
The best placement is either:
- A new **"Progress"** tab on the main screening dashboard
- Or a **"View Progress Over Time"** section below the most recent report

Choose whichever fits the existing page structure better.

### What to build

**Score history chart**  
A line chart with one line per domain + one bolder line for the total score.  
X-axis: screening dates. Y-axis: score (0 to max).  
Use `recharts` `LineChart` if available in the project. If not, request Claude Code to install it (`pnpm --filter @upllyft/web-screening add recharts`).

Chart behaviour:
- Hover tooltip showing date + all domain scores at that point
- Legend showing domain names with matching line colours
- If only 1 screening exists → show a prompt: "Complete another screening to see your progress over time" with the chart hidden

**Score delta callout**  
Between the chart and the raw data, show a simple text line:  
_"Since [first screening date], [child name]'s total score has [improved by X / declined by X / stayed the same]."_

**Domain breakdown table**  
Below the chart: a table with columns Domain | First Score | Latest Score | Change (↑↓ with colour).

### API hook shape
```typescript
useScreeningHistory(userId) → query → ScreeningHistoryResponse
```

---

## Acceptance Criteria

- [ ] Chart renders with correct data points on the date axis
- [ ] Each domain has its own line in a distinct colour
- [ ] Total score line is visually distinct (bolder or dashed)
- [ ] Hovering a data point shows a tooltip with all domain scores
- [ ] Only 1 screening → chart is hidden, prompt to complete another is shown
- [ ] Score delta callout shows correct direction and amount
- [ ] Domain table shows first score, latest score, and change with colour coding (green = better, red = worse)
- [ ] Calling `GET /screening/history/:userId` as a different non-admin user returns 403
- [ ] Chart is responsive and readable on mobile viewport
