-- Add ssoSource column to User for OneVoice SSO integration tracking.
-- Idempotent so it's safe to re-run.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ssoSource" TEXT;
