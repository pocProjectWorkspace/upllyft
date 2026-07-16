-- F6 — the coached teacher→parent conversation.
--
-- One enum, one table. Anchored to the affiliation (the consent anchor). Hand-written and
-- IDEMPOTENT (`prisma migrate` cannot run against this DB). Purely additive — safe to apply
-- before the code that reads it ships, which is the required order.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConcernStatus') THEN
    CREATE TYPE "ConcernStatus" AS ENUM ('DRAFT', 'SHARED', 'ACKNOWLEDGED', 'CLOSED');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "concerns" (
  "id"              TEXT NOT NULL,
  "childId"         TEXT NOT NULL,
  "affiliationId"   TEXT NOT NULL,
  "facilityId"      TEXT NOT NULL,
  "raisedById"      TEXT,
  "status"          "ConcernStatus" NOT NULL DEFAULT 'DRAFT',
  "domains"         TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  -- Private to staff — how to have the conversation. Never shown to the parent.
  "staffCoaching"   TEXT,
  "coachingModel"   TEXT,
  -- The message shared WITH the parent. AI-drafted, editable before sharing.
  "parentSummary"   TEXT NOT NULL,
  "evidenceSummary" JSONB,
  "sharedAt"        TIMESTAMP(3),
  "acknowledgedAt"  TIMESTAMP(3),
  "parentResponse"  TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "concerns_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "concerns_childId_status_idx"    ON "concerns"("childId", "status");
CREATE INDEX IF NOT EXISTS "concerns_facilityId_status_idx" ON "concerns"("facilityId", "status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'concerns_childId_fkey') THEN
    ALTER TABLE "concerns" ADD CONSTRAINT "concerns_childId_fkey"
      FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'concerns_affiliationId_fkey') THEN
    ALTER TABLE "concerns" ADD CONSTRAINT "concerns_affiliationId_fkey"
      FOREIGN KEY ("affiliationId") REFERENCES "child_affiliations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'concerns_facilityId_fkey') THEN
    ALTER TABLE "concerns" ADD CONSTRAINT "concerns_facilityId_fkey"
      FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  -- SetNull: a departing inclusion lead must not delete the concern record.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'concerns_raisedById_fkey') THEN
    ALTER TABLE "concerns" ADD CONSTRAINT "concerns_raisedById_fkey"
      FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
