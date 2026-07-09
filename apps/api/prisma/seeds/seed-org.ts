/**
 * Org seed — creates a demo Organization + an Org Admin login, and scaffolds the
 * existing demo therapist (therapist@upllyft.demo) into that org.
 *
 *   pnpm --filter @upllyft/api exec tsx prisma/seeds/seed-org.ts
 *
 * Idempotent (upserts by email / slug / composite unique keys). Safe to run
 * before or after seed-demo.ts — it will create the therapist if missing.
 */
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

const PASSWORD = 'Demo@1234';
const ORG_ADMIN_EMAIL = 'orgadmin@upllyft.demo';
const ORG_NAME = 'Upllyft Demo Clinic';
const ORG_SLUG = 'upllyft-demo-clinic';

/**
 * The clinic's therapists. The first is the primary therapist on the demo case
 * (also created by seed-demo.ts); the second gives the org a second clinician so
 * members, communities and events aren't a one-person show.
 */
const THERAPISTS = [
  {
    email: 'therapist@upllyft.demo',
    name: 'Dr. Sarah Thomas',
    specializations: ['Speech & Language Therapy', 'Occupational Therapy'],
  },
  {
    email: 'therapist2@upllyft.demo',
    name: 'Ms. Leila Haddad',
    specializations: ['Occupational Therapy', 'Sensory Integration'],
  },
];

async function user(email: string, name: string, role: Role, pw: string, organization?: string) {
  const password = await bcrypt.hash(pw, 10);
  return prisma.user.upsert({
    where: { email },
    update: { password, role, name, ...(organization ? { organization } : {}) },
    create: { email, name, role, password, ...(organization ? { organization } : {}) },
  });
}

async function main() {
  console.log('Seeding org data…');

  // ── org admin user (platform role ORGANIZATION) ──
  const admin = await user(ORG_ADMIN_EMAIL, 'Nadia Rahman', Role.ORGANIZATION, PASSWORD, ORG_NAME);

  // ── therapists (created here if seed-demo hasn't run yet) ──
  type SeededTherapist = (typeof THERAPISTS)[number] & {
    user: Awaited<ReturnType<typeof user>>;
    profile: { id: string };
  };
  const therapists: SeededTherapist[] = [];
  for (const t of THERAPISTS) {
    const u = await user(t.email, t.name, Role.THERAPIST, PASSWORD);
    const profile = await prisma.therapistProfile.upsert({
      where: { userId: u.id },
      update: { specializations: t.specializations },
      create: { userId: u.id, specializations: t.specializations },
    });
    therapists.push({ ...t, user: u, profile });
  }

  // ── organization ──
  const org = await prisma.organization.upsert({
    where: { slug: ORG_SLUG },
    update: { name: ORG_NAME },
    create: {
      name: ORG_NAME,
      slug: ORG_SLUG,
      description: 'Demo multidisciplinary paediatric clinic for the Upllyft clinical workspace.',
      region: 'AE',
    },
  });

  // ── org admin membership (ADMIN) ──
  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: admin.id, organizationId: org.id } },
    update: { role: 'ADMIN', status: 'ACTIVE', joinedAt: new Date() },
    create: { userId: admin.id, organizationId: org.id, role: 'ADMIN', status: 'ACTIVE', joinedAt: new Date() },
  });

  for (const t of therapists) {
    // ── therapist membership (MEMBER) ──
    await prisma.organizationMember.upsert({
      where: { userId_organizationId: { userId: t.user.id, organizationId: org.id } },
      update: { role: 'MEMBER', status: 'ACTIVE', joinedAt: new Date() },
      create: { userId: t.user.id, organizationId: org.id, role: 'MEMBER', status: 'ACTIVE', joinedAt: new Date() },
    });

    // ── therapist ↔ org link (marketplace/case governance) — approved by admin ──
    await prisma.therapistOrganizationLink.upsert({
      where: { therapistId_organizationId: { therapistId: t.profile.id, organizationId: org.id } },
      update: { status: 'APPROVED', approvedAt: new Date(), approvedBy: admin.id },
      create: {
        therapistId: t.profile.id,
        organizationId: org.id,
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: admin.id,
      },
    });
  }

  // ── attach the demo case to the org (if seed-demo has run) ──
  const kase = await prisma.case.findUnique({ where: { caseNumber: 'UPL-DEMO-0001' } });
  if (kase) {
    await prisma.case.update({ where: { id: kase.id }, data: { organizationId: org.id } });
    console.log('  · linked case UPL-DEMO-0001 to org.');
  } else {
    console.log('  · case UPL-DEMO-0001 not found (run seed-demo.ts to create it) — skipped case link.');
  }

  console.log('\n──────────────────────────────────────────────');
  console.log(`Org ready: ${ORG_NAME} (${ORG_SLUG})`);
  console.log('Logins (password for all):', PASSWORD);
  console.log('  Org Admin :', ORG_ADMIN_EMAIL, '(role ORGANIZATION, org member ADMIN)');
  for (const t of therapists) {
    console.log(`  Therapist : ${t.email} — ${t.name} (org member MEMBER, link APPROVED)`);
  }
  console.log('──────────────────────────────────────────────');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
