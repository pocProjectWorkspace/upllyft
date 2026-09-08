-- Parent module feedback (Aug 2026):
--  * children are captured with a family name alongside the given name
--  * a guardian who selects "Parent" picks the specific tie (Mother, Father, ...)
ALTER TABLE "children" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "relationshipDetail" TEXT;
