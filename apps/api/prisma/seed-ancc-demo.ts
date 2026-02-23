/**
 * ANCC Demo Seed Script
 * Run: npx ts-node prisma/seed-ancc-demo.ts
 *
 * Seeds ANCC (Abu Dhabi Neurodevelopmental Care Center) with:
 * - 1 Admin user
 * - 1 Clinic record
 * - 3 Therapists (OT, Speech, ABA)
 * - 5 Children (2 ACTIVE with cases/sessions/IEPs, 2 INTAKE assigned, 1 INTAKE unassigned)
 * - Today's bookings on the Tracking Board
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
    console.log('🌱 Seeding ANCC demo data...');

    // ── 1. Admin User ──────────────────────────────────────────────────────────
    const adminPasswordHash = await bcrypt.hash('ANCCAdmin2026!', 10);
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@ancc.ae' },
        update: {},
        create: {
            email: 'admin@ancc.ae',
            name: 'ANCC Admin',
            password: adminPasswordHash,
            role: Role.ADMIN,
            isEmailVerified: true,
        },
    });
    console.log('✅ Admin:', adminUser.email);

    // ── 1.5. Organization ──────────────────────────────────────────────────────
    const organization = await prisma.organization.upsert({
        where: { slug: 'ancc' },
        update: {},
        create: {
            name: 'Abu Dhabi Neurodevelopmental Care Center',
            slug: 'ancc',
            description: 'Leading pediatric neurodevelopmental care center in Abu Dhabi.',
        },
    });
    console.log('✅ Organization:', organization.name);

    // ── 2. Clinic ──────────────────────────────────────────────────────────────
    const clinic = await prisma.clinic.upsert({
        where: { adminId: adminUser.id },
        update: {},
        create: {
            name: 'Abu Dhabi Neurodevelopmental Care Center',
            address: 'Al Bateen, Abu Dhabi, UAE',
            phone: '+971 2 XXX XXXX',
            email: 'info@ancc.ae',
            adminId: adminUser.id,
            organizationId: organization.id,
        },
    });
    console.log('✅ Clinic:', clinic.name);

    // ── 3. Therapists ─────────────────────────────────────────────────────────
    const therapistDefs = [
        {
            email: 'sara.almansoori@ancc.ae',
            name: 'Dr. Sara Al-Mansoori',
            specializations: ['Occupational Therapy', 'Sensory Integration'],
            title: 'Senior Occupational Therapist',
        },
        {
            email: 'khalid.hassan@ancc.ae',
            name: 'Mr. Khalid Hassan',
            specializations: ['Speech & Language Therapy', 'AAC'],
            title: 'Speech & Language Therapist',
        },
        {
            email: 'layla.ibrahim@ancc.ae',
            name: 'Ms. Layla Ibrahim',
            specializations: ['Applied Behaviour Analysis', 'Autism Intervention'],
            title: 'ABA Therapist (BCBA)',
        },
    ];

    const therapistPasswordHash = await bcrypt.hash('Therapist2026!', 10);
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

    const [saraProfile, khalidProfile, laylaProfile] = therapistUsers.map((t) => t.profile);
    const [saraUser, khalidUser, laylaUser] = therapistUsers.map((t) => t.user);

    // ── 4. Session Types ──────────────────────────────────────────────────────
    const otSessionType = await prisma.sessionType.upsert({
        where: { id: 'ancc-ot-session-type' },
        update: {},
        create: {
            id: 'ancc-ot-session-type',
            therapistId: saraProfile.id,
            name: 'Occupational Therapy Session',
            duration: 60,
            defaultPrice: 0,
            currency: 'AED',
            isActive: true,
        },
    });

    const speechSessionType = await prisma.sessionType.upsert({
        where: { id: 'ancc-speech-session-type' },
        update: {},
        create: {
            id: 'ancc-speech-session-type',
            therapistId: khalidProfile.id,
            name: 'Speech Therapy Session',
            duration: 45,
            defaultPrice: 0,
            currency: 'AED',
            isActive: true,
        },
    });

    // ── 5. Guardian Users + Profiles + Children ───────────────────────────────
    const childDefs = [
        {
            guardianEmail: 'parent.alhashimi@ancc.ae',
            guardianName: 'Mohammed Al-Hashimi',
            guardianPhone: '+971 50 111 2233',
            childFirstName: 'Rayan',
            dob: new Date('2019-03-15'),
            gender: 'Male',
            status: 'ACTIVE' as ClinicStatus,
            therapistProfileId: saraProfile.id,
            therapistUserId: saraUser.id,
            diagnosis: 'Sensory Processing Disorder — Occupational Therapy',
            concern: 'Sensory sensitivity, fine motor delays',
            caseId: 'ancc-case-rayan',
        },
        {
            guardianEmail: 'parent.alqassem@ancc.ae',
            guardianName: 'Fatima Al-Qassem',
            guardianPhone: '+971 55 222 3344',
            childFirstName: 'Lina',
            dob: new Date('2018-07-22'),
            gender: 'Female',
            status: 'ACTIVE' as ClinicStatus,
            therapistProfileId: khalidProfile.id,
            therapistUserId: khalidUser.id,
            diagnosis: 'Expressive Language Delay — Speech & Language Therapy',
            concern: 'Limited vocabulary, speech clarity issues',
            caseId: 'ancc-case-lina',
        },
        {
            guardianEmail: 'parent.alkhalidi@ancc.ae',
            guardianName: 'Omar Al-Khalidi',
            guardianPhone: '+971 54 333 4455',
            childFirstName: 'Zaid',
            dob: new Date('2020-01-10'),
            gender: 'Male',
            status: 'INTAKE' as ClinicStatus,
            therapistProfileId: laylaProfile.id,
            therapistUserId: laylaUser.id,
            diagnosis: 'ASD assessment referral',
            concern: 'Social communication challenges, repetitive behaviours',
            caseId: 'ancc-case-zaid',
        },
        {
            guardianEmail: 'parent.alnuaimi@ancc.ae',
            guardianName: 'Aisha Al-Nuaimi',
            guardianPhone: '+971 56 444 5566',
            childFirstName: 'Mariam',
            dob: new Date('2020-09-05'),
            gender: 'Female',
            status: 'INTAKE' as ClinicStatus,
            therapistProfileId: saraProfile.id,
            therapistUserId: saraUser.id,
            diagnosis: 'Fine motor and self-care delays',
            concern: 'Difficulty with feeding, dressing, handwriting readiness',
            caseId: 'ancc-case-mariam',
        },
        {
            guardianEmail: 'parent.aldhaheri@ancc.ae',
            guardianName: 'Tariq Al-Dhaheri',
            guardianPhone: '+971 52 555 6677',
            childFirstName: 'Hamdan',
            dob: new Date('2019-11-20'),
            gender: 'Male',
            status: 'INTAKE' as ClinicStatus,
            therapistProfileId: null, // Unassigned — shows in intake queue
            therapistUserId: null,
            diagnosis: null,
            concern: 'Developmental delay — general assessment required',
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
        Rayan: 'ANCC-2026-RAY',
        Lina: 'ANCC-2026-LIN',
        Zaid: 'ANCC-2026-ZAI',
        Mariam: 'ANCC-2026-MAR',
    };

    for (const { child, def } of createdChildren) {
        if (!def.therapistProfileId || !def.therapistUserId || !def.caseId) continue;

        // Upsert Case
        const existingCase = await prisma.case.findFirst({ where: { childId: child.id } });

        const caseNo = CASE_NUMBERS[def.childFirstName];
        if (!caseNo) continue; // Hamdan — no case needed

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
                    goalText: `${def.childFirstName} will improve fine motor skills (baseline: grip not established → target: age-appropriate grip)`,
                    domain: 'Motor',
                    targetDate: daysAgo(-90),
                    status: GoalStatus.IN_PROGRESS,
                    order: 2,
                },
            }),
            prisma.iEPGoal.create({
                data: {
                    iepId: iep.id,
                    goalText: `${def.childFirstName} will increase expressive vocabulary (baseline: 20 words → target: 50+ functional words)`,
                    domain: 'Communication',
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
                    sessionType: def.therapistProfileId === saraProfile.id ? 'Occupational Therapy' : 'Speech Therapy',
                    attendanceStatus: 'PRESENT',
                    noteFormat: 'SOAP',
                    noteStatus: 'SIGNED',
                    signedAt: daysAgo(i * 5 + 1),
                    structuredNotes: {
                        subjective: `${def.childFirstName}'s guardian reports ${i === 0 ? 'continued progress' : 'steady improvement'}. ${def.concern}`,
                        objective: `Session conducted for 60 minutes. Child engaged well with structured activities.`,
                        assessment: `${def.childFirstName} is ${i < 3 ? 'progressing as expected' : 'making steady gains'}. Goals are on track.`,
                        plan: `Continue current plan. Increase difficulty of fine motor tasks in next session.`,
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
    const rayansData = createdChildren.find((c) => c.def.childFirstName === 'Rayan');
    const linasData = createdChildren.find((c) => c.def.childFirstName === 'Lina');
    const zaidsData = createdChildren.find((c) => c.def.childFirstName === 'Zaid');
    const mariamsData = createdChildren.find((c) => c.def.childFirstName === 'Mariam');

    const bookingDefs = [
        { childData: rayansData, therapistProfile: saraProfile, therapistUser: saraUser, sessionType: otSessionType, hour: 9, minute: 0 },
        { childData: linasData, therapistProfile: khalidProfile, therapistUser: khalidUser, sessionType: speechSessionType, hour: 10, minute: 0 },
        { childData: zaidsData, therapistProfile: laylaProfile, therapistUser: laylaUser, sessionType: otSessionType, hour: 11, minute: 0 },
        { childData: mariamsData, therapistProfile: saraProfile, therapistUser: saraUser, sessionType: otSessionType, hour: 14, minute: 0 },
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

    console.log('\n🎉 ANCC demo data seeded successfully!');
    console.log('\nLogin credentials:');
    console.log('  Admin:    admin@ancc.ae / ANCCAdmin2026!');
    console.log('  Therapists: [email]@ancc.ae / Therapist2026!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
