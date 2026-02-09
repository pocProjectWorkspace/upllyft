-- AlterTable
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "parentOnboardingEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "therapistOnboardingEnabled" BOOLEAN NOT NULL DEFAULT true;
