-- Backlog decisions of 2026-09-30. Additive only: one column, one table.
--
-- #8  A screening shared with a professional exposes scores and the summary; the
--     item-by-item answers only when the parent opts in. Existing shares default to
--     false, i.e. they narrow to scores + summary from this release on.
ALTER TABLE "assessment_shares" ADD COLUMN IF NOT EXISTS "includeResponses" BOOLEAN NOT NULL DEFAULT false;

-- #1  Care waitlist: a parent with no matching provider asks to be told when one joins.
CREATE TABLE IF NOT EXISTS "care_waitlist_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "childId" TEXT,
    "country" TEXT,
    "concern" TEXT,
    "domains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "care_waitlist_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "care_waitlist_entries_status_country_idx" ON "care_waitlist_entries"("status", "country");
CREATE INDEX IF NOT EXISTS "care_waitlist_entries_userId_idx" ON "care_waitlist_entries"("userId");
DO $$ BEGIN
  ALTER TABLE "care_waitlist_entries" ADD CONSTRAINT "care_waitlist_entries_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
