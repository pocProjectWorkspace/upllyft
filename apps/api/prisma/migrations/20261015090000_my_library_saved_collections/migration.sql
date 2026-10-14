-- Therapist My Library v2: saved Resource Library items and collections.
-- Additive and IDEMPOTENT (safe to re-run on the shared DB).

CREATE TABLE IF NOT EXISTS "saved_resources" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "worksheetId" TEXT,
    "libraryResourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saved_resources_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "saved_resources_userId_worksheetId_key" ON "saved_resources"("userId", "worksheetId");
CREATE UNIQUE INDEX IF NOT EXISTS "saved_resources_userId_libraryResourceId_key" ON "saved_resources"("userId", "libraryResourceId");
CREATE INDEX IF NOT EXISTS "saved_resources_userId_createdAt_idx" ON "saved_resources"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "resource_collections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "resource_collections_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "resource_collections_userId_idx" ON "resource_collections"("userId");

CREATE TABLE IF NOT EXISTS "resource_collection_items" (
    "collectionId" TEXT NOT NULL,
    "savedResourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "resource_collection_items_pkey" PRIMARY KEY ("collectionId", "savedResourceId")
);
CREATE INDEX IF NOT EXISTS "resource_collection_items_savedResourceId_idx" ON "resource_collection_items"("savedResourceId");

DO $$ BEGIN
  ALTER TABLE "saved_resources" ADD CONSTRAINT "saved_resources_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "saved_resources" ADD CONSTRAINT "saved_resources_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "worksheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "saved_resources" ADD CONSTRAINT "saved_resources_libraryResourceId_fkey" FOREIGN KEY ("libraryResourceId") REFERENCES "library_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "resource_collections" ADD CONSTRAINT "resource_collections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "resource_collection_items" ADD CONSTRAINT "resource_collection_items_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "resource_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "resource_collection_items" ADD CONSTRAINT "resource_collection_items_savedResourceId_fkey" FOREIGN KEY ("savedResourceId") REFERENCES "saved_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
