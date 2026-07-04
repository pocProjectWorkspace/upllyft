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
const THERAPIST_EMAIL = 'therapist@upllyft.demo';
const ORG_NAME = 'Upllyft Demo Clinic';
const ORG_SLUG = 'upllyft-demo-clinic';

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

  // ── therapist (create if seed-demo hasn't run yet) ──
  const therapist = await user(THERAPIST_EMAIL, 'Dr. Sarah Thomas', Role.THERAPIST, PASSWORD);
  const therapistProfile = await prisma.therapistProfile.upsert({
    where: { userId: therapist.id },
    update: {},
    create: { userId: therapist.id, specializations: ['Speech & Language Therapy', 'Occupational Therapy'] },
  });

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

  // ── therapist membership (MEMBER) ──
  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: therapist.id, organizationId: org.id } },
    update: { role: 'MEMBER', status: 'ACTIVE', joinedAt: new Date() },
    create: { userId: therapist.id, organizationId: org.id, role: 'MEMBER', status: 'ACTIVE', joinedAt: new Date() },
  });

  // ── therapist ↔ org link (marketplace/case governance) — approved by admin ──
  await prisma.therapistOrganizationLink.upsert({
    where: { therapistId_organizationId: { therapistId: therapistProfile.id, organizationId: org.id } },
    update: { status: 'APPROVED', approvedAt: new Date(), approvedBy: admin.id },
    create: {
      therapistId: therapistProfile.id,
      organizationId: org.id,
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedBy: admin.id,
    },
  });

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
  console.log('  Therapist :', THERAPIST_EMAIL, '(org member MEMBER, link APPROVED)');
  console.log('──────────────────────────────────────────────');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
