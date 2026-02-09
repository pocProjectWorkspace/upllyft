-- Run this SQL to create performance indexes
-- Execute: npm run prisma:execute-sql or run directly in your database client

\c safehaven;

-- Engagement velocity queries
CREATE INDEX IF NOT EXISTS idx_vote_post_created ON "Vote"("postId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_comment_post_created ON "Comment"("postId", "createdAt" DESC);

-- Feed queries
CREATE INDEX IF NOT EXISTS idx_post_published_created ON "Post"("isPublished", "createdAt" DESC) WHERE "isPublished" = true;
CREATE INDEX IF NOT EXISTS idx_post_category_created ON "Post"("category", "createdAt" DESC) WHERE "isPublished" = true;
CREATE INDEX IF NOT EXISTS idx_post_upvotes ON "Post"("upvotes" DESC) WHERE "isPublished" = true;

-- User activity
CREATE INDEX IF NOT EXISTS idx_post_author_created ON "Post"("authorId", "createdAt" DESC) WHERE "isPublished" = true;

-- Community posts
CREATE INDEX IF NOT EXISTS idx_post_community_created ON "Post"("communityId", "createdAt" DESC) WHERE "communityId" IS NOT NULL;

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notification_user_read ON "Notification"("userId", "isRead", "createdAt" DESC);

-- Tag searches
CREATE INDEX IF NOT EXISTS idx_post_tags_gin ON "Post" USING GIN ("tags") WHERE "isPublished" = true;

-- Analyze tables to update statistics
ANALYZE "Post";
ANALYZE "Vote";
ANALYZE "Comment";
ANALYZE "Notification";
