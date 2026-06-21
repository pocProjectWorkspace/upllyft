-- UAE Clinic Management — Phase 4 (safety / incident / discharge / retention). Idempotent.

-- ── Enums ──────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE "IncidentCategory" AS ENUM ('MEDICAL_INSTABILITY','MENTAL_HEALTH_RISK','SAFEGUARDING','SEVERE_BEHAVIOUR','ABUSE_NEGLECT','OUT_OF_SCOPE','OTHER'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "IncidentUrgency" AS ENUM ('EMERGENCY','URGENT','ROUTINE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "IncidentStatus" AS ENUM ('OPEN','IN_REVIEW','ACTION_TAKEN','CLOSED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ExternalRecipientType" AS ENUM ('SCHOOL','PHYSICIAN','SPECIALIST','HOSPITAL','INSURER','OTHER_PROVIDER','PARENT'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Case: discharge split + archive/retention/reactivation ──
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "clinicalDischargeReason" TEXT;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "adminDischargeReason" TEXT;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "dischargeSummaryDocId" TEXT;
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "retentionUntil" TIMESTAMP(3);
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "reactivatedAt" TIMESTAMP(3);
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "reactivatedFromId" TEXT;

-- ── New tables ──
CREATE TABLE IF NOT EXISTS "case_incidents" (
  "id" TEXT NOT NULL,
  "caseId" TEXT, "childId" TEXT,
  "raisedById" TEXT NOT NULL,
  "raisedFromModule" TEXT,
  "category" "IncidentCategory" NOT NULL,
  "urgency" "IncidentUrgency" NOT NULL DEFAULT 'ROUTINE',
  "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
  "ownerId" TEXT,
  "description" TEXT NOT NULL,
  "clinicalDecision" TEXT, "actionPlan" TEXT,
  "closedAt" TIMESTAMP(3), "closedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "case_incidents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "case_incidents_caseId_idx" ON "case_incidents"("caseId");
CREATE INDEX IF NOT EXISTS "case_incidents_status_idx" ON "case_incidents"("status");
CREATE INDEX IF NOT EXISTS "case_incidents_urgency_idx" ON "case_incidents"("urgency");

CREATE TABLE IF NOT EXISTS "external_shares" (
  "id" TEXT NOT NULL,
  "caseId" TEXT,
  "recipientName" TEXT NOT NULL,
  "recipientType" "ExternalRecipientType" NOT NULL,
  "consentId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "accessCount" INTEGER NOT NULL DEFAULT 0,
  "lastAccessedAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "external_shares_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "external_shares_token_key" ON "external_shares"("token");
CREATE INDEX IF NOT EXISTS "external_shares_caseId_idx" ON "external_shares"("caseId");
CREATE INDEX IF NOT EXISTS "external_shares_token_idx" ON "external_shares"("token");

-- ── Foreign keys (guarded) ──
DO $$ BEGIN ALTER TABLE "case_incidents" ADD CONSTRAINT "case_incidents_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "case_incidents" ADD CONSTRAINT "case_incidents_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "case_incidents" ADD CONSTRAINT "case_incidents_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "external_shares" ADD CONSTRAINT "external_shares_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "external_shares" ADD CONSTRAINT "external_shares_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
