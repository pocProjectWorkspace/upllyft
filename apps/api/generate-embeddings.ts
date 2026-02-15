
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function main() {
    console.log('--- Generating Missing Embeddings ---');

    // 1. Find posts without embeddings
    // We use raw query to find them because Prisma types might be tricky with vector
    const postsWithoutEmbeddings = await prisma.$queryRaw<any[]>`
    SELECT id, title, content FROM "Post" 
    WHERE embedding IS NULL OR array_length(embedding, 1) IS NULL
  `;

    console.log(`Found ${postsWithoutEmbeddings.length} posts without embeddings.`);

    for (const post of postsWithoutEmbeddings) {
        console.log(`Generating embedding for: "${post.title}" (${post.id})`);

        try {
            const text = `${post.title}\n\n${post.content}`;
            const response = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: text,
                dimensions: 1536,
            });

            const embedding = response.data[0].embedding;

            // Update the post using Prisma update
            await prisma.post.update({
                where: { id: post.id },
                data: { embedding: embedding }
            });

            console.log(`  -> Success`);
        } catch (error) {
            console.error(`  -> Failed: ${error.message}`);
        }
    }

    console.log('--- Done ---');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
