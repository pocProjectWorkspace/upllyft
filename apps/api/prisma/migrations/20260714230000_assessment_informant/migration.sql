-- F4 — the informant model.
--
-- `Assessment` recorded WHAT was answered and nothing about WHO answered it. A
-- parent-report and a teacher-report of the same child were therefore the same row
-- shape, and multi-informant screening — where the DISAGREEMENT between two settings
-- is the signal — could not be represented at all.
--
-- Hand-written and IDEMPOTENT (`prisma migrate` cannot run against this database).
-- Additive: one enum, three nullable/defaulted columns, two indexes. No existing row
-- changes meaning, so this is safe to apply BEFORE the code deploy — which is the
-- required order.
--
-- THE BACKFILL IS A STATEMENT OF FACT, NOT A GUESS. Every screening that exists today
-- was administered by the child's guardian: assessments.service.ts throws
-- ForbiddenException unless `child.profile.userId === userId`, on every path that can
-- create one. So informantType = PARENT is not a convenient default — it is what
-- happened. `respondentId` is resolved from the child's owning profile; where that
-- cannot be resolved it is LEFT NULL and reported, never invented.

-- ─── enum ────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InformantType') THEN
    CREATE TYPE "InformantType" AS ENUM ('PARENT', 'EDUCATOR', 'CLINICIAN');
  END IF;
END
$$;

-- ─── columns ─────────────────────────────────────────────────────────────────
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "informantType" "InformantType" NOT NULL DEFAULT 'PARENT';
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "respondentId"  TEXT;
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "facilityId"    TEXT;

-- ─── indexes ─────────────────────────────────────────────────────────────────
-- The concordance query: every screening of this child, by informant.
CREATE INDEX IF NOT EXISTS "assessments_childId_informantType_idx" ON "assessments"("childId", "informantType");
CREATE INDEX IF NOT EXISTS "assessments_facilityId_idx"            ON "assessments"("facilityId");

-- ─── foreign keys ────────────────────────────────────────────────────────────
-- SetNull on both: deleting a user or closing a facility must not delete a child's
-- screening history. The screening is about the CHILD; the respondent is metadata.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessments_respondentId_fkey') THEN
    ALTER TABLE "assessments" ADD CONSTRAINT "assessments_respondentId_fkey"
      FOREIGN KEY ("respondentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessments_facilityId_fkey') THEN
    ALTER TABLE "assessments" ADD CONSTRAINT "assessments_facilityId_fkey"
      FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- ─── backfill ────────────────────────────────────────────────────────────────
-- informantType already reads PARENT via the column default. Attribute the respondent
-- to the guardian who owns the child's profile — the only person who could have
-- created the row. Idempotent: only fills rows still NULL.
UPDATE "assessments" a
   SET "respondentId" = up."userId"
  FROM "children" c
  JOIN "user_profiles" up ON up."id" = c."profileId"
 WHERE a."childId" = c."id"
   AND a."respondentId" IS NULL;
