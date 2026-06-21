-- UAE Clinic Management — Phase 1
-- Identity, guardian, versioned/actionable consent, pre-visit tasks. Idempotent.

-- ── Enums ──────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE "IdentityDocType" AS ENUM ('EMIRATES_ID','PASSPORT','BIRTH_CERTIFICATE','OTHER'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "GuardianRelationship" AS ENUM ('MOTHER','FATHER','LEGAL_GUARDIAN','GRANDPARENT','SIBLING','OTHER'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "GuardianAccessLevel" AS ENUM ('FULL','LIMITED','VIEW_ONLY','NONE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "PreVisitTaskType" AS ENUM ('INTAKE_FORM','CONSENT','IDENTITY','DOCUMENT','PAYMENT','PREAUTH','QUESTIONNAIRE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "PreVisitTaskStatus" AS ENUM ('PENDING','IN_PROGRESS','COMPLETE','WAIVED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Extend ConsentType (add new values; safe/idempotent)
ALTER TYPE "ConsentType" ADD VALUE IF NOT EXISTS 'TELEHEALTH';
ALTER TYPE "ConsentType" ADD VALUE IF NOT EXISTS 'REPORT_SHARING';
ALTER TYPE "ConsentType" ADD VALUE IF NOT EXISTS 'COMMUNICATION';
ALTER TYPE "ConsentType" ADD VALUE IF NOT EXISTS 'DATA_PROCESSING';

-- ── Child: identity fields (emiratesId/passportNumber stored ENCRYPTED at app layer) ──
ALTER TABLE "children" ADD COLUMN IF NOT EXISTS "emiratesId" TEXT;
ALTER TABLE "children" ADD COLUMN IF NOT EXISTS "emiratesIdExpiry" TIMESTAMP(3);
ALTER TABLE "children" ADD COLUMN IF NOT EXISTS "passportNumber" TEXT;
ALTER TABLE "children" ADD COLUMN IF NOT EXISTS "identityType" "IdentityDocType";
ALTER TABLE "children" ADD COLUMN IF NOT EXISTS "identityVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "children" ADD COLUMN IF NOT EXISTS "identityVerifiedAt" TIMESTAMP(3);
ALTER TABLE "children" ADD COLUMN IF NOT EXISTS "identityVerifiedBy" TEXT;

-- ── CaseConsent: actionable, versioned consent ──
ALTER TABLE "case_consents" ADD COLUMN IF NOT EXISTS "consentVersionId" TEXT;
ALTER TABLE "case_consents" ADD COLUMN IF NOT EXISTS "purpose" TEXT;
ALTER TABLE "case_consents" ADD COLUMN IF NOT EXISTS "recipient" TEXT;
ALTER TABLE "case_consents" ADD COLUMN IF NOT EXISTS "scope" JSONB;
ALTER TABLE "case_consents" ADD COLUMN IF NOT EXISTS "grantedByGuardianId" TEXT;
ALTER TABLE "case_consents" ADD COLUMN IF NOT EXISTS "consentFormId" TEXT;

-- ── New tables ──
CREATE TABLE IF NOT EXISTS "patient_identity_documents" (
  "id" TEXT NOT NULL,
  "childId" TEXT NOT NULL,
  "type" "IdentityDocType" NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "patient_identity_documents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "patient_identity_documents_childId_idx" ON "patient_identity_documents"("childId");

CREATE TABLE IF NOT EXISTS "guardians" (
  "id" TEXT NOT NULL,
  "childId" TEXT NOT NULL,
  "userId" TEXT,
  "fullName" TEXT NOT NULL,
  "relationship" "GuardianRelationship" NOT NULL,
  "hasAuthorityToConsent" BOOLEAN NOT NULL DEFAULT false,
  "isPrimaryContact" BOOLEAN NOT NULL DEFAULT false,
  "isEmergencyContact" BOOLEAN NOT NULL DEFAULT false,
  "phone" TEXT,
  "email" TEXT,
  "accessLevel" "GuardianAccessLevel" NOT NULL DEFAULT 'VIEW_ONLY',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "guardians_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "guardians_childId_idx" ON "guardians"("childId");

CREATE TABLE IF NOT EXISTS "consent_templates" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT,
  "type" "ConsentType" NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "consent_templates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "consent_templates_clinicId_idx" ON "consent_templates"("clinicId");
CREATE INDEX IF NOT EXISTS "consent_templates_type_idx" ON "consent_templates"("type");

CREATE TABLE IF NOT EXISTS "consent_versions" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "purpose" TEXT NOT NULL,
  "bodyUrl" TEXT,
  "bodyHash" TEXT,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "consent_versions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "consent_versions_templateId_version_key" ON "consent_versions"("templateId","version");

CREATE TABLE IF NOT EXISTS "pre_visit_tasks" (
  "id" TEXT NOT NULL,
  "childId" TEXT NOT NULL,
  "caseId" TEXT,
  "bookingId" TEXT,
  "type" "PreVisitTaskType" NOT NULL,
  "status" "PreVisitTaskStatus" NOT NULL DEFAULT 'PENDING',
  "label" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pre_visit_tasks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "pre_visit_tasks_childId_idx" ON "pre_visit_tasks"("childId");
CREATE INDEX IF NOT EXISTS "pre_visit_tasks_status_idx" ON "pre_visit_tasks"("status");

-- ── Foreign keys (guarded) ──
DO $$ BEGIN ALTER TABLE "patient_identity_documents" ADD CONSTRAINT "patient_identity_documents_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "patient_identity_documents" ADD CONSTRAINT "patient_identity_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "guardians" ADD CONSTRAINT "guardians_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "guardians" ADD CONSTRAINT "guardians_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "consent_templates" ADD CONSTRAINT "consent_templates_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "consent_versions" ADD CONSTRAINT "consent_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "consent_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "pre_visit_tasks" ADD CONSTRAINT "pre_visit_tasks_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "case_consents" ADD CONSTRAINT "case_consents_consentVersionId_fkey" FOREIGN KEY ("consentVersionId") REFERENCES "consent_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "case_consents" ADD CONSTRAINT "case_consents_grantedByGuardianId_fkey" FOREIGN KEY ("grantedByGuardianId") REFERENCES "guardians"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
