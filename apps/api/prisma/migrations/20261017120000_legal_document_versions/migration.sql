-- Admin-managed, versioned legal documents (Terms, Privacy, agreements). Additive and IDEMPOTENT.
-- Rows are seeded by the API on start-up (src/legal/legal-seed.ts), not here.
CREATE TABLE IF NOT EXISTS "legal_document_versions" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "edition" TEXT NOT NULL DEFAULT 'GLOBAL',
    "version" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "changeSummary" TEXT,
    "acceptanceVersion" TEXT,
    "createdById" TEXT,
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "legal_document_versions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "legal_document_versions_type_edition_version_key" ON "legal_document_versions"("type", "edition", "version");
CREATE INDEX IF NOT EXISTS "legal_document_versions_type_edition_status_idx" ON "legal_document_versions"("type", "edition", "status");
