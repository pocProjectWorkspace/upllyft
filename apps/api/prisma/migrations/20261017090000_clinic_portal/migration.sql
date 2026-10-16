-- Clinic Portal (parent view over clinic records). Additive, nullable/defaulted and IDEMPOTENT.

-- Parent reschedule / cancel on the clinic session record.
ALTER TABLE "case_sessions" ADD COLUMN IF NOT EXISTS "cancelledBy" TEXT;
ALTER TABLE "case_sessions" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "case_sessions" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;
ALTER TABLE "case_sessions" ADD COLUMN IF NOT EXISTS "rescheduledAt" TIMESTAMP(3);
ALTER TABLE "case_sessions" ADD COLUMN IF NOT EXISTS "rescheduledBy" TEXT;
-- Parent-facing session summary (shared by the therapist after sign-off) + read receipt.
ALTER TABLE "case_sessions" ADD COLUMN IF NOT EXISTS "parentSummary" JSONB;
ALTER TABLE "case_sessions" ADD COLUMN IF NOT EXISTS "parentSummarySharedAt" TIMESTAMP(3);
ALTER TABLE "case_sessions" ADD COLUMN IF NOT EXISTS "parentViewedAt" TIMESTAMP(3);

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "rescheduledAt" TIMESTAMP(3);

-- Assessment prep checklist + parent read receipt.
ALTER TABLE "assessment_reviews" ADD COLUMN IF NOT EXISTS "parentPrep" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "assessment_reviews" ADD COLUMN IF NOT EXISTS "parentViewedAt" TIMESTAMP(3);

-- Intake Section E: the two consents the portal shows that intake did not capture.
ALTER TABLE "case_intakes" ADD COLUMN IF NOT EXISTS "consentTelehealth" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "case_intakes" ADD COLUMN IF NOT EXISTS "consentMedia" BOOLEAN NOT NULL DEFAULT false;

-- Per-clinic change window for parent self-service.
ALTER TABLE "facilities" ADD COLUMN IF NOT EXISTS "parentChangeWindowHours" INTEGER NOT NULL DEFAULT 24;

-- Short invite code alongside the emailed claim link.
ALTER TABLE "child_claims" ADD COLUMN IF NOT EXISTS "codeHash" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "child_claims_codeHash_key" ON "child_claims"("codeHash");

-- Home activities: therapist note to the parent + "seen".
ALTER TABLE "child_resources" ADD COLUMN IF NOT EXISTS "parentNote" TEXT;
ALTER TABLE "child_resources" ADD COLUMN IF NOT EXISTS "parentSeenAt" TIMESTAMP(3);
