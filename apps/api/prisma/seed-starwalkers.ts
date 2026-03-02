/**
 * Starwalkers Demo Seed Script
 * Run: npx ts-node prisma/seed-starwalkers.ts
 */

import { PrismaClient, Role, ClinicStatus, IEPStatus, GoalStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TODAY = new Date();
const todayStr = TODAY.toISOString().split('T')[0]; // YYYY-MM-DD

function daysAgo(n: number): Date {
    const d = new Date(TODAY);
    d.setDate(d.getDate() - n);
    return d;
}

function todayAt(hour: number, minute = 0): Date {
    const d = new Date(TODAY);
    d.setHours(hour, minute, 0, 0);
    return d;
}

async function main() {
    console.log('🌱 Seeding Starwalkers demo data...');

    // ── 1. Admin User ──────────────────────────────────────────────────────────
    const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@starwalkers.com' },
        update: {},
        create: {
            email: 'admin@starwalkers.com',
            name: 'Starwalkers Admin',
            password: adminPasswordHash,
            role: Role.ADMIN,
            isEmailVerified: true,
            country: 'AE',
        },
    });
    console.log('✅ Admin:', adminUser.email);

    // ── 1.5. Organization ──────────────────────────────────────────────────────
    const organization = await prisma.organization.upsert({
        where: { slug: 'starwalkers' },
        update: {},
        create: {
            name: 'Starwalkers Clinic',
            slug: 'starwalkers',
            description: 'Leading pediatric neurodevelopmental care center in Dubai.',
            region: 'AE',
        },
    });
    console.log('✅ Organization:', organization.name);

    // ── 2. Clinic ──────────────────────────────────────────────────────────────
    const clinic = await prisma.clinic.upsert({
        where: { adminId: adminUser.id },
        update: {},
        create: {
            name: 'Starwalkers - Dubai',
            address: 'Dubai, UAE',
            phone: '+971 4 XXX XXXX',
            email: 'info@starwalkers.com',
            country: 'AE',
            description: 'Starwalkers is a leading pediatric neurodevelopmental care center in Dubai, offering comprehensive therapy services for children with developmental needs.',
            specializations: ['Occupational Therapy', 'Speech & Language Therapy', 'Applied Behaviour Analysis', 'Physical Therapy', 'Child Psychology'],
            isPublic: true,
            adminId: adminUser.id,
            organizationId: organization.id,
        },
    });
    console.log('✅ Clinic:', clinic.name);

    // ── 3. Therapists ─────────────────────────────────────────────────────────
    const therapistDefs = [
        {
            email: 'ali.ahmed@starwalkers.com',
            name: 'Dr. Ali Ahmed',
            specializations: ['Occupational Therapy', 'Sensory Integration'],
            title: 'Senior Occupational Therapist',
        },
        {
            email: 'sam.wilson@starwalkers.com',
            name: 'Mr. Sam Wilson',
            specializations: ['Speech & Language Therapy', 'AAC'],
            title: 'Speech & Language Therapist',
        },
        {
            email: 'jane.doe@starwalkers.com',
            name: 'Ms. Jane Doe',
            specializations: ['Applied Behaviour Analysis', 'Autism Intervention'],
            title: 'ABA Therapist (BCBA)',
        },
        {
            email: 'john.smith@starwalkers.com',
            name: 'Mr. John Smith',
            specializations: ['Physical Therapy', 'Gross Motor Skills'],
            title: 'Physical Therapist',
        },
        {
            email: 'sara.smith@starwalkers.com',
            name: 'Dr. Sara Smith',
            specializations: ['Child Psychology', 'Cognitive Assessment'],
            title: 'Child Psychologist',
        },
    ];

    const therapistPasswordHash = await bcrypt.hash('Admin@123', 10);
    const therapistUsers: { user: typeof adminUser; profile: { id: string; userId: string } }[] = [];

    for (const def of therapistDefs) {
        const user = await prisma.user.upsert({
            where: { email: def.email },
            update: {},
            create: {
                email: def.email,
                name: def.name,
                password: therapistPasswordHash,
                role: Role.THERAPIST,
                specialization: def.specializations,
                isEmailVerified: true,
                country: 'AE',
            },
        });

        const profile = await prisma.therapistProfile.upsert({
            where: { userId: user.id },
            update: {},
            create: {
                userId: user.id,
                title: def.title,
                specializations: def.specializations,
                clinicId: clinic.id,
                isActive: true,
                acceptingBookings: true,
                credentialStatus: 'VERIFIED',
            },
        });

        therapistUsers.push({ user, profile: { id: profile.id, userId: profile.userId } });
        console.log(`✅ Therapist: ${def.name}`);
    }

    const [aliProfile, samProfile, janeProfile, johnProfile, saraTProfile] = therapistUsers.map((t) => t.profile);
    const [aliUser, samUser, janeUser, johnUser, saraTUser] = therapistUsers.map((t) => t.user);

    // ── 4. Session Types ──────────────────────────────────────────────────────
    const otSessionType = await prisma.sessionType.upsert({
        where: { id: 'starwalkers-ot-session-type' },
        update: {},
        create: {
            id: 'starwalkers-ot-session-type',
            therapistId: aliProfile.id,
            name: 'Occupational Therapy Session',
            duration: 60,
            defaultPrice: 0,
            currency: 'AED',
            isActive: true,
        },
    });

    const speechSessionType = await prisma.sessionType.upsert({
        where: { id: 'starwalkers-speech-session-type' },
        update: {},
        create: {
            id: 'starwalkers-speech-session-type',
            therapistId: samProfile.id,
            name: 'Speech Therapy Session',
            duration: 45,
            defaultPrice: 0,
            currency: 'AED',
            isActive: true,
        },
    });

    const abaSessionType = await prisma.sessionType.upsert({
        where: { id: 'starwalkers-aba-session-type' },
        update: {},
        create: {
            id: 'starwalkers-aba-session-type',
            therapistId: janeProfile.id,
            name: 'ABA Therapy Session',
            duration: 90,
            defaultPrice: 0,
            currency: 'AED',
            isActive: true,
        },
    });

    const ptSessionType = await prisma.sessionType.upsert({
        where: { id: 'starwalkers-pt-session-type' },
        update: {},
        create: {
            id: 'starwalkers-pt-session-type',
            therapistId: johnProfile.id,
            name: 'Physical Therapy Session',
            duration: 60,
            defaultPrice: 0,
            currency: 'AED',
            isActive: true,
        },
    });

    const psychSessionType = await prisma.sessionType.upsert({
        where: { id: 'starwalkers-psych-session-type' },
        update: {},
        create: {
            id: 'starwalkers-psych-session-type',
            therapistId: saraTProfile.id,
            name: 'Psychology Consultation',
            duration: 60,
            defaultPrice: 0,
            currency: 'AED',
            isActive: true,
        },
    });

    // ── 5. Guardian Users + Profiles + Children ───────────────────────────────
    const childDefs = [
        {
            guardianEmail: 'parent.ahmed@starwalkers.com',
            guardianName: 'Ahmed Al-Farsi',
            guardianPhone: '+971 50 111 2233',
            childFirstName: 'Omar',
            dob: new Date('2019-03-15'),
            gender: 'Male',
            status: 'ACTIVE' as ClinicStatus,
            therapistProfileId: aliProfile.id,
            therapistUserId: aliUser.id,
            diagnosis: 'Sensory Processing Disorder — Occupational Therapy',
            concern: 'Sensory sensitivity, fine motor delays',
            caseId: 'starwalkers-case-omar',
            sessionType: otSessionType,
            stName: 'Occupational Therapy'
        },
        {
            guardianEmail: 'parent.fatima@starwalkers.com',
            guardianName: 'Fatima Al-Mheiri',
            guardianPhone: '+971 55 222 3344',
            childFirstName: 'Nour',
            dob: new Date('2018-07-22'),
            gender: 'Female',
            status: 'ACTIVE' as ClinicStatus,
            therapistProfileId: samProfile.id,
            therapistUserId: samUser.id,
            diagnosis: 'Expressive Language Delay — Speech & Language Therapy',
            concern: 'Limited vocabulary, speech clarity issues',
            caseId: 'starwalkers-case-nour',
            sessionType: speechSessionType,
            stName: 'Speech Therapy'
        },
        {
            guardianEmail: 'parent.khalid@starwalkers.com',
            guardianName: 'Khalid Al-Suwaidi',
            guardianPhone: '+971 54 333 4455',
            childFirstName: 'Tariq',
            dob: new Date('2020-01-10'),
            gender: 'Male',
            status: 'ACTIVE' as ClinicStatus,
            therapistProfileId: janeProfile.id,
            therapistUserId: janeUser.id,
            diagnosis: 'ASD — ABA Therapy',
            concern: 'Social communication challenges, repetitive behaviours',
            caseId: 'starwalkers-case-tariq',
            sessionType: abaSessionType,
            stName: 'ABA Therapy'
        },
        {
            guardianEmail: 'parent.aisha@starwalkers.com',
            guardianName: 'Aisha Al-Hashimi',
            guardianPhone: '+971 56 444 5566',
            childFirstName: 'Salma',
            dob: new Date('2020-09-05'),
            gender: 'Female',
            status: 'ACTIVE' as ClinicStatus,
            therapistProfileId: johnProfile.id,
            therapistUserId: johnUser.id,
            diagnosis: 'Gross motor delays — Physical Therapy',
            concern: 'Difficulty walking, balance issues',
            caseId: 'starwalkers-case-salma',
            sessionType: ptSessionType,
            stName: 'Physical Therapy'
        },
        {
            guardianEmail: 'parent.sultan@starwalkers.com',
            guardianName: 'Sultan Al-Ketbi',
            guardianPhone: '+971 52 555 6677',
            childFirstName: 'Zayed',
            dob: new Date('2019-11-20'),
            gender: 'Male',
            status: 'ACTIVE' as ClinicStatus,
            therapistProfileId: saraTProfile.id,
            therapistUserId: saraTUser.id,
            diagnosis: 'ADHD Assessment — Psychology',
            concern: 'Hyperactivity, attention issues',
            caseId: 'starwalkers-case-zayed',
            sessionType: psychSessionType,
            stName: 'Psychology Consultation'
        },
        {
            guardianEmail: 'parent.mariam@starwalkers.com',
            guardianName: 'Mariam Al-Mansoori',
            guardianPhone: '+971 50 666 7788',
            childFirstName: 'Hala',
            dob: new Date('2021-02-14'),
            gender: 'Female',
            status: 'INTAKE' as ClinicStatus,
            therapistProfileId: aliProfile.id,
            therapistUserId: aliUser.id,
            diagnosis: 'Fine motor delay assessment',
            concern: 'Difficulty with grasping objects',
            caseId: 'starwalkers-case-hala',
        },
        {
            guardianEmail: 'parent.yousuf@starwalkers.com',
            guardianName: 'Yousuf Al-Balooshi',
            guardianPhone: '+971 50 777 8899',
            childFirstName: 'Majed',
            dob: new Date('2020-05-30'),
            gender: 'Male',
            status: 'INTAKE' as ClinicStatus,
            therapistProfileId: null, // Unassigned
            therapistUserId: null,
            diagnosis: null,
            concern: 'General development assessment',
            caseId: null,
        },
    ];

    const createdChildren: { child: { id: string }; guardianUserId: string; def: typeof childDefs[0] }[] = [];

    for (const def of childDefs) {
        const guardianUser = await prisma.user.upsert({
            where: { email: def.guardianEmail },
            update: {},
            create: {
                email: def.guardianEmail,
                name: def.guardianName,
                phone: def.guardianPhone,
                role: Role.USER,
                isEmailVerified: false,
            },
        });

        const profile = await prisma.userProfile.upsert({
            where: { userId: guardianUser.id },
            update: {},
            create: {
                userId: guardianUser.id,
                fullName: def.guardianName,
                phoneNumber: def.guardianPhone,
                email: def.guardianEmail,
                relationshipToChild: 'Parent',
            },
        });

        const child = await prisma.child.create({
            data: {
                profileId: profile.id,
                firstName: def.childFirstName,
                dateOfBirth: def.dob,
                gender: def.gender,
                clinicStatus: def.status,
                walkinCreatedByAdmin: true,
                developmentalConcerns: def.concern,
                referralSource: 'Walk-in',
                clinicId: clinic.id,
            },
        });

        createdChildren.push({ child, guardianUserId: guardianUser.id, def });
        console.log(`✅ Child: ${def.childFirstName} (${def.status})`);
    }

    // ── 6. Cases + IEPs + Sessions for ACTIVE children ───────────────────────
    // Fixed deterministic case numbers (safe for re-runs)
    const CASE_NUMBERS: Record<string, string> = {
        Omar: 'STAR-2026-OMA',
        Nour: 'STAR-2026-NOU',
        Tariq: 'STAR-2026-TAR',
        Salma: 'STAR-2026-SAL',
        Zayed: 'STAR-2026-ZAY',
        Hala: 'STAR-2026-HAL',
    };

    for (const { child, def } of createdChildren) {
        if (!def.therapistProfileId || !def.therapistUserId || !def.caseId) continue;

        // Upsert Case
        const existingCase = await prisma.case.findFirst({ where: { childId: child.id } });

        const caseNo = CASE_NUMBERS[def.childFirstName];
        if (!caseNo) continue;

        const newCase = await prisma.case.upsert({
            where: { caseNumber: caseNo },
            update: {},
            create: {
                caseNumber: caseNo,
                childId: child.id,
                primaryTherapistId: def.therapistProfileId,
                status: 'ACTIVE',
                diagnosis: def.diagnosis,
                clinicId: clinic.id,
                openedAt: daysAgo(30),
                therapists: {
                    create: {
                        therapistId: def.therapistProfileId,
                        role: 'PRIMARY',
                    },
                },
            },
        });

        console.log(`✅ Case: ${newCase.caseNumber}`);

        // For ACTIVE children only — add IEP, goals, sessions
        if (def.status !== 'ACTIVE') continue;

        // Skip if IEP already seeded for this case
        const existingIEP = await prisma.iEP.findFirst({ where: { caseId: newCase.id } });
        if (existingIEP) continue;

        // Create IEP
        const iep = await prisma.iEP.create({
            data: {
                caseId: newCase.id,
                createdById: def.therapistUserId,
                status: IEPStatus.ACTIVE,
                reviewDate: new Date(TODAY.getFullYear(), TODAY.getMonth() + 6, TODAY.getDate()),
            },
        });

        // Create 3 goals
        const goals = await Promise.all([
            prisma.iEPGoal.create({
                data: {
                    iepId: iep.id,
                    goalText: `${def.childFirstName} will demonstrate improved attention span (baseline: 2 min → target: 10 min in structured activities)`,
                    domain: 'Behaviour',
                    targetDate: daysAgo(-60),
                    status: GoalStatus.IN_PROGRESS,
                    order: 1,
                },
            }),
            prisma.iEPGoal.create({
                data: {
                    iepId: iep.id,
                    goalText: `${def.childFirstName} will improve skills related to ${def.stName} (baseline: developing → target: age-appropriate)`,
                    domain: 'Skill',
                    targetDate: daysAgo(-90),
                    status: GoalStatus.IN_PROGRESS,
                    order: 2,
                },
            }),
            prisma.iEPGoal.create({
                data: {
                    iepId: iep.id,
                    goalText: `${def.childFirstName} will master functional goals for ${def.stName} (baseline: basic → target: advanced)`,
                    domain: 'Functional',
                    targetDate: daysAgo(-90),
                    status: GoalStatus.IN_PROGRESS,
                    order: 3,
                },
            }),
        ]);

        console.log(`  ✅ IEP + 3 goals for ${def.childFirstName}`);

        // Create 6 sessions (past) with SOAP notes + goal progress
        for (let i = 5; i >= 0; i--) {
            const session = await prisma.caseSession.create({
                data: {
                    caseId: newCase.id,
                    therapistId: def.therapistUserId,
                    scheduledAt: daysAgo(i * 5 + 2),
                    actualDuration: 60,
                    sessionType: def.stName || 'Therapy',
                    attendanceStatus: 'PRESENT',
                    noteFormat: 'SOAP',
                    noteStatus: 'SIGNED',
                    signedAt: daysAgo(i * 5 + 1),
                    structuredNotes: {
                        subjective: `${def.childFirstName}'s guardian reports ${i === 0 ? 'continued progress' : 'steady improvement'}. ${def.concern}`,
                        objective: `Session conducted for 60 minutes. Child engaged well with structured activities.`,
                        assessment: `${def.childFirstName} is ${i < 3 ? 'progressing as expected' : 'making steady gains'}. Goals are on track.`,
                        plan: `Continue current plan. Increase difficulty of tasks in next session.`,
                    },
                    goalProgress: {
                        create: goals.map((g, idx) => ({
                            goalId: g.id,
                            progressValue: Math.min(5 - i + idx, 5) / 5, // 0.0–1.0 scale
                            progressNote: `Session ${6 - i}: steady progress observed`,
                        })),
                    },
                },
            });
            console.log(`    ✅ Session ${6 - i} for ${def.childFirstName}`);
        }
    }

    // ── 7. Today's Bookings (for Tracking Board) ──────────────────────────────
    const omarData = createdChildren.find((c) => c.def.childFirstName === 'Omar');
    const nourData = createdChildren.find((c) => c.def.childFirstName === 'Nour');
    const tariqData = createdChildren.find((c) => c.def.childFirstName === 'Tariq');
    const salmaData = createdChildren.find((c) => c.def.childFirstName === 'Salma');
    const zayedData = createdChildren.find((c) => c.def.childFirstName === 'Zayed');

    const bookingDefs = [
        { childData: omarData, therapistProfile: aliProfile, therapistUser: aliUser, sessionType: otSessionType, hour: 9, minute: 0 },
        { childData: nourData, therapistProfile: samProfile, therapistUser: samUser, sessionType: speechSessionType, hour: 10, minute: 0 },
        { childData: tariqData, therapistProfile: janeProfile, therapistUser: janeUser, sessionType: abaSessionType, hour: 11, minute: 0 },
        { childData: salmaData, therapistProfile: johnProfile, therapistUser: johnUser, sessionType: ptSessionType, hour: 14, minute: 0 },
        { childData: zayedData, therapistProfile: saraTProfile, therapistUser: saraTUser, sessionType: psychSessionType, hour: 15, minute: 0 },
    ];

    for (const bd of bookingDefs) {
        if (!bd.childData) continue;
        const start = todayAt(bd.hour, bd.minute);
        const end = new Date(start.getTime() + 60 * 60 * 1000);

        await prisma.booking.create({
            data: {
                patientId: bd.childData.guardianUserId,
                therapistId: bd.therapistProfile.id,
                sessionTypeId: bd.sessionType.id,
                startDateTime: start,
                endDateTime: end,
                timezone: 'Asia/Dubai',
                duration: 60,
                status: 'CONFIRMED',
                subtotal: 0,
                platformFee: 0,
                platformFeePercentage: 0,
                therapistAmount: 0,
                currency: 'AED',
                paymentStatus: 'PENDING',
                trackingStatus: 'SCHEDULED',
                clinicId: clinic.id,
            },
        });
        console.log(`✅ Booking: ${bd.childData.def.childFirstName} @ ${bd.hour}:${bd.minute.toString().padStart(2, '0')}`);
    }

    console.log('\n🎉 Starwalkers demo data seeded successfully!');
    console.log('\nLogin credentials:');
    console.log('  Admin:    admin@starwalkers.com / Admin@123');
    console.log('  Therapists: [email]@starwalkers.com / Admin@123');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
