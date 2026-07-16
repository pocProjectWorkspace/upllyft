-- F9 + F11 — the early developmental review (~age 2), and the onward handover record.
--
-- Two tables, three enums. Both anchored to the affiliation (the consent anchor), like every
-- other thing a nursery holds about a child (F5/F6/F7). Hand-written and IDEMPOTENT
-- (`prisma migrate` cannot run against this DB). Purely additive — safe to apply before the
-- code that reads it ships, which is the required order.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DevReviewStatus') THEN
    CREATE TYPE "DevReviewStatus" AS ENUM ('DRAFT', 'SHARED', 'ACKNOWLEDGED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HandoverRecipient') THEN
    CREATE TYPE "HandoverRecipient" AS ENUM ('SCHOOL', 'CLINICIAN', 'OTHER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HandoverStatus') THEN
    CREATE TYPE "HandoverStatus" AS ENUM ('DRAFT', 'SHARED');
  END IF;
END
$$;

-- ─── developmental_reviews (F9) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "developmental_reviews" (
  "id"                   TEXT NOT NULL,
  "childId"              TEXT NOT NULL,
  "affiliationId"        TEXT NOT NULL,
  "facilityId"           TEXT NOT NULL,
  "createdById"          TEXT,
  "ageMonths"            INTEGER NOT NULL,
  "status"               "DevReviewStatus" NOT NULL DEFAULT 'DRAFT',
  "flaggedDomains"       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "educatorAssessmentId" TEXT,
  "parentAssessmentId"   TEXT,
  "evidenceSummary"      JSONB,
  "summary"              TEXT NOT NULL,
  "recommendation"       TEXT,
  "sharedAt"             TIMESTAMP(3),
  "acknowledgedAt"       TIMESTAMP(3),
  "parentResponse"       TEXT,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL,

  CONSTRAINT "developmental_reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "developmental_reviews_childId_status_idx"    ON "developmental_reviews"("childId", "status");
CREATE INDEX IF NOT EXISTS "developmental_reviews_facilityId_status_idx" ON "developmental_reviews"("facilityId", "status");

-- ─── handover_records (F11) ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "handover_records" (
  "id"                  TEXT NOT NULL,
  "childId"             TEXT NOT NULL,
  "affiliationId"       TEXT NOT NULL,
  "facilityId"          TEXT NOT NULL,
  "createdById"         TEXT,
  "recipientType"       "HandoverRecipient" NOT NULL DEFAULT 'SCHOOL',
  "recipientName"       TEXT,
  "status"              "HandoverStatus" NOT NULL DEFAULT 'DRAFT',
  "snapshot"            JSONB NOT NULL,
  "summary"             TEXT NOT NULL,
  "guardianConsentedAt" TIMESTAMP(3),
  "sharedAt"            TIMESTAMP(3),
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL,

  CONSTRAINT "handover_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "handover_records_childId_status_idx"    ON "handover_records"("childId", "status");
CREATE INDEX IF NOT EXISTS "handover_records_facilityId_status_idx" ON "handover_records"("facilityId", "status");

-- ─── foreign keys ────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- developmental_reviews
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'developmental_reviews_childId_fkey') THEN
    ALTER TABLE "developmental_reviews" ADD CONSTRAINT "developmental_reviews_childId_fkey"
      FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'developmental_reviews_affiliationId_fkey') THEN
    ALTER TABLE "developmental_reviews" ADD CONSTRAINT "developmental_reviews_affiliationId_fkey"
      FOREIGN KEY ("affiliationId") REFERENCES "child_affiliations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'developmental_reviews_facilityId_fkey') THEN
    ALTER TABLE "developmental_reviews" ADD CONSTRAINT "developmental_reviews_facilityId_fkey"
      FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'developmental_reviews_createdById_fkey') THEN
    ALTER TABLE "developmental_reviews" ADD CONSTRAINT "developmental_reviews_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  -- handover_records
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'handover_records_childId_fkey') THEN
    ALTER TABLE "handover_records" ADD CONSTRAINT "handover_records_childId_fkey"
      FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'handover_records_affiliationId_fkey') THEN
    ALTER TABLE "handover_records" ADD CONSTRAINT "handover_records_affiliationId_fkey"
      FOREIGN KEY ("affiliationId") REFERENCES "child_affiliations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'handover_records_facilityId_fkey') THEN
    ALTER TABLE "handover_records" ADD CONSTRAINT "handover_records_facilityId_fkey"
      FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'handover_records_createdById_fkey') THEN
    ALTER TABLE "handover_records" ADD CONSTRAINT "handover_records_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
