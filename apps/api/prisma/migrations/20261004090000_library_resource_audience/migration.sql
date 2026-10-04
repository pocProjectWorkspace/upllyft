-- Library resource audience targeting + view-only files. Additive and IDEMPOTENT.
--
-- A resource's OWNER stays `scope` (+ organizationId). Who SEES it becomes:
--   audience        EVERYONE | ALL_ORGS | ORGS (the orgs in library_resource_organizations)
--   audienceSegment ALL | FAMILIES | STAFF
-- Backfill keeps every existing row's visibility exactly as it was:
--   PLATFORM     -> EVERYONE
--   ORGANIZATION -> ORGS targeting its own organization
--
-- storagePath is derived from the old public URL so files can be served by signed URLs.

ALTER TABLE "library_resources" ADD COLUMN IF NOT EXISTS "storagePath"     TEXT;
ALTER TABLE "library_resources" ADD COLUMN IF NOT EXISTS "audience"        TEXT    NOT NULL DEFAULT 'EVERYONE';
ALTER TABLE "library_resources" ADD COLUMN IF NOT EXISTS "audienceSegment" TEXT    NOT NULL DEFAULT 'ALL';
ALTER TABLE "library_resources" ADD COLUMN IF NOT EXISTS "downloadable"    BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "library_resource_organizations" (
  "resourceId"     TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  CONSTRAINT "library_resource_organizations_pkey" PRIMARY KEY ("resourceId", "organizationId")
);
CREATE INDEX IF NOT EXISTS "library_resource_organizations_organizationId_idx"
  ON "library_resource_organizations"("organizationId");

DO $$ BEGIN
  ALTER TABLE "library_resource_organizations" ADD CONSTRAINT "library_resource_organizations_resourceId_fkey"
    FOREIGN KEY ("resourceId") REFERENCES "library_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "library_resource_organizations" ADD CONSTRAINT "library_resource_organizations_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill (safe to re-run: only touches rows still on the defaults / missing targets).
UPDATE "library_resources"
   SET "audience" = 'ORGS'
 WHERE "scope" = 'ORGANIZATION' AND "audience" = 'EVERYONE';

INSERT INTO "library_resource_organizations" ("resourceId", "organizationId")
SELECT "id", "organizationId"
  FROM "library_resources"
 WHERE "scope" = 'ORGANIZATION' AND "organizationId" IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE "library_resources"
   SET "storagePath" = substring("fileUrl" from '/object/public/library-resources/(.+)$')
 WHERE "storagePath" IS NULL;
