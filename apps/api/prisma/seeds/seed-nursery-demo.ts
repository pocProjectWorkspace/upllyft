/**
 * Seed a SYNTHETIC nursery demo: one nursery, its staff, and three enrolled children
 * across the three consent states, so every part of the nursery flow (F3 roster + claim,
 * F4 educator screening, F5 observations) can be demonstrated end to end.
 *
 * ⚠️ SYNTHETIC ACCOUNTS ONLY. Every user this creates is on `@upllyft.demo` — there is no
 * human behind any of them, which is the ONLY reason it is allowed to seed their consent.
 * The rule that must never be crossed: never fabricate a ChildConsent for a REAL guardian
 * (35 of ~39 prod parents are real testers who entered their own real children). This
 * script creates only NEW synthetic rows and never reads, attaches to, or modifies any
 * existing family. See prisma/seeds/seed-demo-consents.ts for the same guardrail.
 *
 * Idempotent — upserts by email / slug, and find-or-creates children, affiliations,
 * consents and observations by stable attributes, so re-running changes nothing.
 *
 *   # dev:
 *   node_modules/.bin/ts-node --transpile-only prisma/seeds/seed-nursery-demo.ts
 *   # prod (creds from Railway, exported so dotenv can't override):
 *   DATABASE_URL="<iqak…>" node_modules/.bin/ts-node --transpile-only prisma/seeds/seed-nursery-demo.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const PASSWORD = 'Demo@1234';

/** A safety belt: this script must only ever mint @upllyft.demo identities. */
const SYNTHETIC_DOMAIN = '@upllyft.demo';
function assertSynthetic(email: string) {
  if (!email.endsWith(SYNTHETIC_DOMAIN)) {
    throw new Error(`Refusing to seed a non-synthetic email: ${email}. This script mints ${SYNTHETIC_DOMAIN} only.`);
  }
}

/** Months-ago DOB, so the children stay in the 2–3 band regardless of when this runs. */
function dobMonthsAgo(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function upsertUser(email: string, name: string, role: any) {
  assertSynthetic(email);
  const password = await bcrypt.hash(PASSWORD, 10);
  return prisma.user.upsert({
    where: { email },
    update: { name, role },
    create: { email, name, role, password, isEmailVerified: true },
  });
}

async function main() {
  console.log('\n🌱 Seeding synthetic nursery demo (@upllyft.demo only)…\n');

  // ── Organization + facility ──────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: 'little-explorers-demo' },
    update: { name: 'Little Explorers Group', kind: 'NURSERY_GROUP' },
    create: { name: 'Little Explorers Group', slug: 'little-explorers-demo', kind: 'NURSERY_GROUP' },
  });

  const facility = await prisma.facility.upsert({
    where: { slug: 'little-explorers-demo' },
    update: { name: 'Little Explorers Nursery', type: 'NURSERY' },
    create: {
      organizationId: org.id,
      name: 'Little Explorers Nursery',
      slug: 'little-explorers-demo',
      type: 'NURSERY',
      licenseNo: 'KHDA-DEMO-001',
      licenseAuthority: 'KHDA',
      emirate: 'DUBAI',
      complianceStatus: 'ACTIVE',
    },
  });

  const room = await prisma.room.upsert({
    where: { facilityId_name: { facilityId: facility.id, name: 'Sunflowers' } },
    update: { ageBandLabel: '2–3 years' },
    create: { facilityId: facility.id, name: 'Sunflowers', ageBandLabel: '2–3 years' },
  });

  // ── Staff (loginable) ────────────────────────────────────────────────────
  const lead = await upsertUser('nursery.lead@upllyft.demo', 'Nadia Farouk', 'EDUCATOR');
  const keyworker = await upsertUser('nursery.key@upllyft.demo', 'Sara Okoro', 'EDUCATOR');

  const leadMember = await prisma.facilityMember.upsert({
    where: { userId_facilityId: { userId: lead.id, facilityId: facility.id } },
    update: { role: 'OWNER', status: 'ACTIVE' },
    create: { userId: lead.id, facilityId: facility.id, role: 'OWNER', status: 'ACTIVE' },
  });
  const keyworkerMember = await prisma.facilityMember.upsert({
    where: { userId_facilityId: { userId: keyworker.id, facilityId: facility.id } },
    update: { role: 'KEYWORKER', status: 'ACTIVE' },
    create: { userId: keyworker.id, facilityId: facility.id, role: 'KEYWORKER', status: 'ACTIVE' },
  });
  void leadMember;

  // ── Org membership ────────────────────────────────────────────────────────
  // The nursery admin is a FacilityMember OWNER (runs the site) AND an OrganizationMember
  // ADMIN (runs the account). The second is what the "My Organisation" resolver reads —
  // without it the org page shows nothing for them. This is the "name the admin" step of
  // onboarding: both memberships, together.
  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: lead.id, organizationId: org.id } },
    update: { role: 'ADMIN', status: 'ACTIVE' },
    create: { userId: lead.id, organizationId: org.id, role: 'ADMIN', status: 'ACTIVE', joinedAt: new Date() },
  });
  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: keyworker.id, organizationId: org.id } },
    update: { role: 'MEMBER', status: 'ACTIVE' },
    create: { userId: keyworker.id, organizationId: org.id, role: 'MEMBER', status: 'ACTIVE', joinedAt: new Date() },
  });

  // ── Children, each in a different consent state ───────────────────────────
  //
  //   Yousef — full consent (observations + screening). Has seeded observations.
  //   Diya   — observation consent only (shows the "ask for screening consent" state).
  //   Kai    — enrolled but PENDING_CONSENT (shows the locked / awaiting-parent state).
  const plan = [
    {
      parentEmail: 'parent.amina@upllyft.demo',
      parentName: 'Amina Saleh',
      childName: 'Yousef',
      months: 30,
      status: 'ACTIVE' as const,
      consents: ['DATA_PROCESSING', 'ASSESSMENT'] as const,
    },
    {
      parentEmail: 'parent.deepak@upllyft.demo',
      parentName: 'Deepak Nair',
      childName: 'Diya',
      months: 34,
      status: 'ACTIVE' as const,
      consents: ['DATA_PROCESSING'] as const,
    },
    {
      parentEmail: 'parent.mei@upllyft.demo',
      parentName: 'Mei Chen',
      childName: 'Kai',
      months: 27,
      status: 'PENDING_CONSENT' as const,
      consents: [] as const,
    },
  ];

  const created: any[] = [];

  for (const p of plan) {
    const parent = await upsertUser(p.parentEmail, p.parentName, 'USER');
    const profile = await prisma.userProfile.upsert({
      where: { userId: parent.id },
      update: { fullName: p.parentName, email: p.parentEmail },
      create: { userId: parent.id, fullName: p.parentName, email: p.parentEmail },
    });

    let child = await prisma.child.findFirst({
      where: { profileId: profile.id, firstName: p.childName },
    });
    if (!child) {
      child = await prisma.child.create({
        data: {
          profileId: profile.id,
          firstName: p.childName,
          dateOfBirth: dobMonthsAgo(p.months),
          gender: 'other',
          referralSource: 'Nursery demo',
        },
      });
    }

    // Guardian row carries the authority to consent — the parent, for their own child.
    const guardian = await prisma.guardian.findFirst({ where: { childId: child.id, userId: parent.id } });
    if (!guardian) {
      await prisma.guardian.create({
        data: {
          childId: child.id,
          userId: parent.id,
          fullName: p.parentName,
          email: p.parentEmail,
          relationship: 'LEGAL_GUARDIAN',
          hasAuthorityToConsent: true,
          isPrimaryContact: true,
          accessLevel: 'FULL',
        },
      });
    }

    // Affiliation — ENROLLED, in the planned status, placed in the room with a keyworker.
    let affiliation = await prisma.childAffiliation.findFirst({
      where: { childId: child.id, facilityId: facility.id, endedAt: null },
    });
    if (!affiliation) {
      affiliation = await prisma.childAffiliation.create({
        data: {
          childId: child.id,
          facilityId: facility.id,
          type: 'ENROLLED',
          status: p.status,
          dataScope: 'OBSERVATIONS_ONLY',
          roomId: room.id,
          keyworkerId: keyworkerMember.id,
        },
      });
    } else {
      affiliation = await prisma.childAffiliation.update({
        where: { id: affiliation.id },
        data: { status: p.status, roomId: room.id, keyworkerId: keyworkerMember.id },
      });
    }

    // Consents — synthetic parent grants for their synthetic child (allowed).
    for (const type of p.consents) {
      const existing = await prisma.childConsent.findFirst({
        where: { childId: child.id, facilityId: facility.id, type, revokedAt: null },
      });
      if (!existing) {
        await prisma.childConsent.create({
          data: {
            childId: child.id,
            facilityId: facility.id,
            affiliationId: affiliation.id,
            guardianId: (await prisma.guardian.findFirstOrThrow({ where: { childId: child.id, userId: parent.id } })).id,
            grantedById: parent.id,
            type,
            purpose: type === 'ASSESSMENT' ? 'Developmental screening at nursery' : 'Day-to-day observations',
          },
        });
      }
    }

    created.push({ ...p, childId: child.id, affiliationId: affiliation.id });
  }

  // ── A few observations for the fully-consented child (Yousef) ─────────────
  const yousef = created.find((c) => c.childName === 'Yousef')!;
  const observations = [
    { domain: 'socialEmotional', type: 'MOMENT', note: 'Shared the train set with two other children at circle time — first time I have seen him do that.', daysAgo: 9 },
    { domain: 'speechLanguage', type: 'NOTE', note: 'Using three- and four-word sentences today. "I want more juice please."', daysAgo: 6 },
    { domain: 'grossMotor', type: 'MILESTONE', note: 'Climbed the small climbing steps unaided and came down carefully.', daysAgo: 4 },
    { domain: 'sensoryProcessing', type: 'CONCERN', note: 'Covered his ears and left the room during music time again. Third time this fortnight.', daysAgo: 1 },
  ];
  for (const o of observations) {
    const existing = await prisma.observation.findFirst({ where: { childId: yousef.childId, note: o.note } });
    if (!existing) {
      const observedAt = new Date();
      observedAt.setDate(observedAt.getDate() - o.daysAgo);
      await prisma.observation.create({
        data: {
          childId: yousef.childId,
          affiliationId: yousef.affiliationId,
          facilityId: facility.id,
          authorId: keyworker.id,
          domain: o.domain,
          type: o.type as any,
          note: o.note,
          observedAt,
        },
      });
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('✅ Nursery demo ready.\n');
  console.log(`   Nursery:  Little Explorers Nursery  (KHDA · Dubai)`);
  console.log(`   Room:     Sunflowers (2–3 years)\n`);
  console.log('   Staff logins (password Demo@1234) — see the nursery in web-cases:');
  console.log('     nursery.lead@upllyft.demo   Nadia Farouk   OWNER');
  console.log('     nursery.key@upllyft.demo    Sara Okoro     KEYWORKER\n');
  console.log('   Parent logins (password Demo@1234) — see permissions + observations in web-main:');
  console.log('     parent.amina@upllyft.demo   Yousef   FULL consent (observations + screening) · 4 observations');
  console.log('     parent.deepak@upllyft.demo  Diya     observation consent only (screening not yet granted)');
  console.log('     parent.mei@upllyft.demo     Kai      enrolled, awaiting consent (locked)\n');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
