-- Directory-only therapists (admin upload): listed in Find Therapist, never bookable.
-- Additive and IDEMPOTENT.
ALTER TABLE "therapist_profiles" ADD COLUMN IF NOT EXISTS "directoryOnly" BOOLEAN NOT NULL DEFAULT false;

-- Backfill the therapists already uploaded from the admin console: a THERAPIST who
-- has never signed in (no password, no Google), still holds the upload's set-password
-- token, has no session types and no organisation link.
UPDATE "therapist_profiles" tp
SET "directoryOnly" = true, "acceptingBookings" = false
FROM "User" u
WHERE u."id" = tp."userId"
  AND u."role" = 'THERAPIST'
  AND u."password" IS NULL
  AND u."googleId" IS NULL
  AND u."resetPasswordToken" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "session_types" st WHERE st."therapistId" = tp."id")
  AND NOT EXISTS (SELECT 1 FROM "therapist_organization_links" l WHERE l."therapistId" = tp."id");

-- Directory therapists get no email: cancel their set-password invites still waiting
-- in the outbox (the sender only claims QUEUED rows).
UPDATE "email_outbox" o
SET "status" = 'CANCELLED', "lastError" = 'Directory listing: invite not sent'
FROM "User" u
JOIN "therapist_profiles" tp ON tp."userId" = u."id"
WHERE tp."directoryOnly" = true
  AND lower(o."toEmail") = lower(u."email")
  AND 'therapist-invite' = ANY(o."tags")
  AND o."status" IN ('QUEUED', 'FAILED');
