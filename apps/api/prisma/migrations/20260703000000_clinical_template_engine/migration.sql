-- Clinical Template Engine — templates (digitized clinic forms) + captured records. Idempotent.

-- ── Enums ──────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE "TherapyDiscipline" AS ENUM ('SPEECH','OCCUPATIONAL','BEHAVIOUR_ABA','PSYCHOLOGY','SPECIAL_EDUCATION','PHYSIOTHERAPY','MEDICAL','MULTIDISCIPLINARY','UNIVERSAL'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ClinicalActivityType" AS ENUM ('INTAKE','SESSION_NOTE','ASSESSMENT','CONSULTATION','MDT_REVIEW','GOAL_PLAN','PROGRESS_REVIEW','DISCHARGE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ClinicalRecordStatus" AS ENUM ('DRAFT','SIGNED','AMENDED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── clinical_templates ──
CREATE TABLE IF NOT EXISTS "clinical_templates" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "discipline" "TherapyDiscipline" NOT NULL,
  "activityType" "ClinicalActivityType" NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "schema" JSONB NOT NULL,
  "isGlobal" BOOLEAN NOT NULL DEFAULT true,
  "organizationId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinical_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "clinical_templates_code_version_organizationId_key" ON "clinical_templates"("code","version","organizationId");
CREATE INDEX IF NOT EXISTS "clinical_templates_discipline_activityType_idx" ON "clinical_templates"("discipline","activityType");
CREATE INDEX IF NOT EXISTS "clinical_templates_organizationId_idx" ON "clinical_templates"("organizationId");
CREATE INDEX IF NOT EXISTS "clinical_templates_isActive_idx" ON "clinical_templates"("isActive");

DO $$ BEGIN
  ALTER TABLE "clinical_templates" ADD CONSTRAINT "clinical_templates_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── clinical_records ──
CREATE TABLE IF NOT EXISTS "clinical_records" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "templateCode" TEXT NOT NULL,
  "templateVersion" INTEGER NOT NULL DEFAULT 1,
  "discipline" "TherapyDiscipline" NOT NULL,
  "activityType" "ClinicalActivityType" NOT NULL,
  "therapistId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "answers" JSONB NOT NULL,
  "status" "ClinicalRecordStatus" NOT NULL DEFAULT 'DRAFT',
  "signedAt" TIMESTAMP(3),
  "signatureName" TEXT,
  "reportDocumentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinical_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "clinical_records_caseId_idx" ON "clinical_records"("caseId");
CREATE INDEX IF NOT EXISTS "clinical_records_caseId_activityType_idx" ON "clinical_records"("caseId","activityType");
CREATE INDEX IF NOT EXISTS "clinical_records_templateId_idx" ON "clinical_records"("templateId");
CREATE INDEX IF NOT EXISTS "clinical_records_status_idx" ON "clinical_records"("status");

DO $$ BEGIN
  ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_caseId_fkey"
    FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "clinical_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_therapistId_fkey"
    FOREIGN KEY ("therapistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
