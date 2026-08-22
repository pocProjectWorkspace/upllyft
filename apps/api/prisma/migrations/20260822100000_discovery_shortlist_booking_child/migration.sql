-- Parent discovery phase 4 — shortlist ("Save" on providers) + which child a booking is
-- for. Hand-written and IDEMPOTENT (`prisma migrate` cannot run against this database).
-- Purely additive: one nullable column, one table. Safe to apply before the code ships.

-- ─── bookings.childId ────────────────────────────────────────────────────────
-- Nullable: bookings pre-date children here, and an adult can book for themselves.
-- SET NULL: removing a child must not delete the financial/booking record.
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "childId" TEXT;

CREATE INDEX IF NOT EXISTS "bookings_childId_idx" ON "bookings"("childId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_childId_fkey') THEN
    ALTER TABLE "bookings" ADD CONSTRAINT "bookings_childId_fkey"
      FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- ─── shortlist_entries ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "shortlist_entries" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "therapistId" TEXT,
  "clinicId"    TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "shortlist_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "shortlist_entries_userId_therapistId_key" ON "shortlist_entries"("userId", "therapistId");
CREATE UNIQUE INDEX IF NOT EXISTS "shortlist_entries_userId_clinicId_key"    ON "shortlist_entries"("userId", "clinicId");
CREATE INDEX IF NOT EXISTS "shortlist_entries_userId_idx" ON "shortlist_entries"("userId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shortlist_entries_userId_fkey') THEN
    ALTER TABLE "shortlist_entries" ADD CONSTRAINT "shortlist_entries_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shortlist_entries_therapistId_fkey') THEN
    ALTER TABLE "shortlist_entries" ADD CONSTRAINT "shortlist_entries_therapistId_fkey"
      FOREIGN KEY ("therapistId") REFERENCES "therapist_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shortlist_entries_clinicId_fkey') THEN
    ALTER TABLE "shortlist_entries" ADD CONSTRAINT "shortlist_entries_clinicId_fkey"
      FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
