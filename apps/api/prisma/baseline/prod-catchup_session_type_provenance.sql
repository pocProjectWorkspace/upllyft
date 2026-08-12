-- Prod catch-up: SessionType provenance columns (setBy / edited).
--
-- These columns were added to schema.prisma (commit ce08d39) but never captured in a
-- migration, so any environment whose DB predates that commit is missing them and will
-- 500 when the SessionType provenance feature reads them.
--
-- Idempotent (IF NOT EXISTS) — safe to run more than once. Apply to any DB that has NOT
-- already been hand-patched, BEFORE the fix/v5 branch reaches prod. Superseded by the full
-- baseline adoption in README.md (0_init.sql already contains these columns).

ALTER TABLE "session_types" ADD COLUMN IF NOT EXISTS "setBy" TEXT;
ALTER TABLE "session_types" ADD COLUMN IF NOT EXISTS "edited" BOOLEAN NOT NULL DEFAULT false;
