-- Care Journey — UAT Tranche 6 (Goals & IEPs §7): care-plan creator fields + IEP link.
-- Additive, idempotent.
ALTER TABLE "care_plans" ADD COLUMN IF NOT EXISTS "iepId" TEXT;
ALTER TABLE "care_plans" ADD COLUMN IF NOT EXISTS "mode" TEXT;
ALTER TABLE "care_plans" ADD COLUMN IF NOT EXISTS "sessionDurationMin" INTEGER;
ALTER TABLE "care_plans" ADD COLUMN IF NOT EXISTS "parentHomeProgram" TEXT;
ALTER TABLE "care_plans" ADD COLUMN IF NOT EXISTS "expectedOutcomes" TEXT;
ALTER TABLE "care_plans" ADD COLUMN IF NOT EXISTS "reviewDate" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "care_plans_iepId_idx" ON "care_plans"("iepId");
