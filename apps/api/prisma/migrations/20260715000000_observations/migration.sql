-- F5 — continuous observation capture.
--
-- A nursery observes an enrolled child day to day. This is NOT a clinical record (a
-- nursery has no case, and the capability map grants `canObserve` while denying
-- `canWriteClinicalNotes`), so it is its own table anchored to the affiliation — the
-- consent anchor — not to a Case.
--
-- Hand-written and IDEMPOTENT (`prisma migrate` cannot run against this database).
-- Purely additive: one enum, one table. Nothing existing is altered, so this is safe to
-- apply BEFORE the code that reads it ships — the required order.

-- ─── enum ────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ObservationType') THEN
    CREATE TYPE "ObservationType" AS ENUM ('NOTE', 'MOMENT', 'MILESTONE', 'CONCERN');
  END IF;
END
$$;

-- ─── table ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "observations" (
  "id"            TEXT NOT NULL,
  "childId"       TEXT NOT NULL,
  -- The enrolment this was observed under. The consent anchor: an observation is only
  -- ever visible through the affiliation, so deleting it takes the observations with it.
  "affiliationId" TEXT NOT NULL,
  -- Denormalised for direct fail-closed scoping without a join through the affiliation.
  "facilityId"    TEXT NOT NULL,
  -- WHO observed it. Nullable + SetNull so a departing keyworker does not delete a
  -- child's developmental history.
  "authorId"      TEXT,
  "domain"        TEXT,
  "type"          "ObservationType" NOT NULL DEFAULT 'NOTE',
  "note"          TEXT NOT NULL,
  "observedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,

  CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "observations_childId_observedAt_idx"    ON "observations"("childId", "observedAt");
CREATE INDEX IF NOT EXISTS "observations_facilityId_observedAt_idx" ON "observations"("facilityId", "observedAt");
CREATE INDEX IF NOT EXISTS "observations_affiliationId_idx"         ON "observations"("affiliationId");
CREATE INDEX IF NOT EXISTS "observations_domain_idx"                ON "observations"("domain");

-- ─── foreign keys ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'observations_childId_fkey') THEN
    ALTER TABLE "observations" ADD CONSTRAINT "observations_childId_fkey"
      FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'observations_affiliationId_fkey') THEN
    ALTER TABLE "observations" ADD CONSTRAINT "observations_affiliationId_fkey"
      FOREIGN KEY ("affiliationId") REFERENCES "child_affiliations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'observations_facilityId_fkey') THEN
    ALTER TABLE "observations" ADD CONSTRAINT "observations_facilityId_fkey"
      FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  -- SetNull: a departing staff member must not delete the observations they made.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'observations_authorId_fkey') THEN
    ALTER TABLE "observations" ADD CONSTRAINT "observations_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
