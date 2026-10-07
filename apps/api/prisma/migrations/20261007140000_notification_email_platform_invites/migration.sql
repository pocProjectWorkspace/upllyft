-- Notification emails + parent invitations. Additive and IDEMPOTENT.

-- When a notification went out by email (instantly or in a digest).
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "emailedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Notification_emailedAt_createdAt_idx" ON "Notification"("emailedAt", "createdAt");

-- Existing notifications are history, not news: mark them as already handled so the
-- first daily digest does not email everyone their backlog.
UPDATE "Notification" SET "emailedAt" = "createdAt" WHERE "emailedAt" IS NULL AND "createdAt" < now();

-- Family invitations from platform admins and organisation admins.
CREATE TABLE IF NOT EXISTS "platform_invitations" (
    "id"             TEXT NOT NULL,
    "email"          TEXT NOT NULL,
    "name"           TEXT,
    "organizationId" TEXT,
    "token"          TEXT NOT NULL,
    "status"         TEXT NOT NULL DEFAULT 'PENDING',
    "invitedById"    TEXT NOT NULL,
    "expiresAt"      TIMESTAMP(3) NOT NULL,
    "acceptedAt"     TIMESTAMP(3),
    "acceptedUserId" TEXT,
    "sentCount"      INTEGER NOT NULL DEFAULT 1,
    "lastSentAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "platform_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_invitations_token_key" ON "platform_invitations"("token");
CREATE INDEX IF NOT EXISTS "platform_invitations_email_idx" ON "platform_invitations"("email");
CREATE INDEX IF NOT EXISTS "platform_invitations_organizationId_status_idx" ON "platform_invitations"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "platform_invitations_status_createdAt_idx" ON "platform_invitations"("status", "createdAt");

DO $$ BEGIN
  ALTER TABLE "platform_invitations" ADD CONSTRAINT "platform_invitations_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "platform_invitations" ADD CONSTRAINT "platform_invitations_invitedById_fkey"
    FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
