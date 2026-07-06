-- Care Journey — Phase 3 migration (Triage decision spine). Additive, idempotent.
DO $$ BEGIN
  CREATE TYPE "TriagePathway" AS ENUM (
    'CONSULTATION_ONLY', 'SINGLE_ASSESSMENT', 'MDT_ASSESSMENT',
    'THERAPY_TRIAL', 'PARENT_COUNSELLING', 'EXTERNAL_REFERRAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "triage_reviews" ADD COLUMN IF NOT EXISTS "pathway" "TriagePathway";
ALTER TABLE "triage_reviews" ADD COLUMN IF NOT EXISTS "decisionData" JSONB;
ALTER TABLE "triage_reviews" ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3);
