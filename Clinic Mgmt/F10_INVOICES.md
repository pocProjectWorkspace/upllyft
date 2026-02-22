# F10 — Invoice UI Per Session
## Auto-create on sign · Parent invoice view · Stripe receipt link

> **Days 4–5** · web-booking (parent view) + API billing module  
> Prerequisite: Phase 2 Prisma migration complete. Phase 1 F6 (SOAP notes + sign endpoint) complete.

---

## Context

When a therapist signs a session note, an invoice is automatically generated for that session. Parents see their invoice history in web-booking. This is not a new payment flow — payment already happened via Stripe at booking time. This is the clinical billing record that gives the clinic a paper trail and gives parents a receipt they can submit to insurance.

---

## Prisma Model

```prisma
model Invoice {
  id            String        @id @default(cuid())
  sessionId     String        @unique
  bookingId     String?
  patientId     String        // parent User.id
  therapistId   String
  clinicName    String        @default("Upllyft Clinic")
  amountAED     Float
  status        InvoiceStatus @default(GENERATED)
  stripePaymentId String?     // from the original Booking, if available
  issuedAt      DateTime      @default(now())
  dueDate       DateTime?
  paidAt        DateTime?
  notes         String?

  session       Session       @relation(fields:[sessionId], references:[id])
  patient       User          @relation("PatientInvoices",   fields:[patientId],   references:[id])
  therapist     User          @relation("TherapistInvoices", fields:[therapistId], references:[id])
  createdAt     DateTime      @default(now())
}

enum InvoiceStatus { GENERATED SENT PAID VOID }
```

---

## API Module — `apps/api/src/billing/`

Create: `billing.module.ts`, `billing.controller.ts`, `billing.service.ts`  
Register in `app.module.ts`

### Endpoints

| Method | Route | Guard | Purpose |
|---|---|---|---|
| GET | `/billing/invoices/session/:sessionId` | JWT + THERAPIST or ADMIN | Get invoice for a session |
| GET | `/billing/invoices/patient/:patientId` | JWT (own) or ADMIN | Parent's invoice history |
| GET | `/billing/invoices/:id/pdf` | JWT (own) or ADMIN | Generate + return invoice PDF |

### Auto-creation trigger

**Modify `charting.service.ts` `signSession()` method** — after setting status to SIGNED, emit an internal event:

```typescript
this.eventEmitter.emit('session.signed', {
  sessionId: session.id,
  patientId: session.patientId,
  therapistId: session.therapistId,
  bookingId: session.bookingId,
});
```

**In `billing.service.ts`**, add an `@OnEvent('session.signed')` listener:
- Look up the Booking to get the amount paid
- Create an `Invoice` record with `status: GENERATED`
- If a parent email is available, optionally send a MailerSend notification ("Your invoice is ready")

### `GET /billing/invoices/patient/:patientId`
- Verify `request.user.id === patientId` OR role is ADMIN (throw 403 otherwise)
- Return all invoices ordered by `issuedAt` DESC
- Include: `id, issuedAt, amountAED, status, session.date, therapist.name`

### `GET /billing/invoices/:id/pdf`
- Generate a simple PDF using `pdfkit` or `puppeteer`
- Contents: clinic name, child name, therapist name, session date and duration, amount, invoice number, payment reference
- Return as `application/pdf` with `Content-Disposition: attachment`

Install if needed: `pnpm --filter @upllyft/api add pdfkit` (lighter than puppeteer for simple invoices)

---

## web-booking UI — Parent Invoice View

### Where it lives
Add an **Invoices** tab (or section) to the parent's booking area in web-booking. Route: `/invoices`

### What to build

**Invoice list page** (`/invoices`):
- Table of invoices: session date, therapist name, amount (AED), status badge, download button
- Status colours: GENERATED → blue, PAID → green, VOID → gray
- Empty state if no invoices

**Download button**:
- Calls `GET /api/billing/invoices/:id/pdf`
- Opens PDF in a new browser tab

**Invoice detail** (optional for Phase 2 — can skip):
- A readable breakdown of the invoice fields

### API hook shape
```typescript
useMyInvoices()           → query → Invoice[]
useDownloadInvoicePdf(id) → lazy (fires on button click, opens blob URL)
```

---

## Acceptance Criteria

- [ ] Signing a SOAP session note automatically creates an Invoice record
- [ ] Invoice is linked to the correct session, patient, and therapist
- [ ] Invoice amount is pulled from the original Booking amount
- [ ] Parent can view their invoice list in web-booking at `/invoices`
- [ ] Invoice list shows session date, therapist, amount, status
- [ ] Download button fetches and opens the invoice PDF
- [ ] PDF contains: clinic name, child name, therapist name, session date, amount, invoice number
- [ ] Calling `GET /billing/invoices/patient/:id` as a different user returns 403
- [ ] Empty state renders when a parent has no invoices yet
