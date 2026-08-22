-- Library resources — admin/org-uploaded files for the Resources app, with scoped
-- visibility (PLATFORM = everyone, ORGANIZATION = that org's members only).
--
-- Hand-written and IDEMPOTENT (`prisma migrate` cannot run against this database).
-- Purely additive: one enum, one table.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LibraryResourceScope') THEN
    CREATE TYPE "LibraryResourceScope" AS ENUM ('PLATFORM', 'ORGANIZATION');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "library_resources" (
  "id"             TEXT NOT NULL,
  "title"          TEXT NOT NULL,
  "description"    TEXT,
  "resourceType"   TEXT NOT NULL,
  "tags"           TEXT[] DEFAULT ARRAY[]::TEXT[],
  "fileUrl"        TEXT NOT NULL,
  "fileName"       TEXT NOT NULL,
  "mimeType"       TEXT NOT NULL,
  "fileSize"       INTEGER NOT NULL,
  "scope"          "LibraryResourceScope" NOT NULL,
  "organizationId" TEXT,
  "uploadedById"   TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "library_resources_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "library_resources_scope_createdAt_idx"  ON "library_resources"("scope", "createdAt");
CREATE INDEX IF NOT EXISTS "library_resources_organizationId_idx"   ON "library_resources"("organizationId");
CREATE INDEX IF NOT EXISTS "library_resources_resourceType_idx"     ON "library_resources"("resourceType");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'library_resources_organizationId_fkey') THEN
    ALTER TABLE "library_resources" ADD CONSTRAINT "library_resources_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'library_resources_uploadedById_fkey') THEN
    ALTER TABLE "library_resources" ADD CONSTRAINT "library_resources_uploadedById_fkey"
      FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
