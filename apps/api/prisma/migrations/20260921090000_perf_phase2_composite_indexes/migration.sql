-- Performance Phase 2: remaining composite indexes for hot list/filter paths,
-- and removal of three indexes that duplicated @unique constraints on "User".
-- All additive except the three DROPs, which are safe because the unique
-- constraints already provide equivalent B-trees.

CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Post_communityId_createdAt_idx" ON "Post"("communityId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Event_status_isCancelled_startDate_idx" ON "Event"("status", "isCancelled", "startDate");
CREATE INDEX IF NOT EXISTS "FeedInteraction_userId_action_idx" ON "FeedInteraction"("userId", "action");
CREATE INDEX IF NOT EXISTS "Question_moderationStatus_idx" ON "Question"("moderationStatus");
CREATE INDEX IF NOT EXISTS "Question_moderationStatus_status_idx" ON "Question"("moderationStatus", "status");
CREATE INDEX IF NOT EXISTS "therapist_profiles_isActive_acceptingBookings_overallRating_idx" ON "therapist_profiles"("isActive", "acceptingBookings", "overallRating" DESC);
CREATE INDEX IF NOT EXISTS "bookings_therapistId_status_idx" ON "bookings"("therapistId", "status");
CREATE INDEX IF NOT EXISTS "bookings_patientId_status_idx" ON "bookings"("patientId", "status");
CREATE INDEX IF NOT EXISTS "cases_primaryTherapistId_status_idx" ON "cases"("primaryTherapistId", "status");
CREATE INDEX IF NOT EXISTS "cases_createdAt_idx" ON "cases"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "case_therapists_therapistId_removedAt_idx" ON "case_therapists"("therapistId", "removedAt");
CREATE INDEX IF NOT EXISTS "mira_conversations_userId_updatedAt_idx" ON "mira_conversations"("userId", "updatedAt" DESC);

DROP INDEX IF EXISTS "User_email_idx";
DROP INDEX IF EXISTS "User_resetPasswordToken_idx";
DROP INDEX IF EXISTS "User_googleId_idx";
