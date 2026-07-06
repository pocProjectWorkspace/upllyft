-- Care Journey — Phase 2 migration (Client Intake). Additive, idempotent.
DO $$ BEGIN
  CREATE TYPE "IntakeState" AS ENUM ('DRAFT', 'SUMMARISED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "case_intakes" (
  "id"                TEXT NOT NULL,
  "caseId"            TEXT NOT NULL,
  "state"             "IntakeState" NOT NULL DEFAULT 'DRAFT',
  "data"              JSONB NOT NULL DEFAULT '{}',
  "presentingConcern" TEXT,
  "referralQuestions" TEXT[],
  "parentGoals"       TEXT[],
  "urgencyFlag"       TEXT,
  "aiSummary"         TEXT,
  "consentAssessment" BOOLEAN NOT NULL DEFAULT false,
  "consentTherapy"    BOOLEAN NOT NULL DEFAULT false,
  "consentSharing"    BOOLEAN NOT NULL DEFAULT false,
  "consentAi"         BOOLEAN NOT NULL DEFAULT false,
  "recordedBy"        TEXT,
  "summarisedAt"      TIMESTAMP(3),
  "createdById"       TEXT NOT NULL,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "case_intakes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "case_intakes_caseId_key" ON "case_intakes"("caseId");

DO $$ BEGIN
  ALTER TABLE "case_intakes" ADD CONSTRAINT "case_intakes_caseId_fkey"
    FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
