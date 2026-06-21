-- UAE Clinic Management — Phase 0
-- Licence authority context, facility compliance gating, and professional clinical scope.
-- Hand-written migration (pgvector shadow-DB caveat — see CLAUDE.md). Idempotent.

-- ── Enums ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "LicenseAuthority" AS ENUM ('DHA', 'DOH', 'MOHAP', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "Emirate" AS ENUM ('ABU_DHABI', 'DUBAI', 'SHARJAH', 'AJMAN', 'UMM_AL_QUWAIN', 'RAS_AL_KHAIMAH', 'FUJAIRAH');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "FacilityComplianceStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'ACTIVE', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Clinic: regulatory context + EHR integration pointers ───────────────────
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "licenseAuthority" "LicenseAuthority";
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "emirate" "Emirate";
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "complianceStatus" "FacilityComplianceStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "complianceReviewedAt" TIMESTAMP(3);
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "complianceReviewedBy" TEXT;
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "ehrSystemName" TEXT;
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "nabidhFacilityCode" TEXT;

-- Backfill: grandfather existing clinics to ACTIVE so the new compliance gate
-- does not disrupt live facilities (design decision). New clinics default DRAFT.
UPDATE "clinics" SET "complianceStatus" = 'ACTIVE' WHERE "complianceStatus" = 'DRAFT';

-- ── TherapistProfile: authority + clinical scope ────────────────────────────
ALTER TABLE "therapist_profiles" ADD COLUMN IF NOT EXISTS "licenseAuthority" "LicenseAuthority";
ALTER TABLE "therapist_profiles" ADD COLUMN IF NOT EXISTS "canDiagnose" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "therapist_profiles" ADD COLUMN IF NOT EXISTS "scopeOfPractice" TEXT[] DEFAULT ARRAY[]::TEXT[];
