-- Add Therapist wizard: profile + discipline-specific credential fields.
-- Additive, all nullable — safe to run on any environment. Idempotent.
-- Apply to prod (iqak…) manually via psql per the repo's manual-migration convention.

ALTER TABLE "therapist_profiles" ADD COLUMN IF NOT EXISTS "department" TEXT;
ALTER TABLE "therapist_profiles" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "therapist_profiles" ADD COLUMN IF NOT EXISTS "branch" TEXT;
ALTER TABLE "therapist_profiles" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "therapist_profiles" ADD COLUMN IF NOT EXISTS "qualification" TEXT;
ALTER TABLE "therapist_profiles" ADD COLUMN IF NOT EXISTS "university" TEXT;
ALTER TABLE "therapist_profiles" ADD COLUMN IF NOT EXISTS "rciNumber" TEXT;
ALTER TABLE "therapist_profiles" ADD COLUMN IF NOT EXISTS "councilNumber" TEXT;
ALTER TABLE "therapist_profiles" ADD COLUMN IF NOT EXISTS "bcbaNumber" TEXT;
ALTER TABLE "therapist_profiles" ADD COLUMN IF NOT EXISTS "emiratesId" TEXT;
ALTER TABLE "therapist_profiles" ADD COLUMN IF NOT EXISTS "visaStatus" TEXT;
ALTER TABLE "therapist_profiles" ADD COLUMN IF NOT EXISTS "insuranceProvider" TEXT;
ALTER TABLE "therapist_profiles" ADD COLUMN IF NOT EXISTS "insurancePolicyNumber" TEXT;
ALTER TABLE "therapist_profiles" ADD COLUMN IF NOT EXISTS "insuranceExpiry" TIMESTAMP(3);
