-- F3 — parent claim for facility-created children.
--
-- Hand-written and IDEMPOTENT: `prisma migrate` cannot run against this database
-- (pgvector breaks shadow-db creation, and `_prisma_migrations` is empty on prod),
-- so migrations are applied by psql and must tolerate a re-run.
--
-- Purely additive: one new enum, one new table. Nothing existing is altered, so
-- this is safe to apply BEFORE the code that reads it ships.

-- ─── enum ────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChildClaimStatus') THEN
    CREATE TYPE "ChildClaimStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DISPUTED', 'EXPIRED', 'REVOKED');
  END IF;
END
$$;

-- ─── table ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "child_claims" (
  "id"                      TEXT NOT NULL,
  -- SHA-256 of the emailed token. The raw token is never stored: a leaked database
  -- must not yield working claim links to children's records.
  "tokenHash"               TEXT NOT NULL,
  "childId"                 TEXT NOT NULL,
  "affiliationId"           TEXT NOT NULL,
  "facilityId"              TEXT NOT NULL,
  -- The guardian's real email lives HERE, not on a User row. That is what keeps
  -- their address free for the account they will knowingly create themselves.
  "guardianEmail"           TEXT NOT NULL,
  "guardianName"            TEXT NOT NULL,
  "status"                  "ChildClaimStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt"               TIMESTAMP(3) NOT NULL,
  "claimedAt"               TIMESTAMP(3),
  "claimedByUserId"         TEXT,
  "mergedFromPlaceholderId" TEXT,
  "disputeReason"           TEXT,
  "createdById"             TEXT NOT NULL,
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMP(3) NOT NULL,

  CONSTRAINT "child_claims_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "child_claims_tokenHash_key"   ON "child_claims"("tokenHash");
CREATE INDEX        IF NOT EXISTS "child_claims_facilityId_status_idx" ON "child_claims"("facilityId", "status");
CREATE INDEX        IF NOT EXISTS "child_claims_guardianEmail_idx"     ON "child_claims"("guardianEmail");
CREATE INDEX        IF NOT EXISTS "child_claims_childId_idx"           ON "child_claims"("childId");

-- ─── foreign keys ────────────────────────────────────────────────────────────
-- Added conditionally: ADD CONSTRAINT has no IF NOT EXISTS in Postgres.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'child_claims_childId_fkey') THEN
    ALTER TABLE "child_claims" ADD CONSTRAINT "child_claims_childId_fkey"
      FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'child_claims_affiliationId_fkey') THEN
    ALTER TABLE "child_claims" ADD CONSTRAINT "child_claims_affiliationId_fkey"
      FOREIGN KEY ("affiliationId") REFERENCES "child_affiliations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'child_claims_facilityId_fkey') THEN
    ALTER TABLE "child_claims" ADD CONSTRAINT "child_claims_facilityId_fkey"
      FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  -- SetNull, not Cascade: if the claiming user is deleted we keep the claim record.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'child_claims_claimedByUserId_fkey') THEN
    ALTER TABLE "child_claims" ADD CONSTRAINT "child_claims_claimedByUserId_fkey"
      FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'child_claims_createdById_fkey') THEN
    ALTER TABLE "child_claims" ADD CONSTRAINT "child_claims_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
