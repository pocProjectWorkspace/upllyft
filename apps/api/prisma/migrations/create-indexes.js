// Script to create performance indexes using Prisma
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createIndexes() {
    console.log('Creating performance indexes...');

    const indexes = [
        // Engagement velocity queries
        `CREATE INDEX IF NOT EXISTS idx_vote_post_created ON "Vote"("postId", "createdAt" DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_comment_post_created ON "Comment"("postId", "createdAt" DESC)`,

        // Feed queries
        `CREATE INDEX IF NOT EXISTS idx_post_published_created ON "Post"("isPublished", "createdAt" DESC) WHERE "isPublished" = true`,
        `CREATE INDEX IF NOT EXISTS idx_post_category_created ON "Post"("category", "createdAt" DESC) WHERE "isPublished" = true`,
        `CREATE INDEX IF NOT EXISTS idx_post_upvotes ON "Post"("upvotes" DESC) WHERE "isPublished" = true`,

        // User activity
        `CREATE INDEX IF NOT EXISTS idx_post_author_created ON "Post"("authorId", "createdAt" DESC) WHERE "isPublished" = true`,

        // Community posts
        `CREATE INDEX IF NOT EXISTS idx_post_community_created ON "Post"("communityId", "createdAt" DESC) WHERE "communityId" IS NOT NULL`,

        // Notifications
        `CREATE INDEX IF NOT EXISTS idx_notification_user_read ON "Notification"("userId", "isRead", "createdAt" DESC)`,

        // Tag searches
        `CREATE INDEX IF NOT EXISTS idx_post_tags_gin ON "Post" USING GIN ("tags") WHERE "isPublished" = true`,
    ];

    for (const [index, sql] of indexes.entries()) {
        try {
            console.log(`Creating index ${index + 1}/${indexes.length}...`);
            await prisma.$executeRawUnsafe(sql);
            console.log(`✓ Index ${index + 1} created successfully`);
        } catch (error) {
            console.error(`✗ Failed to create index ${index + 1}:`, error.message);
        }
    }

    // Analyze tables
    console.log('\nAnalyzing tables...');
    await prisma.$executeRawUnsafe('ANALYZE "Post"');
    await prisma.$executeRawUnsafe('ANALYZE "Vote"');
    await prisma.$executeRawUnsafe('ANALYZE "Comment"');
    await prisma.$executeRawUnsafe('ANALYZE "Notification"');

    console.log('✓ All indexes created successfully!');
    await prisma.$disconnect();
}

createIndexes()
    .catch((error) => {
        console.error('Error creating indexes:', error);
        process.exit(1);
    });
