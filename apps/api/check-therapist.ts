
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTherapist() {
    const id = 'cmkmh02m400014sizw880uwie';
    console.log(`Checking for TherapistProfile with id: ${id}`);

    const profile = await prisma.therapistProfile.findUnique({
        where: { id },
    });

    if (profile) {
        console.log('Found profile:', profile);
    } else {
        console.log('Profile NOT found');
        // Search by user ID just in case
        const userProfile = await prisma.therapistProfile.findFirst({
            where: { userId: id }
        });
        if (userProfile) {
            console.log('Found as userID instead! Profile ID is:', userProfile.id);
        }
    }
}

checkTherapist()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
