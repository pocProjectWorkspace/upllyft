-- Care Journey — UAT Tranche 4 (#14): per-weekday session timing on the care plan.
-- Additive, idempotent. { "1": "16:00", "3": "15:00" } (weekday → HH:mm).
ALTER TABLE "care_plans" ADD COLUMN IF NOT EXISTS "daySchedule" JSONB;
