# F11 — Revenue Dashboard
## Clinic totals · Per-therapist breakdown · Period filtering

> **Days 6–7** · web-admin  
> Prerequisite: F10 (Invoice model) complete and populated with data.

---

## Context

The clinic director needs a financial overview: how much revenue came in this month, which therapists are most active, and what's outstanding. This is a read-only reporting view in web-admin — no payment processing here.

---

## API Endpoints

Add to `billing.controller.ts` and `billing.service.ts`.

| Method | Route | Guard | Purpose |
|---|---|---|---|
| GET | `/billing/revenue` | JWT + ADMIN | Clinic-wide revenue summary |
| GET | `/billing/revenue/therapist/:id` | JWT + ADMIN | Per-therapist breakdown |

### `GET /billing/revenue` — query params + response

Query params: `period` (`this_month` \| `last_month` \| `this_year`) — default `this_month`

```typescript
// Response shape
{
  period: string,
  totalInvoiced: number,         // sum of all Invoice.amountAED in period
  totalSessions: number,         // count of SIGNED sessions in period
  avgRevenuePerSession: number,
  byTherapist: [
    {
      therapist: { id, name, avatarUrl },
      invoiced: number,
      sessions: number,
    }
  ],
  byWeek: [
    { week: string, amount: number }  // last 8 weeks or 12 months depending on period
  ]
}
```

### `GET /billing/revenue/therapist/:id` — query params + response

Query params: `period` (same options)

```typescript
{
  therapist: { id, name, avatarUrl },
  period: string,
  totalInvoiced: number,
  totalSessions: number,
  invoices: Invoice[]  // paginated, newest first
}
```

---

## web-admin UI — Revenue Dashboard

### Where it lives
`/reports` page in web-admin (replace the placeholder from Phase 1 F2).

### Layout — three sections

**1. Summary strip (top)**
Four stat cards side by side:
- Total Invoiced (AED) this period
- Total Sessions this period
- Avg per Session (AED)
- Outstanding (GENERATED but not PAID) — count + amount

**2. Per-therapist table**
Columns: Therapist name + avatar | Sessions | Revenue (AED) | Avg per session  
Sortable by revenue descending by default.  
Clicking a therapist row → opens a slide-over or navigates to `/reports/therapist/:id` with that therapist's detailed breakdown.

**3. Revenue trend chart**
A simple bar chart or line chart showing revenue per week (this month view) or per month (this year view).  
Use `recharts` if already in the project, otherwise build a simple SVG bar chart — no new dependencies.

**Period filter**
Dropdown at the top right: This Month / Last Month / This Year.  
Changing it re-fetches both API endpoints.

### API hook shape
```typescript
useClinicRevenue(period)             → query → RevenueResponse
useTherapistRevenue(id, period)      → query → TherapistRevenueResponse
```

---

## Acceptance Criteria

- [ ] `/reports` page loads with correct totals for the current month
- [ ] Period filter changes data correctly for all three sections
- [ ] Per-therapist table shows correct session count and revenue per therapist
- [ ] Clicking a therapist shows their breakdown (slide-over or detail page)
- [ ] Revenue trend chart renders with correct bars/points per week or month
- [ ] Outstanding amount shows count of unpaid invoices and their total value
- [ ] All numbers are formatted as AED currency (e.g. AED 1,200.00)
- [ ] Empty state renders gracefully when there are no invoices for the selected period
- [ ] Non-ADMIN users cannot access `/billing/revenue` (returns 403)
