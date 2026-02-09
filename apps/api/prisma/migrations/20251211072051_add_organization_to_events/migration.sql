-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('OPEN', 'CLOSED', 'MERGED', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'ANSWERED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'THERAPIST', 'EDUCATOR', 'ORGANIZATION', 'ADMIN', 'MODERATOR');

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
CREATE TYPE "OrganizationStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED');

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
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "resetPasswordToken" TEXT,
    "resetPasswordExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "googleId" TEXT,
    "acceptedAnswerCount" INTEGER NOT NULL DEFAULT 0,
    "answerCount" INTEGER NOT NULL DEFAULT 0,
    "expertTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "helpfulVoteCount" INTEGER NOT NULL DEFAULT 0,
    "questionCount" INTEGER NOT NULL DEFAULT 0,

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
    "organizationId" TEXT,
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
    "blockedCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "blockedTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contentTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "followedTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minEngagement" INTEGER NOT NULL DEFAULT 0,
    "notificationFrequency" TEXT NOT NULL DEFAULT 'daily',
    "notificationTypes" JSONB NOT NULL DEFAULT '{}',
    "preferredHelplines" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pushNotifications" BOOLEAN NOT NULL DEFAULT false,
    "showCrisisButton" BOOLEAN NOT NULL DEFAULT true,
    "verifiedAuthorsOnly" BOOLEAN NOT NULL DEFAULT false,
    "allowDirectMessages" BOOLEAN NOT NULL DEFAULT true,
    "crisisAutoDetection" BOOLEAN NOT NULL DEFAULT false,
    "crisisModuleEnabled" BOOLEAN NOT NULL DEFAULT true,
    "desktopNotifications" BOOLEAN NOT NULL DEFAULT false,
    "emailDigestFrequency" TEXT NOT NULL DEFAULT 'daily',
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inAppSoundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notificationPrefs" JSONB,
    "profilePublic" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursEnd" TEXT,
    "quietHoursStart" TEXT,
    "savedCrisisResources" JSONB,
    "showEmail" BOOLEAN NOT NULL DEFAULT false,
    "showSOSButton" BOOLEAN NOT NULL DEFAULT true,
    "emergencyContacts" TEXT[] DEFAULT ARRAY[]::TEXT[],

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
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
    "completenessScore" INTEGER NOT NULL DEFAULT 0,
    "lastCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetPasswordToken_key" ON "User"("resetPasswordToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

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
CREATE INDEX "Bookmark_userId_idx" ON "Bookmark"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_postId_key" ON "Bookmark"("userId", "postId");

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
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE INDEX "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationMember_status_idx" ON "OrganizationMember"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_userId_organizationId_key" ON "OrganizationMember"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "ClinicalConversation_userId_idx" ON "ClinicalConversation"("userId");

-- CreateIndex
CREATE INDEX "ClinicalConversation_updatedAt_idx" ON "ClinicalConversation"("updatedAt");

-- CreateIndex
CREATE INDEX "ClinicalMessage_conversationId_idx" ON "ClinicalMessage"("conversationId");

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "Event" ADD CONSTRAINT "Event_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_feedPostId_fkey" FOREIGN KEY ("feedPostId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "children" ADD CONSTRAINT "children_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_conditions" ADD CONSTRAINT "child_conditions_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalConversation" ADD CONSTRAINT "ClinicalConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalMessage" ADD CONSTRAINT "ClinicalMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ClinicalConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
