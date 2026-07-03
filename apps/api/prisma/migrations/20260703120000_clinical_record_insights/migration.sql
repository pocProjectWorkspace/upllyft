-- Clinical record AI insights (Anthropic). Additive, idempotent.
ALTER TABLE "clinical_records" ADD COLUMN IF NOT EXISTS "insights" JSONB;
ALTER TABLE "clinical_records" ADD COLUMN IF NOT EXISTS "insightsModel" TEXT;
ALTER TABLE "clinical_records" ADD COLUMN IF NOT EXISTS "insightsGeneratedAt" TIMESTAMP(3);
