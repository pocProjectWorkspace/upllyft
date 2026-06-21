-- UAE Clinic Management — Phase 2
-- Payer / insurance / pre-authorisation + billing-coordinator role. Idempotent.

-- ── Enums ──────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE "PayerType" AS ENUM ('SELF_PAY','INSURANCE','EMPLOYER','SCHOOL_SPONSOR','NGO_SPONSOR','OTHER_THIRD_PARTY'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "PreAuthStatus" AS ENUM ('NOT_REQUIRED','PENDING','APPROVED','DENIED','EXPIRED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "FinancialClearanceStatus" AS ENUM ('NOT_REQUIRED','PENDING','CLEARED','EXCEPTION_APPROVED','BLOCKED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "SessionModality" AS ENUM ('IN_PERSON','TELEHEALTH','HYBRID'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Billing/insurance coordinator role
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'BILLING';

-- ── SessionType: modality + payer config ──
ALTER TABLE "session_types" ADD COLUMN IF NOT EXISTS "modality" "SessionModality" NOT NULL DEFAULT 'IN_PERSON';
ALTER TABLE "session_types" ADD COLUMN IF NOT EXISTS "serviceCode" TEXT;
ALTER TABLE "session_types" ADD COLUMN IF NOT EXISTS "payerRoute" "PayerType";
ALTER TABLE "session_types" ADD COLUMN IF NOT EXISTS "requiresPreAuth" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "session_types" ADD COLUMN IF NOT EXISTS "insuranceEligible" BOOLEAN NOT NULL DEFAULT false;

-- ── Booking: modality + payer route + financial clearance ──
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "modality" "SessionModality";
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "paymentRoute" "PayerType" NOT NULL DEFAULT 'SELF_PAY';
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "financialClearance" "FinancialClearanceStatus" NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "clearanceApprovedById" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "preAuthorizationId" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "depositAmount" DOUBLE PRECISION;

-- ── CaseBilling: payer-aware billing ──
ALTER TABLE "case_billing" ADD COLUMN IF NOT EXISTS "payerType" "PayerType" NOT NULL DEFAULT 'SELF_PAY';
ALTER TABLE "case_billing" ADD COLUMN IF NOT EXISTS "insurancePolicyId" TEXT;
ALTER TABLE "case_billing" ADD COLUMN IF NOT EXISTS "preAuthorizationId" TEXT;

-- ── Invoice: payer-aware invoicing ──
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "payerType" "PayerType" NOT NULL DEFAULT 'SELF_PAY';
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "insurancePolicyId" TEXT;

-- ── New tables ──
CREATE TABLE IF NOT EXISTS "insurance_policies" (
  "id" TEXT NOT NULL,
  "childId" TEXT NOT NULL,
  "payerType" "PayerType" NOT NULL DEFAULT 'INSURANCE',
  "insurerName" TEXT,
  "sponsorName" TEXT,
  "policyNumber" TEXT,
  "memberId" TEXT,
  "cardDocumentUrl" TEXT,
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "coPayPercent" DOUBLE PRECISION,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "insurance_policies_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "insurance_policies_childId_idx" ON "insurance_policies"("childId");

CREATE TABLE IF NOT EXISTS "pre_authorizations" (
  "id" TEXT NOT NULL,
  "policyId" TEXT NOT NULL,
  "caseId" TEXT,
  "serviceCode" TEXT,
  "preAuthNumber" TEXT,
  "status" "PreAuthStatus" NOT NULL DEFAULT 'PENDING',
  "approvedSessions" INTEGER,
  "usedSessions" INTEGER NOT NULL DEFAULT 0,
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "denialReason" TEXT,
  "renewedFromId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pre_authorizations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "pre_authorizations_renewedFromId_key" ON "pre_authorizations"("renewedFromId");
CREATE INDEX IF NOT EXISTS "pre_authorizations_policyId_idx" ON "pre_authorizations"("policyId");
CREATE INDEX IF NOT EXISTS "pre_authorizations_caseId_idx" ON "pre_authorizations"("caseId");
CREATE INDEX IF NOT EXISTS "pre_authorizations_status_idx" ON "pre_authorizations"("status");

-- ── Foreign keys (guarded) ──
DO $$ BEGIN ALTER TABLE "insurance_policies" ADD CONSTRAINT "insurance_policies_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "pre_authorizations" ADD CONSTRAINT "pre_authorizations_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "insurance_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "pre_authorizations" ADD CONSTRAINT "pre_authorizations_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "pre_authorizations" ADD CONSTRAINT "pre_authorizations_renewedFromId_fkey" FOREIGN KEY ("renewedFromId") REFERENCES "pre_authorizations"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
