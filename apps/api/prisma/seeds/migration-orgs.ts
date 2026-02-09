import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting migration for Organization users...');

    // 1. Find all users with role 'ORGANIZATION'
    const orgUsers = await prisma.user.findMany({
        where: {
            role: 'ORGANIZATION',
        },
        include: {
            organizationMemberships: true,
        },
    });

    console.log(`Found ${orgUsers.length} users with ORGANIZATION role.`);

    for (const user of orgUsers) {
        // Check if they already have an organization membership
        if (user.organizationMemberships.length > 0) {
            console.log(`User ${user.email} already has an organization membership. Skipping.`);
            continue;
        }

        const orgName = user.organization || user.name || 'Unnamed Organization';
        // Create a slug from the name
        let slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        // Append random string to ensure uniqueness if needed (simple approach for migration)
        const existingOrg = await prisma.organization.findUnique({ where: { slug } });
        if (existingOrg) {
            slug = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
        }

        console.log(`Migrating user ${user.email} -> New Organization: ${orgName} (${slug})`);

        try {
            // Create Organization and assign User as ADMIN
            await prisma.organization.create({
                data: {
                    name: orgName,
                    slug: slug,
                    isVerified: user.verificationStatus === 'VERIFIED',
                    members: {
                        create: {
                            userId: user.id,
                            role: 'ADMIN',
                            status: 'ACTIVE',
                            joinedAt: new Date(),
                        },
                    },
                },
            });
            console.log(`Successfully migrated ${user.email}`);
        } catch (error) {
            console.error(`Failed to migrate user ${user.email}:`, error);
        }
    }

    console.log('Migration completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
