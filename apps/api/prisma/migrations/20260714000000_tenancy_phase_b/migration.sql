-- Multi-setting tenancy — Phase B (docs/tenancy-and-multi-setting-model.md). Idempotent.
--
-- ADDITIVE ONLY. Nothing reads these tables yet; `clinics` remains the live model
-- until readers are migrated (Phase D). No existing column is dropped or altered
-- except `organizations.kind`, which is added with a default.
--
-- Root problem: `children.clinicId` is a single nullable FK, so a child enrolled
-- at a nursery AND referred to a clinic cannot be both — which is exactly the
-- referral loop the nursery proposition depends on. `child_affiliations` fixes it.

-- ── Enum extensions ────────────────────────────────────────────────────────
-- Education regulators. A nursery is licensed by KHDA/ADEK/MOE, never by DHA —
-- which is why a nursery cannot just be a `clinic` row with a type flag.
-- (ADD VALUE IF NOT EXISTS is a no-op when already present. The new values are
-- not referenced elsewhere in this migration, so same-transaction use is avoided.)
ALTER TYPE "LicenseAuthority" ADD VALUE IF NOT EXISTS 'KHDA';
ALTER TYPE "LicenseAuthority" ADD VALUE IF NOT EXISTS 'ADEK';
ALTER TYPE "LicenseAuthority" ADD VALUE IF NOT EXISTS 'MOE';

-- ── New enums ──────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE "OrgKind" AS ENUM ('CLINIC_GROUP','NURSERY_GROUP','SCHOOL_GROUP','NGO','PLATFORM'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "FacilityType" AS ENUM ('CLINIC','NURSERY','SCHOOL'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "AffiliationType" AS ENUM ('PATIENT','ENROLLED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "AffiliationStatus" AS ENUM ('PENDING_CONSENT','ACTIVE','ENDED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "DataScope" AS ENUM ('OBSERVATIONS_ONLY','SCREENING_SHARED','CLINICAL_SUMMARY','FULL_CLINICAL'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "FacilityRole" AS ENUM ('OWNER','ADMIN','CLINICAL_LEAD','THERAPIST','INCLUSION_LEAD','KEYWORKER','RECEPTION','BILLING'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── organizations.kind ─────────────────────────────────────────────────────
-- The discriminator Organization has always lacked: clinic group vs nursery group
-- vs NGO were previously indistinguishable.
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "kind" "OrgKind" NOT NULL DEFAULT 'CLINIC_GROUP';
CREATE INDEX IF NOT EXISTS "Organization_kind_idx" ON "Organization"("kind");

-- ── facilities ─────────────────────────────────────────────────────────────
-- Generalises `clinics`. Note what is deliberately ABSENT vs clinics:
--   * no `adminId UNIQUE` — administration comes from facility_members, so a
--     group may run many sites and a person may administer several.
--   * `organizationId` is NOT NULL — every facility belongs to an account.
CREATE TABLE IF NOT EXISTS "facilities" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "type" "FacilityType" NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "licenseNo" TEXT,
  "licenseAuthority" "LicenseAuthority",
  "emirate" "Emirate",
  "complianceStatus" "FacilityComplianceStatus" NOT NULL DEFAULT 'DRAFT',
  "complianceReviewedAt" TIMESTAMP(3),
  "complianceReviewedBy" TEXT,
  "logoUrl" TEXT,
  "primaryColor" TEXT,
  "address" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "migratedFromClinicId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "facilities_slug_key" ON "facilities"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "facilities_migratedFromClinicId_key" ON "facilities"("migratedFromClinicId");
CREATE INDEX IF NOT EXISTS "facilities_organizationId_idx" ON "facilities"("organizationId");
CREATE INDEX IF NOT EXISTS "facilities_type_idx" ON "facilities"("type");
CREATE INDEX IF NOT EXISTS "facilities_complianceStatus_idx" ON "facilities"("complianceStatus");

DO $$ BEGIN
  ALTER TABLE "facilities" ADD CONSTRAINT "facilities_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── rooms ──────────────────────────────────────────────────────────────────
-- The cohort primitive. Gives a nursery roster with NO new tenancy concept.
CREATE TABLE IF NOT EXISTS "rooms" (
  "id" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "ageBandLabel" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "rooms_facilityId_name_key" ON "rooms"("facilityId","name");
CREATE INDEX IF NOT EXISTS "rooms_facilityId_idx" ON "rooms"("facilityId");

DO $$ BEGIN
  ALTER TABLE "rooms" ADD CONSTRAINT "rooms_facilityId_fkey"
    FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── facility_members ───────────────────────────────────────────────────────
-- Replaces `clinics.adminId UNIQUE` and `therapist_profiles.clinicId`.
CREATE TABLE IF NOT EXISTS "facility_members" (
  "id" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "FacilityRole" NOT NULL,
  "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "facility_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "facility_members_userId_facilityId_key" ON "facility_members"("userId","facilityId");
CREATE INDEX IF NOT EXISTS "facility_members_facilityId_role_idx" ON "facility_members"("facilityId","role");
CREATE INDEX IF NOT EXISTS "facility_members_userId_idx" ON "facility_members"("userId");

DO $$ BEGIN
  ALTER TABLE "facility_members" ADD CONSTRAINT "facility_members_facilityId_fkey"
    FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "facility_members" ADD CONSTRAINT "facility_members_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── _RoomStaff (implicit m:n Room <-> FacilityMember) ───────────────────────
-- Prisma's implicit m:n join table: composite PRIMARY KEY on (A,B), not a unique
-- index. Getting this wrong shows up as permanent schema drift.
CREATE TABLE IF NOT EXISTS "_RoomStaff" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  CONSTRAINT "_RoomStaff_AB_pkey" PRIMARY KEY ("A","B")
);
CREATE INDEX IF NOT EXISTS "_RoomStaff_B_index" ON "_RoomStaff"("B");

DO $$ BEGIN
  ALTER TABLE "_RoomStaff" ADD CONSTRAINT "_RoomStaff_A_fkey"
    FOREIGN KEY ("A") REFERENCES "facility_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "_RoomStaff" ADD CONSTRAINT "_RoomStaff_B_fkey"
    FOREIGN KEY ("B") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── child_affiliations ─────────────────────────────────────────────────────
-- THE load-bearing table. A child holds N affiliations CONCURRENTLY: enrolled at
-- a nursery while a patient at a clinic is the normal case, not an edge case.
-- Every access decision routes through here, which is what makes the unsafe query
-- the hard one to write.
CREATE TABLE IF NOT EXISTS "child_affiliations" (
  "id" TEXT NOT NULL,
  "childId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "type" "AffiliationType" NOT NULL,
  "status" "AffiliationStatus" NOT NULL DEFAULT 'PENDING_CONSENT',
  "dataScope" "DataScope" NOT NULL DEFAULT 'OBSERVATIONS_ONLY',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "roomId" TEXT,
  "keyworkerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "child_affiliations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "child_affiliations_childId_facilityId_startedAt_key" ON "child_affiliations"("childId","facilityId","startedAt");
CREATE INDEX IF NOT EXISTS "child_affiliations_childId_idx" ON "child_affiliations"("childId");
CREATE INDEX IF NOT EXISTS "child_affiliations_facilityId_status_idx" ON "child_affiliations"("facilityId","status");
CREATE INDEX IF NOT EXISTS "child_affiliations_roomId_idx" ON "child_affiliations"("roomId");
CREATE INDEX IF NOT EXISTS "child_affiliations_keyworkerId_idx" ON "child_affiliations"("keyworkerId");

DO $$ BEGIN
  ALTER TABLE "child_affiliations" ADD CONSTRAINT "child_affiliations_childId_fkey"
    FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "child_affiliations" ADD CONSTRAINT "child_affiliations_facilityId_fkey"
    FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "child_affiliations" ADD CONSTRAINT "child_affiliations_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "child_affiliations" ADD CONSTRAINT "child_affiliations_keyworkerId_fkey"
    FOREIGN KEY ("keyworkerId") REFERENCES "facility_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
