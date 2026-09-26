-- Performance Phase 1: indexes for the hottest read paths.
--   Notification(userId, read)              -> GET /notifications/unread-count (polled every 30s per tab)
--   Post(isPublished, createdAt DESC)       -> GET /posts and community feeds ordered by recency
--   User(updatedAt)                          -> "active users" COUNT(*) in /admin/stats and /community/stats
-- All additive; safe to apply on a live database. CONCURRENTLY is used when applied by hand
-- (see PERFORMANCE_AUDIT.md); Prisma's migrate runner applies them inside a transaction.

CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read");
CREATE INDEX IF NOT EXISTS "Post_isPublished_createdAt_idx" ON "Post"("isPublished", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "User_updatedAt_idx" ON "User"("updatedAt");
