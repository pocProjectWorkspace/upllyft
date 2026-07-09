-- Organization brand colors (primary / secondary / accent).
-- Nullable: orgs without colors fall back to the Upllyft teal defaults in the UI.

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "primaryColor" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "secondaryColor" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "accentColor" TEXT;
