-- UAE Clinic Management — Phase 3 (clinical orchestration)
-- Lead funnel, triage/pathway, telehealth metadata, MDT + report approval,
-- care-plan activation, review engine, clinical flags/addendum, EHR export.
-- Idempotent.

-- ── Enums ──────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE "LeadChannel" AS ENUM ('WEBSITE','WHATSAPP','SOCIAL','PHONE','REFERRAL','INSURER','WALK_IN','OTHER'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "LeadStatus" AS ENUM ('NEW','CONTACTED','QUALIFIED','WAITLISTED','CONVERTED','OUT_OF_SCOPE','DUPLICATE','CLOSED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ClinicRole" AS ENUM ('THERAPIST','CLINICAL_LEAD','MEDICAL_DIRECTOR','CARE_COORDINATOR'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "TriageStatus" AS ENUM ('PENDING','IN_REVIEW','DECIDED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "TriageDecision" AS ENUM ('PROCEED','REQUEST_MORE_INFO','URGENT_REFERRAL','ALTERNATE_SERVICE','OUT_OF_SCOPE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "RiskLevel" AS ENUM ('NONE','LOW','MODERATE','HIGH'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "TelehealthPlatform" AS ENUM ('GOOGLE_MEET','ZOOM','MS_TEAMS','WHATSAPP','OTHER'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "MdtReviewStatus" AS ENUM ('SCHEDULED','COMPLETED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ReportStatus" AS ENUM ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ReportAudience" AS ENUM ('PROFESSIONAL','PARENT'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ClinicalFlagType" AS ENUM ('REGRESSION','NEW_RISK','POOR_PROGRESS','PLAN_REVIEW'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ReviewTriggerType" AS ENUM ('PLAN_DATE','SESSION_COUNT','AUTH_EXPIRY','GOAL_PROGRESS','CLINICAL_FLAG','MANUAL'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ReviewStatus" AS ENUM ('DUE','IN_PROGRESS','COMPLETED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "EhrExportFormat" AS ENUM ('PDF','FHIR','STRUCTURED_JSON'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "EhrExportStatus" AS ENUM ('PENDING','EXPORTED','RECONCILED','FAILED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Field additions on existing tables ──
ALTER TABLE "therapist_profiles" ADD COLUMN IF NOT EXISTS "clinicRole" "ClinicRole" NOT NULL DEFAULT 'THERAPIST';

ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "pathwayTemplateId" TEXT;

ALTER TABLE "case_sessions" ADD COLUMN IF NOT EXISTS "treatmentPlanId" TEXT;
ALTER TABLE "case_sessions" ADD COLUMN IF NOT EXISTS "clinicalFlag" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "case_sessions" ADD COLUMN IF NOT EXISTS "flagType" "ClinicalFlagType";
ALTER TABLE "case_sessions" ADD COLUMN IF NOT EXISTS "flagReason" TEXT;
ALTER TABLE "case_sessions" ADD COLUMN IF NOT EXISTS "ehrRef" TEXT;
ALTER TABLE "case_sessions" ADD COLUMN IF NOT EXISTS "exportedToEhrAt" TIMESTAMP(3);

ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "audience" "ReportAudience" NOT NULL DEFAULT 'PROFESSIONAL';
ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "approvedById" TEXT;
ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "parentVersionId" TEXT;
ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "mdtReviewId" TEXT;
ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "downloadCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "lastDownloadedAt" TIMESTAMP(3);
ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "ehrRef" TEXT;
ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "exportedToEhrAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "case_documents_parentVersionId_key" ON "case_documents"("parentVersionId");
-- Grandfather: existing documents are already shareable, so mark them APPROVED.
UPDATE "case_documents" SET "status" = 'APPROVED' WHERE "status" = 'DRAFT';

ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "frequency" TEXT;
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "sessionsPlanned" INTEGER;
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "reviewIntervalDays" INTEGER;
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP(3);
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "parentAcceptedAt" TIMESTAMP(3);

ALTER TABLE "iep_goals" ADD COLUMN IF NOT EXISTS "frequency" TEXT;
ALTER TABLE "iep_goals" ADD COLUMN IF NOT EXISTS "baselineValue" DOUBLE PRECISION;
ALTER TABLE "iep_goals" ADD COLUMN IF NOT EXISTS "reviewIntervalDays" INTEGER;

-- ── New tables ──
CREATE TABLE IF NOT EXISTS "leads" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "channel" "LeadChannel" NOT NULL DEFAULT 'WEBSITE',
  "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
  "concern" TEXT, "childAge" TEXT, "preferredBranch" TEXT, "language" TEXT,
  "payerIndication" "PayerType",
  "contactName" TEXT, "contactPhone" TEXT, "contactEmail" TEXT,
  "referralSource" TEXT, "referrerName" TEXT, "referrerOrg" TEXT, "referrerContact" TEXT, "referrerConsentId" TEXT,
  "assignedToId" TEXT, "qualifiedAt" TIMESTAMP(3), "closeReason" TEXT,
  "convertedChildId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "leads_convertedChildId_key" ON "leads"("convertedChildId");
CREATE INDEX IF NOT EXISTS "leads_clinicId_idx" ON "leads"("clinicId");
CREATE INDEX IF NOT EXISTS "leads_status_idx" ON "leads"("status");
CREATE INDEX IF NOT EXISTS "leads_channel_idx" ON "leads"("channel");

CREATE TABLE IF NOT EXISTS "pathway_templates" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT,
  "name" TEXT NOT NULL,
  "serviceCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "generates" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pathway_templates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "pathway_templates_clinicId_idx" ON "pathway_templates"("clinicId");

CREATE TABLE IF NOT EXISTS "triage_reviews" (
  "id" TEXT NOT NULL,
  "caseId" TEXT, "leadId" TEXT,
  "reviewedById" TEXT NOT NULL,
  "status" "TriageStatus" NOT NULL DEFAULT 'PENDING',
  "decision" "TriageDecision",
  "riskLevel" "RiskLevel" NOT NULL DEFAULT 'NONE',
  "aiSummary" TEXT, "notes" TEXT,
  "pathwayTemplateId" TEXT,
  "acknowledgedByGuardianAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "triage_reviews_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "triage_reviews_caseId_idx" ON "triage_reviews"("caseId");
CREATE INDEX IF NOT EXISTS "triage_reviews_status_idx" ON "triage_reviews"("status");

CREATE TABLE IF NOT EXISTS "telehealth_encounters" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "platform" "TelehealthPlatform" NOT NULL DEFAULT 'GOOGLE_MEET',
  "clinicianLicence" TEXT, "clinicianLocation" TEXT, "patientLocation" TEXT, "telehealthConsentId" TEXT,
  "startedAt" TIMESTAMP(3), "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "telehealth_encounters_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "telehealth_encounters_sessionId_key" ON "telehealth_encounters"("sessionId");

CREATE TABLE IF NOT EXISTS "mdt_reviews" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3),
  "status" "MdtReviewStatus" NOT NULL DEFAULT 'SCHEDULED',
  "summary" TEXT, "conductedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mdt_reviews_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "mdt_reviews_caseId_idx" ON "mdt_reviews"("caseId");

CREATE TABLE IF NOT EXISTS "mdt_attendees" (
  "id" TEXT NOT NULL,
  "mdtReviewId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "attended" BOOLEAN NOT NULL DEFAULT false,
  "approvedAt" TIMESTAMP(3),
  CONSTRAINT "mdt_attendees_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "mdt_attendees_mdtReviewId_userId_key" ON "mdt_attendees"("mdtReviewId","userId");
CREATE INDEX IF NOT EXISTS "mdt_attendees_mdtReviewId_idx" ON "mdt_attendees"("mdtReviewId");

CREATE TABLE IF NOT EXISTS "session_addendums" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "session_addendums_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "session_addendums_sessionId_idx" ON "session_addendums"("sessionId");

CREATE TABLE IF NOT EXISTS "case_reviews" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "treatmentPlanId" TEXT,
  "triggerType" "ReviewTriggerType" NOT NULL,
  "status" "ReviewStatus" NOT NULL DEFAULT 'DUE',
  "dueAt" TIMESTAMP(3),
  "completedById" TEXT, "outcome" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "case_reviews_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "case_reviews_caseId_idx" ON "case_reviews"("caseId");
CREATE INDEX IF NOT EXISTS "case_reviews_status_idx" ON "case_reviews"("status");

CREATE TABLE IF NOT EXISTS "ehr_exports" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "format" "EhrExportFormat" NOT NULL DEFAULT 'PDF',
  "status" "EhrExportStatus" NOT NULL DEFAULT 'PENDING',
  "payloadUrl" TEXT, "ehrRef" TEXT, "exportedById" TEXT, "reconciledAt" TIMESTAMP(3), "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ehr_exports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ehr_exports_clinicId_idx" ON "ehr_exports"("clinicId");
CREATE INDEX IF NOT EXISTS "ehr_exports_resourceType_resourceId_idx" ON "ehr_exports"("resourceType","resourceId");
CREATE INDEX IF NOT EXISTS "ehr_exports_status_idx" ON "ehr_exports"("status");

-- ── Foreign keys (guarded) ──
DO $$ BEGIN ALTER TABLE "leads" ADD CONSTRAINT "leads_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "leads" ADD CONSTRAINT "leads_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "leads" ADD CONSTRAINT "leads_convertedChildId_fkey" FOREIGN KEY ("convertedChildId") REFERENCES "children"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "pathway_templates" ADD CONSTRAINT "pathway_templates_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "triage_reviews" ADD CONSTRAINT "triage_reviews_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "triage_reviews" ADD CONSTRAINT "triage_reviews_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "triage_reviews" ADD CONSTRAINT "triage_reviews_pathwayTemplateId_fkey" FOREIGN KEY ("pathwayTemplateId") REFERENCES "pathway_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "telehealth_encounters" ADD CONSTRAINT "telehealth_encounters_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "case_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "mdt_reviews" ADD CONSTRAINT "mdt_reviews_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "mdt_reviews" ADD CONSTRAINT "mdt_reviews_conductedById_fkey" FOREIGN KEY ("conductedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "mdt_attendees" ADD CONSTRAINT "mdt_attendees_mdtReviewId_fkey" FOREIGN KEY ("mdtReviewId") REFERENCES "mdt_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "mdt_attendees" ADD CONSTRAINT "mdt_attendees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "session_addendums" ADD CONSTRAINT "session_addendums_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "case_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "session_addendums" ADD CONSTRAINT "session_addendums_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "case_reviews" ADD CONSTRAINT "case_reviews_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "case_reviews" ADD CONSTRAINT "case_reviews_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "treatment_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "case_reviews" ADD CONSTRAINT "case_reviews_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "ehr_exports" ADD CONSTRAINT "ehr_exports_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "ehr_exports" ADD CONSTRAINT "ehr_exports_exportedById_fkey" FOREIGN KEY ("exportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "case_documents" ADD CONSTRAINT "case_documents_parentVersionId_fkey" FOREIGN KEY ("parentVersionId") REFERENCES "case_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "case_documents" ADD CONSTRAINT "case_documents_mdtReviewId_fkey" FOREIGN KEY ("mdtReviewId") REFERENCES "mdt_reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
