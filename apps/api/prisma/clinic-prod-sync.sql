-- Clinic schema sync for production (Supabase project iqakryfvzrgvekqsfcvv)
-- Consolidated, idempotent, additive-only. Safe to run in Supabase SQL Editor.
-- Wrapped in a single transaction: all-or-nothing.
BEGIN;

-- ========================= 20260618000000_clinic_phase0_uae =========================
-- UAE Clinic Management — Phase 0
-- Licence authority context, facility compliance gating, and professional clinical scope.
-- Hand-written migration (pgvector shadow-DB caveat — see CLAUDE.md). Idempotent.

-- ── Enums ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "LicenseAuthority" AS ENUM ('DHA', 'DOH', 'MOHAP', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "Emirate" AS ENUM ('ABU_DHABI', 'DUBAI', 'SHARJAH', 'AJMAN', 'UMM_AL_QUWAIN', 'RAS_AL_KHAIMAH', 'FUJAIRAH');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "FacilityComplianceStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'ACTIVE', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Clinic: regulatory context + EHR integration pointers ───────────────────
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "licenseAuthority" "LicenseAuthority";
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "emirate" "Emirate";
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "complianceStatus" "FacilityComplianceStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "complianceReviewedAt" TIMESTAMP(3);
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "complianceReviewedBy" TEXT;
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "ehrSystemName" TEXT;
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "nabidhFacilityCode" TEXT;

-- Backfill: grandfather existing clinics to ACTIVE so the new compliance gate
-- does not disrupt live facilities (design decision). New clinics default DRAFT.
UPDATE "clinics" SET "complianceStatus" = 'ACTIVE' WHERE "complianceStatus" = 'DRAFT';

-- ── TherapistProfile: authority + clinical scope ────────────────────────────
ALTER TABLE "therapist_profiles" ADD COLUMN IF NOT EXISTS "licenseAuthority" "LicenseAuthority";
ALTER TABLE "therapist_profiles" ADD COLUMN IF NOT EXISTS "canDiagnose" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "therapist_profiles" ADD COLUMN IF NOT EXISTS "scopeOfPractice" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- ========================= 20260618010000_clinic_phase1_uae =========================
-- UAE Clinic Management — Phase 1
-- Identity, guardian, versioned/actionable consent, pre-visit tasks. Idempotent.

-- ── Enums ──────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE "IdentityDocType" AS ENUM ('EMIRATES_ID','PASSPORT','BIRTH_CERTIFICATE','OTHER'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "GuardianRelationship" AS ENUM ('MOTHER','FATHER','LEGAL_GUARDIAN','GRANDPARENT','SIBLING','OTHER'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "GuardianAccessLevel" AS ENUM ('FULL','LIMITED','VIEW_ONLY','NONE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "PreVisitTaskType" AS ENUM ('INTAKE_FORM','CONSENT','IDENTITY','DOCUMENT','PAYMENT','PREAUTH','QUESTIONNAIRE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "PreVisitTaskStatus" AS ENUM ('PENDING','IN_PROGRESS','COMPLETE','WAIVED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Extend ConsentType (add new values; safe/idempotent)
ALTER TYPE "ConsentType" ADD VALUE IF NOT EXISTS 'TELEHEALTH';
ALTER TYPE "ConsentType" ADD VALUE IF NOT EXISTS 'REPORT_SHARING';
ALTER TYPE "ConsentType" ADD VALUE IF NOT EXISTS 'COMMUNICATION';
ALTER TYPE "ConsentType" ADD VALUE IF NOT EXISTS 'DATA_PROCESSING';

-- ── Child: identity fields (emiratesId/passportNumber stored ENCRYPTED at app layer) ──
ALTER TABLE "children" ADD COLUMN IF NOT EXISTS "emiratesId" TEXT;
ALTER TABLE "children" ADD COLUMN IF NOT EXISTS "emiratesIdExpiry" TIMESTAMP(3);
ALTER TABLE "children" ADD COLUMN IF NOT EXISTS "passportNumber" TEXT;
ALTER TABLE "children" ADD COLUMN IF NOT EXISTS "identityType" "IdentityDocType";
ALTER TABLE "children" ADD COLUMN IF NOT EXISTS "identityVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "children" ADD COLUMN IF NOT EXISTS "identityVerifiedAt" TIMESTAMP(3);
ALTER TABLE "children" ADD COLUMN IF NOT EXISTS "identityVerifiedBy" TEXT;

-- ── CaseConsent: actionable, versioned consent ──
ALTER TABLE "case_consents" ADD COLUMN IF NOT EXISTS "consentVersionId" TEXT;
ALTER TABLE "case_consents" ADD COLUMN IF NOT EXISTS "purpose" TEXT;
ALTER TABLE "case_consents" ADD COLUMN IF NOT EXISTS "recipient" TEXT;
ALTER TABLE "case_consents" ADD COLUMN IF NOT EXISTS "scope" JSONB;
ALTER TABLE "case_consents" ADD COLUMN IF NOT EXISTS "grantedByGuardianId" TEXT;
ALTER TABLE "case_consents" ADD COLUMN IF NOT EXISTS "consentFormId" TEXT;

-- ── New tables ──
CREATE TABLE IF NOT EXISTS "patient_identity_documents" (
  "id" TEXT NOT NULL,
  "childId" TEXT NOT NULL,
  "type" "IdentityDocType" NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "patient_identity_documents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "patient_identity_documents_childId_idx" ON "patient_identity_documents"("childId");

CREATE TABLE IF NOT EXISTS "guardians" (
  "id" TEXT NOT NULL,
  "childId" TEXT NOT NULL,
  "userId" TEXT,
  "fullName" TEXT NOT NULL,
  "relationship" "GuardianRelationship" NOT NULL,
  "hasAuthorityToConsent" BOOLEAN NOT NULL DEFAULT false,
  "isPrimaryContact" BOOLEAN NOT NULL DEFAULT false,
  "isEmergencyContact" BOOLEAN NOT NULL DEFAULT false,
  "phone" TEXT,
  "email" TEXT,
  "accessLevel" "GuardianAccessLevel" NOT NULL DEFAULT 'VIEW_ONLY',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "guardians_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "guardians_childId_idx" ON "guardians"("childId");

CREATE TABLE IF NOT EXISTS "consent_templates" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT,
  "type" "ConsentType" NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "consent_templates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "consent_templates_clinicId_idx" ON "consent_templates"("clinicId");
CREATE INDEX IF NOT EXISTS "consent_templates_type_idx" ON "consent_templates"("type");

CREATE TABLE IF NOT EXISTS "consent_versions" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "purpose" TEXT NOT NULL,
  "bodyUrl" TEXT,
  "bodyHash" TEXT,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "consent_versions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "consent_versions_templateId_version_key" ON "consent_versions"("templateId","version");

CREATE TABLE IF NOT EXISTS "pre_visit_tasks" (
  "id" TEXT NOT NULL,
  "childId" TEXT NOT NULL,
  "caseId" TEXT,
  "bookingId" TEXT,
  "type" "PreVisitTaskType" NOT NULL,
  "status" "PreVisitTaskStatus" NOT NULL DEFAULT 'PENDING',
  "label" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pre_visit_tasks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "pre_visit_tasks_childId_idx" ON "pre_visit_tasks"("childId");
CREATE INDEX IF NOT EXISTS "pre_visit_tasks_status_idx" ON "pre_visit_tasks"("status");

-- ── Foreign keys (guarded) ──
DO $$ BEGIN ALTER TABLE "patient_identity_documents" ADD CONSTRAINT "patient_identity_documents_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "patient_identity_documents" ADD CONSTRAINT "patient_identity_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "guardians" ADD CONSTRAINT "guardians_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "guardians" ADD CONSTRAINT "guardians_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "consent_templates" ADD CONSTRAINT "consent_templates_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "consent_versions" ADD CONSTRAINT "consent_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "consent_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "pre_visit_tasks" ADD CONSTRAINT "pre_visit_tasks_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "case_consents" ADD CONSTRAINT "case_consents_consentVersionId_fkey" FOREIGN KEY ("consentVersionId") REFERENCES "consent_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "case_consents" ADD CONSTRAINT "case_consents_grantedByGuardianId_fkey" FOREIGN KEY ("grantedByGuardianId") REFERENCES "guardians"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ========================= 20260618020000_clinic_phase2_uae =========================
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

-- ========================= 20260618030000_clinic_phase3_uae =========================
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

-- ========================= 20260619000000_clinic_phase4_uae =========================
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

COMMIT;
