-- Full-schema baseline (all 155 models) generated offline via:
--   prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
-- Source commit: aa2c64b (branch fix/v5-provenance-and-patients)
-- NOT auto-applied. See prisma/baseline/README.md before using.

-- Required extension (schema uses the pgvector "vector" type); must exist before table creation.
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "WorksheetFlagReason" AS ENUM ('INAPPROPRIATE', 'INACCURATE', 'HARMFUL', 'SPAM', 'OTHER');

-- CreateEnum
CREATE TYPE "WorksheetFlagStatus" AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED', 'ACTIONED');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('OPEN', 'CLOSED', 'MERGED', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'ANSWERED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'THERAPIST', 'EDUCATOR', 'ORGANIZATION', 'ADMIN', 'SUPERADMIN', 'MODERATOR', 'BILLING');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('QUESTION', 'DISCUSSION', 'CASE_STUDY', 'RESOURCE', 'ANNOUNCEMENT', 'STORY');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'FLAGGED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('RESEARCH_PAPER', 'GUIDELINE', 'TOOL', 'VIDEO', 'COURSE', 'ARTICLE', 'PDF', 'LINK');

-- CreateEnum
CREATE TYPE "CostType" AS ENUM ('FREE', 'PAID', 'VARIES');

-- CreateEnum
CREATE TYPE "CrisisStatus" AS ENUM ('ACTIVE', 'IN_PROGRESS', 'RESOLVED', 'FOLLOWUP_PENDING');

-- CreateEnum
CREATE TYPE "CrisisType" AS ENUM ('SUICIDE_RISK', 'SELF_HARM', 'MELTDOWN', 'PANIC_ATTACK', 'MEDICAL_EMERGENCY', 'FAMILY_CONFLICT', 'BURNOUT', 'SUICIDE_PREVENTION', 'MENTAL_HEALTH', 'AUTISM_SUPPORT', 'ADHD_SUPPORT', 'CHILD_CRISIS', 'WOMEN_CRISIS', 'POISON_CONTROL', 'LGBTQ_SUPPORT', 'PARENT_SUPPORT', 'GENERAL_COUNSELING');

-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('NATIONAL_HELPLINE', 'NGO', 'HOSPITAL', 'EMERGENCY_SERVICE', 'SUPPORT_GROUP');

-- CreateEnum
CREATE TYPE "UrgencyLevel" AS ENUM ('IMMEDIATE', 'HIGH', 'MODERATE', 'LOW');

-- CreateEnum
CREATE TYPE "CommunityRole" AS ENUM ('MEMBER', 'MODERATOR', 'ADMIN', 'OWNER');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED', 'LEFT');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'SENT', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('VIRTUAL', 'IN_PERSON', 'HYBRID');

-- CreateEnum
CREATE TYPE "FeedView" AS ENUM ('FOR_YOU', 'FOLLOWING', 'COMMUNITIES', 'BOOKMARKS', 'TRENDING', 'RECENT');

-- CreateEnum
CREATE TYPE "FeedDensity" AS ENUM ('COMPACT', 'COMFORTABLE', 'SPACIOUS');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('VIEW', 'CLICK', 'VOTE', 'COMMENT', 'BOOKMARK', 'SHARE', 'HIDE', 'REPORT');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('THERAPY_SESSION', 'ASSESSMENT', 'CONSULTATION', 'WORKSHOP', 'WEBINAR', 'TRAINING', 'PARENT_EDUCATION', 'SUPPORT_GROUP', 'PEER_MEETUP', 'PLAYDATE', 'SOCIAL_SKILLS', 'AWARENESS_CAMPAIGN', 'FUNDRAISER', 'COMMUNITY_OUTREACH', 'SENSORY_PLAY', 'ART_THERAPY', 'MUSIC_THERAPY', 'SPORTS_ACTIVITY', 'OTHER');

-- CreateEnum
CREATE TYPE "EventFormat" AS ENUM ('VIRTUAL', 'IN_PERSON', 'HYBRID');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "InterestStatus" AS ENUM ('INTERESTED', 'GOING');

-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "OrganizationInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('WEB', 'IOS', 'ANDROID', 'BROWSER');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('IN_PROGRESS', 'TIER1_COMPLETE', 'TIER2_REQUIRED', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InformantType" AS ENUM ('PARENT', 'EDUCATOR', 'CLINICIAN');

-- CreateEnum
CREATE TYPE "AnswerType" AS ENUM ('YES', 'SOMETIMES', 'NOT_SURE', 'NO', 'NOT_OBSERVED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('SUMMARY', 'DETAILED', 'ENHANCED');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('VIEW', 'ANNOTATE');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING_PAYMENT', 'PAYMENT_FAILED', 'PENDING_ACCEPTANCE', 'ACCEPTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED_BY_PATIENT', 'CANCELLED_BY_THERAPIST', 'NO_SHOW_PATIENT', 'NO_SHOW_THERAPIST', 'DISPUTED');

-- CreateEnum
CREATE TYPE "TrackingStatus" AS ENUM ('SCHEDULED', 'WAITING', 'IN_SESSION', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('AVAILABLE', 'BOOKED', 'BLOCKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TherapistApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PricingControl" AS ENUM ('ORGANIZATION', 'THERAPIST', 'BOTH');

-- CreateEnum
CREATE TYPE "AvailabilityExceptionType" AS ENUM ('AVAILABLE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "RaterType" AS ENUM ('PATIENT', 'THERAPIST');

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AdPlacement" AS ENUM ('FEED', 'SIDEBAR', 'BANNER_TOP', 'BANNER_BOTTOM');

-- CreateEnum
CREATE TYPE "AdStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TherapyDiscipline" AS ENUM ('SPEECH', 'OCCUPATIONAL', 'BEHAVIOUR_ABA', 'PSYCHOLOGY', 'SPECIAL_EDUCATION', 'PHYSIOTHERAPY', 'MEDICAL', 'MULTIDISCIPLINARY', 'UNIVERSAL');

-- CreateEnum
CREATE TYPE "ClinicalActivityType" AS ENUM ('INTAKE', 'SESSION_NOTE', 'ASSESSMENT', 'CONSULTATION', 'MDT_REVIEW', 'GOAL_PLAN', 'PROGRESS_REVIEW', 'DISCHARGE');

-- CreateEnum
CREATE TYPE "ClinicalRecordStatus" AS ENUM ('DRAFT', 'SIGNED', 'AMENDED');

-- CreateEnum
CREATE TYPE "LicenseAuthority" AS ENUM ('DHA', 'DOH', 'MOHAP', 'KHDA', 'ADEK', 'MOE', 'OTHER');

-- CreateEnum
CREATE TYPE "Emirate" AS ENUM ('ABU_DHABI', 'DUBAI', 'SHARJAH', 'AJMAN', 'UMM_AL_QUWAIN', 'RAS_AL_KHAIMAH', 'FUJAIRAH');

-- CreateEnum
CREATE TYPE "FacilityComplianceStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "IdentityDocType" AS ENUM ('EMIRATES_ID', 'PASSPORT', 'BIRTH_CERTIFICATE', 'OTHER');

-- CreateEnum
CREATE TYPE "GuardianRelationship" AS ENUM ('MOTHER', 'FATHER', 'LEGAL_GUARDIAN', 'GRANDPARENT', 'SIBLING', 'OTHER');

-- CreateEnum
CREATE TYPE "GuardianAccessLevel" AS ENUM ('FULL', 'LIMITED', 'VIEW_ONLY', 'NONE');

-- CreateEnum
CREATE TYPE "PreVisitTaskType" AS ENUM ('INTAKE_FORM', 'CONSENT', 'IDENTITY', 'DOCUMENT', 'PAYMENT', 'PREAUTH', 'QUESTIONNAIRE');

-- CreateEnum
CREATE TYPE "PreVisitTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETE', 'WAIVED');

-- CreateEnum
CREATE TYPE "PayerType" AS ENUM ('SELF_PAY', 'INSURANCE', 'EMPLOYER', 'SCHOOL_SPONSOR', 'NGO_SPONSOR', 'OTHER_THIRD_PARTY');

-- CreateEnum
CREATE TYPE "PreAuthStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'DENIED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "FinancialClearanceStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'CLEARED', 'EXCEPTION_APPROVED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "SessionModality" AS ENUM ('IN_PERSON', 'TELEHEALTH', 'HYBRID');

-- CreateEnum
CREATE TYPE "LeadChannel" AS ENUM ('WEBSITE', 'WHATSAPP', 'SOCIAL', 'PHONE', 'REFERRAL', 'INSURER', 'WALK_IN', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'WAITLISTED', 'CONVERTED', 'OUT_OF_SCOPE', 'DUPLICATE', 'CLOSED');

-- CreateEnum
CREATE TYPE "ClinicRole" AS ENUM ('THERAPIST', 'CLINICAL_LEAD', 'MEDICAL_DIRECTOR', 'CARE_COORDINATOR');

-- CreateEnum
CREATE TYPE "TriageStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'DECIDED');

-- CreateEnum
CREATE TYPE "TriageDecision" AS ENUM ('PROCEED', 'REQUEST_MORE_INFO', 'URGENT_REFERRAL', 'ALTERNATE_SERVICE', 'OUT_OF_SCOPE');

-- CreateEnum
CREATE TYPE "TriagePathway" AS ENUM ('CONSULTATION_ONLY', 'SINGLE_ASSESSMENT', 'MDT_ASSESSMENT', 'THERAPY_TRIAL', 'PARENT_COUNSELLING', 'EXTERNAL_REFERRAL');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('NONE', 'LOW', 'MODERATE', 'HIGH');

-- CreateEnum
CREATE TYPE "TelehealthPlatform" AS ENUM ('GOOGLE_MEET', 'ZOOM', 'MS_TEAMS', 'WHATSAPP', 'OTHER');

-- CreateEnum
CREATE TYPE "MdtReviewStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReportAudience" AS ENUM ('PROFESSIONAL', 'PARENT');

-- CreateEnum
CREATE TYPE "ClinicalFlagType" AS ENUM ('REGRESSION', 'NEW_RISK', 'POOR_PROGRESS', 'PLAN_REVIEW');

-- CreateEnum
CREATE TYPE "ReviewTriggerType" AS ENUM ('PLAN_DATE', 'SESSION_COUNT', 'AUTH_EXPIRY', 'GOAL_PROGRESS', 'CLINICAL_FLAG', 'MANUAL');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DUE', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "EhrExportFormat" AS ENUM ('PDF', 'FHIR', 'STRUCTURED_JSON');

-- CreateEnum
CREATE TYPE "EhrExportStatus" AS ENUM ('PENDING', 'EXPORTED', 'RECONCILED', 'FAILED');

-- CreateEnum
CREATE TYPE "IncidentCategory" AS ENUM ('MEDICAL_INSTABILITY', 'MENTAL_HEALTH_RISK', 'SAFEGUARDING', 'SEVERE_BEHAVIOUR', 'ABUSE_NEGLECT', 'OUT_OF_SCOPE', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentUrgency" AS ENUM ('EMERGENCY', 'URGENT', 'ROUTINE');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'ACTION_TAKEN', 'REFERRAL_SENT', 'CONTINUED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ExternalRecipientType" AS ENUM ('SCHOOL', 'PHYSICIAN', 'SPECIALIST', 'HOSPITAL', 'INSURER', 'OTHER_PROVIDER', 'PARENT');

-- CreateEnum
CREATE TYPE "ClinicStatus" AS ENUM ('INTAKE', 'ACTIVE', 'ON_HOLD', 'DISCHARGED');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'DISCHARGED', 'TRANSFERRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "JourneyStage" AS ENUM ('INTAKE', 'TRIAGE', 'CONSULTATION', 'IN_THERAPY', 'IN_ASSESSMENT', 'DISCHARGED');

-- CreateEnum
CREATE TYPE "CarePlanRecommendation" AS ENUM ('NONE', 'SINGLE_ASSESSMENT', 'MDT_ASSESSMENT', 'THERAPY', 'COACHING', 'REFERRAL');

-- CreateEnum
CREATE TYPE "CarePlanPaymentStatus" AS ENUM ('PAID', 'PENDING', 'PREAUTH');

-- CreateEnum
CREATE TYPE "CarePlanStatus" AS ENUM ('DRAFT', 'LOCKED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IntakeState" AS ENUM ('DRAFT', 'SUMMARISED');

-- CreateEnum
CREATE TYPE "AssessmentReviewType" AS ENUM ('SINGLE', 'MDT');

-- CreateEnum
CREATE TYPE "AssessmentPhase" AS ENUM ('PLAN', 'EXEC', 'REPORT', 'SHARED');

-- CreateEnum
CREATE TYPE "AssessmentExecStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "CaseTherapistRole" AS ENUM ('PRIMARY', 'SECONDARY', 'CONSULTANT');

-- CreateEnum
CREATE TYPE "IEPStatus" AS ENUM ('DRAFT', 'ACTIVE', 'IN_REVIEW', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'ACHIEVED', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('ON_TRACK', 'EMERGING', 'DELAYED', 'ACHIEVED', 'REGRESSED');

-- CreateEnum
CREATE TYPE "SessionNoteFormat" AS ENUM ('SOAP', 'DAP', 'NARRATIVE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SessionNoteStatus" AS ENUM ('DRAFT', 'SIGNED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'CANCELLED', 'NO_SHOW', 'LATE');

-- CreateEnum
CREATE TYPE "CaseDocumentType" AS ENUM ('IEP', 'REPORT', 'ASSESSMENT', 'SUMMARY', 'PROGRESS_REPORT', 'DISCHARGE_SUMMARY', 'CONSENT', 'OTHER');

-- CreateEnum
CREATE TYPE "TreatmentPlanStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('PENDING', 'BILLED', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('TREATMENT', 'SHARING', 'ASSESSMENT', 'RECORDING', 'RESEARCH', 'TELEHEALTH', 'REPORT_SHARING', 'COMMUNICATION', 'DATA_PROCESSING');

-- CreateEnum
CREATE TYPE "WorksheetType" AS ENUM ('ACTIVITY', 'VISUAL_SUPPORT', 'STRUCTURED_PLAN', 'PROGRESS_TRACKER');

-- CreateEnum
CREATE TYPE "WorksheetStatus" AS ENUM ('DRAFT', 'GENERATING', 'PUBLISHED', 'ARCHIVED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "WorksheetColorMode" AS ENUM ('FULL_COLOR', 'GRAYSCALE', 'LINE_ART');

-- CreateEnum
CREATE TYPE "WorksheetDifficulty" AS ENUM ('FOUNDATIONAL', 'DEVELOPING', 'STRENGTHENING');

-- CreateEnum
CREATE TYPE "WorksheetImageStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "WorksheetDataSource" AS ENUM ('MANUAL', 'SCREENING', 'UPLOADED_REPORT', 'IEP_GOALS', 'SESSION_NOTES');

-- CreateEnum
CREATE TYPE "WorksheetAssignmentStatus" AS ENUM ('ASSIGNED', 'VIEWED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('PENDING', 'SENT', 'SIGNED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('IOS', 'ANDROID', 'WEB');

-- CreateEnum
CREATE TYPE "OrgKind" AS ENUM ('CLINIC_GROUP', 'NURSERY_GROUP', 'SCHOOL_GROUP', 'NGO', 'PLATFORM');

-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('CLINIC', 'NURSERY', 'SCHOOL');

-- CreateEnum
CREATE TYPE "AffiliationType" AS ENUM ('PATIENT', 'ENROLLED');

-- CreateEnum
CREATE TYPE "AffiliationStatus" AS ENUM ('PENDING_CONSENT', 'ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "DataScope" AS ENUM ('OBSERVATIONS_ONLY', 'SCREENING_SHARED', 'CLINICAL_SUMMARY', 'FULL_CLINICAL');

-- CreateEnum
CREATE TYPE "FacilityRole" AS ENUM ('OWNER', 'ADMIN', 'CLINICAL_LEAD', 'THERAPIST', 'INCLUSION_LEAD', 'KEYWORKER', 'RECEPTION', 'BILLING');

-- CreateEnum
CREATE TYPE "ChildClaimStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DISPUTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ObservationType" AS ENUM ('NOTE', 'MOMENT', 'MILESTONE', 'CONCERN');

-- CreateEnum
CREATE TYPE "ConcernStatus" AS ENUM ('DRAFT', 'SHARED', 'ACKNOWLEDGED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'UNDER_REVIEW', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportReviewDecision" AS ENUM ('CONTINUE', 'ADJUST', 'ESCALATE', 'CLOSE');

-- CreateEnum
CREATE TYPE "InterventionKind" AS ENUM ('IN_SETTING', 'HOME');

-- CreateEnum
CREATE TYPE "InterventionStatus" AS ENUM ('PLANNED', 'ACTIVE', 'DONE', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "DevReviewStatus" AS ENUM ('DRAFT', 'SHARED', 'ACKNOWLEDGED');

-- CreateEnum
CREATE TYPE "HandoverRecipient" AS ENUM ('SCHOOL', 'CLINICIAN', 'OTHER');

-- CreateEnum
CREATE TYPE "HandoverStatus" AS ENUM ('DRAFT', 'SHARED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "bio" TEXT,
    "reputation" INTEGER NOT NULL DEFAULT 0,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "licenseNumber" TEXT,
    "specialization" TEXT[],
    "yearsOfExperience" INTEGER,
    "organization" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "website" TEXT,
    "languages" TEXT[],
    "education" TEXT,
    "certifications" TEXT[],
    "lastActive" TIMESTAMP(3),
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
    "embedding_vector" vector,
    "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "state" TEXT,
    "city" TEXT,
    "country" TEXT,
    "preferredRegion" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "resetPasswordToken" TEXT,
    "resetPasswordExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "googleId" TEXT,
    "ssoSource" TEXT,
    "acceptedAnswerCount" INTEGER NOT NULL DEFAULT 0,
    "answerCount" INTEGER NOT NULL DEFAULT 0,
    "expertTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "helpfulVoteCount" INTEGER NOT NULL DEFAULT 0,
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "stripeCustomerId" TEXT,
    "isVerifiedContributor" BOOLEAN NOT NULL DEFAULT false,
    "verifiedContributorAt" TIMESTAMP(3),
    "contributorBio" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Community" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "condition" TEXT,
    "ageRange" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "location" TEXT,
    "parentId" TEXT,
    "creatorId" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "inviteOnly" BOOLEAN NOT NULL DEFAULT false,
    "rules" TEXT,
    "welcomeMessage" TEXT,
    "bannerImage" TEXT,
    "icon" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoCreateWhatsAppGroup" BOOLEAN NOT NULL DEFAULT false,
    "whatsappGroupLimit" INTEGER NOT NULL DEFAULT 256,
    "primaryLanguage" TEXT NOT NULL DEFAULT 'en',
    "supportedLanguages" TEXT[] DEFAULT ARRAY['en', 'hi']::TEXT[],
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "role" "CommunityRole" NOT NULL DEFAULT 'MEMBER',
    "permissions" JSONB,
    "lastActive" TIMESTAMP(3),
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "reputation" INTEGER NOT NULL DEFAULT 0,
    "whatsappNumber" TEXT,
    "whatsappGroupId" TEXT,
    "whatsappSynced" BOOLEAN NOT NULL DEFAULT false,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "invitedBy" TEXT,
    "invitedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppGroup" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "groupLink" TEXT NOT NULL,
    "qrCodeUrl" TEXT,
    "memberLimit" INTEGER NOT NULL DEFAULT 256,
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "isFull" BOOLEAN NOT NULL DEFAULT false,
    "groupNumber" INTEGER NOT NULL DEFAULT 1,
    "isOverflow" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT NOT NULL DEFAULT 'en',
    "region" TEXT,
    "adminUserId" TEXT,
    "adminWhatsAppNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSynced" TIMESTAMP(3),
    "syncStatus" TEXT,
    "autoWelcomeMessage" BOOLEAN NOT NULL DEFAULT true,
    "allowMemberInvites" BOOLEAN NOT NULL DEFAULT true,
    "moderationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppInvitation" (
    "id" TEXT NOT NULL,
    "whatsappGroupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "inviteCode" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "sentVia" TEXT,
    "sentAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "communityId" TEXT,
    "createdBy" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coverImage" TEXT,
    "eventType" "EventCategory" NOT NULL,
    "format" "EventFormat" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "venue" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "location" TEXT,
    "meetingLink" TEXT,
    "virtualLink" TEXT,
    "platform" TEXT,
    "ageGroup" TEXT[],
    "languages" TEXT[],
    "accessibilityFeatures" TEXT[],
    "specialInstructions" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "contactWhatsApp" TEXT,
    "externalLink" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "shareToFeed" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[],
    "interestedCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "status" "EventStatus" NOT NULL DEFAULT 'PUBLISHED',
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancellationReason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "whatsappReminderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsappGroupId" TEXT,
    "maxAttendees" INTEGER,
    "attendeeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "feedPostId" TEXT,
    "organizationId" TEXT,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventInterest" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "InterestStatus" NOT NULL DEFAULT 'INTERESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "type" "PostType" NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "authorId" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "insights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "moderationNotes" TEXT,
    "metadata" JSONB,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "sentiment" DOUBLE PRECISION,
    "toxicity" DOUBLE PRECISION,
    "containsCrisisKeywords" BOOLEAN NOT NULL DEFAULT false,
    "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
    "communityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultFeedView" "FeedView" NOT NULL DEFAULT 'FOR_YOU',
    "feedDensity" "FeedDensity" NOT NULL DEFAULT 'COMFORTABLE',
    "showAnonymousPosts" BOOLEAN NOT NULL DEFAULT true,
    "autoplayVideos" BOOLEAN NOT NULL DEFAULT false,
    "preferredCategories" TEXT[],
    "mutedKeywords" TEXT[],
    "mutedAuthors" TEXT[],
    "preferredLanguages" TEXT[],
    "recencyWeight" INTEGER NOT NULL DEFAULT 30,
    "relevanceWeight" INTEGER NOT NULL DEFAULT 40,
    "engagementWeight" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "allowDirectMessages" BOOLEAN NOT NULL DEFAULT true,
    "blockedCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "blockedTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contentTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "crisisAutoDetection" BOOLEAN NOT NULL DEFAULT false,
    "crisisModuleEnabled" BOOLEAN NOT NULL DEFAULT true,
    "desktopNotifications" BOOLEAN NOT NULL DEFAULT false,
    "emailDigestFrequency" TEXT NOT NULL DEFAULT 'daily',
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "emergencyContacts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "followedTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "inAppSoundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "minEngagement" INTEGER NOT NULL DEFAULT 0,
    "notificationFrequency" TEXT NOT NULL DEFAULT 'daily',
    "notificationPrefs" JSONB,
    "notificationTypes" JSONB NOT NULL DEFAULT '{}',
    "preferredHelplines" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "profilePublic" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursEnd" TEXT,
    "quietHoursStart" TEXT,
    "savedCrisisResources" JSONB,
    "showCrisisButton" BOOLEAN NOT NULL DEFAULT true,
    "showEmail" BOOLEAN NOT NULL DEFAULT false,
    "showSOSButton" BOOLEAN NOT NULL DEFAULT true,
    "verifiedAuthorsOnly" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInterests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "interactions" INTEGER NOT NULL DEFAULT 0,
    "lastEngaged" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInterests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "action" "InteractionType" NOT NULL,
    "duration" INTEGER,
    "scrollDepth" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostView" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngagementEvent" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "value" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngagementEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostEngagementMetrics" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "engagementLast1h" INTEGER NOT NULL DEFAULT 0,
    "engagementLast24h" INTEGER NOT NULL DEFAULT 0,
    "engagementLast7d" INTEGER NOT NULL DEFAULT 0,
    "engagementLast30d" INTEGER NOT NULL DEFAULT 0,
    "velocityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "velocityTrend" TEXT NOT NULL DEFAULT 'stable',
    "collaborativeScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "relevanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostEngagementMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSimilarity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "similarUserId" TEXT NOT NULL,
    "similarity" DOUBLE PRECISION NOT NULL,
    "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSimilarity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInteractionProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryPreferences" JSONB NOT NULL DEFAULT '[]',
    "tagPreferences" JSONB NOT NULL DEFAULT '[]',
    "typePreferences" JSONB NOT NULL DEFAULT '[]',
    "avgEngagementTime" INTEGER NOT NULL DEFAULT 0,
    "upvoteRatio" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "commentFrequency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activeHours" JSONB NOT NULL DEFAULT '[]',
    "activeDays" JSONB NOT NULL DEFAULT '[]',
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInteractionProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "sentiment" DOUBLE PRECISION,
    "toxicity" DOUBLE PRECISION,
    "helpful" BOOLEAN,
    "containsCrisisKeywords" BOOLEAN NOT NULL DEFAULT false,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "postId" TEXT,
    "commentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "questionId" TEXT,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "postId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT NOT NULL,
    "url" TEXT,
    "type" "ResourceType" NOT NULL,
    "relevance" DOUBLE PRECISION,
    "authors" TEXT[],
    "publishDate" TIMESTAMP(3),
    "doi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimilarPost" (
    "id" TEXT NOT NULL,
    "originalPostId" TEXT NOT NULL,
    "relatedPostId" TEXT NOT NULL,
    "similarity" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimilarPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectMessage" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "connectionType" TEXT,
    "matchReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "relatedPostId" TEXT,
    "relatedUserId" TEXT,
    "senderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actionUrl" TEXT,
    "metadata" JSONB,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "relatedEntityId" TEXT,
    "relatedEntityType" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationDoc" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "aiVerified" BOOLEAN NOT NULL DEFAULT false,
    "aiConfidence" DOUBLE PRECISION,
    "aiNotes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reporterId" TEXT,
    "targetId" TEXT NOT NULL,
    "targetType" TEXT,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "aiSeverity" DOUBLE PRECISION,
    "aiCategory" TEXT,
    "resolvedBy" TEXT,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "postId" TEXT,
    "commentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationLog" (
    "id" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT,
    "details" TEXT,
    "metadata" JSONB,
    "notes" TEXT,
    "aiSuggested" BOOLEAN NOT NULL DEFAULT false,
    "aiReasoning" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "context" JSONB,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analytics" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "postId" TEXT,
    "event" TEXT NOT NULL,
    "metadata" JSONB,
    "userIntent" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "planId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "limit" INTEGER NOT NULL DEFAULT 3,
    "lastResetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrisisIncident" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" "CrisisType" NOT NULL,
    "urgencyLevel" "UrgencyLevel" NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "state" TEXT,
    "city" TEXT,
    "contactNumber" TEXT,
    "preferredLang" TEXT NOT NULL DEFAULT 'en',
    "status" "CrisisStatus" NOT NULL DEFAULT 'ACTIVE',
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolutionNotes" TEXT,
    "resourcesUsed" TEXT[],
    "volunteerId" TEXT,
    "followupScheduled" TIMESTAMP(3),
    "followupCompleted" BOOLEAN NOT NULL DEFAULT false,
    "followupNotes" TEXT,
    "triggerKeywords" TEXT[],
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrisisIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrisisResource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" "CrisisType"[],
    "phoneNumber" TEXT,
    "whatsappNumber" TEXT,
    "email" TEXT,
    "website" TEXT,
    "available24x7" BOOLEAN NOT NULL DEFAULT false,
    "operatingHours" TEXT,
    "languages" TEXT[],
    "country" TEXT NOT NULL DEFAULT 'IN',
    "state" TEXT,
    "city" TEXT,
    "pincode" TEXT,
    "address" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "description" TEXT,
    "specialization" TEXT[],
    "ageGroups" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrisisResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrisisLog" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrisisLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrisisVolunteer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trainingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "certifications" TEXT[],
    "specializations" "CrisisType"[],
    "languages" TEXT[],
    "isAvailable" BOOLEAN NOT NULL DEFAULT false,
    "availableFrom" TIMESTAMP(3),
    "availableTill" TIMESTAMP(3),
    "maxCasesPerDay" INTEGER NOT NULL DEFAULT 3,
    "currentCases" INTEGER NOT NULL DEFAULT 0,
    "state" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "casesHandled" INTEGER NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrisisVolunteer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrisisConnection" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "volunteerId" TEXT,
    "resourceId" TEXT,
    "connectionType" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "outcome" TEXT,
    "notes" TEXT,
    "rating" INTEGER,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrisisConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrisisAuditLog" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrisisAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "answerCount" INTEGER NOT NULL DEFAULT 0,
    "followerCount" INTEGER NOT NULL DEFAULT 0,
    "hasAcceptedAnswer" BOOLEAN NOT NULL DEFAULT false,
    "acceptedAnswerId" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "anonymousName" TEXT,
    "status" "QuestionStatus" NOT NULL DEFAULT 'OPEN',
    "closedReason" TEXT,
    "closedAt" TIMESTAMP(3),
    "topics" TEXT[],
    "tags" TEXT[],
    "category" TEXT NOT NULL,
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'APPROVED',
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "moderationNotes" TEXT,
    "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mergedIntoId" TEXT,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "originalContent" TEXT,
    "isAccepted" BOOLEAN NOT NULL DEFAULT false,
    "acceptedAt" TIMESTAMP(3),
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "helpfulVotes" INTEGER NOT NULL DEFAULT 0,
    "notHelpfulVotes" INTEGER NOT NULL DEFAULT 0,
    "readTime" INTEGER,
    "hasMedia" BOOLEAN NOT NULL DEFAULT false,
    "wordCount" INTEGER,
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'APPROVED',
    "moderationNotes" TEXT,
    "toxicity" DOUBLE PRECISION,
    "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastEditedAt" TIMESTAMP(3),

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerVote" (
    "id" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnswerVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerComment" (
    "id" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnswerComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerEdit" (
    "id" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "editReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnswerEdit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionFollower" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifyPush" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionFollower_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerRequest" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "requestedUserId" TEXT NOT NULL,
    "message" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "AnswerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelatedQuestion" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "relatedQuestionId" TEXT NOT NULL,
    "similarity" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelatedQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerView" (
    "id" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnswerView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" TEXT NOT NULL,
    "serialNumber" INTEGER NOT NULL,
    "state" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "organizationType" TEXT NOT NULL,
    "contactPersonName" TEXT,
    "contactNumber" TEXT,
    "email" TEXT,
    "address" TEXT,
    "websiteLinkedin" TEXT,
    "normalizedState" TEXT NOT NULL,
    "normalizedOrgType" TEXT NOT NULL,
    "searchVector" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "contactClickCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "addedById" TEXT,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_views" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT,
    "relationshipToChild" TEXT,
    "phoneNumber" TEXT,
    "alternatePhone" TEXT,
    "email" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "occupation" TEXT,
    "educationLevel" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "communicationPreference" TEXT,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "onboardingData" JSONB,
    "completenessScore" INTEGER NOT NULL DEFAULT 0,
    "lastCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "country" TEXT,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "children" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "nickname" TEXT,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "schoolType" TEXT,
    "grade" TEXT,
    "hasCondition" BOOLEAN NOT NULL DEFAULT false,
    "diagnosisStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "address" TEXT,
    "attendancePattern" TEXT,
    "birthComplications" TEXT,
    "birthOrder" TEXT,
    "birthWeight" TEXT,
    "caregiverRelationship" TEXT,
    "city" TEXT,
    "currentMedicalConditions" TEXT,
    "currentSchool" TEXT,
    "delayedMilestones" BOOLEAN,
    "delayedMilestonesDetails" TEXT,
    "deliveryType" TEXT,
    "developmentalConcerns" TEXT,
    "eatingDetails" TEXT,
    "eatingIssues" BOOLEAN,
    "familyHistoryOfDevelopmentalDisorders" TEXT,
    "gestationalAge" TEXT,
    "learningDifficulties" TEXT,
    "medicationDetails" TEXT,
    "mediumOfInstruction" TEXT,
    "mothersHealthDuringPregnancy" TEXT,
    "nationality" TEXT,
    "placeOfBirth" TEXT,
    "postalCode" TEXT,
    "prematureBirth" BOOLEAN,
    "previousAssessments" BOOLEAN,
    "primaryLanguage" TEXT,
    "referralSource" TEXT,
    "sleepDetails" TEXT,
    "sleepIssues" BOOLEAN,
    "state" TEXT,
    "takingMedications" BOOLEAN,
    "teacherConcerns" TEXT,
    "visionHearingIssues" TEXT,
    "clinicStatus" "ClinicStatus" NOT NULL DEFAULT 'INTAKE',
    "walkinCreatedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "clinicId" TEXT,
    "emiratesId" TEXT,
    "emiratesIdExpiry" TIMESTAMP(3),
    "passportNumber" TEXT,
    "identityType" "IdentityDocType",
    "identityVerified" BOOLEAN NOT NULL DEFAULT false,
    "identityVerifiedAt" TIMESTAMP(3),
    "identityVerifiedBy" TEXT,

    CONSTRAINT "children_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_conditions" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "conditionType" TEXT NOT NULL,
    "diagnosedAt" TIMESTAMP(3),
    "diagnosedBy" TEXT,
    "severity" TEXT,
    "specificDiagnosis" TEXT,
    "currentTherapies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "medications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "primaryChallenges" TEXT,
    "strengths" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "child_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_completeness_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "basicInfoComplete" BOOLEAN NOT NULL DEFAULT false,
    "contactComplete" BOOLEAN NOT NULL DEFAULT false,
    "childrenAdded" BOOLEAN NOT NULL DEFAULT false,
    "conditionsAdded" BOOLEAN NOT NULL DEFAULT false,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_completeness_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "banner" TEXT,
    "website" TEXT,
    "region" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "accentColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "commissionPercentage" DOUBLE PRECISION,
    "kind" "OrgKind" NOT NULL DEFAULT 'CLINIC_GROUP',

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL DEFAULT 'MEMBER',
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "status" "OrganizationInviteStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FcmToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fcmToken" TEXT NOT NULL,
    "device" "DeviceType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FcmToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insight_shares" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sharedBy" TEXT NOT NULL,
    "sharedWith" TEXT NOT NULL,
    "message" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insight_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "informantType" "InformantType" NOT NULL DEFAULT 'PARENT',
    "respondentId" TEXT,
    "facilityId" TEXT,
    "tier1Completed" BOOLEAN NOT NULL DEFAULT false,
    "tier2Completed" BOOLEAN NOT NULL DEFAULT false,
    "tier1CompletedAt" TIMESTAMP(3),
    "tier2CompletedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "overallScore" DOUBLE PRECISION,
    "domainScores" JSONB,
    "flaggedDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reportGenerated" BOOLEAN NOT NULL DEFAULT false,
    "reportGeneratedAt" TIMESTAMP(3),
    "v2ReportGenerated" BOOLEAN NOT NULL DEFAULT false,
    "v2ReportGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_responses" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "domain" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" "AnswerType" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_reports" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "reportType" "ReportType" NOT NULL,
    "pdfUrl" TEXT,
    "v2Content" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "lastDownloadedAt" TIMESTAMP(3),

    CONSTRAINT "assessment_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_shares" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "sharedBy" TEXT NOT NULL,
    "sharedWith" TEXT NOT NULL,
    "shareLink" TEXT,
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'VIEW',
    "annotations" JSONB,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "assessment_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapist_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "credentials" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "yearsExperience" INTEGER,
    "title" TEXT,
    "profileImage" TEXT,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "defaultTimezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "overallRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "totalRatings" INTEGER NOT NULL DEFAULT 0,
    "stripeAccountId" TEXT,
    "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "acceptingBookings" BOOLEAN NOT NULL DEFAULT true,
    "commissionPercentage" DOUBLE PRECISION,
    "licenceNumber" TEXT,
    "licenceExpiry" TIMESTAMP(3),
    "credentialStatus" "CredentialStatus" NOT NULL DEFAULT 'PENDING',
    "licenseAuthority" "LicenseAuthority",
    "canDiagnose" BOOLEAN NOT NULL DEFAULT false,
    "scopeOfPractice" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "department" TEXT,
    "phone" TEXT,
    "branch" TEXT,
    "country" TEXT,
    "qualification" TEXT,
    "university" TEXT,
    "rciNumber" TEXT,
    "councilNumber" TEXT,
    "bcbaNumber" TEXT,
    "emiratesId" TEXT,
    "visaStatus" TEXT,
    "insuranceProvider" TEXT,
    "insurancePolicyNumber" TEXT,
    "insuranceExpiry" TIMESTAMP(3),
    "clinicRole" "ClinicRole" NOT NULL DEFAULT 'THERAPIST',
    "clinicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "therapist_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapist_organization_links" (
    "id" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "TherapistApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "canWorkMultiple" BOOLEAN NOT NULL DEFAULT false,
    "organizationPercentage" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "therapistPercentage" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "pricingControl" "PricingControl" NOT NULL DEFAULT 'ORGANIZATION',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "therapist_organization_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "defaultPrice" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "organizationId" TEXT,
    "therapistId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "modality" "SessionModality" NOT NULL DEFAULT 'IN_PERSON',
    "serviceCode" TEXT,
    "payerRoute" "PayerType",
    "requiresPreAuth" BOOLEAN NOT NULL DEFAULT false,
    "insuranceEligible" BOOLEAN NOT NULL DEFAULT false,
    "setBy" TEXT,
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_pricing" (
    "id" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "sessionTypeId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapist_availability" (
    "id" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "therapist_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_exceptions" (
    "id" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "type" "AvailabilityExceptionType" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "sessionTypeId" TEXT NOT NULL,
    "organizationId" TEXT,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "platformFee" DOUBLE PRECISION NOT NULL,
    "platformFeePercentage" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "therapistAmount" DOUBLE PRECISION NOT NULL,
    "organizationAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stripePaymentIntentId" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "escrowReleasedAt" TIMESTAMP(3),
    "googleMeetLink" TEXT,
    "calendarEventId" TEXT,
    "meetingStartedAt" TIMESTAMP(3),
    "patientJoinedAt" TIMESTAMP(3),
    "therapistJoinedAt" TIMESTAMP(3),
    "sessionCompletedAt" TIMESTAMP(3),
    "patientConfirmedCompletion" BOOLEAN NOT NULL DEFAULT false,
    "therapistConfirmedCompletion" BOOLEAN NOT NULL DEFAULT false,
    "cancelledBy" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "refundAmount" DOUBLE PRECISION,
    "refundedAt" TIMESTAMP(3),
    "patientNotes" TEXT,
    "patientFiles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "therapistAcceptedAt" TIMESTAMP(3),
    "therapistRejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "acceptanceDeadline" TIMESTAMP(3),
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "trackingStatus" "TrackingStatus",
    "checkedInAt" TIMESTAMP(3),
    "sessionStartedAt" TIMESTAMP(3),
    "sessionEndedAt" TIMESTAMP(3),
    "receptionistNotes" TEXT,
    "clinicId" TEXT,
    "modality" "SessionModality",
    "paymentRoute" "PayerType" NOT NULL DEFAULT 'SELF_PAY',
    "financialClearance" "FinancialClearanceStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "clearanceApprovedById" TEXT,
    "preAuthorizationId" TEXT,
    "depositAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pre_session_questionnaires" (
    "id" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "questions" JSONB NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pre_session_questionnaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_questionnaire_responses" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "questionnaireId" TEXT NOT NULL,
    "responses" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_questionnaire_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_ratings" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "ratedBy" TEXT NOT NULL,
    "raterType" "RaterType" NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "professionalismRating" INTEGER,
    "communicationRating" INTEGER,
    "helpfulnessRating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "therapistId" TEXT NOT NULL,

    CONSTRAINT "session_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" TEXT,
    "therapistId" TEXT,
    "sessionTypeId" TEXT NOT NULL,
    "numberOfSessions" INTEGER NOT NULL,
    "sessionsCount" INTEGER NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "packagePrice" DOUBLE PRECISION NOT NULL,
    "regularPrice" DOUBLE PRECISION NOT NULL,
    "pricePerSession" DOUBLE PRECISION NOT NULL,
    "savings" DOUBLE PRECISION NOT NULL,
    "validityDays" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_purchases" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "sessionsTotal" INTEGER NOT NULL,
    "sessionsUsed" INTEGER NOT NULL DEFAULT 0,
    "sessionsRemaining" INTEGER NOT NULL,
    "totalPaid" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stripePaymentIntentId" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "package_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_disputes" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "raisedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" JSONB,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "resolutionNotes" TEXT,
    "refundAmount" DOUBLE PRECISION,
    "refundIssued" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_settings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "allowMultiOrgTherapists" BOOLEAN NOT NULL DEFAULT false,
    "autoAcceptBookings" BOOLEAN NOT NULL DEFAULT false,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 15,
    "advanceBookingDays" INTEGER NOT NULL DEFAULT 90,
    "minimumNoticeHours" INTEGER NOT NULL DEFAULT 12,
    "defaultOrgPercentage" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "defaultTherapistPercentage" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "enablePackages" BOOLEAN NOT NULL DEFAULT true,
    "enableQuestionnaires" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL,
    "platformCommissionPercentage" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "escrowHoldHours" INTEGER NOT NULL DEFAULT 2,
    "stripePlatformAccountId" TEXT,
    "enableMarketplace" BOOLEAN NOT NULL DEFAULT true,
    "parentOnboardingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "therapistOnboardingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worksheets" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "WorksheetType" NOT NULL,
    "subType" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "pdfUrl" TEXT,
    "previewUrl" TEXT,
    "status" "WorksheetStatus" NOT NULL DEFAULT 'DRAFT',
    "colorMode" "WorksheetColorMode" NOT NULL DEFAULT 'FULL_COLOR',
    "difficulty" "WorksheetDifficulty" NOT NULL DEFAULT 'DEVELOPING',
    "targetDomains" TEXT[],
    "ageRangeMin" INTEGER,
    "ageRangeMax" INTEGER,
    "conditionTags" TEXT[],
    "dataSource" "WorksheetDataSource" NOT NULL DEFAULT 'MANUAL',
    "screeningId" TEXT,
    "caseId" TEXT,
    "iepGoalIds" TEXT[],
    "uploadedReportUrl" TEXT,
    "parsedReportData" JSONB,
    "sessionNoteIds" TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentVersionId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "contributorNotes" TEXT,
    "clonedFromId" TEXT,
    "cloneCount" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "childId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worksheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worksheet_images" (
    "id" TEXT NOT NULL,
    "worksheetId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "WorksheetImageStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worksheet_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worksheet_assignments" (
    "id" TEXT NOT NULL,
    "worksheetId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "caseId" TEXT,
    "status" "WorksheetAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "parentNotes" TEXT,
    "completedAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worksheet_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worksheet_reviews" (
    "id" TEXT NOT NULL,
    "worksheetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "reviewText" TEXT,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worksheet_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worksheet_flags" (
    "id" TEXT NOT NULL,
    "worksheetId" TEXT NOT NULL,
    "flaggedById" TEXT NOT NULL,
    "reason" "WorksheetFlagReason" NOT NULL,
    "details" TEXT,
    "status" "WorksheetFlagStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worksheet_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worksheet_completions" (
    "id" TEXT NOT NULL,
    "worksheetId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "timeSpentMinutes" INTEGER,
    "difficultyRating" INTEGER,
    "engagementRating" INTEGER,
    "helpLevel" TEXT,
    "parentNotes" TEXT,
    "completionQuality" TEXT,

    CONSTRAINT "worksheet_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worksheet_effectiveness" (
    "id" TEXT NOT NULL,
    "worksheetId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "preScore" DOUBLE PRECISION,
    "postScore" DOUBLE PRECISION,
    "progressDelta" DOUBLE PRECISION,
    "goalId" TEXT,
    "goalProgress" DOUBLE PRECISION,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worksheet_effectiveness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BannerAd" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "placement" "AdPlacement" NOT NULL,
    "status" "AdStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BannerAd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdAnalytics" (
    "id" TEXT NOT NULL,
    "bannerAdId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT,
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "intakeTokenHash" TEXT,
    "intakeTokenExpiry" TIMESTAMP(3),
    "childId" TEXT NOT NULL,
    "primaryTherapistId" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "journeyStage" "JourneyStage" NOT NULL DEFAULT 'INTAKE',
    "diagnosis" TEXT,
    "referralSource" TEXT,
    "notes" TEXT,
    "pathwayTemplateId" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dischargedAt" TIMESTAMP(3),
    "dischargeReason" TEXT,
    "clinicalDischargeReason" TEXT,
    "adminDischargeReason" TEXT,
    "dischargeSummaryDocId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "retentionUntil" TIMESTAMP(3),
    "reactivatedAt" TIMESTAMP(3),
    "reactivatedFromId" TEXT,
    "organizationId" TEXT,
    "clinicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_therapists" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "role" "CaseTherapistRole" NOT NULL DEFAULT 'SECONDARY',
    "permissions" JSONB,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "case_therapists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_internal_notes" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_internal_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ieps" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "title" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "IEPStatus" NOT NULL DEFAULT 'DRAFT',
    "templateId" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedByTherapistAt" TIMESTAMP(3),
    "approvedByParentAt" TIMESTAMP(3),
    "reviewDate" TIMESTAMP(3),
    "accommodations" JSONB,
    "servicesTracking" JSONB,
    "meetingNotes" JSONB,
    "pdfUrl" TEXT,
    "previousVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ieps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iep_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" JSONB NOT NULL,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iep_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iep_goals" (
    "id" TEXT NOT NULL,
    "iepId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "goalText" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3),
    "baselineScreeningId" TEXT,
    "currentProgress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "GoalStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "linkedScreeningIndicators" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "frequency" TEXT,
    "baselineValue" DOUBLE PRECISION,
    "reviewIntervalDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iep_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_bank_items" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "condition" TEXT,
    "goalText" TEXT NOT NULL,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_bank_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestone_plans" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "pdfUrl" TEXT,
    "sharedWithParent" BOOLEAN NOT NULL DEFAULT false,
    "previousVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestone_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "expectedAge" TEXT,
    "targetDate" TIMESTAMP(3),
    "status" "MilestoneStatus" NOT NULL DEFAULT 'ON_TRACK',
    "linkedScreeningId" TEXT,
    "achievedAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_sessions" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "bookingId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "actualDuration" INTEGER,
    "attendanceStatus" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "sessionType" TEXT,
    "location" TEXT,
    "discipline" "TherapyDiscipline",
    "carePlanId" TEXT,
    "rawNotes" TEXT,
    "aiSummary" TEXT,
    "aiDraft" JSONB,
    "noteFormat" "SessionNoteFormat",
    "structuredNotes" JSONB,
    "noteStatus" "SessionNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "signedAt" TIMESTAMP(3),
    "treatmentPlanId" TEXT,
    "clinicalFlag" BOOLEAN NOT NULL DEFAULT false,
    "flagType" "ClinicalFlagType",
    "flagReason" TEXT,
    "ehrRef" TEXT,
    "exportedToEhrAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_goal_progress" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "progressNote" TEXT,
    "progressValue" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_goal_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_documents" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" "CaseDocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "fileUrl" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "audience" "ReportAudience" NOT NULL DEFAULT 'PROFESSIONAL',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "parentVersionId" TEXT,
    "mdtReviewId" TEXT,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "lastDownloadedAt" TIMESTAMP(3),
    "ehrRef" TEXT,
    "exportedToEhrAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_shares" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "documentId" TEXT,
    "sharedWithId" TEXT NOT NULL,
    "sharedById" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_plans" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "status" "TreatmentPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "content" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "frequency" TEXT,
    "sessionsPlanned" INTEGER,
    "reviewIntervalDays" INTEGER,
    "activatedAt" TIMESTAMP(3),
    "parentAcceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_plans" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "consultationRecordId" TEXT,
    "consultationNotes" TEXT,
    "recommendation" "CarePlanRecommendation" NOT NULL DEFAULT 'THERAPY',
    "disciplines" "TherapyDiscipline"[],
    "primaryTherapistId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "timeOfDay" TEXT NOT NULL,
    "daysOfWeek" INTEGER[],
    "daySchedule" JSONB,
    "sessionCount" INTEGER NOT NULL,
    "packageName" TEXT,
    "unitPrice" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "paymentStatus" "CarePlanPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "reviewInWeeks" INTEGER,
    "externalReferralTarget" TEXT,
    "iepId" TEXT,
    "mode" TEXT,
    "sessionDurationMin" INTEGER,
    "parentHomeProgram" TEXT,
    "expectedOutcomes" TEXT,
    "reviewDate" TIMESTAMP(3),
    "status" "CarePlanStatus" NOT NULL DEFAULT 'DRAFT',
    "parentAcceptedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_plan_pricing_defaults" (
    "id" TEXT NOT NULL,
    "recommendation" "CarePlanRecommendation" NOT NULL,
    "label" TEXT NOT NULL,
    "unitPrice" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "defaultCount" INTEGER NOT NULL DEFAULT 1,
    "defaultDaysPerWeek" INTEGER NOT NULL DEFAULT 1,
    "defaultDays" INTEGER[],
    "packageType" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_plan_pricing_defaults_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_reviews" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" "AssessmentReviewType" NOT NULL DEFAULT 'SINGLE',
    "phase" "AssessmentPhase" NOT NULL DEFAULT 'PLAN',
    "title" TEXT,
    "scopeText" TEXT,
    "scopeApproved" BOOLEAN NOT NULL DEFAULT false,
    "dayMode" TEXT,
    "questionnaireSent" BOOLEAN NOT NULL DEFAULT false,
    "schoolInputRequested" BOOLEAN NOT NULL DEFAULT false,
    "paymentStatus" "CarePlanPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "meetingAt" TIMESTAMP(3),
    "syncMode" TEXT,
    "reportText" TEXT,
    "approval" TEXT,
    "reportDocumentId" TEXT,
    "recipients" JSONB,
    "sharedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_disciplines" (
    "id" TEXT NOT NULL,
    "assessmentReviewId" TEXT NOT NULL,
    "discipline" "TherapyDiscipline" NOT NULL,
    "status" "AssessmentExecStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "assignee" TEXT,
    "clinicalRecordId" TEXT,
    "reportTitle" TEXT,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_disciplines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_intakes" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "state" "IntakeState" NOT NULL DEFAULT 'DRAFT',
    "data" JSONB NOT NULL DEFAULT '{}',
    "presentingConcern" TEXT,
    "referralQuestions" TEXT[],
    "parentGoals" TEXT[],
    "urgencyFlag" TEXT,
    "aiSummary" TEXT,
    "consentAssessment" BOOLEAN NOT NULL DEFAULT false,
    "consentTherapy" BOOLEAN NOT NULL DEFAULT false,
    "consentSharing" BOOLEAN NOT NULL DEFAULT false,
    "consentAi" BOOLEAN NOT NULL DEFAULT false,
    "recordedBy" TEXT,
    "summarisedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_intakes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_billing" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "sessionId" TEXT,
    "serviceCode" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "BillingStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "invoiceUrl" TEXT,
    "payerType" "PayerType" NOT NULL DEFAULT 'SELF_PAY',
    "insurancePolicyId" TEXT,
    "preAuthorizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_billing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_audit_logs" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_consents" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "grantedById" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "notes" TEXT,
    "consentVersionId" TEXT,
    "purpose" TEXT,
    "recipient" TEXT,
    "scope" JSONB,
    "grantedByGuardianId" TEXT,
    "consentFormId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_identity_documents" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "type" "IdentityDocType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_identity_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardians" (
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

-- CreateTable
CREATE TABLE "consent_templates" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT,
    "facilityId" TEXT,
    "type" "ConsentType" NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consent_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_versions" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "bodyUrl" TEXT,
    "bodyHash" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pre_visit_tasks" (
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

-- CreateTable
CREATE TABLE "insurance_policies" (
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

-- CreateTable
CREATE TABLE "pre_authorizations" (
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

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "channel" "LeadChannel" NOT NULL DEFAULT 'WEBSITE',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "concern" TEXT,
    "childAge" TEXT,
    "preferredBranch" TEXT,
    "language" TEXT,
    "payerIndication" "PayerType",
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "referralSource" TEXT,
    "referrerName" TEXT,
    "referrerOrg" TEXT,
    "referrerContact" TEXT,
    "referrerConsentId" TEXT,
    "assignedToId" TEXT,
    "qualifiedAt" TIMESTAMP(3),
    "closeReason" TEXT,
    "convertedChildId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pathway_templates" (
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

-- CreateTable
CREATE TABLE "triage_reviews" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "leadId" TEXT,
    "reviewedById" TEXT NOT NULL,
    "status" "TriageStatus" NOT NULL DEFAULT 'PENDING',
    "decision" "TriageDecision",
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'NONE',
    "aiSummary" TEXT,
    "notes" TEXT,
    "pathwayTemplateId" TEXT,
    "pathway" "TriagePathway",
    "decisionData" JSONB,
    "confirmedAt" TIMESTAMP(3),
    "acknowledgedByGuardianAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "triage_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telehealth_encounters" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "platform" "TelehealthPlatform" NOT NULL DEFAULT 'GOOGLE_MEET',
    "clinicianLicence" TEXT,
    "clinicianLocation" TEXT,
    "patientLocation" TEXT,
    "telehealthConsentId" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telehealth_encounters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mdt_reviews" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "status" "MdtReviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "summary" TEXT,
    "conductedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mdt_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mdt_attendees" (
    "id" TEXT NOT NULL,
    "mdtReviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "mdt_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_addendums" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_addendums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_reviews" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "treatmentPlanId" TEXT,
    "triggerType" "ReviewTriggerType" NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'DUE',
    "dueAt" TIMESTAMP(3),
    "completedById" TEXT,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ehr_exports" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "format" "EhrExportFormat" NOT NULL DEFAULT 'PDF',
    "status" "EhrExportStatus" NOT NULL DEFAULT 'PENDING',
    "payloadUrl" TEXT,
    "ehrRef" TEXT,
    "exportedById" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ehr_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_incidents" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "childId" TEXT,
    "raisedById" TEXT NOT NULL,
    "raisedFromModule" TEXT,
    "category" "IncidentCategory" NOT NULL,
    "urgency" "IncidentUrgency" NOT NULL DEFAULT 'ROUTINE',
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "ownerId" TEXT,
    "description" TEXT NOT NULL,
    "clinicalDecision" TEXT,
    "actionPlan" TEXT,
    "riskLabel" TEXT,
    "referralTarget" TEXT,
    "reviewerNote" TEXT,
    "reviewerApproved" BOOLEAN NOT NULL DEFAULT false,
    "consentObtained" BOOLEAN NOT NULL DEFAULT false,
    "shareScope" JSONB,
    "followUpOutcome" TEXT,
    "sentAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_shares" (
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

-- CreateTable
CREATE TABLE "clinical_templates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discipline" "TherapyDiscipline" NOT NULL,
    "activityType" "ClinicalActivityType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "schema" JSONB NOT NULL,
    "isGlobal" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_records" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateCode" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL DEFAULT 1,
    "discipline" "TherapyDiscipline" NOT NULL,
    "activityType" "ClinicalActivityType" NOT NULL,
    "therapistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "status" "ClinicalRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "signedAt" TIMESTAMP(3),
    "signatureName" TEXT,
    "reportDocumentId" TEXT,
    "insights" JSONB,
    "insightsModel" TEXT,
    "insightsGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mira_conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "childId" TEXT,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mira_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mira_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "cards" JSONB,
    "choices" JSONB,
    "actions" JSONB,
    "sentiment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mira_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_forms" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "intakeId" TEXT NOT NULL,
    "envelopeId" TEXT,
    "status" "ConsentStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "documentUrl" TEXT,
    "sentBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consent_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credentials" (
    "id" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "docType" TEXT NOT NULL DEFAULT '',
    "fileName" TEXT NOT NULL DEFAULT '',
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/octet-stream',
    "expiresAt" TIMESTAMP(3),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "bookingId" TEXT,
    "patientId" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "stripePaymentId" TEXT,
    "clinicName" TEXT,
    "issuedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "payerType" "PayerType" NOT NULL DEFAULT 'SELF_PAY',
    "insurancePolicyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clinicId" TEXT,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "caseId" TEXT,
    "participantIds" TEXT[],
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "accentColor" TEXT,
    "address" TEXT,
    "licenseNo" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "country" TEXT,
    "description" TEXT,
    "website" TEXT,
    "rating" DOUBLE PRECISION DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "licenseAuthority" "LicenseAuthority",
    "emirate" "Emirate",
    "complianceStatus" "FacilityComplianceStatus" NOT NULL DEFAULT 'DRAFT',
    "complianceReviewedAt" TIMESTAMP(3),
    "complianceReviewedBy" TEXT,
    "ehrSystemName" TEXT,
    "nabidhFacilityCode" TEXT,
    "organizationId" TEXT,
    "adminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facilities" (
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

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ageBandLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_members" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "FacilityRole" NOT NULL,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facility_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_consents" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "guardianId" TEXT,
    "grantedById" TEXT NOT NULL,
    "facilityId" TEXT,
    "affiliationId" TEXT,
    "caseId" TEXT,
    "type" "ConsentType" NOT NULL,
    "purpose" TEXT,
    "recipient" TEXT,
    "scope" JSONB,
    "consentVersionId" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "notes" TEXT,
    "migratedFromCaseConsentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "child_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_affiliations" (
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

-- CreateTable
CREATE TABLE "child_claims" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "affiliationId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "guardianEmail" TEXT NOT NULL,
    "guardianName" TEXT NOT NULL,
    "status" "ChildClaimStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "claimedByUserId" TEXT,
    "mergedFromPlaceholderId" TEXT,
    "disputeReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "child_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observations" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "affiliationId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "authorId" TEXT,
    "domain" TEXT,
    "type" "ObservationType" NOT NULL DEFAULT 'NOTE',
    "note" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concerns" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "affiliationId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "raisedById" TEXT,
    "status" "ConcernStatus" NOT NULL DEFAULT 'DRAFT',
    "domains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "staffCoaching" TEXT,
    "coachingModel" TEXT,
    "parentSummary" TEXT NOT NULL,
    "evidenceSummary" JSONB,
    "sharedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "parentResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "concerns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_plans" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "affiliationId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "concernId" TEXT,
    "createdById" TEXT,
    "title" TEXT NOT NULL,
    "status" "SupportPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "domains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "summary" TEXT,
    "staffNotes" TEXT,
    "reviewDate" TIMESTAMP(3),
    "sharedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "parentResponse" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_outcomes" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "outcomeText" TEXT NOT NULL,
    "successCriteria" TEXT,
    "baselineValue" DOUBLE PRECISION,
    "targetDate" TIMESTAMP(3),
    "reviewIntervalDays" INTEGER,
    "currentProgress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "GoalStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_reviews" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "reviewedById" TEXT,
    "outcomeProgress" JSONB,
    "progressNote" TEXT,
    "decision" "SupportReviewDecision" NOT NULL,
    "sharedWithParent" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_interventions" (
    "id" TEXT NOT NULL,
    "outcomeId" TEXT NOT NULL,
    "kind" "InterventionKind" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "InterventionStatus" NOT NULL DEFAULT 'PLANNED',
    "worksheetAssignmentId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_interventions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developmental_reviews" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "affiliationId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "createdById" TEXT,
    "ageMonths" INTEGER NOT NULL,
    "status" "DevReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "flaggedDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "educatorAssessmentId" TEXT,
    "parentAssessmentId" TEXT,
    "evidenceSummary" JSONB,
    "summary" TEXT NOT NULL,
    "recommendation" TEXT,
    "sharedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "parentResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "developmental_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handover_records" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "affiliationId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "createdById" TEXT,
    "recipientType" "HandoverRecipient" NOT NULL DEFAULT 'SCHOOL',
    "recipientName" TEXT,
    "status" "HandoverStatus" NOT NULL DEFAULT 'DRAFT',
    "snapshot" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "guardianConsentedAt" TIMESTAMP(3),
    "sharedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "handover_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RoomStaff" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RoomStaff_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetPasswordToken_key" ON "User"("resetPasswordToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_verificationStatus_idx" ON "User"("verificationStatus");

-- CreateIndex
CREATE INDEX "User_state_city_idx" ON "User"("state", "city");

-- CreateIndex
CREATE INDEX "User_preferredLanguage_idx" ON "User"("preferredLanguage");

-- CreateIndex
CREATE INDEX "User_resetPasswordToken_idx" ON "User"("resetPasswordToken");

-- CreateIndex
CREATE INDEX "User_googleId_idx" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "Community_slug_key" ON "Community"("slug");

-- CreateIndex
CREATE INDEX "Community_type_idx" ON "Community"("type");

-- CreateIndex
CREATE INDEX "Community_condition_idx" ON "Community"("condition");

-- CreateIndex
CREATE INDEX "Community_location_idx" ON "Community"("location");

-- CreateIndex
CREATE INDEX "Community_parentId_idx" ON "Community"("parentId");

-- CreateIndex
CREATE INDEX "Community_creatorId_idx" ON "Community"("creatorId");

-- CreateIndex
CREATE INDEX "Community_isPrivate_idx" ON "Community"("isPrivate");

-- CreateIndex
CREATE INDEX "Community_slug_idx" ON "Community"("slug");

-- CreateIndex
CREATE INDEX "CommunityMember_userId_idx" ON "CommunityMember"("userId");

-- CreateIndex
CREATE INDEX "CommunityMember_communityId_idx" ON "CommunityMember"("communityId");

-- CreateIndex
CREATE INDEX "CommunityMember_whatsappGroupId_idx" ON "CommunityMember"("whatsappGroupId");

-- CreateIndex
CREATE INDEX "CommunityMember_status_idx" ON "CommunityMember"("status");

-- CreateIndex
CREATE INDEX "CommunityMember_role_idx" ON "CommunityMember"("role");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityMember_userId_communityId_key" ON "CommunityMember"("userId", "communityId");

-- CreateIndex
CREATE INDEX "WhatsAppGroup_communityId_idx" ON "WhatsAppGroup"("communityId");

-- CreateIndex
CREATE INDEX "WhatsAppGroup_adminUserId_idx" ON "WhatsAppGroup"("adminUserId");

-- CreateIndex
CREATE INDEX "WhatsAppGroup_isFull_idx" ON "WhatsAppGroup"("isFull");

-- CreateIndex
CREATE INDEX "WhatsAppGroup_language_idx" ON "WhatsAppGroup"("language");

-- CreateIndex
CREATE INDEX "WhatsAppGroup_isActive_idx" ON "WhatsAppGroup"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppInvitation_inviteCode_key" ON "WhatsAppInvitation"("inviteCode");

-- CreateIndex
CREATE INDEX "WhatsAppInvitation_inviteCode_idx" ON "WhatsAppInvitation"("inviteCode");

-- CreateIndex
CREATE INDEX "WhatsAppInvitation_status_idx" ON "WhatsAppInvitation"("status");

-- CreateIndex
CREATE INDEX "WhatsAppInvitation_userId_idx" ON "WhatsAppInvitation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppInvitation_whatsappGroupId_userId_key" ON "WhatsAppInvitation"("whatsappGroupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_feedPostId_key" ON "Event"("feedPostId");

-- CreateIndex
CREATE INDEX "Event_communityId_idx" ON "Event"("communityId");

-- CreateIndex
CREATE INDEX "Event_organizationId_idx" ON "Event"("organizationId");

-- CreateIndex
CREATE INDEX "Event_startDate_idx" ON "Event"("startDate");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE INDEX "Event_eventType_idx" ON "Event"("eventType");

-- CreateIndex
CREATE INDEX "Event_city_state_idx" ON "Event"("city", "state");

-- CreateIndex
CREATE INDEX "Event_createdBy_idx" ON "Event"("createdBy");

-- CreateIndex
CREATE INDEX "EventInterest_userId_idx" ON "EventInterest"("userId");

-- CreateIndex
CREATE INDEX "EventInterest_status_idx" ON "EventInterest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EventInterest_eventId_userId_key" ON "EventInterest"("eventId", "userId");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE INDEX "Post_category_idx" ON "Post"("category");

-- CreateIndex
CREATE INDEX "Post_type_idx" ON "Post"("type");

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Post_moderationStatus_idx" ON "Post"("moderationStatus");

-- CreateIndex
CREATE INDEX "Post_communityId_idx" ON "Post"("communityId");

-- CreateIndex
CREATE INDEX "Post_containsCrisisKeywords_idx" ON "Post"("containsCrisisKeywords");

-- CreateIndex
CREATE INDEX "Post_needsReview_idx" ON "Post"("needsReview");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");

-- CreateIndex
CREATE INDEX "UserPreferences_userId_idx" ON "UserPreferences"("userId");

-- CreateIndex
CREATE INDEX "UserInterests_userId_score_idx" ON "UserInterests"("userId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "UserInterests_userId_category_key" ON "UserInterests"("userId", "category");

-- CreateIndex
CREATE INDEX "FeedInteraction_userId_timestamp_idx" ON "FeedInteraction"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "FeedInteraction_postId_action_idx" ON "FeedInteraction"("postId", "action");

-- CreateIndex
CREATE INDEX "PostView_postId_createdAt_idx" ON "PostView"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "PostView_userId_idx" ON "PostView"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PostView_postId_userId_viewedAt_key" ON "PostView"("postId", "userId", "viewedAt");

-- CreateIndex
CREATE INDEX "EngagementEvent_postId_eventType_createdAt_idx" ON "EngagementEvent"("postId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "EngagementEvent_userId_idx" ON "EngagementEvent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PostEngagementMetrics_postId_key" ON "PostEngagementMetrics"("postId");

-- CreateIndex
CREATE INDEX "PostEngagementMetrics_velocityScore_idx" ON "PostEngagementMetrics"("velocityScore");

-- CreateIndex
CREATE INDEX "PostEngagementMetrics_lastCalculatedAt_idx" ON "PostEngagementMetrics"("lastCalculatedAt");

-- CreateIndex
CREATE INDEX "UserSimilarity_userId_similarity_idx" ON "UserSimilarity"("userId", "similarity");

-- CreateIndex
CREATE UNIQUE INDEX "UserSimilarity_userId_similarUserId_key" ON "UserSimilarity"("userId", "similarUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UserInteractionProfile_userId_key" ON "UserInteractionProfile"("userId");

-- CreateIndex
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");

-- CreateIndex
CREATE INDEX "Vote_commentId_idx" ON "Vote"("commentId");

-- CreateIndex
CREATE INDEX "Vote_postId_idx" ON "Vote"("postId");

-- CreateIndex
CREATE INDEX "Vote_targetId_targetType_idx" ON "Vote"("targetId", "targetType");

-- CreateIndex
CREATE INDEX "Vote_userId_idx" ON "Vote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_userId_commentId_key" ON "Vote"("userId", "commentId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_userId_postId_key" ON "Vote"("userId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_userId_targetId_targetType_key" ON "Vote"("userId", "targetId", "targetType");

-- CreateIndex
CREATE INDEX "Bookmark_postId_idx" ON "Bookmark"("postId");

-- CreateIndex
CREATE INDEX "Bookmark_questionId_idx" ON "Bookmark"("questionId");

-- CreateIndex
CREATE INDEX "Bookmark_userId_idx" ON "Bookmark"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_postId_key" ON "Bookmark"("userId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_questionId_key" ON "Bookmark"("userId", "questionId");

-- CreateIndex
CREATE INDEX "Resource_postId_idx" ON "Resource"("postId");

-- CreateIndex
CREATE INDEX "Resource_type_idx" ON "Resource"("type");

-- CreateIndex
CREATE INDEX "SimilarPost_originalPostId_idx" ON "SimilarPost"("originalPostId");

-- CreateIndex
CREATE INDEX "SimilarPost_similarity_idx" ON "SimilarPost"("similarity");

-- CreateIndex
CREATE UNIQUE INDEX "SimilarPost_originalPostId_relatedPostId_key" ON "SimilarPost"("originalPostId", "relatedPostId");

-- CreateIndex
CREATE INDEX "DirectMessage_fromId_idx" ON "DirectMessage"("fromId");

-- CreateIndex
CREATE INDEX "DirectMessage_toId_idx" ON "DirectMessage"("toId");

-- CreateIndex
CREATE INDEX "DirectMessage_read_idx" ON "DirectMessage"("read");

-- CreateIndex
CREATE INDEX "Follow_followerId_idx" ON "Follow"("followerId");

-- CreateIndex
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "VerificationDoc_userId_idx" ON "VerificationDoc"("userId");

-- CreateIndex
CREATE INDEX "Report_userId_idx" ON "Report"("userId");

-- CreateIndex
CREATE INDEX "Report_targetId_idx" ON "Report"("targetId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ModerationLog_moderatorId_idx" ON "ModerationLog"("moderatorId");

-- CreateIndex
CREATE INDEX "ModerationLog_userId_idx" ON "ModerationLog"("userId");

-- CreateIndex
CREATE INDEX "ModerationLog_targetId_idx" ON "ModerationLog"("targetId");

-- CreateIndex
CREATE INDEX "ModerationLog_targetType_targetId_idx" ON "ModerationLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ModerationLog_createdAt_idx" ON "ModerationLog"("createdAt");

-- CreateIndex
CREATE INDEX "AiSession_userId_idx" ON "AiSession"("userId");

-- CreateIndex
CREATE INDEX "Analytics_createdAt_idx" ON "Analytics"("createdAt");

-- CreateIndex
CREATE INDEX "Analytics_event_idx" ON "Analytics"("event");

-- CreateIndex
CREATE INDEX "Analytics_postId_idx" ON "Analytics"("postId");

-- CreateIndex
CREATE INDEX "Analytics_userId_idx" ON "Analytics"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AiSubscription_userId_key" ON "AiSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AiSubscription_stripeSubscriptionId_key" ON "AiSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "AiUsage_userId_key" ON "AiUsage"("userId");

-- CreateIndex
CREATE INDEX "CrisisIncident_userId_idx" ON "CrisisIncident"("userId");

-- CreateIndex
CREATE INDEX "CrisisIncident_status_idx" ON "CrisisIncident"("status");

-- CreateIndex
CREATE INDEX "CrisisIncident_urgencyLevel_idx" ON "CrisisIncident"("urgencyLevel");

-- CreateIndex
CREATE INDEX "CrisisIncident_type_idx" ON "CrisisIncident"("type");

-- CreateIndex
CREATE INDEX "CrisisIncident_createdAt_idx" ON "CrisisIncident"("createdAt");

-- CreateIndex
CREATE INDEX "CrisisIncident_state_city_idx" ON "CrisisIncident"("state", "city");

-- CreateIndex
CREATE INDEX "CrisisResource_state_city_idx" ON "CrisisResource"("state", "city");

-- CreateIndex
CREATE INDEX "CrisisResource_type_idx" ON "CrisisResource"("type");

-- CreateIndex
CREATE INDEX "CrisisResource_priority_idx" ON "CrisisResource"("priority");

-- CreateIndex
CREATE INDEX "CrisisResource_isActive_idx" ON "CrisisResource"("isActive");

-- CreateIndex
CREATE INDEX "CrisisLog_incidentId_idx" ON "CrisisLog"("incidentId");

-- CreateIndex
CREATE INDEX "CrisisLog_createdAt_idx" ON "CrisisLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CrisisVolunteer_userId_key" ON "CrisisVolunteer"("userId");

-- CreateIndex
CREATE INDEX "CrisisVolunteer_userId_idx" ON "CrisisVolunteer"("userId");

-- CreateIndex
CREATE INDEX "CrisisVolunteer_isAvailable_idx" ON "CrisisVolunteer"("isAvailable");

-- CreateIndex
CREATE INDEX "CrisisVolunteer_state_city_idx" ON "CrisisVolunteer"("state", "city");

-- CreateIndex
CREATE INDEX "CrisisVolunteer_isAvailable_state_city_idx" ON "CrisisVolunteer"("isAvailable", "state", "city");

-- CreateIndex
CREATE INDEX "CrisisConnection_incidentId_idx" ON "CrisisConnection"("incidentId");

-- CreateIndex
CREATE INDEX "CrisisConnection_volunteerId_idx" ON "CrisisConnection"("volunteerId");

-- CreateIndex
CREATE INDEX "CrisisAuditLog_action_idx" ON "CrisisAuditLog"("action");

-- CreateIndex
CREATE INDEX "CrisisAuditLog_incidentId_idx" ON "CrisisAuditLog"("incidentId");

-- CreateIndex
CREATE INDEX "CrisisAuditLog_timestamp_idx" ON "CrisisAuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "CrisisAuditLog_userId_idx" ON "CrisisAuditLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Question_slug_key" ON "Question"("slug");

-- CreateIndex
CREATE INDEX "Question_authorId_idx" ON "Question"("authorId");

-- CreateIndex
CREATE INDEX "Question_status_idx" ON "Question"("status");

-- CreateIndex
CREATE INDEX "Question_category_idx" ON "Question"("category");

-- CreateIndex
CREATE INDEX "Question_lastActivityAt_idx" ON "Question"("lastActivityAt");

-- CreateIndex
CREATE INDEX "Question_answerCount_idx" ON "Question"("answerCount");

-- CreateIndex
CREATE INDEX "Question_viewCount_idx" ON "Question"("viewCount");

-- CreateIndex
CREATE INDEX "Question_slug_idx" ON "Question"("slug");

-- CreateIndex
CREATE INDEX "Answer_questionId_idx" ON "Answer"("questionId");

-- CreateIndex
CREATE INDEX "Answer_authorId_idx" ON "Answer"("authorId");

-- CreateIndex
CREATE INDEX "Answer_isAccepted_idx" ON "Answer"("isAccepted");

-- CreateIndex
CREATE INDEX "Answer_qualityScore_idx" ON "Answer"("qualityScore");

-- CreateIndex
CREATE INDEX "Answer_createdAt_idx" ON "Answer"("createdAt");

-- CreateIndex
CREATE INDEX "AnswerVote_answerId_idx" ON "AnswerVote"("answerId");

-- CreateIndex
CREATE INDEX "AnswerVote_userId_idx" ON "AnswerVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AnswerVote_answerId_userId_key" ON "AnswerVote"("answerId", "userId");

-- CreateIndex
CREATE INDEX "AnswerComment_answerId_idx" ON "AnswerComment"("answerId");

-- CreateIndex
CREATE INDEX "AnswerComment_authorId_idx" ON "AnswerComment"("authorId");

-- CreateIndex
CREATE INDEX "AnswerEdit_answerId_idx" ON "AnswerEdit"("answerId");

-- CreateIndex
CREATE INDEX "AnswerEdit_createdAt_idx" ON "AnswerEdit"("createdAt");

-- CreateIndex
CREATE INDEX "QuestionFollower_userId_idx" ON "QuestionFollower"("userId");

-- CreateIndex
CREATE INDEX "QuestionFollower_questionId_idx" ON "QuestionFollower"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionFollower_questionId_userId_key" ON "QuestionFollower"("questionId", "userId");

-- CreateIndex
CREATE INDEX "AnswerRequest_questionId_idx" ON "AnswerRequest"("questionId");

-- CreateIndex
CREATE INDEX "AnswerRequest_requestedUserId_idx" ON "AnswerRequest"("requestedUserId");

-- CreateIndex
CREATE INDEX "AnswerRequest_status_idx" ON "AnswerRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AnswerRequest_questionId_requesterId_requestedUserId_key" ON "AnswerRequest"("questionId", "requesterId", "requestedUserId");

-- CreateIndex
CREATE INDEX "RelatedQuestion_questionId_idx" ON "RelatedQuestion"("questionId");

-- CreateIndex
CREATE INDEX "RelatedQuestion_similarity_idx" ON "RelatedQuestion"("similarity");

-- CreateIndex
CREATE UNIQUE INDEX "RelatedQuestion_questionId_relatedQuestionId_key" ON "RelatedQuestion"("questionId", "relatedQuestionId");

-- CreateIndex
CREATE INDEX "AnswerView_answerId_idx" ON "AnswerView"("answerId");

-- CreateIndex
CREATE INDEX "AnswerView_viewedAt_idx" ON "AnswerView"("viewedAt");

-- CreateIndex
CREATE INDEX "AnswerView_userId_idx" ON "AnswerView"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "providers_serialNumber_key" ON "providers"("serialNumber");

-- CreateIndex
CREATE INDEX "providers_state_city_idx" ON "providers"("state", "city");

-- CreateIndex
CREATE INDEX "providers_normalizedState_idx" ON "providers"("normalizedState");

-- CreateIndex
CREATE INDEX "providers_normalizedOrgType_idx" ON "providers"("normalizedOrgType");

-- CreateIndex
CREATE INDEX "providers_organizationName_idx" ON "providers"("organizationName");

-- CreateIndex
CREATE INDEX "providers_isVerified_idx" ON "providers"("isVerified");

-- CreateIndex
CREATE INDEX "provider_views_providerId_idx" ON "provider_views"("providerId");

-- CreateIndex
CREATE INDEX "provider_views_userId_idx" ON "provider_views"("userId");

-- CreateIndex
CREATE INDEX "provider_views_viewedAt_idx" ON "provider_views"("viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");

-- CreateIndex
CREATE INDEX "user_profiles_userId_idx" ON "user_profiles"("userId");

-- CreateIndex
CREATE INDEX "user_profiles_completenessScore_idx" ON "user_profiles"("completenessScore");

-- CreateIndex
CREATE INDEX "children_profileId_idx" ON "children"("profileId");

-- CreateIndex
CREATE INDEX "children_dateOfBirth_idx" ON "children"("dateOfBirth");

-- CreateIndex
CREATE INDEX "children_clinicId_idx" ON "children"("clinicId");

-- CreateIndex
CREATE INDEX "child_conditions_childId_idx" ON "child_conditions"("childId");

-- CreateIndex
CREATE INDEX "child_conditions_conditionType_idx" ON "child_conditions"("conditionType");

-- CreateIndex
CREATE INDEX "profile_completeness_logs_userId_idx" ON "profile_completeness_logs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_kind_idx" ON "Organization"("kind");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE INDEX "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationMember_status_idx" ON "OrganizationMember"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_userId_organizationId_key" ON "OrganizationMember"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvitation_token_key" ON "OrganizationInvitation"("token");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_email_idx" ON "OrganizationInvitation"("email");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_token_idx" ON "OrganizationInvitation"("token");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_organizationId_idx" ON "OrganizationInvitation"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_status_idx" ON "OrganizationInvitation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvitation_email_organizationId_key" ON "OrganizationInvitation"("email", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "FcmToken_fcmToken_key" ON "FcmToken"("fcmToken");

-- CreateIndex
CREATE INDEX "FcmToken_userId_idx" ON "FcmToken"("userId");

-- CreateIndex
CREATE INDEX "FcmToken_email_idx" ON "FcmToken"("email");

-- CreateIndex
CREATE INDEX "FcmToken_device_idx" ON "FcmToken"("device");

-- CreateIndex
CREATE INDEX "FcmToken_isActive_idx" ON "FcmToken"("isActive");

-- CreateIndex
CREATE INDEX "FcmToken_fcmToken_idx" ON "FcmToken"("fcmToken");

-- CreateIndex
CREATE INDEX "ClinicalConversation_userId_idx" ON "ClinicalConversation"("userId");

-- CreateIndex
CREATE INDEX "ClinicalConversation_updatedAt_idx" ON "ClinicalConversation"("updatedAt");

-- CreateIndex
CREATE INDEX "ClinicalMessage_conversationId_idx" ON "ClinicalMessage"("conversationId");

-- CreateIndex
CREATE INDEX "ClinicalPlan_userId_idx" ON "ClinicalPlan"("userId");

-- CreateIndex
CREATE INDEX "ClinicalFeedback_conversationId_idx" ON "ClinicalFeedback"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalFeedback_userId_conversationId_key" ON "ClinicalFeedback"("userId", "conversationId");

-- CreateIndex
CREATE INDEX "insight_shares_sharedBy_idx" ON "insight_shares"("sharedBy");

-- CreateIndex
CREATE INDEX "insight_shares_sharedWith_idx" ON "insight_shares"("sharedWith");

-- CreateIndex
CREATE UNIQUE INDEX "insight_shares_conversationId_sharedWith_key" ON "insight_shares"("conversationId", "sharedWith");

-- CreateIndex
CREATE INDEX "assessments_childId_idx" ON "assessments"("childId");

-- CreateIndex
CREATE INDEX "assessments_status_idx" ON "assessments"("status");

-- CreateIndex
CREATE INDEX "assessments_createdAt_idx" ON "assessments"("createdAt");

-- CreateIndex
CREATE INDEX "assessments_childId_informantType_idx" ON "assessments"("childId", "informantType");

-- CreateIndex
CREATE INDEX "assessments_facilityId_idx" ON "assessments"("facilityId");

-- CreateIndex
CREATE INDEX "assessment_responses_assessmentId_idx" ON "assessment_responses"("assessmentId");

-- CreateIndex
CREATE INDEX "assessment_responses_domain_idx" ON "assessment_responses"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_responses_assessmentId_questionId_key" ON "assessment_responses"("assessmentId", "questionId");

-- CreateIndex
CREATE INDEX "assessment_reports_assessmentId_idx" ON "assessment_reports"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_shares_shareLink_key" ON "assessment_shares"("shareLink");

-- CreateIndex
CREATE INDEX "assessment_shares_sharedBy_idx" ON "assessment_shares"("sharedBy");

-- CreateIndex
CREATE INDEX "assessment_shares_sharedWith_idx" ON "assessment_shares"("sharedWith");

-- CreateIndex
CREATE INDEX "assessment_shares_shareLink_idx" ON "assessment_shares"("shareLink");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_shares_assessmentId_sharedWith_key" ON "assessment_shares"("assessmentId", "sharedWith");

-- CreateIndex
CREATE UNIQUE INDEX "therapist_profiles_userId_key" ON "therapist_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "therapist_profiles_stripeAccountId_key" ON "therapist_profiles"("stripeAccountId");

-- CreateIndex
CREATE INDEX "therapist_profiles_userId_idx" ON "therapist_profiles"("userId");

-- CreateIndex
CREATE INDEX "therapist_profiles_isActive_idx" ON "therapist_profiles"("isActive");

-- CreateIndex
CREATE INDEX "therapist_profiles_acceptingBookings_idx" ON "therapist_profiles"("acceptingBookings");

-- CreateIndex
CREATE INDEX "therapist_profiles_overallRating_idx" ON "therapist_profiles"("overallRating");

-- CreateIndex
CREATE INDEX "therapist_organization_links_therapistId_idx" ON "therapist_organization_links"("therapistId");

-- CreateIndex
CREATE INDEX "therapist_organization_links_organizationId_idx" ON "therapist_organization_links"("organizationId");

-- CreateIndex
CREATE INDEX "therapist_organization_links_status_idx" ON "therapist_organization_links"("status");

-- CreateIndex
CREATE UNIQUE INDEX "therapist_organization_links_therapistId_organizationId_key" ON "therapist_organization_links"("therapistId", "organizationId");

-- CreateIndex
CREATE INDEX "session_types_organizationId_idx" ON "session_types"("organizationId");

-- CreateIndex
CREATE INDEX "session_types_therapistId_idx" ON "session_types"("therapistId");

-- CreateIndex
CREATE INDEX "session_types_isActive_idx" ON "session_types"("isActive");

-- CreateIndex
CREATE INDEX "session_pricing_therapistId_idx" ON "session_pricing"("therapistId");

-- CreateIndex
CREATE INDEX "session_pricing_sessionTypeId_idx" ON "session_pricing"("sessionTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "session_pricing_therapistId_sessionTypeId_key" ON "session_pricing"("therapistId", "sessionTypeId");

-- CreateIndex
CREATE INDEX "therapist_availability_therapistId_idx" ON "therapist_availability"("therapistId");

-- CreateIndex
CREATE INDEX "therapist_availability_dayOfWeek_idx" ON "therapist_availability"("dayOfWeek");

-- CreateIndex
CREATE INDEX "therapist_availability_isActive_idx" ON "therapist_availability"("isActive");

-- CreateIndex
CREATE INDEX "availability_exceptions_therapistId_idx" ON "availability_exceptions"("therapistId");

-- CreateIndex
CREATE INDEX "availability_exceptions_date_idx" ON "availability_exceptions"("date");

-- CreateIndex
CREATE INDEX "availability_exceptions_type_idx" ON "availability_exceptions"("type");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_stripePaymentIntentId_key" ON "bookings"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "bookings_patientId_idx" ON "bookings"("patientId");

-- CreateIndex
CREATE INDEX "bookings_therapistId_idx" ON "bookings"("therapistId");

-- CreateIndex
CREATE INDEX "bookings_sessionTypeId_idx" ON "bookings"("sessionTypeId");

-- CreateIndex
CREATE INDEX "bookings_organizationId_idx" ON "bookings"("organizationId");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_startDateTime_idx" ON "bookings"("startDateTime");

-- CreateIndex
CREATE INDEX "bookings_paymentStatus_idx" ON "bookings"("paymentStatus");

-- CreateIndex
CREATE INDEX "bookings_trackingStatus_idx" ON "bookings"("trackingStatus");

-- CreateIndex
CREATE INDEX "pre_session_questionnaires_therapistId_idx" ON "pre_session_questionnaires"("therapistId");

-- CreateIndex
CREATE INDEX "pre_session_questionnaires_isEnabled_idx" ON "pre_session_questionnaires"("isEnabled");

-- CreateIndex
CREATE INDEX "booking_questionnaire_responses_bookingId_idx" ON "booking_questionnaire_responses"("bookingId");

-- CreateIndex
CREATE INDEX "booking_questionnaire_responses_questionnaireId_idx" ON "booking_questionnaire_responses"("questionnaireId");

-- CreateIndex
CREATE UNIQUE INDEX "booking_questionnaire_responses_bookingId_questionnaireId_key" ON "booking_questionnaire_responses"("bookingId", "questionnaireId");

-- CreateIndex
CREATE INDEX "session_ratings_bookingId_idx" ON "session_ratings"("bookingId");

-- CreateIndex
CREATE INDEX "session_ratings_ratedBy_idx" ON "session_ratings"("ratedBy");

-- CreateIndex
CREATE INDEX "session_ratings_therapistId_idx" ON "session_ratings"("therapistId");

-- CreateIndex
CREATE INDEX "session_ratings_rating_idx" ON "session_ratings"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "session_ratings_bookingId_ratedBy_key" ON "session_ratings"("bookingId", "ratedBy");

-- CreateIndex
CREATE INDEX "booking_packages_organizationId_idx" ON "booking_packages"("organizationId");

-- CreateIndex
CREATE INDEX "booking_packages_therapistId_idx" ON "booking_packages"("therapistId");

-- CreateIndex
CREATE INDEX "booking_packages_sessionTypeId_idx" ON "booking_packages"("sessionTypeId");

-- CreateIndex
CREATE INDEX "booking_packages_isActive_idx" ON "booking_packages"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "package_purchases_stripePaymentIntentId_key" ON "package_purchases"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "package_purchases_patientId_idx" ON "package_purchases"("patientId");

-- CreateIndex
CREATE INDEX "package_purchases_packageId_idx" ON "package_purchases"("packageId");

-- CreateIndex
CREATE INDEX "package_purchases_expiresAt_idx" ON "package_purchases"("expiresAt");

-- CreateIndex
CREATE INDEX "package_purchases_isActive_idx" ON "package_purchases"("isActive");

-- CreateIndex
CREATE INDEX "session_disputes_bookingId_idx" ON "session_disputes"("bookingId");

-- CreateIndex
CREATE INDEX "session_disputes_raisedBy_idx" ON "session_disputes"("raisedBy");

-- CreateIndex
CREATE INDEX "session_disputes_status_idx" ON "session_disputes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_settings_organizationId_key" ON "marketplace_settings"("organizationId");

-- CreateIndex
CREATE INDEX "marketplace_settings_organizationId_idx" ON "marketplace_settings"("organizationId");

-- CreateIndex
CREATE INDEX "worksheets_createdById_idx" ON "worksheets"("createdById");

-- CreateIndex
CREATE INDEX "worksheets_childId_idx" ON "worksheets"("childId");

-- CreateIndex
CREATE INDEX "worksheets_type_status_idx" ON "worksheets"("type", "status");

-- CreateIndex
CREATE INDEX "worksheets_createdAt_idx" ON "worksheets"("createdAt");

-- CreateIndex
CREATE INDEX "worksheets_screeningId_idx" ON "worksheets"("screeningId");

-- CreateIndex
CREATE INDEX "worksheets_caseId_idx" ON "worksheets"("caseId");

-- CreateIndex
CREATE INDEX "worksheets_isPublic_status_idx" ON "worksheets"("isPublic", "status");

-- CreateIndex
CREATE INDEX "worksheets_averageRating_idx" ON "worksheets"("averageRating");

-- CreateIndex
CREATE INDEX "worksheets_clonedFromId_idx" ON "worksheets"("clonedFromId");

-- CreateIndex
CREATE INDEX "worksheets_parentVersionId_idx" ON "worksheets"("parentVersionId");

-- CreateIndex
CREATE INDEX "worksheet_images_worksheetId_idx" ON "worksheet_images"("worksheetId");

-- CreateIndex
CREATE INDEX "worksheet_assignments_assignedById_idx" ON "worksheet_assignments"("assignedById");

-- CreateIndex
CREATE INDEX "worksheet_assignments_assignedToId_idx" ON "worksheet_assignments"("assignedToId");

-- CreateIndex
CREATE INDEX "worksheet_assignments_childId_idx" ON "worksheet_assignments"("childId");

-- CreateIndex
CREATE INDEX "worksheet_assignments_caseId_idx" ON "worksheet_assignments"("caseId");

-- CreateIndex
CREATE INDEX "worksheet_assignments_status_idx" ON "worksheet_assignments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "worksheet_assignments_worksheetId_assignedToId_childId_key" ON "worksheet_assignments"("worksheetId", "assignedToId", "childId");

-- CreateIndex
CREATE INDEX "worksheet_reviews_worksheetId_idx" ON "worksheet_reviews"("worksheetId");

-- CreateIndex
CREATE INDEX "worksheet_reviews_userId_idx" ON "worksheet_reviews"("userId");

-- CreateIndex
CREATE INDEX "worksheet_reviews_rating_idx" ON "worksheet_reviews"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "worksheet_reviews_worksheetId_userId_key" ON "worksheet_reviews"("worksheetId", "userId");

-- CreateIndex
CREATE INDEX "worksheet_flags_worksheetId_idx" ON "worksheet_flags"("worksheetId");

-- CreateIndex
CREATE INDEX "worksheet_flags_flaggedById_idx" ON "worksheet_flags"("flaggedById");

-- CreateIndex
CREATE INDEX "worksheet_flags_status_idx" ON "worksheet_flags"("status");

-- CreateIndex
CREATE INDEX "worksheet_completions_worksheetId_idx" ON "worksheet_completions"("worksheetId");

-- CreateIndex
CREATE INDEX "worksheet_completions_childId_idx" ON "worksheet_completions"("childId");

-- CreateIndex
CREATE INDEX "worksheet_completions_assignmentId_idx" ON "worksheet_completions"("assignmentId");

-- CreateIndex
CREATE INDEX "worksheet_completions_completedAt_idx" ON "worksheet_completions"("completedAt");

-- CreateIndex
CREATE INDEX "worksheet_effectiveness_worksheetId_idx" ON "worksheet_effectiveness"("worksheetId");

-- CreateIndex
CREATE INDEX "worksheet_effectiveness_childId_idx" ON "worksheet_effectiveness"("childId");

-- CreateIndex
CREATE INDEX "worksheet_effectiveness_domain_idx" ON "worksheet_effectiveness"("domain");

-- CreateIndex
CREATE INDEX "BannerAd_placement_status_startDate_endDate_idx" ON "BannerAd"("placement", "status", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "AdAnalytics_bannerAdId_type_idx" ON "AdAnalytics"("bannerAdId", "type");

-- CreateIndex
CREATE INDEX "AdAnalytics_createdAt_idx" ON "AdAnalytics"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "cases_caseNumber_key" ON "cases"("caseNumber");

-- CreateIndex
CREATE INDEX "cases_childId_idx" ON "cases"("childId");

-- CreateIndex
CREATE INDEX "cases_primaryTherapistId_idx" ON "cases"("primaryTherapistId");

-- CreateIndex
CREATE INDEX "cases_status_idx" ON "cases"("status");

-- CreateIndex
CREATE INDEX "cases_organizationId_idx" ON "cases"("organizationId");

-- CreateIndex
CREATE INDEX "case_therapists_caseId_idx" ON "case_therapists"("caseId");

-- CreateIndex
CREATE INDEX "case_therapists_therapistId_idx" ON "case_therapists"("therapistId");

-- CreateIndex
CREATE UNIQUE INDEX "case_therapists_caseId_therapistId_key" ON "case_therapists"("caseId", "therapistId");

-- CreateIndex
CREATE INDEX "case_internal_notes_caseId_idx" ON "case_internal_notes"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "ieps_previousVersionId_key" ON "ieps"("previousVersionId");

-- CreateIndex
CREATE INDEX "ieps_caseId_idx" ON "ieps"("caseId");

-- CreateIndex
CREATE INDEX "ieps_status_idx" ON "ieps"("status");

-- CreateIndex
CREATE INDEX "iep_templates_isGlobal_idx" ON "iep_templates"("isGlobal");

-- CreateIndex
CREATE INDEX "iep_templates_organizationId_idx" ON "iep_templates"("organizationId");

-- CreateIndex
CREATE INDEX "iep_goals_iepId_idx" ON "iep_goals"("iepId");

-- CreateIndex
CREATE INDEX "iep_goals_status_idx" ON "iep_goals"("status");

-- CreateIndex
CREATE INDEX "goal_bank_items_domain_idx" ON "goal_bank_items"("domain");

-- CreateIndex
CREATE INDEX "goal_bank_items_isGlobal_idx" ON "goal_bank_items"("isGlobal");

-- CreateIndex
CREATE UNIQUE INDEX "milestone_plans_previousVersionId_key" ON "milestone_plans"("previousVersionId");

-- CreateIndex
CREATE INDEX "milestone_plans_caseId_idx" ON "milestone_plans"("caseId");

-- CreateIndex
CREATE INDEX "milestones_planId_idx" ON "milestones"("planId");

-- CreateIndex
CREATE INDEX "milestones_status_idx" ON "milestones"("status");

-- CreateIndex
CREATE UNIQUE INDEX "case_sessions_bookingId_key" ON "case_sessions"("bookingId");

-- CreateIndex
CREATE INDEX "case_sessions_caseId_idx" ON "case_sessions"("caseId");

-- CreateIndex
CREATE INDEX "case_sessions_therapistId_idx" ON "case_sessions"("therapistId");

-- CreateIndex
CREATE INDEX "case_sessions_scheduledAt_idx" ON "case_sessions"("scheduledAt");

-- CreateIndex
CREATE INDEX "case_sessions_carePlanId_idx" ON "case_sessions"("carePlanId");

-- CreateIndex
CREATE INDEX "session_goal_progress_sessionId_idx" ON "session_goal_progress"("sessionId");

-- CreateIndex
CREATE INDEX "session_goal_progress_goalId_idx" ON "session_goal_progress"("goalId");

-- CreateIndex
CREATE UNIQUE INDEX "session_goal_progress_sessionId_goalId_key" ON "session_goal_progress"("sessionId", "goalId");

-- CreateIndex
CREATE UNIQUE INDEX "case_documents_parentVersionId_key" ON "case_documents"("parentVersionId");

-- CreateIndex
CREATE INDEX "case_documents_caseId_idx" ON "case_documents"("caseId");

-- CreateIndex
CREATE INDEX "case_documents_type_idx" ON "case_documents"("type");

-- CreateIndex
CREATE INDEX "case_shares_caseId_idx" ON "case_shares"("caseId");

-- CreateIndex
CREATE INDEX "case_shares_sharedWithId_idx" ON "case_shares"("sharedWithId");

-- CreateIndex
CREATE INDEX "treatment_plans_caseId_idx" ON "treatment_plans"("caseId");

-- CreateIndex
CREATE INDEX "treatment_plans_status_idx" ON "treatment_plans"("status");

-- CreateIndex
CREATE INDEX "care_plans_caseId_idx" ON "care_plans"("caseId");

-- CreateIndex
CREATE INDEX "care_plans_status_idx" ON "care_plans"("status");

-- CreateIndex
CREATE UNIQUE INDEX "care_plan_pricing_defaults_recommendation_key" ON "care_plan_pricing_defaults"("recommendation");

-- CreateIndex
CREATE INDEX "assessment_reviews_caseId_idx" ON "assessment_reviews"("caseId");

-- CreateIndex
CREATE INDEX "assessment_reviews_phase_idx" ON "assessment_reviews"("phase");

-- CreateIndex
CREATE INDEX "assessment_disciplines_assessmentReviewId_idx" ON "assessment_disciplines"("assessmentReviewId");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_disciplines_assessmentReviewId_discipline_key" ON "assessment_disciplines"("assessmentReviewId", "discipline");

-- CreateIndex
CREATE UNIQUE INDEX "case_intakes_caseId_key" ON "case_intakes"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "case_billing_sessionId_key" ON "case_billing"("sessionId");

-- CreateIndex
CREATE INDEX "case_billing_caseId_idx" ON "case_billing"("caseId");

-- CreateIndex
CREATE INDEX "case_billing_status_idx" ON "case_billing"("status");

-- CreateIndex
CREATE INDEX "case_audit_logs_caseId_idx" ON "case_audit_logs"("caseId");

-- CreateIndex
CREATE INDEX "case_audit_logs_userId_idx" ON "case_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "case_audit_logs_timestamp_idx" ON "case_audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "case_consents_caseId_idx" ON "case_consents"("caseId");

-- CreateIndex
CREATE INDEX "case_consents_type_idx" ON "case_consents"("type");

-- CreateIndex
CREATE INDEX "patient_identity_documents_childId_idx" ON "patient_identity_documents"("childId");

-- CreateIndex
CREATE INDEX "guardians_childId_idx" ON "guardians"("childId");

-- CreateIndex
CREATE INDEX "consent_templates_clinicId_idx" ON "consent_templates"("clinicId");

-- CreateIndex
CREATE INDEX "consent_templates_facilityId_idx" ON "consent_templates"("facilityId");

-- CreateIndex
CREATE INDEX "consent_templates_type_idx" ON "consent_templates"("type");

-- CreateIndex
CREATE UNIQUE INDEX "consent_versions_templateId_version_key" ON "consent_versions"("templateId", "version");

-- CreateIndex
CREATE INDEX "pre_visit_tasks_childId_idx" ON "pre_visit_tasks"("childId");

-- CreateIndex
CREATE INDEX "pre_visit_tasks_status_idx" ON "pre_visit_tasks"("status");

-- CreateIndex
CREATE INDEX "insurance_policies_childId_idx" ON "insurance_policies"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "pre_authorizations_renewedFromId_key" ON "pre_authorizations"("renewedFromId");

-- CreateIndex
CREATE INDEX "pre_authorizations_policyId_idx" ON "pre_authorizations"("policyId");

-- CreateIndex
CREATE INDEX "pre_authorizations_caseId_idx" ON "pre_authorizations"("caseId");

-- CreateIndex
CREATE INDEX "pre_authorizations_status_idx" ON "pre_authorizations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "leads_convertedChildId_key" ON "leads"("convertedChildId");

-- CreateIndex
CREATE INDEX "leads_clinicId_idx" ON "leads"("clinicId");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_channel_idx" ON "leads"("channel");

-- CreateIndex
CREATE INDEX "pathway_templates_clinicId_idx" ON "pathway_templates"("clinicId");

-- CreateIndex
CREATE INDEX "triage_reviews_caseId_idx" ON "triage_reviews"("caseId");

-- CreateIndex
CREATE INDEX "triage_reviews_status_idx" ON "triage_reviews"("status");

-- CreateIndex
CREATE UNIQUE INDEX "telehealth_encounters_sessionId_key" ON "telehealth_encounters"("sessionId");

-- CreateIndex
CREATE INDEX "mdt_reviews_caseId_idx" ON "mdt_reviews"("caseId");

-- CreateIndex
CREATE INDEX "mdt_attendees_mdtReviewId_idx" ON "mdt_attendees"("mdtReviewId");

-- CreateIndex
CREATE UNIQUE INDEX "mdt_attendees_mdtReviewId_userId_key" ON "mdt_attendees"("mdtReviewId", "userId");

-- CreateIndex
CREATE INDEX "session_addendums_sessionId_idx" ON "session_addendums"("sessionId");

-- CreateIndex
CREATE INDEX "case_reviews_caseId_idx" ON "case_reviews"("caseId");

-- CreateIndex
CREATE INDEX "case_reviews_status_idx" ON "case_reviews"("status");

-- CreateIndex
CREATE INDEX "ehr_exports_clinicId_idx" ON "ehr_exports"("clinicId");

-- CreateIndex
CREATE INDEX "ehr_exports_resourceType_resourceId_idx" ON "ehr_exports"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "ehr_exports_status_idx" ON "ehr_exports"("status");

-- CreateIndex
CREATE INDEX "case_incidents_caseId_idx" ON "case_incidents"("caseId");

-- CreateIndex
CREATE INDEX "case_incidents_status_idx" ON "case_incidents"("status");

-- CreateIndex
CREATE INDEX "case_incidents_urgency_idx" ON "case_incidents"("urgency");

-- CreateIndex
CREATE UNIQUE INDEX "external_shares_token_key" ON "external_shares"("token");

-- CreateIndex
CREATE INDEX "external_shares_caseId_idx" ON "external_shares"("caseId");

-- CreateIndex
CREATE INDEX "external_shares_token_idx" ON "external_shares"("token");

-- CreateIndex
CREATE INDEX "clinical_templates_discipline_activityType_idx" ON "clinical_templates"("discipline", "activityType");

-- CreateIndex
CREATE INDEX "clinical_templates_organizationId_idx" ON "clinical_templates"("organizationId");

-- CreateIndex
CREATE INDEX "clinical_templates_isActive_idx" ON "clinical_templates"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_templates_code_version_organizationId_key" ON "clinical_templates"("code", "version", "organizationId");

-- CreateIndex
CREATE INDEX "clinical_records_caseId_idx" ON "clinical_records"("caseId");

-- CreateIndex
CREATE INDEX "clinical_records_caseId_activityType_idx" ON "clinical_records"("caseId", "activityType");

-- CreateIndex
CREATE INDEX "clinical_records_templateId_idx" ON "clinical_records"("templateId");

-- CreateIndex
CREATE INDEX "clinical_records_status_idx" ON "clinical_records"("status");

-- CreateIndex
CREATE INDEX "mira_conversations_userId_idx" ON "mira_conversations"("userId");

-- CreateIndex
CREATE INDEX "mira_conversations_childId_idx" ON "mira_conversations"("childId");

-- CreateIndex
CREATE INDEX "mira_conversations_updatedAt_idx" ON "mira_conversations"("updatedAt");

-- CreateIndex
CREATE INDEX "mira_messages_conversationId_idx" ON "mira_messages"("conversationId");

-- CreateIndex
CREATE INDEX "mira_messages_createdAt_idx" ON "mira_messages"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "consent_forms_envelopeId_key" ON "consent_forms"("envelopeId");

-- CreateIndex
CREATE INDEX "consent_forms_patientId_idx" ON "consent_forms"("patientId");

-- CreateIndex
CREATE INDEX "consent_forms_intakeId_idx" ON "consent_forms"("intakeId");

-- CreateIndex
CREATE INDEX "consent_forms_status_idx" ON "consent_forms"("status");

-- CreateIndex
CREATE INDEX "credentials_therapistId_idx" ON "credentials"("therapistId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_sessionId_key" ON "invoices"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_bookingId_key" ON "invoices"("bookingId");

-- CreateIndex
CREATE INDEX "invoices_patientId_idx" ON "invoices"("patientId");

-- CreateIndex
CREATE INDEX "invoices_therapistId_idx" ON "invoices"("therapistId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_clinicId_idx" ON "invoices"("clinicId");

-- CreateIndex
CREATE INDEX "conversations_parentId_idx" ON "conversations"("parentId");

-- CreateIndex
CREATE INDEX "conversations_therapistId_idx" ON "conversations"("therapistId");

-- CreateIndex
CREATE INDEX "conversations_caseId_idx" ON "conversations"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_parentId_therapistId_key" ON "conversations"("parentId", "therapistId");

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "device_tokens_userId_idx" ON "device_tokens"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_resourceType_idx" ON "audit_logs"("resourceType");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "clinics_adminId_key" ON "clinics"("adminId");

-- CreateIndex
CREATE INDEX "clinics_adminId_idx" ON "clinics"("adminId");

-- CreateIndex
CREATE INDEX "clinics_organizationId_idx" ON "clinics"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_slug_key" ON "facilities"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_migratedFromClinicId_key" ON "facilities"("migratedFromClinicId");

-- CreateIndex
CREATE INDEX "facilities_organizationId_idx" ON "facilities"("organizationId");

-- CreateIndex
CREATE INDEX "facilities_type_idx" ON "facilities"("type");

-- CreateIndex
CREATE INDEX "facilities_complianceStatus_idx" ON "facilities"("complianceStatus");

-- CreateIndex
CREATE INDEX "rooms_facilityId_idx" ON "rooms"("facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_facilityId_name_key" ON "rooms"("facilityId", "name");

-- CreateIndex
CREATE INDEX "facility_members_facilityId_role_idx" ON "facility_members"("facilityId", "role");

-- CreateIndex
CREATE INDEX "facility_members_userId_idx" ON "facility_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "facility_members_userId_facilityId_key" ON "facility_members"("userId", "facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "child_consents_migratedFromCaseConsentId_key" ON "child_consents"("migratedFromCaseConsentId");

-- CreateIndex
CREATE INDEX "child_consents_childId_type_idx" ON "child_consents"("childId", "type");

-- CreateIndex
CREATE INDEX "child_consents_facilityId_idx" ON "child_consents"("facilityId");

-- CreateIndex
CREATE INDEX "child_consents_affiliationId_idx" ON "child_consents"("affiliationId");

-- CreateIndex
CREATE INDEX "child_consents_guardianId_idx" ON "child_consents"("guardianId");

-- CreateIndex
CREATE INDEX "child_affiliations_childId_idx" ON "child_affiliations"("childId");

-- CreateIndex
CREATE INDEX "child_affiliations_facilityId_status_idx" ON "child_affiliations"("facilityId", "status");

-- CreateIndex
CREATE INDEX "child_affiliations_roomId_idx" ON "child_affiliations"("roomId");

-- CreateIndex
CREATE INDEX "child_affiliations_keyworkerId_idx" ON "child_affiliations"("keyworkerId");

-- CreateIndex
CREATE UNIQUE INDEX "child_affiliations_childId_facilityId_startedAt_key" ON "child_affiliations"("childId", "facilityId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "child_claims_tokenHash_key" ON "child_claims"("tokenHash");

-- CreateIndex
CREATE INDEX "child_claims_facilityId_status_idx" ON "child_claims"("facilityId", "status");

-- CreateIndex
CREATE INDEX "child_claims_guardianEmail_idx" ON "child_claims"("guardianEmail");

-- CreateIndex
CREATE INDEX "child_claims_childId_idx" ON "child_claims"("childId");

-- CreateIndex
CREATE INDEX "observations_childId_observedAt_idx" ON "observations"("childId", "observedAt");

-- CreateIndex
CREATE INDEX "observations_facilityId_observedAt_idx" ON "observations"("facilityId", "observedAt");

-- CreateIndex
CREATE INDEX "observations_affiliationId_idx" ON "observations"("affiliationId");

-- CreateIndex
CREATE INDEX "observations_domain_idx" ON "observations"("domain");

-- CreateIndex
CREATE INDEX "concerns_childId_status_idx" ON "concerns"("childId", "status");

-- CreateIndex
CREATE INDEX "concerns_facilityId_status_idx" ON "concerns"("facilityId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "support_plans_previousVersionId_key" ON "support_plans"("previousVersionId");

-- CreateIndex
CREATE INDEX "support_plans_childId_status_idx" ON "support_plans"("childId", "status");

-- CreateIndex
CREATE INDEX "support_plans_facilityId_status_idx" ON "support_plans"("facilityId", "status");

-- CreateIndex
CREATE INDEX "support_plans_affiliationId_idx" ON "support_plans"("affiliationId");

-- CreateIndex
CREATE INDEX "support_plans_concernId_idx" ON "support_plans"("concernId");

-- CreateIndex
CREATE INDEX "support_outcomes_planId_idx" ON "support_outcomes"("planId");

-- CreateIndex
CREATE INDEX "support_outcomes_status_idx" ON "support_outcomes"("status");

-- CreateIndex
CREATE INDEX "support_reviews_planId_idx" ON "support_reviews"("planId");

-- CreateIndex
CREATE INDEX "support_interventions_outcomeId_idx" ON "support_interventions"("outcomeId");

-- CreateIndex
CREATE INDEX "developmental_reviews_childId_status_idx" ON "developmental_reviews"("childId", "status");

-- CreateIndex
CREATE INDEX "developmental_reviews_facilityId_status_idx" ON "developmental_reviews"("facilityId", "status");

-- CreateIndex
CREATE INDEX "handover_records_childId_status_idx" ON "handover_records"("childId", "status");

-- CreateIndex
CREATE INDEX "handover_records_facilityId_status_idx" ON "handover_records"("facilityId", "status");

-- CreateIndex
CREATE INDEX "_RoomStaff_B_index" ON "_RoomStaff"("B");

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_whatsappGroupId_fkey" FOREIGN KEY ("whatsappGroupId") REFERENCES "WhatsAppGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppGroup" ADD CONSTRAINT "WhatsAppGroup_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppGroup" ADD CONSTRAINT "WhatsAppGroup_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppInvitation" ADD CONSTRAINT "WhatsAppInvitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppInvitation" ADD CONSTRAINT "WhatsAppInvitation_whatsappGroupId_fkey" FOREIGN KEY ("whatsappGroupId") REFERENCES "WhatsAppGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_feedPostId_fkey" FOREIGN KEY ("feedPostId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInterest" ADD CONSTRAINT "EventInterest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInterest" ADD CONSTRAINT "EventInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInterests" ADD CONSTRAINT "UserInterests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedInteraction" ADD CONSTRAINT "FeedInteraction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedInteraction" ADD CONSTRAINT "FeedInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostView" ADD CONSTRAINT "PostView_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostView" ADD CONSTRAINT "PostView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementEvent" ADD CONSTRAINT "EngagementEvent_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementEvent" ADD CONSTRAINT "EngagementEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostEngagementMetrics" ADD CONSTRAINT "PostEngagementMetrics_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSimilarity" ADD CONSTRAINT "UserSimilarity_similarUserId_fkey" FOREIGN KEY ("similarUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSimilarity" ADD CONSTRAINT "UserSimilarity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInteractionProfile" ADD CONSTRAINT "UserInteractionProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimilarPost" ADD CONSTRAINT "SimilarPost_originalPostId_fkey" FOREIGN KEY ("originalPostId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimilarPost" ADD CONSTRAINT "SimilarPost_relatedPostId_fkey" FOREIGN KEY ("relatedPostId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationDoc" ADD CONSTRAINT "VerificationDoc_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Answer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationLog" ADD CONSTRAINT "ModerationLog_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationLog" ADD CONSTRAINT "ModerationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSubscription" ADD CONSTRAINT "AiSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrisisIncident" ADD CONSTRAINT "CrisisIncident_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrisisLog" ADD CONSTRAINT "CrisisLog_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "CrisisIncident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrisisVolunteer" ADD CONSTRAINT "CrisisVolunteer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrisisConnection" ADD CONSTRAINT "CrisisConnection_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "CrisisIncident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrisisConnection" ADD CONSTRAINT "CrisisConnection_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "CrisisVolunteer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrisisAuditLog" ADD CONSTRAINT "CrisisAuditLog_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "CrisisIncident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerVote" ADD CONSTRAINT "AnswerVote_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerVote" ADD CONSTRAINT "AnswerVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerComment" ADD CONSTRAINT "AnswerComment_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerComment" ADD CONSTRAINT "AnswerComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerEdit" ADD CONSTRAINT "AnswerEdit_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionFollower" ADD CONSTRAINT "QuestionFollower_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionFollower" ADD CONSTRAINT "QuestionFollower_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerRequest" ADD CONSTRAINT "AnswerRequest_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerRequest" ADD CONSTRAINT "AnswerRequest_requestedUserId_fkey" FOREIGN KEY ("requestedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerRequest" ADD CONSTRAINT "AnswerRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatedQuestion" ADD CONSTRAINT "RelatedQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatedQuestion" ADD CONSTRAINT "RelatedQuestion_relatedQuestionId_fkey" FOREIGN KEY ("relatedQuestionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerView" ADD CONSTRAINT "AnswerView_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerView" ADD CONSTRAINT "AnswerView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providers" ADD CONSTRAINT "providers_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_views" ADD CONSTRAINT "provider_views_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_views" ADD CONSTRAINT "provider_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_conditions" ADD CONSTRAINT "child_conditions_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FcmToken" ADD CONSTRAINT "FcmToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalConversation" ADD CONSTRAINT "ClinicalConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalMessage" ADD CONSTRAINT "ClinicalMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ClinicalConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalPlan" ADD CONSTRAINT "ClinicalPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalFeedback" ADD CONSTRAINT "ClinicalFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalFeedback" ADD CONSTRAINT "ClinicalFeedback_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ClinicalConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insight_shares" ADD CONSTRAINT "insight_shares_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ClinicalConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insight_shares" ADD CONSTRAINT "insight_shares_sharedBy_fkey" FOREIGN KEY ("sharedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insight_shares" ADD CONSTRAINT "insight_shares_sharedWith_fkey" FOREIGN KEY ("sharedWith") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_reports" ADD CONSTRAINT "assessment_reports_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_shares" ADD CONSTRAINT "assessment_shares_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_shares" ADD CONSTRAINT "assessment_shares_sharedBy_fkey" FOREIGN KEY ("sharedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_shares" ADD CONSTRAINT "assessment_shares_sharedWith_fkey" FOREIGN KEY ("sharedWith") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapist_profiles" ADD CONSTRAINT "therapist_profiles_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapist_profiles" ADD CONSTRAINT "therapist_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapist_organization_links" ADD CONSTRAINT "therapist_organization_links_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapist_organization_links" ADD CONSTRAINT "therapist_organization_links_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "therapist_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_types" ADD CONSTRAINT "session_types_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_types" ADD CONSTRAINT "session_types_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "therapist_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_pricing" ADD CONSTRAINT "session_pricing_sessionTypeId_fkey" FOREIGN KEY ("sessionTypeId") REFERENCES "session_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_pricing" ADD CONSTRAINT "session_pricing_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "therapist_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapist_availability" ADD CONSTRAINT "therapist_availability_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "therapist_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "therapist_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_sessionTypeId_fkey" FOREIGN KEY ("sessionTypeId") REFERENCES "session_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "therapist_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_session_questionnaires" ADD CONSTRAINT "pre_session_questionnaires_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "therapist_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_questionnaire_responses" ADD CONSTRAINT "booking_questionnaire_responses_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_questionnaire_responses" ADD CONSTRAINT "booking_questionnaire_responses_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "pre_session_questionnaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_ratings" ADD CONSTRAINT "session_ratings_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_ratings" ADD CONSTRAINT "session_ratings_ratedBy_fkey" FOREIGN KEY ("ratedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_ratings" ADD CONSTRAINT "session_ratings_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "therapist_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_packages" ADD CONSTRAINT "booking_packages_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_packages" ADD CONSTRAINT "booking_packages_sessionTypeId_fkey" FOREIGN KEY ("sessionTypeId") REFERENCES "session_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_packages" ADD CONSTRAINT "booking_packages_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "therapist_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_purchases" ADD CONSTRAINT "package_purchases_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "booking_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_purchases" ADD CONSTRAINT "package_purchases_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_disputes" ADD CONSTRAINT "session_disputes_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_disputes" ADD CONSTRAINT "session_disputes_raisedBy_fkey" FOREIGN KEY ("raisedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_disputes" ADD CONSTRAINT "session_disputes_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_settings" ADD CONSTRAINT "marketplace_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheets" ADD CONSTRAINT "worksheets_screeningId_fkey" FOREIGN KEY ("screeningId") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheets" ADD CONSTRAINT "worksheets_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheets" ADD CONSTRAINT "worksheets_parentVersionId_fkey" FOREIGN KEY ("parentVersionId") REFERENCES "worksheets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheets" ADD CONSTRAINT "worksheets_clonedFromId_fkey" FOREIGN KEY ("clonedFromId") REFERENCES "worksheets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheets" ADD CONSTRAINT "worksheets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheets" ADD CONSTRAINT "worksheets_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheet_images" ADD CONSTRAINT "worksheet_images_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "worksheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheet_assignments" ADD CONSTRAINT "worksheet_assignments_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "worksheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheet_assignments" ADD CONSTRAINT "worksheet_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheet_assignments" ADD CONSTRAINT "worksheet_assignments_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheet_assignments" ADD CONSTRAINT "worksheet_assignments_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheet_assignments" ADD CONSTRAINT "worksheet_assignments_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheet_reviews" ADD CONSTRAINT "worksheet_reviews_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "worksheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheet_reviews" ADD CONSTRAINT "worksheet_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheet_flags" ADD CONSTRAINT "worksheet_flags_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "worksheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheet_flags" ADD CONSTRAINT "worksheet_flags_flaggedById_fkey" FOREIGN KEY ("flaggedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheet_flags" ADD CONSTRAINT "worksheet_flags_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheet_completions" ADD CONSTRAINT "worksheet_completions_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "worksheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheet_completions" ADD CONSTRAINT "worksheet_completions_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheet_completions" ADD CONSTRAINT "worksheet_completions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "worksheet_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheet_effectiveness" ADD CONSTRAINT "worksheet_effectiveness_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "worksheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheet_effectiveness" ADD CONSTRAINT "worksheet_effectiveness_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BannerAd" ADD CONSTRAINT "BannerAd_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdAnalytics" ADD CONSTRAINT "AdAnalytics_bannerAdId_fkey" FOREIGN KEY ("bannerAdId") REFERENCES "BannerAd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_primaryTherapistId_fkey" FOREIGN KEY ("primaryTherapistId") REFERENCES "therapist_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_therapists" ADD CONSTRAINT "case_therapists_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_therapists" ADD CONSTRAINT "case_therapists_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "therapist_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_internal_notes" ADD CONSTRAINT "case_internal_notes_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_internal_notes" ADD CONSTRAINT "case_internal_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ieps" ADD CONSTRAINT "ieps_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ieps" ADD CONSTRAINT "ieps_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "iep_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ieps" ADD CONSTRAINT "ieps_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ieps" ADD CONSTRAINT "ieps_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "ieps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iep_templates" ADD CONSTRAINT "iep_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iep_templates" ADD CONSTRAINT "iep_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iep_goals" ADD CONSTRAINT "iep_goals_iepId_fkey" FOREIGN KEY ("iepId") REFERENCES "ieps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_plans" ADD CONSTRAINT "milestone_plans_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_plans" ADD CONSTRAINT "milestone_plans_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "milestone_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_planId_fkey" FOREIGN KEY ("planId") REFERENCES "milestone_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_sessions" ADD CONSTRAINT "case_sessions_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_sessions" ADD CONSTRAINT "case_sessions_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_sessions" ADD CONSTRAINT "case_sessions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_sessions" ADD CONSTRAINT "case_sessions_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "care_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_goal_progress" ADD CONSTRAINT "session_goal_progress_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "case_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_goal_progress" ADD CONSTRAINT "session_goal_progress_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "iep_goals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_documents" ADD CONSTRAINT "case_documents_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_documents" ADD CONSTRAINT "case_documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_documents" ADD CONSTRAINT "case_documents_parentVersionId_fkey" FOREIGN KEY ("parentVersionId") REFERENCES "case_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_documents" ADD CONSTRAINT "case_documents_mdtReviewId_fkey" FOREIGN KEY ("mdtReviewId") REFERENCES "mdt_reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_shares" ADD CONSTRAINT "case_shares_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_shares" ADD CONSTRAINT "case_shares_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "case_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_shares" ADD CONSTRAINT "case_shares_sharedWithId_fkey" FOREIGN KEY ("sharedWithId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_shares" ADD CONSTRAINT "case_shares_sharedById_fkey" FOREIGN KEY ("sharedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_reviews" ADD CONSTRAINT "assessment_reviews_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_disciplines" ADD CONSTRAINT "assessment_disciplines_assessmentReviewId_fkey" FOREIGN KEY ("assessmentReviewId") REFERENCES "assessment_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_intakes" ADD CONSTRAINT "case_intakes_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_billing" ADD CONSTRAINT "case_billing_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_billing" ADD CONSTRAINT "case_billing_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "case_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_audit_logs" ADD CONSTRAINT "case_audit_logs_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_audit_logs" ADD CONSTRAINT "case_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_consents" ADD CONSTRAINT "case_consents_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_consents" ADD CONSTRAINT "case_consents_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_consents" ADD CONSTRAINT "case_consents_consentVersionId_fkey" FOREIGN KEY ("consentVersionId") REFERENCES "consent_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_consents" ADD CONSTRAINT "case_consents_grantedByGuardianId_fkey" FOREIGN KEY ("grantedByGuardianId") REFERENCES "guardians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_identity_documents" ADD CONSTRAINT "patient_identity_documents_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_identity_documents" ADD CONSTRAINT "patient_identity_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_templates" ADD CONSTRAINT "consent_templates_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_templates" ADD CONSTRAINT "consent_templates_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_versions" ADD CONSTRAINT "consent_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "consent_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_visit_tasks" ADD CONSTRAINT "pre_visit_tasks_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_policies" ADD CONSTRAINT "insurance_policies_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_authorizations" ADD CONSTRAINT "pre_authorizations_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "insurance_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_authorizations" ADD CONSTRAINT "pre_authorizations_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_authorizations" ADD CONSTRAINT "pre_authorizations_renewedFromId_fkey" FOREIGN KEY ("renewedFromId") REFERENCES "pre_authorizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_convertedChildId_fkey" FOREIGN KEY ("convertedChildId") REFERENCES "children"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pathway_templates" ADD CONSTRAINT "pathway_templates_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_reviews" ADD CONSTRAINT "triage_reviews_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_reviews" ADD CONSTRAINT "triage_reviews_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_reviews" ADD CONSTRAINT "triage_reviews_pathwayTemplateId_fkey" FOREIGN KEY ("pathwayTemplateId") REFERENCES "pathway_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telehealth_encounters" ADD CONSTRAINT "telehealth_encounters_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "case_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mdt_reviews" ADD CONSTRAINT "mdt_reviews_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mdt_reviews" ADD CONSTRAINT "mdt_reviews_conductedById_fkey" FOREIGN KEY ("conductedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mdt_attendees" ADD CONSTRAINT "mdt_attendees_mdtReviewId_fkey" FOREIGN KEY ("mdtReviewId") REFERENCES "mdt_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mdt_attendees" ADD CONSTRAINT "mdt_attendees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_addendums" ADD CONSTRAINT "session_addendums_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "case_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_addendums" ADD CONSTRAINT "session_addendums_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_reviews" ADD CONSTRAINT "case_reviews_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_reviews" ADD CONSTRAINT "case_reviews_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "treatment_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_reviews" ADD CONSTRAINT "case_reviews_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ehr_exports" ADD CONSTRAINT "ehr_exports_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ehr_exports" ADD CONSTRAINT "ehr_exports_exportedById_fkey" FOREIGN KEY ("exportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_incidents" ADD CONSTRAINT "case_incidents_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_incidents" ADD CONSTRAINT "case_incidents_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_incidents" ADD CONSTRAINT "case_incidents_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_shares" ADD CONSTRAINT "external_shares_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_shares" ADD CONSTRAINT "external_shares_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_templates" ADD CONSTRAINT "clinical_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "clinical_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mira_conversations" ADD CONSTRAINT "mira_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mira_conversations" ADD CONSTRAINT "mira_conversations_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mira_messages" ADD CONSTRAINT "mira_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "mira_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_forms" ADD CONSTRAINT "consent_forms_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_forms" ADD CONSTRAINT "consent_forms_sentBy_fkey" FOREIGN KEY ("sentBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "case_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinics" ADD CONSTRAINT "clinics_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinics" ADD CONSTRAINT "clinics_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_members" ADD CONSTRAINT "facility_members_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_members" ADD CONSTRAINT "facility_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_consents" ADD CONSTRAINT "child_consents_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_consents" ADD CONSTRAINT "child_consents_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_consents" ADD CONSTRAINT "child_consents_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_consents" ADD CONSTRAINT "child_consents_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_consents" ADD CONSTRAINT "child_consents_affiliationId_fkey" FOREIGN KEY ("affiliationId") REFERENCES "child_affiliations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_consents" ADD CONSTRAINT "child_consents_consentVersionId_fkey" FOREIGN KEY ("consentVersionId") REFERENCES "consent_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_affiliations" ADD CONSTRAINT "child_affiliations_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_affiliations" ADD CONSTRAINT "child_affiliations_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_affiliations" ADD CONSTRAINT "child_affiliations_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_affiliations" ADD CONSTRAINT "child_affiliations_keyworkerId_fkey" FOREIGN KEY ("keyworkerId") REFERENCES "facility_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_claims" ADD CONSTRAINT "child_claims_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_claims" ADD CONSTRAINT "child_claims_affiliationId_fkey" FOREIGN KEY ("affiliationId") REFERENCES "child_affiliations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_claims" ADD CONSTRAINT "child_claims_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_claims" ADD CONSTRAINT "child_claims_claimedByUserId_fkey" FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_claims" ADD CONSTRAINT "child_claims_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_affiliationId_fkey" FOREIGN KEY ("affiliationId") REFERENCES "child_affiliations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concerns" ADD CONSTRAINT "concerns_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concerns" ADD CONSTRAINT "concerns_affiliationId_fkey" FOREIGN KEY ("affiliationId") REFERENCES "child_affiliations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concerns" ADD CONSTRAINT "concerns_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concerns" ADD CONSTRAINT "concerns_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_plans" ADD CONSTRAINT "support_plans_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_plans" ADD CONSTRAINT "support_plans_affiliationId_fkey" FOREIGN KEY ("affiliationId") REFERENCES "child_affiliations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_plans" ADD CONSTRAINT "support_plans_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_plans" ADD CONSTRAINT "support_plans_concernId_fkey" FOREIGN KEY ("concernId") REFERENCES "concerns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_plans" ADD CONSTRAINT "support_plans_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_plans" ADD CONSTRAINT "support_plans_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "support_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_outcomes" ADD CONSTRAINT "support_outcomes_planId_fkey" FOREIGN KEY ("planId") REFERENCES "support_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_reviews" ADD CONSTRAINT "support_reviews_planId_fkey" FOREIGN KEY ("planId") REFERENCES "support_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_reviews" ADD CONSTRAINT "support_reviews_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_interventions" ADD CONSTRAINT "support_interventions_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "support_outcomes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_interventions" ADD CONSTRAINT "support_interventions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developmental_reviews" ADD CONSTRAINT "developmental_reviews_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developmental_reviews" ADD CONSTRAINT "developmental_reviews_affiliationId_fkey" FOREIGN KEY ("affiliationId") REFERENCES "child_affiliations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developmental_reviews" ADD CONSTRAINT "developmental_reviews_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developmental_reviews" ADD CONSTRAINT "developmental_reviews_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_records" ADD CONSTRAINT "handover_records_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_records" ADD CONSTRAINT "handover_records_affiliationId_fkey" FOREIGN KEY ("affiliationId") REFERENCES "child_affiliations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_records" ADD CONSTRAINT "handover_records_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_records" ADD CONSTRAINT "handover_records_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RoomStaff" ADD CONSTRAINT "_RoomStaff_A_fkey" FOREIGN KEY ("A") REFERENCES "facility_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RoomStaff" ADD CONSTRAINT "_RoomStaff_B_fkey" FOREIGN KEY ("B") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

