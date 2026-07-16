-- F7 + F8 — in-setting support, the graduated approach (Assess-Plan-Do-Review), and the
-- targeted interventions that hang off it.
--
-- Four tables and four enums (SupportOutcome reuses the existing GoalStatus). Anchored to the
-- affiliation (the consent anchor), like observations (F5) and concerns (F6). Hand-written and
-- IDEMPOTENT (`prisma migrate` cannot run against this DB). Purely additive — safe to apply
-- before the code that reads it ships, which is the required order.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupportPlanStatus') THEN
    CREATE TYPE "SupportPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'UNDER_REVIEW', 'CLOSED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupportReviewDecision') THEN
    CREATE TYPE "SupportReviewDecision" AS ENUM ('CONTINUE', 'ADJUST', 'ESCALATE', 'CLOSE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InterventionKind') THEN
    CREATE TYPE "InterventionKind" AS ENUM ('IN_SETTING', 'HOME');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InterventionStatus') THEN
    CREATE TYPE "InterventionStatus" AS ENUM ('PLANNED', 'ACTIVE', 'DONE', 'DISCONTINUED');
  END IF;
END
$$;

-- ─── support_plans ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "support_plans" (
  "id"                TEXT NOT NULL,
  "childId"           TEXT NOT NULL,
  "affiliationId"     TEXT NOT NULL,
  "facilityId"        TEXT NOT NULL,
  "concernId"         TEXT,
  "createdById"       TEXT,
  "title"             TEXT NOT NULL,
  "status"            "SupportPlanStatus" NOT NULL DEFAULT 'DRAFT',
  "domains"           TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  -- Parent-facing summary (shared). Staff-only working notes live in staffNotes.
  "summary"           TEXT,
  "staffNotes"        TEXT,
  "reviewDate"        TIMESTAMP(3),
  "sharedAt"          TIMESTAMP(3),
  "acknowledgedAt"    TIMESTAMP(3),
  "parentResponse"    TEXT,
  "version"           INTEGER NOT NULL DEFAULT 1,
  "previousVersionId" TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,

  CONSTRAINT "support_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "support_plans_previousVersionId_key" ON "support_plans"("previousVersionId");
CREATE INDEX IF NOT EXISTS "support_plans_childId_status_idx"    ON "support_plans"("childId", "status");
CREATE INDEX IF NOT EXISTS "support_plans_facilityId_status_idx" ON "support_plans"("facilityId", "status");
CREATE INDEX IF NOT EXISTS "support_plans_affiliationId_idx"     ON "support_plans"("affiliationId");
CREATE INDEX IF NOT EXISTS "support_plans_concernId_idx"         ON "support_plans"("concernId");

-- ─── support_outcomes ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "support_outcomes" (
  "id"                 TEXT NOT NULL,
  "planId"             TEXT NOT NULL,
  "domain"             TEXT NOT NULL,
  "outcomeText"        TEXT NOT NULL,
  "successCriteria"    TEXT,
  "baselineValue"      DOUBLE PRECISION,
  "targetDate"         TIMESTAMP(3),
  "reviewIntervalDays" INTEGER,
  "currentProgress"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status"             "GoalStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "order"              INTEGER NOT NULL DEFAULT 0,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL,

  CONSTRAINT "support_outcomes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "support_outcomes_planId_idx" ON "support_outcomes"("planId");
CREATE INDEX IF NOT EXISTS "support_outcomes_status_idx" ON "support_outcomes"("status");

-- ─── support_reviews ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "support_reviews" (
  "id"               TEXT NOT NULL,
  "planId"           TEXT NOT NULL,
  "reviewedById"     TEXT,
  "outcomeProgress"  JSONB,
  "progressNote"     TEXT,
  "decision"         "SupportReviewDecision" NOT NULL,
  "sharedWithParent" BOOLEAN NOT NULL DEFAULT false,
  "reviewedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "support_reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "support_reviews_planId_idx" ON "support_reviews"("planId");

-- ─── support_interventions ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "support_interventions" (
  "id"                    TEXT NOT NULL,
  "outcomeId"             TEXT NOT NULL,
  "kind"                  "InterventionKind" NOT NULL,
  "title"                 TEXT NOT NULL,
  "description"           TEXT,
  "status"                "InterventionStatus" NOT NULL DEFAULT 'PLANNED',
  "worksheetAssignmentId" TEXT,
  "createdById"           TEXT,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL,

  CONSTRAINT "support_interventions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "support_interventions_outcomeId_idx" ON "support_interventions"("outcomeId");

-- ─── foreign keys ────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- support_plans
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_plans_childId_fkey') THEN
    ALTER TABLE "support_plans" ADD CONSTRAINT "support_plans_childId_fkey"
      FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_plans_affiliationId_fkey') THEN
    ALTER TABLE "support_plans" ADD CONSTRAINT "support_plans_affiliationId_fkey"
      FOREIGN KEY ("affiliationId") REFERENCES "child_affiliations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_plans_facilityId_fkey') THEN
    ALTER TABLE "support_plans" ADD CONSTRAINT "support_plans_facilityId_fkey"
      FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  -- SetNull: a resolved/deleted concern must not delete the plan it led to.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_plans_concernId_fkey') THEN
    ALTER TABLE "support_plans" ADD CONSTRAINT "support_plans_concernId_fkey"
      FOREIGN KEY ("concernId") REFERENCES "concerns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  -- SetNull: a departing lead must not delete the plan record.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_plans_createdById_fkey') THEN
    ALTER TABLE "support_plans" ADD CONSTRAINT "support_plans_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_plans_previousVersionId_fkey') THEN
    ALTER TABLE "support_plans" ADD CONSTRAINT "support_plans_previousVersionId_fkey"
      FOREIGN KEY ("previousVersionId") REFERENCES "support_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  -- support_outcomes
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_outcomes_planId_fkey') THEN
    ALTER TABLE "support_outcomes" ADD CONSTRAINT "support_outcomes_planId_fkey"
      FOREIGN KEY ("planId") REFERENCES "support_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  -- support_reviews
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_reviews_planId_fkey') THEN
    ALTER TABLE "support_reviews" ADD CONSTRAINT "support_reviews_planId_fkey"
      FOREIGN KEY ("planId") REFERENCES "support_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_reviews_reviewedById_fkey') THEN
    ALTER TABLE "support_reviews" ADD CONSTRAINT "support_reviews_reviewedById_fkey"
      FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  -- support_interventions
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_interventions_outcomeId_fkey') THEN
    ALTER TABLE "support_interventions" ADD CONSTRAINT "support_interventions_outcomeId_fkey"
      FOREIGN KEY ("outcomeId") REFERENCES "support_outcomes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_interventions_createdById_fkey') THEN
    ALTER TABLE "support_interventions" ADD CONSTRAINT "support_interventions_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
