-- Care Journey — Phase 0/1 migration (additive, idempotent)
-- Adds: Case.journeyStage; CaseSession.discipline + carePlanId; CarePlan; CarePlanPricingDefault.
-- Apply manually via psql (pgvector breaks Prisma's shadow DB — see project notes).

-- ── Enums ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "JourneyStage" AS ENUM ('INTAKE', 'TRIAGE', 'CONSULTATION', 'IN_THERAPY', 'IN_ASSESSMENT', 'DISCHARGED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CarePlanRecommendation" AS ENUM ('NONE', 'SINGLE_ASSESSMENT', 'MDT_ASSESSMENT', 'THERAPY', 'COACHING', 'REFERRAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CarePlanPaymentStatus" AS ENUM ('PAID', 'PENDING', 'PREAUTH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CarePlanStatus" AS ENUM ('DRAFT', 'LOCKED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Case: journey stage ──────────────────────────────────────────────────
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "journeyStage" "JourneyStage" NOT NULL DEFAULT 'INTAKE';

-- ── CaseSession: discipline + care plan link ─────────────────────────────
ALTER TABLE "case_sessions" ADD COLUMN IF NOT EXISTS "discipline" "TherapyDiscipline";
ALTER TABLE "case_sessions" ADD COLUMN IF NOT EXISTS "carePlanId" TEXT;

-- ── CarePlan ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "care_plans" (
  "id"                     TEXT NOT NULL,
  "caseId"                 TEXT NOT NULL,
  "consultationRecordId"   TEXT,
  "recommendation"         "CarePlanRecommendation" NOT NULL DEFAULT 'THERAPY',
  "disciplines"            "TherapyDiscipline"[],
  "primaryTherapistId"     TEXT,
  "startDate"              TIMESTAMP(3) NOT NULL,
  "timeOfDay"              TEXT NOT NULL,
  "daysOfWeek"             INTEGER[],
  "sessionCount"           INTEGER NOT NULL,
  "packageName"            TEXT,
  "unitPrice"              INTEGER NOT NULL DEFAULT 0,
  "currency"               TEXT NOT NULL DEFAULT 'INR',
  "totalAmount"            INTEGER NOT NULL DEFAULT 0,
  "paymentStatus"          "CarePlanPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "reviewInWeeks"          INTEGER,
  "externalReferralTarget" TEXT,
  "status"                 "CarePlanStatus" NOT NULL DEFAULT 'DRAFT',
  "parentAcceptedAt"       TIMESTAMP(3),
  "lockedAt"               TIMESTAMP(3),
  "createdById"            TEXT NOT NULL,
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3) NOT NULL,
  CONSTRAINT "care_plans_pkey" PRIMARY KEY ("id")
);

-- ── CarePlanPricingDefault ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "care_plan_pricing_defaults" (
  "id"                 TEXT NOT NULL,
  "recommendation"     "CarePlanRecommendation" NOT NULL,
  "label"              TEXT NOT NULL,
  "unitPrice"          INTEGER NOT NULL DEFAULT 0,
  "currency"           TEXT NOT NULL DEFAULT 'INR',
  "defaultCount"       INTEGER NOT NULL DEFAULT 1,
  "defaultDaysPerWeek" INTEGER NOT NULL DEFAULT 1,
  "defaultDays"        INTEGER[],
  "packageType"        TEXT,
  "active"             BOOLEAN NOT NULL DEFAULT true,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL,
  CONSTRAINT "care_plan_pricing_defaults_pkey" PRIMARY KEY ("id")
);

-- ── Indexes ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "case_sessions_carePlanId_idx" ON "case_sessions"("carePlanId");
CREATE INDEX IF NOT EXISTS "care_plans_caseId_idx" ON "care_plans"("caseId");
CREATE INDEX IF NOT EXISTS "care_plans_status_idx" ON "care_plans"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "care_plan_pricing_defaults_recommendation_key" ON "care_plan_pricing_defaults"("recommendation");

-- ── Foreign keys ─────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE "case_sessions" ADD CONSTRAINT "case_sessions_carePlanId_fkey"
    FOREIGN KEY ("carePlanId") REFERENCES "care_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_caseId_fkey"
    FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
