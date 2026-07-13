-- Multi-setting tenancy — Phase E: consent generalised from Case to CHILD + FACILITY.
-- Idempotent. ADDITIVE — `case_consents` remains until its readers migrate.
--
-- CaseConsent already had the right shape (versioned, guardian-granted,
-- purpose-bound, revocable) — it was merely keyed to a Case, which a nursery will
-- never have: a nursery observes an enrolled child, it does not open cases.
--
-- The grant now reads: this guardian permits THIS FACILITY to do THIS, for THIS
-- purpose, until THIS date, revocably. That is what makes consent an access GATE
-- rather than a stored form.

-- ── consent_templates.facilityId ───────────────────────────────────────────
-- A nursery needs its own consent pack, collected in bulk at enrolment rather
-- than per-case like a clinic's.
ALTER TABLE "consent_templates" ADD COLUMN IF NOT EXISTS "facilityId" TEXT;
CREATE INDEX IF NOT EXISTS "consent_templates_facilityId_idx" ON "consent_templates"("facilityId");

DO $$ BEGIN
  ALTER TABLE "consent_templates" ADD CONSTRAINT "consent_templates_facilityId_fkey"
    FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── child_consents ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "child_consents" (
  "id" TEXT NOT NULL,
  "childId" TEXT NOT NULL,
  "guardianId" TEXT,
  "grantedById" TEXT NOT NULL,
  "facilityId" TEXT,
  "affiliationId" TEXT,
  "caseId" TEXT,
  "type" "ConsentType" NOT NULL,
  "purpose" TEXT,
  "recipient" TEXT,
  "scope" JSONB,
  "consentVersionId" TEXT,
  "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "notes" TEXT,
  "migratedFromCaseConsentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "child_consents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "child_consents_migratedFromCaseConsentId_key" ON "child_consents"("migratedFromCaseConsentId");
CREATE INDEX IF NOT EXISTS "child_consents_childId_type_idx" ON "child_consents"("childId","type");
CREATE INDEX IF NOT EXISTS "child_consents_facilityId_idx" ON "child_consents"("facilityId");
CREATE INDEX IF NOT EXISTS "child_consents_affiliationId_idx" ON "child_consents"("affiliationId");
CREATE INDEX IF NOT EXISTS "child_consents_guardianId_idx" ON "child_consents"("guardianId");

DO $$ BEGIN
  ALTER TABLE "child_consents" ADD CONSTRAINT "child_consents_childId_fkey"
    FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "child_consents" ADD CONSTRAINT "child_consents_guardianId_fkey"
    FOREIGN KEY ("guardianId") REFERENCES "guardians"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "child_consents" ADD CONSTRAINT "child_consents_grantedById_fkey"
    FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "child_consents" ADD CONSTRAINT "child_consents_facilityId_fkey"
    FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "child_consents" ADD CONSTRAINT "child_consents_affiliationId_fkey"
    FOREIGN KEY ("affiliationId") REFERENCES "child_affiliations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "child_consents" ADD CONSTRAINT "child_consents_consentVersionId_fkey"
    FOREIGN KEY ("consentVersionId") REFERENCES "consent_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
