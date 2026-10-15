-- Legal acceptance record (Terms, Privacy, 18+). Additive and IDEMPOTENT.
CREATE TABLE IF NOT EXISTS "legal_acceptances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "edition" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "statementHash" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "legal_acceptances_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "legal_acceptances_userId_documentType_idx" ON "legal_acceptances"("userId", "documentType");

DO $$ BEGIN
  ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
