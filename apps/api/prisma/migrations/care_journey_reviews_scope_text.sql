-- Care Journey — UAT Tranche 1 (#18): free-text assessment scope on Assessment Reviews.
-- Additive, idempotent.
ALTER TABLE "assessment_reviews" ADD COLUMN IF NOT EXISTS "scopeText" TEXT;
