-- Care Journey — Phase 4 migration (Assessment Reviews). Additive, idempotent.
DO $$ BEGIN
  CREATE TYPE "AssessmentReviewType" AS ENUM ('SINGLE', 'MDT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "AssessmentPhase" AS ENUM ('PLAN', 'EXEC', 'REPORT', 'SHARED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "AssessmentExecStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "assessment_reviews" (
  "id"                   TEXT NOT NULL,
  "caseId"               TEXT NOT NULL,
  "type"                 "AssessmentReviewType" NOT NULL DEFAULT 'SINGLE',
  "phase"                "AssessmentPhase" NOT NULL DEFAULT 'PLAN',
  "title"                TEXT,
  "scopeApproved"        BOOLEAN NOT NULL DEFAULT false,
  "dayMode"              TEXT,
  "questionnaireSent"    BOOLEAN NOT NULL DEFAULT false,
  "schoolInputRequested" BOOLEAN NOT NULL DEFAULT false,
  "paymentStatus"        "CarePlanPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "meetingAt"            TIMESTAMP(3),
  "syncMode"             TEXT,
  "reportText"           TEXT,
  "approval"             TEXT,
  "reportDocumentId"     TEXT,
  "recipients"           JSONB,
  "sharedAt"             TIMESTAMP(3),
  "createdById"          TEXT NOT NULL,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL,
  CONSTRAINT "assessment_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "assessment_disciplines" (
  "id"                 TEXT NOT NULL,
  "assessmentReviewId" TEXT NOT NULL,
  "discipline"         "TherapyDiscipline" NOT NULL,
  "status"             "AssessmentExecStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "assignee"           TEXT,
  "clinicalRecordId"   TEXT,
  "reportTitle"        TEXT,
  "flagged"            BOOLEAN NOT NULL DEFAULT false,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL,
  CONSTRAINT "assessment_disciplines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "assessment_reviews_caseId_idx" ON "assessment_reviews"("caseId");
CREATE INDEX IF NOT EXISTS "assessment_reviews_phase_idx" ON "assessment_reviews"("phase");
CREATE INDEX IF NOT EXISTS "assessment_disciplines_assessmentReviewId_idx" ON "assessment_disciplines"("assessmentReviewId");
CREATE UNIQUE INDEX IF NOT EXISTS "assessment_disciplines_assessmentReviewId_discipline_key" ON "assessment_disciplines"("assessmentReviewId", "discipline");

DO $$ BEGIN
  ALTER TABLE "assessment_reviews" ADD CONSTRAINT "assessment_reviews_caseId_fkey"
    FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "assessment_disciplines" ADD CONSTRAINT "assessment_disciplines_assessmentReviewId_fkey"
    FOREIGN KEY ("assessmentReviewId") REFERENCES "assessment_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
