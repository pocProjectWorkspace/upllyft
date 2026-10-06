-- Resources journey: a child's own library, activity logs and progress shares, plus
-- family-facing tags on uploaded files and worksheets. Additive and IDEMPOTENT.
-- See docs/superpowers/specs/2026-10-07-resources-journey-design.md.

-- ── Tags ──────────────────────────────────────────────────────────────────────
ALTER TABLE "library_resources" ADD COLUMN IF NOT EXISTS "domains"         TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "library_resources" ADD COLUMN IF NOT EXISTS "ageMin"          INTEGER;
ALTER TABLE "library_resources" ADD COLUMN IF NOT EXISTS "ageMax"          INTEGER;
ALTER TABLE "library_resources" ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER;
ALTER TABLE "library_resources" ADD COLUMN IF NOT EXISTS "practises"       TEXT;
ALTER TABLE "library_resources" ADD COLUMN IF NOT EXISTS "forText"         TEXT;

ALTER TABLE "worksheets" ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER;
ALTER TABLE "worksheets" ADD COLUMN IF NOT EXISTS "practises"       TEXT;
ALTER TABLE "worksheets" ADD COLUMN IF NOT EXISTS "forText"         TEXT;

-- ── Tables ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "child_resources" (
    "id"                TEXT NOT NULL,
    "childId"           TEXT NOT NULL,
    "kind"              TEXT NOT NULL,
    "worksheetId"       TEXT,
    "libraryResourceId" TEXT,
    "source"            TEXT NOT NULL DEFAULT 'SAVED',
    "savedById"         TEXT NOT NULL,
    "assignedById"      TEXT,
    "goal"              TEXT,
    "targetDate"        TIMESTAMP(3),
    "assignedArea"      TEXT,
    "masteredOverride"  BOOLEAN,
    "unassignedAt"      TIMESTAMP(3),
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,
    CONSTRAINT "child_resources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "activity_logs" (
    "id"              TEXT NOT NULL,
    "childResourceId" TEXT NOT NULL,
    "childId"         TEXT NOT NULL,
    "loggedById"      TEXT NOT NULL,
    "date"            TIMESTAMP(3) NOT NULL,
    "help"            INTEGER NOT NULL,
    "engagement"      INTEGER NOT NULL,
    "note"            TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "progress_shares" (
    "id"              TEXT NOT NULL,
    "childId"         TEXT NOT NULL,
    "parentId"        TEXT NOT NULL,
    "therapistUserId" TEXT NOT NULL,
    "periodDays"      INTEGER,
    "includeNotes"    BOOLEAN NOT NULL DEFAULT false,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt"       TIMESTAMP(3),
    CONSTRAINT "progress_shares_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "child_resources_childId_createdAt_idx" ON "child_resources"("childId", "createdAt");
CREATE INDEX IF NOT EXISTS "child_resources_assignedById_idx" ON "child_resources"("assignedById");
CREATE UNIQUE INDEX IF NOT EXISTS "child_resources_childId_worksheetId_key" ON "child_resources"("childId", "worksheetId");
CREATE UNIQUE INDEX IF NOT EXISTS "child_resources_childId_libraryResourceId_key" ON "child_resources"("childId", "libraryResourceId");
CREATE INDEX IF NOT EXISTS "activity_logs_childId_date_idx" ON "activity_logs"("childId", "date");
CREATE INDEX IF NOT EXISTS "activity_logs_childResourceId_date_idx" ON "activity_logs"("childResourceId", "date");
CREATE INDEX IF NOT EXISTS "progress_shares_childId_revokedAt_idx" ON "progress_shares"("childId", "revokedAt");
CREATE INDEX IF NOT EXISTS "progress_shares_therapistUserId_revokedAt_idx" ON "progress_shares"("therapistUserId", "revokedAt");

DO $$ BEGIN
  ALTER TABLE "child_resources" ADD CONSTRAINT "child_resources_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "child_resources" ADD CONSTRAINT "child_resources_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "worksheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "child_resources" ADD CONSTRAINT "child_resources_libraryResourceId_fkey" FOREIGN KEY ("libraryResourceId") REFERENCES "library_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "child_resources" ADD CONSTRAINT "child_resources_savedById_fkey" FOREIGN KEY ("savedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "child_resources" ADD CONSTRAINT "child_resources_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_childResourceId_fkey" FOREIGN KEY ("childResourceId") REFERENCES "child_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "progress_shares" ADD CONSTRAINT "progress_shares_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "progress_shares" ADD CONSTRAINT "progress_shares_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "progress_shares" ADD CONSTRAINT "progress_shares_therapistUserId_fkey" FOREIGN KEY ("therapistUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Backfill (safe to re-run: deterministic ids + ON CONFLICT DO NOTHING) ───────

-- 1. Every worksheet assignment becomes an ASSIGNED item in the child's library.
INSERT INTO "child_resources"
  ("id", "childId", "kind", "worksheetId", "source", "savedById", "assignedById", "goal", "targetDate", "createdAt", "updatedAt")
SELECT 'wa_' || wa."id", wa."childId", 'WORKSHEET', wa."worksheetId", 'ASSIGNED', wa."assignedToId",
       wa."assignedById", wa."notes", wa."dueDate", wa."createdAt", wa."updatedAt"
  FROM "worksheet_assignments" wa
ON CONFLICT DO NOTHING;

-- 2. A finished worksheet with no assignment was saved by the child's parent.
INSERT INTO "child_resources"
  ("id", "childId", "kind", "worksheetId", "source", "savedById", "createdAt", "updatedAt")
SELECT DISTINCT ON (wc."childId", wc."worksheetId")
       'wc_' || wc."id", wc."childId", 'WORKSHEET', wc."worksheetId", 'SAVED', up."userId", wc."startedAt", wc."startedAt"
  FROM "worksheet_completions" wc
  JOIN "children" c ON c."id" = wc."childId"
  JOIN "user_profiles" up ON up."id" = c."profileId"
 WHERE wc."completedAt" IS NOT NULL
 ORDER BY wc."childId", wc."worksheetId", wc."startedAt"
ON CONFLICT DO NOTHING;

-- 3. Every finished worksheet completion becomes one logged try.
INSERT INTO "activity_logs"
  ("id", "childResourceId", "childId", "loggedById", "date", "help", "engagement", "note", "createdAt")
SELECT 'wc_' || wc."id", cr."id", wc."childId",
       coalesce(wa."assignedToId", up."userId"),
       wc."completedAt",
       CASE wc."helpLevel" WHEN 'NONE' THEN 2 WHEN 'MINIMAL' THEN 1 WHEN 'MODERATE' THEN 1 WHEN 'SIGNIFICANT' THEN 0 ELSE 1 END,
       CASE WHEN wc."engagementRating" IS NULL THEN 1
            WHEN wc."engagementRating" <= 2 THEN 0
            WHEN wc."engagementRating" = 3 THEN 1
            ELSE 2 END,
       nullif(trim(wc."parentNotes"), ''),
       wc."completedAt"
  FROM "worksheet_completions" wc
  JOIN "child_resources" cr ON cr."childId" = wc."childId" AND cr."worksheetId" = wc."worksheetId"
  JOIN "children" c ON c."id" = wc."childId"
  JOIN "user_profiles" up ON up."id" = c."profileId"
  LEFT JOIN "worksheet_assignments" wa ON wa."id" = wc."assignmentId"
 WHERE wc."completedAt" IS NOT NULL
ON CONFLICT DO NOTHING;
