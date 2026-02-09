// Marketplace seed script for therapist profiles
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function seedMarketplaceData() {
    console.log('🏥 Starting marketplace seed...');

    // Find all therapist users
    const therapists = await prisma.user.findMany({
        where: { role: Role.THERAPIST },
    });

    console.log(`Found ${therapists.length} therapist users`);

    const therapistProfilesData = [
        {
            email: 'dr.meena@therapy.com',
            bio: 'Clinical psychologist specializing in autism spectrum disorders with over 15 years of experience. I use evidence-based behavioral therapy approaches, including ABA and cognitive behavioral techniques, to help children and families thrive. My practice focuses on individualized treatment plans that respect neurodiversity while building essential life skills.',
            credentials: ['M.Phil Clinical Psychology', 'BCBA Certification', 'PhD in Developmental Psychology'],
            specializations: ['Autism Spectrum Disorder', 'Applied Behavior Analysis (ABA)', 'Developmental Delays', 'Parent Training'],
            yearsExperience: 15,
            title: 'Clinical Psychologist',
            languages: ['English', 'Hindi', 'Marathi'],
        },
        {
            email: 'dr.singh@therapy.com',
            bio: 'Speech and language pathologist with extensive experience in augmentative and alternative communication (AAC) systems. I specialize in helping non-verbal and minimally verbal children find their voice through a combination of traditional speech therapy and modern AAC technology.',
            credentials: ['Master of Speech-Language Pathology', 'ASHA Certified', 'AAC Specialist Certification'],
            specializations: ['Speech and Language Therapy', 'Augmentative Communication', 'Language Development', 'Articulation Disorders'],
            yearsExperience: 10,
            title: 'Speech-Language Pathologist',
            languages: ['English', 'Hindi', 'Kannada'],
        },
        {
            email: 'dr.reddy@therapy.com',
            bio: 'Occupational therapist focused on sensory integration and motor skills development for children with special needs. I believe in a holistic approach that considers the whole child and their environment. My sessions are play-based and designed to be both therapeutic and enjoyable.',
            credentials: ['Master of Occupational Therapy', 'SI Certification', 'Pediatric OT Specialist'],
            specializations: ['Sensory Integration', 'Fine Motor Skills', 'Gross Motor Development', 'Activities of Daily Living'],
            yearsExperience: 12,
            title: 'Occupational Therapist',
            languages: ['English', 'Tamil', 'Telugu'],
        },
        {
            email: 'dr.verma@therapy.com',
            bio: 'Child psychologist specializing in ADHD, learning disabilities, and emotional regulation. Certified in play therapy and cognitive behavioral therapy for children. I work collaboratively with families and schools to create comprehensive support systems that help children succeed academically and socially.',
            credentials: ['M.Phil Child Psychology', 'Play Therapy Certification', 'CBT for Children Certification'],
            specializations: ['ADHD', 'Learning Disabilities', 'Play Therapy', 'Anxiety and Depression in Children'],
            yearsExperience: 8,
            title: 'Child Psychologist',
            languages: ['English', 'Hindi'],
        },
        {
            email: 'dr.nair@therapy.com',
            bio: 'Behavioral therapist and ABA specialist with a passion for helping children with autism reach their full potential. I emphasize naturalistic teaching methods and focus on skill generalization across environments. Parent involvement and training are central to my therapeutic approach.',
            credentials: ['BCaBA Certification', 'Master in Applied Behavior Analysis', 'RBT Supervisor'],
            specializations: ['Applied Behavior Analysis', 'Autism', 'Behavioral Interventions', 'Verbal Behavior'],
            yearsExperience: 11,
            title: 'Behavior Analyst',
            languages: ['English', 'Malayalam', 'Hindi'],
        },
    ];

    for (const data of therapistProfilesData) {
        const therapist = therapists.find(t => t.email === data.email);

        if (!therapist) {
            console.log(`⚠️  Therapist user not found for ${data.email}`);
            continue;
        }

        // Check if profile already exists
        const existing = await prisma.therapistProfile.findFirst({
            where: { userId: therapist.id },
        });

        if (existing) {
            console.log(`✓ Profile already exists for ${therapist.name}`);
            continue;
        }

        // Create therapist profile
        const profile = await prisma.therapistProfile.create({
            data: {
                userId: therapist.id,
                bio: data.bio,
                credentials: data.credentials,
                specializations: data.specializations,
                yearsExperience: data.yearsExperience,
                title: data.title,
                languages: data.languages,
                defaultTimezone: 'Asia/Kolkata',
                overallRating: Math.random() * 1 + 4, // Random rating between 4-5
                totalSessions: Math.floor(Math.random() * 100) + 20, // 20-120 sessions
                totalRatings: Math.floor(Math.random() * 50) + 10, // 10-60 ratings
                isActive: true,
                acceptingBookings: true,
            },
        });

        console.log(`✓ Created profile for ${therapist.name}`);

        // Create default session types for each therapist
        const sessionTypesData = [
            {
                name: 'Initial Consultation',
                description: 'First session to understand your needs and create a personalized treatment plan',
                duration: 60,
                defaultPrice: 1500,
            },
            {
                name: 'Individual Therapy Session',
                description: 'Standard one-on-one therapy session',
                duration: 45,
                defaultPrice: 1200,
            },
            {
                name: 'Extended Session',
                description: 'Longer session for complex cases or comprehensive assessments',
                duration: 90,
                defaultPrice: 2000,
            },
            {
                name: 'Parent Training Session',
                description: 'Training session for parents to learn strategies and techniques',
                duration: 60,
                defaultPrice: 1000,
            },
        ];

        for (const sessionType of sessionTypesData) {
            const type = await prisma.sessionType.create({
                data: {
                    ...sessionType,
                    therapistId: profile.id,
                    currency: 'INR',
                    isActive: true,
                },
            });

            // Create pricing for this session type
            await prisma.sessionPricing.create({
                data: {
                    therapistId: profile.id,
                    sessionTypeId: type.id,
                    price: sessionType.defaultPrice,
                    currency: 'INR',
                    isActive: true,
                },
            });
        }

        console.log(`✓ Created session types and pricing for ${therapist.name}`);

        // Create some default availability (Mon-Fri, 9 AM - 5 PM)
        const weekdays = [1, 2, 3, 4, 5]; // Monday to Friday
        for (const day of weekdays) {
            await prisma.therapistAvailability.create({
                data: {
                    therapistId: profile.id,
                    dayOfWeek: day,
                    startTime: '09:00',
                    endTime: '17:00',
                    timezone: 'Asia/Kolkata',
                    isActive: true,
                },
            });
        }

        console.log(`✓ Created availability for ${therapist.name}`);
    }

    console.log('✅ Marketplace seed completed successfully!');
}

async function main() {
    try {
        await seedMarketplaceData();
    } catch (error) {
        console.error('❌ Error seeding marketplace data:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main();
