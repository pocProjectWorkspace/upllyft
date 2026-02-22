# F9 — Therapist Credential Upload
## Licence documents · Supabase storage · Signed download URLs

> **Day 3** · web-admin + API  
> Prerequisite: Phase 2 Prisma migration complete. Supabase `credentials` bucket created (private, not public).

---

## Context

Clinics are legally required to verify that therapists hold valid licences before they practise. This feature lets an admin upload credential documents (PDF or image) against a therapist profile, and view/download them later via a time-limited signed URL. No document is ever publicly accessible.

---

## Prisma Model

```prisma
model Credential {
  id           String   @id @default(cuid())
  therapistId  String
  label        String   // e.g. "HAAD Licence", "DHA Registration", "University Certificate"
  fileUrl      String   // Supabase storage path (not public URL)
  mimeType     String
  expiresAt    DateTime?
  uploadedBy   String   // admin userId
  createdAt    DateTime @default(now())

  therapist    User     @relation("TherapistCredentials", fields:[therapistId], references:[id])
  uploadedByUser User   @relation("UploadedCredentials", fields:[uploadedBy], references:[id])
}
```

---

## API Endpoints

Add to the existing `admin.controller.ts` and `admin.service.ts` (no new module needed).

| Method | Route | Purpose |
|---|---|---|
| POST | `/admin/therapists/:id/credentials` | Upload credential — multipart/form-data |
| GET | `/admin/therapists/:id/credentials` | List credentials for a therapist |
| GET | `/admin/therapists/:id/credentials/:credId/download` | Get a signed download URL (expires 15 min) |
| DELETE | `/admin/therapists/:id/credentials/:credId` | Delete credential |

### `POST /admin/therapists/:id/credentials`
- Accept `multipart/form-data` with fields: `file` (binary), `label` (string), `expiresAt` (optional ISO date)
- Use `@nestjs/platform-fastify` multipart handling or `multer` depending on how the API is set up
- Upload file to Supabase bucket `credentials` at path `/{therapistId}/{timestamp}-{filename}`
- Store the Supabase storage path (not the public URL) in `Credential.fileUrl`
- Return the created `Credential` record (without a download URL — generate that separately on demand)

### `GET /admin/therapists/:id/credentials/:credId/download`
- Fetch `Credential` by `credId`, verify `therapistId` matches route param
- Generate a Supabase signed URL for the file path, expiring in 15 minutes
- Return `{ url: string, expiresIn: 900 }`

### `DELETE /admin/therapists/:id/credentials/:credId`
- Delete from Supabase storage
- Delete `Credential` record

---

## web-admin UI

### Where it lives
Add a **Credentials** tab to the therapist detail page (`/therapists/[id]`).

### What to build
- Table of existing credentials: label, uploaded date, expiry date (if set), download button, delete button
- **Upload credential** button → opens a modal with:
  - File picker (accept: `.pdf,.jpg,.jpeg,.png`)
  - Label input (text field, required)
  - Expiry date picker (optional)
  - Upload button — POST multipart to API
- Download button → calls `GET .../download` → opens signed URL in new tab
- If `expiresAt` is set and in the past → show an "Expired" red badge on that row

### File upload pattern
Use the browser `FormData` API. Do not base64 encode. Send as `multipart/form-data`.

```
FormData:
  file: File object
  label: string
  expiresAt?: string (ISO)
```

Use `axios` (already in `@upllyft/api-client`) with `Content-Type: multipart/form-data` header.

### API hook shape
```typescript
useTherapistCredentials(therapistId) → query → Credential[]
useUploadCredential()               → mutation (FormData)
useDeleteCredential()               → mutation
useGetDownloadUrl(credId)           → lazy query (only fires on button click)
```

---

## Acceptance Criteria

- [ ] Admin can upload a PDF or image file with a label against a therapist
- [ ] File appears in the credentials table with label, date, and expiry
- [ ] Clicking "Download" opens the file in a new tab via a signed URL
- [ ] Signed URL expires after 15 minutes (test by waiting or shortening in dev)
- [ ] Expired credentials show a red "Expired" badge
- [ ] Deleting a credential removes it from Supabase storage and the table
- [ ] Upload modal resets and closes after a successful upload
- [ ] Uploading a file > 10MB shows a validation error (enforce client-side)
- [ ] Only PDF, JPG, PNG file types are accepted (enforce client-side + server-side mime check)
