-- Parent Intake public link: hashed token + expiry on Case.
-- Additive, nullable, idempotent. Apply to prod (iqak…) manually via psql.

ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "intakeTokenHash" TEXT;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "intakeTokenExpiry" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "cases_intakeTokenHash_idx" ON "cases" ("intakeTokenHash");
