# Upllyft PDPL Compliance Checklist

**Last reviewed:** 2026-02-21
**Reviewed by:** Engineering Team
**UAE Personal Data Protection Law:** Federal Decree-Law No. 45 of 2021

## Status: IN PROGRESS

---

## Section 1 -- Consent Before Data Collection

| Item | Status | Notes |
|------|--------|-------|
| Consent guard on session creation | DONE | `case-sessions.service.ts` checks for a `ConsentForm` with `status: SIGNED` before allowing `createSession()`. If no signed consent exists, a `ForbiddenException` is thrown. |
| Onboarding ToS/privacy agreement | DONE | Onboarding step 1 (`apps/web-main/src/app/onboarding/page.tsx`) collects explicit agreement to Terms of Service and Privacy Policy before proceeding. |
| Consent form template names data types | PENDING | The DocuSign template should explicitly list: screening results, session notes, communications, AI-generated insights. Requires coordination with legal to update the DocuSign template. |

---

## Section 2 -- Data Fields Audit

| Item | Status | Notes |
|------|--------|-------|
| Unused Prisma fields removed | REVIEWED | All fields in the schema are actively used. The `Child` model is comprehensive (50+ fields) but each field maps to onboarding/intake form inputs. No orphan fields identified. |
| SOAP notes encrypted at rest | PHASE 3 | `CaseSession.rawNotes`, `structuredNotes`, and `aiSummary` are stored as plaintext in PostgreSQL. Column-level encryption or Supabase Vault integration is deferred to Phase 3. |
| Message.body not logged | PASS | No API request logs write `Message.body` content. Verified by grep of the entire API codebase. |
| No PII in console logs | DONE | Removed 5 instances of PII leaking via `console.log`: phone/email in `whatsapp.service.ts`, full `req.user` objects in `posts.controller.ts` and `comments.controller.ts`. The `AppLoggerService` PII masker handles all `this.logger.*` calls. |

---

## Section 3 -- Right to Access + Deletion

| Item | Status | Notes |
|------|--------|-------|
| `GET /admin/users/:id/data-export` | DONE | Returns a JSON bundle containing: user profile, children, assessments, session notes, messages, invoices, consent records, and Mira conversations. Admin-only endpoint. |
| `DELETE /admin/users/:id/data` | DONE | Anonymises PII (replaces with `[deleted]`), nullifies sensitive fields, anonymises child records and message bodies. Retains aggregate/structural data for clinical audit trail. Admin-only endpoint. |

### Deletion Request Process

1. Parent submits a data deletion request via email or in-app support.
2. The **Data Protection Officer** (see Section 7) verifies the identity of the requester.
3. Admin executes `DELETE /admin/users/:id/data` via the admin panel.
4. The system anonymises all PII and soft-deletes the account.
5. Clinical session records are retained in anonymised form for 7 years per UAE medical records retention standards.
6. A confirmation email is sent to the (now-deleted) email address before anonymisation.
7. The action is recorded in the `AuditLog` table with the admin's user ID and timestamp.

---

## Section 4 -- Audit Logging

| Item | Status | Notes |
|------|--------|-------|
| `AuditLog` model | DONE | New Prisma model: `{ userId, resourceType, resourceId, action, metadata, timestamp }`. Stored in `audit_logs` table. |
| Session access logged | DONE | `CaseSessionsService.getSession()` writes an audit record when a session is viewed. |
| ConsentForm access logged | DONE | `ConsentService.getSigningUrl()` writes an audit record when a consent form is accessed. |
| Data export/deletion logged | DONE | Both `exportUserData` and `deleteUserData` admin endpoints write audit records. |
| Admin UI behind HTTPS | PASS | Vercel enforces HTTPS for all deployments. The web-admin app at `adminsafehaven-upllyft` is served over HTTPS with automatic certificate management. |

---

## Section 5 -- Cross-Border Data Transfer

| Service | Data Sent | Hosting Region | Transfer Mechanism |
|---------|-----------|----------------|-------------------|
| **Supabase** (PostgreSQL + Storage) | All platform data | To be confirmed -- must verify region in Supabase dashboard | If US-hosted: Standard Contractual Clauses (SCCs) required |
| **OpenAI API** | Mira chat context, session note drafts (anonymised) | US-based | Child names replaced with "the child" before sending. Medical conditions and developmental data are sent for clinical AI features. Data processing agreement (DPA) with OpenAI required. |
| **Stripe** | Payment data (card tokens, amounts) | US-based | Minimal PII (email for receipts). Stripe is PCI-DSS compliant. Standard Contractual Clauses apply. |
| **DocuSign** | Parent name, email, child name (for consent forms) | US-based | Required for e-signature workflow. DPA with DocuSign required. |
| **Firebase Cloud Messaging** | Device tokens, notification titles | US-based (Google Cloud) | No sensitive data in notification payloads. |
| **MailerSend / SendGrid** | Email addresses, notification content | US/EU-based | Transactional emails only. No health data in email bodies. |

### Disclosure

This information must be added to the platform's Privacy Policy, accessible at `upllyft.com/privacy`. The policy must disclose:
- Which third-party services receive user data
- The purpose of each data transfer
- The legal basis (consent + legitimate interest for clinical services)
- The safeguards in place (DPAs, SCCs, anonymisation)

---

## Section 6 -- Retention Policy

| Data Type | Retention Period | Enforcement |
|-----------|-----------------|-------------|
| Active accounts | Indefinite | No action required |
| Closed accounts -- clinical records | 7 years from closure | UAE medical records retention standard. Records kept in anonymised form. |
| Closed accounts -- PII | Anonymised after 90 days | `RetentionService` cron job runs daily at midnight. Currently in dry-run mode (logs only). |
| Messages (parent-therapist) | 3 years | After 3 years, messages are eligible for archival/deletion. |
| Mira conversation history | 3 years | After 3 years, conversation content is eligible for archival/deletion. |
| Audit logs | 10 years | Required for compliance evidence. Never deleted. |

### Implementation

The `RetentionService` (`apps/api/src/retention/retention.service.ts`) runs a daily cron job that:
1. Identifies soft-deleted users past the 90-day PII retention window
2. Counts messages older than 3 years
3. Counts Mira messages older than 3 years
4. Logs what would be deleted (dry-run mode)

To enable actual enforcement, set `RETENTION_DRY_RUN=false` in the environment after legal review.

---

## Section 7 -- Breach Response Process

### Steps to Follow if a Data Breach is Detected

1. **Identify scope**: Determine which users are affected, what data was exposed, and the nature of the breach (unauthorized access, data loss, etc.).
2. **Contain the breach**: Revoke compromised credentials, disable affected endpoints, and preserve forensic evidence (logs, access records).
3. **Notify the UAE National Cybersecurity Council** within 72 hours of discovery, including:
   - Nature of the breach
   - Categories of data affected
   - Approximate number of affected users
   - Measures taken to mitigate
4. **Notify affected users** via email and in-app notification, explaining:
   - What data was compromised
   - What the platform is doing about it
   - Recommended actions (password change, etc.)
5. **Preserve logs**: Ensure all `AuditLog` entries and server logs for the affected period are archived and tamper-protected.
6. **Post-incident review**: Conduct a root-cause analysis within 14 days and implement preventive measures.

### Responsible Role

**Data Protection Officer (DPO)** -- to be appointed before go-live. This should be:
- A named role (not a specific person) within the organization
- Responsible for: breach response coordination, regulatory notification, user communication, and compliance monitoring
- Contact: `dpo@upllyft.com` (to be configured)

Until a formal DPO is appointed, the **CTO** or **Head of Engineering** acts as interim DPO.

---

## Accepted Risks

| Risk | Justification | Target Remediation Date |
|------|---------------|------------------------|
| SOAP notes not encrypted at rest | PostgreSQL is hosted on Supabase with encryption at rest at the infrastructure level (AES-256). Column-level encryption adds complexity with minimal incremental security benefit at current scale. | Phase 3 (Q3 2026) |
| Supabase region not confirmed | Need to verify if Supabase project is in EU/UAE region. If US, need SCCs. | Before go-live |
| No formal DPO appointed | Interim DPO is CTO. Formal appointment required before handling real patient data. | Before go-live |
| DocuSign template does not enumerate data types | Template needs legal review to explicitly name all data categories collected. | Before go-live |
| OpenAI DPA not signed | Need a Data Processing Agreement with OpenAI for processing health-related context. | Before go-live |
| Retention cron in dry-run mode | Needs legal sign-off before enabling actual data deletion. | Q2 2026 |
| Consent form not checked on session update | Only `createSession` checks for signed consent. Updates to existing sessions do not re-verify consent status. | Q2 2026 |

---

## Phase 3 Items

| Item | Description | Priority |
|------|-------------|----------|
| Column-level encryption | Encrypt `CaseSession.rawNotes`, `structuredNotes`, `aiSummary`, and `Message.body` at the application layer using AES-256-GCM. | High |
| Formal DPO appointment | Appoint a Data Protection Officer per PDPL requirements. | Critical (pre-go-live) |
| Privacy policy update | Add cross-border data transfer disclosures to the public privacy policy. | Critical (pre-go-live) |
| Consent granularity | Extend `ConsentForm` to track consent per data type (screening, sessions, communications, AI processing) rather than a single blanket consent. | Medium |
| Data portability format | Extend `/data-export` to support standardized formats (JSON-LD, CSV) for true data portability. | Low |
| Automated breach detection | Implement anomaly detection on `AuditLog` access patterns to flag potential breaches. | Medium |
| Retention enforcement | Enable actual data deletion in `RetentionService` after legal review. | High |
