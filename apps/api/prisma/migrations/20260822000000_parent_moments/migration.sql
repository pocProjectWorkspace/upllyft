-- Parent Everyday Moments — parent-captured observations + Mira pattern insights.
--
-- A parent logs small real-life moments about their own child; Mira surfaces patterns
-- across them. Deliberately separate from "observations" (staff-authored, consent-gated
-- via the affiliation): a parent needs no consent to record their own child, and moments
-- must exist for children with no facility affiliation at all.
--
-- Hand-written and IDEMPOTENT (`prisma migrate` cannot run against this database).
-- Purely additive: four enums, two tables. Nothing existing is altered, so this is safe
-- to apply BEFORE the code that reads it ships — the required order.

-- ─── enums ───────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MomentCategory') THEN
    CREATE TYPE "MomentCategory" AS ENUM ('WENT_WELL', 'DIFFICULT', 'CHANGED', 'MILESTONE');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MomentCaptureVia') THEN
    CREATE TYPE "MomentCaptureVia" AS ENUM ('TEXT', 'VOICE');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MiraInsightType') THEN
    CREATE TYPE "MiraInsightType" AS ENUM ('RECURRING_CHALLENGE', 'EMERGING_PROGRESS', 'STRATEGY_WORKS');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MiraInsightStatus') THEN
    CREATE TYPE "MiraInsightStatus" AS ENUM ('NEW', 'WATCHING', 'SHARED', 'DISMISSED');
  END IF;
END
$$;

-- ─── moments ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "moments" (
  "id"             TEXT NOT NULL,
  "childId"        TEXT NOT NULL,
  -- WHO captured it. Nullable + SetNull so deleting an account does not erase the
  -- child's history.
  "createdById"    TEXT,
  "text"           TEXT NOT NULL,
  "category"       "MomentCategory",
  "capturedVia"    "MomentCaptureVia" NOT NULL DEFAULT 'TEXT',
  "place"          TEXT,
  "occurredAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "domainTags"     TEXT[] DEFAULT ARRAY[]::TEXT[],
  "interpretation" JSONB,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "moments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "moments_childId_occurredAt_idx" ON "moments"("childId", "occurredAt");
CREATE INDEX IF NOT EXISTS "moments_childId_createdAt_idx"  ON "moments"("childId", "createdAt");

-- ─── mira_insights ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "mira_insights" (
  "id"              TEXT NOT NULL,
  "childId"         TEXT NOT NULL,
  "type"            "MiraInsightType" NOT NULL,
  "title"           TEXT NOT NULL,
  "body"            TEXT NOT NULL,
  "whatHelped"      TEXT,
  "whyMatters"      TEXT,
  "settings"        TEXT[] DEFAULT ARRAY[]::TEXT[],
  "sourceMomentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "status"          "MiraInsightStatus" NOT NULL DEFAULT 'NEW',
  "generatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "mira_insights_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "mira_insights_childId_status_idx"      ON "mira_insights"("childId", "status");
CREATE INDEX IF NOT EXISTS "mira_insights_childId_generatedAt_idx" ON "mira_insights"("childId", "generatedAt");

-- ─── foreign keys ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'moments_childId_fkey') THEN
    ALTER TABLE "moments" ADD CONSTRAINT "moments_childId_fkey"
      FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'moments_createdById_fkey') THEN
    ALTER TABLE "moments" ADD CONSTRAINT "moments_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mira_insights_childId_fkey') THEN
    ALTER TABLE "mira_insights" ADD CONSTRAINT "mira_insights_childId_fkey"
      FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
