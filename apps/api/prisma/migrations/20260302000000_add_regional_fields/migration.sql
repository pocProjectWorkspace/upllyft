-- Add regional fields to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "preferredRegion" TEXT;

-- Add region to Organization
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "region" TEXT;

-- Enrich Clinic for public browsing
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "rating" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "totalReviews" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT true;
