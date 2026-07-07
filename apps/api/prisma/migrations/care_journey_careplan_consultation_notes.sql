-- Care Journey — UAT Tranche 3 (#10): detailed consultation notes on the care plan.
-- Additive, idempotent.
ALTER TABLE "care_plans" ADD COLUMN IF NOT EXISTS "consultationNotes" TEXT;
