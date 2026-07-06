-- Care Journey — Phase 5 migration (Referral / Escalation). Additive, idempotent.
ALTER TYPE "IncidentStatus" ADD VALUE IF NOT EXISTS 'REFERRAL_SENT';
ALTER TYPE "IncidentStatus" ADD VALUE IF NOT EXISTS 'CONTINUED';

ALTER TABLE "case_incidents" ADD COLUMN IF NOT EXISTS "riskLabel" TEXT;
ALTER TABLE "case_incidents" ADD COLUMN IF NOT EXISTS "referralTarget" TEXT;
ALTER TABLE "case_incidents" ADD COLUMN IF NOT EXISTS "reviewerNote" TEXT;
ALTER TABLE "case_incidents" ADD COLUMN IF NOT EXISTS "reviewerApproved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "case_incidents" ADD COLUMN IF NOT EXISTS "consentObtained" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "case_incidents" ADD COLUMN IF NOT EXISTS "shareScope" JSONB;
ALTER TABLE "case_incidents" ADD COLUMN IF NOT EXISTS "followUpOutcome" TEXT;
ALTER TABLE "case_incidents" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3);
