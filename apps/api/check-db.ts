
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking Database State ---');

    // 1. Check Posts and Embeddings
    const totalPosts = await prisma.post.count();


    // Use raw query to check for embeddings since it's a vector type
    // Try checking 'embedding' column which is Float[] in schema
    const postsWithEmbeddingsResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM "Post" WHERE embedding IS NOT NULL AND array_length(embedding, 1) > 0
    `;

    const postsWithEmbeddings = Number(postsWithEmbeddingsResult[0]?.count || 0);

    console.log(`Total Posts: ${totalPosts}`);
    console.log(`Posts with Embeddings: ${postsWithEmbeddings}`);

    if (postsWithEmbeddings > 0) {
        const posts = await prisma.$queryRaw<any[]>`
        SELECT title, "authorId", "moderationStatus" FROM "Post" WHERE embedding IS NOT NULL AND array_length(embedding, 1) > 0 LIMIT 10
      `;
        console.log('Posts with embeddings:', posts);
    }

    if (postsWithEmbeddings === 0 && totalPosts > 0) {
        console.log('WARNING: Posts exist but have no embeddings. Vector search will fail.');
    }

    // 2. Check Verified Experts
    const experts = await prisma.user.findMany({
        where: {
            role: { in: ['THERAPIST', 'EDUCATOR'] },
            verificationStatus: 'VERIFIED',
        },
        select: { id: true, name: true, specialization: true }
    });

    console.log(`Verified Experts found: ${experts.length}`);
    if (experts.length > 0) {
        console.log('Sample Experts:', experts.slice(0, 3));
    } else {
        console.log('WARNING: No verified experts found. Expert connections will be empty.');
    }

    // 3. Check Unverified Experts (potential candidates)
    const unverifiedExperts = await prisma.user.count({
        where: {
            role: { in: ['THERAPIST', 'EDUCATOR'] },
            verificationStatus: { not: 'VERIFIED' }
        }
    });
    console.log(`Unverified Experts: ${unverifiedExperts}`);

}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
