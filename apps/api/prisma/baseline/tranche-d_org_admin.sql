-- Tranche D — Org Admin schema batch. ADDITIVE ONLY: no DROP, no column removal,
-- no data migration. Existing rows are unaffected. Idempotent (IF NOT EXISTS /
-- guarded constraints) — safe to run more than once.
--
-- Apply to prod (Supabase, PG15) via the SQL editor, and to dev, BEFORE the
-- Tranche D application code is deployed. Supabase runs PG15 so ALTER TYPE ADD
-- VALUE inside the editor's transaction is fine (the values are only added here,
-- not used in the same statement).
--
-- Generated from schema.prisma via `prisma migrate diff --from-schema-datamodel`
-- and hand-hardened for idempotent manual application.

-- 1) Member status lifecycle (M2): Invited (invitation exists) / Awaiting Review
--    (accepted, pending admin approval before going Active).
ALTER TYPE "OrganizationStatus" ADD VALUE IF NOT EXISTS 'INVITED';
ALTER TYPE "OrganizationStatus" ADD VALUE IF NOT EXISTS 'AWAITING_REVIEW';

-- 2) Invite-modal fields (M3) + non-therapist member location (M1).
ALTER TABLE "OrganizationMember"
  ADD COLUMN IF NOT EXISTS "memberType" TEXT,
  ADD COLUMN IF NOT EXISTS "branch" TEXT;
ALTER TABLE "OrganizationInvitation"
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "branch" TEXT,
  ADD COLUMN IF NOT EXISTS "note" TEXT,
  ADD COLUMN IF NOT EXISTS "memberType" TEXT;

-- 3) Sliding-scale / insurance-covered rate (M4) on the therapist record.
ALTER TABLE "therapist_profiles"
  ADD COLUMN IF NOT EXISTS "slidingScaleAvailable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "slidingScaleRate" DOUBLE PRECISION;

-- 4) Event host (E1) — nullable FK to the member roster; deleting the host user
--    nulls the field rather than the event.
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "hostId" TEXT;
CREATE INDEX IF NOT EXISTS "Event_hostId_idx" ON "Event"("hostId");
DO $$ BEGIN
  ALTER TABLE "Event" ADD CONSTRAINT "Event_hostId_fkey"
    FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5) Resources (X2) — org-scoped uploaded documents.
CREATE TABLE IF NOT EXISTS "OrgResource" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "title"          TEXT NOT NULL,
  "description"    TEXT,
  "fileUrl"        TEXT NOT NULL,
  "fileType"       TEXT,
  "fileSize"       INTEGER,
  "category"       TEXT,
  "uploadedById"   TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrgResource_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OrgResource_organizationId_idx" ON "OrgResource"("organizationId");
DO $$ BEGIN
  ALTER TABLE "OrgResource" ADD CONSTRAINT "OrgResource_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "OrgResource" ADD CONSTRAINT "OrgResource_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Intake documents (F10) need NO schema change — reuse the existing
-- "case_documents" table with type = 'OTHER'.
