# F8 — Consent Forms with E-Signature
## DocuSign embedded signing · Status tracking · Consent history

> **Days 1–2** · web-admin + API  
> Prerequisite: Phase 2 Prisma migration complete. DocuSign developer account created with a consent template configured.

---

## Context

Clinic admin sends a consent form to a parent from the patient record in web-admin. The parent signs it in-browser via DocuSign embedded signing — no email required, the signing URL opens directly in their web-main session. When signed, the status updates automatically via a DocuSign webhook.

---

## Prisma Model

```prisma
model ConsentForm {
  id          String        @id @default(cuid())
  patientId   String        // parent User.id
  intakeId    String        // IntakeQueue.id
  envelopeId  String?       @unique
  status      ConsentStatus @default(PENDING)
  sentAt      DateTime?
  signedAt    DateTime?
  documentUrl String?       // Supabase signed PDF URL after completion
  sentBy      String        // admin userId

  patient     User          @relation("PatientConsent", fields:[patientId], references:[id])
  admin       User          @relation("SentConsent",    fields:[sentBy],    references:[id])
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

enum ConsentStatus { PENDING SENT SIGNED DECLINED EXPIRED }
```

---

## Environment Variables Needed

```
# apps/api/.env
DOCUSIGN_INTEGRATION_KEY=
DOCUSIGN_USER_ID=
DOCUSIGN_ACCOUNT_ID=
DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi
DOCUSIGN_PRIVATE_KEY=          # RSA private key, \n-escaped
DOCUSIGN_TEMPLATE_ID=          # ID of your consent template in DocuSign
WEB_MAIN_URL=http://localhost:3000
```

Install: `pnpm --filter @upllyft/api add docusign-esign`

---

## API Module — `apps/api/src/consent/`

Create: `consent.module.ts`, `consent.controller.ts`, `consent.service.ts`  
Register in `app.module.ts`

### Endpoints

| Method | Route | Guard | Purpose |
|---|---|---|---|
| POST | `/consent/send` | JWT + ADMIN | Admin sends envelope to parent |
| GET | `/consent/sign/:consentId` | JWT | Returns embedded signing URL to parent |
| GET | `/consent/patient/:patientId` | JWT + ADMIN or THERAPIST | List consent records for a patient |
| POST | `/consent/webhook` | None (public) | DocuSign status callback |

### `POST /consent/send` — request body
```typescript
{
  patientId: string;    // parent User.id
  intakeId: string;     // IntakeQueue.id
  patientName: string;  // child name (pre-fill template)
  parentName: string;
  parentEmail: string;
}
```
**Logic:** Authenticate with DocuSign JWT Grant → create envelope from template with signer pre-filled → store `ConsentForm` record with `status: SENT`, `envelopeId`, `sentAt`.

### `GET /consent/sign/:consentId` — response
```typescript
{ signingUrl: string }
// OR if already signed:
{ alreadySigned: true }
```
**Logic:** Verify `request.user.id === consentForm.patientId` (throw 403 otherwise) → call DocuSign `createRecipientView` with `returnUrl` pointing to `/consent/complete?consentId=` on web-main.

### `POST /consent/webhook` — DocuSign payload
**Logic:** Extract `envelopeId` + `status` from payload → map `completed → SIGNED`, `declined → DECLINED`, `voided → EXPIRED` → `updateMany` on `ConsentForm` where `envelopeId` matches → set `signedAt` if SIGNED. Always return `{ received: true }`.

### `GET /consent/patient/:patientId`
Return all `ConsentForm` records for the patient, ordered newest first.

---

## web-admin UI

### Where it lives
Add a **Consent** section to the patient detail page (`/patients/[id]`).

### Consent panel — what to build
- Shows current consent status as a coloured badge: `PENDING` (gray) / `SENT` (blue) / `SIGNED` (green) / `DECLINED` (red)
- If status is `PENDING`: show **"Send Consent Form"** button → triggers `POST /consent/send` → updates status badge optimistically
- If status is `SENT`: show sent timestamp + **"Resend"** button
- If status is `SIGNED`: show signed timestamp + download link (if `documentUrl` exists)
- History table of all consent records for this patient

### API hook shape
```typescript
// POST /consent/send
useSendConsent() → mutation

// GET /consent/patient/:patientId
usePatientConsents(patientId) → query → ConsentRecord[]
```

---

## web-main — Parent Signs Consent

### Where it lives
Add `/consent/[consentId]` page to web-main. This is where the parent lands when the admin sends them the link (or the admin can copy and share it).

### Page logic
1. Call `GET /api/consent/sign/:consentId` to get the signing URL
2. If `alreadySigned: true` → show a "You've already signed" confirmation screen
3. Otherwise → redirect the browser to `signingUrl` (DocuSign hosted page)
4. DocuSign redirects back to `/consent/complete?consentId=` after signing

### `/consent/complete` page
Show a success screen: "Thank you — your consent form has been signed." with a link back to the dashboard. No API call needed here — the webhook handles the status update.

---

## Acceptance Criteria

- [ ] Admin can click "Send Consent Form" on a patient record and status changes to SENT
- [ ] Calling `GET /consent/sign/:consentId` as the correct parent returns a valid DocuSign URL
- [ ] Calling it as a different user returns 403
- [ ] Calling it on an already-signed form returns `{ alreadySigned: true }`
- [ ] DocuSign webhook updates status to SIGNED and sets `signedAt`
- [ ] Patient detail page shows correct consent status badge
- [ ] Consent history table renders all records for the patient
- [ ] `/consent/[consentId]` page on web-main loads and redirects to DocuSign
- [ ] `/consent/complete` page shows success message after redirect back
