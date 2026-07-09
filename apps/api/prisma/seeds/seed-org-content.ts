/**
 * Org content seed — brand colours, sub-communities and a month of events for the
 * demo organization, so the org workspace has something live to show.
 *
 *   pnpm --filter @upllyft/api db:seed:org:content
 *
 * Run after seed-org.ts (which creates the org, the org admin and the therapist).
 * Idempotent: communities upsert by slug; events are tagged `demo-seed` and the
 * previous batch is cleared before reseeding, so dates stay relative to "now".
 */
import { CommunityRole, EventCategory, EventFormat, PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

const ORG_SLUG = 'upllyft-demo-clinic';
const ORG_ADMIN_EMAIL = 'orgadmin@upllyft.demo';
const THERAPIST_EMAIL = 'therapist@upllyft.demo';
const SEED_TAG = 'demo-seed';

const BRAND = {
  primaryColor: '#0ea5e9',
  secondaryColor: '#1e3a8a',
  accentColor: '#f59e0b',
};

/** Hours from now → Date. Negative = past. */
const hoursFromNow = (h: number) => new Date(Date.now() + h * 60 * 60 * 1000);
const daysFromNow = (d: number, atHour = 10) => {
  const date = new Date(Date.now() + d * 24 * 60 * 60 * 1000);
  date.setHours(atHour, 0, 0, 0);
  return date;
};

const COMMUNITIES = [
  {
    slug: 'demo-clinic-speech-language',
    name: 'Speech & Language Circle',
    description: 'Parents and therapists sharing progress, strategies and wins in speech therapy.',
    type: 'condition',
    condition: 'Speech Delay',
    tags: ['speech', 'language', 'aac'],
  },
  {
    slug: 'demo-clinic-sensory-ot',
    name: 'Sensory & OT Support',
    description: 'Occupational therapy techniques, sensory diets and regulation strategies.',
    type: 'condition',
    condition: 'Sensory Processing',
    tags: ['occupational-therapy', 'sensory'],
  },
  {
    slug: 'demo-clinic-parent-lounge',
    name: 'Parent Lounge',
    description: 'A private space for our clinic families to connect, vent and support each other.',
    type: 'support',
    condition: null,
    isPrivate: true,
    tags: ['parents', 'peer-support'],
  },
  {
    slug: 'demo-clinic-clinician-room',
    name: 'Clinician Room',
    description: 'Internal space for our multidisciplinary team — case discussions and CPD.',
    type: 'professional',
    condition: null,
    isPrivate: true,
    tags: ['clinicians', 'cpd'],
  },
];

/**
 * Spread across roughly one month: two finished, one running right now,
 * the rest upcoming over the next three weeks.
 */
const EVENTS = [
  {
    title: 'Introduction to AAC Devices',
    description: 'A hands-on walkthrough of augmentative and alternative communication tools for non-verbal children.',
    eventType: EventCategory.PARENT_EDUCATION,
    format: EventFormat.VIRTUAL,
    startDate: daysFromNow(-14, 11),
    endDate: daysFromNow(-14, 12),
    community: 'demo-clinic-speech-language',
    meetingLink: 'https://meet.upllyft.demo/aac-intro',
  },
  {
    title: 'Sensory Diet Workshop',
    description: 'Build a practical, repeatable sensory diet you can run at home between OT sessions.',
    eventType: EventCategory.WORKSHOP,
    format: EventFormat.IN_PERSON,
    startDate: daysFromNow(-6, 9),
    endDate: daysFromNow(-6, 11),
    community: 'demo-clinic-sensory-ot',
    venue: 'Upllyft Demo Clinic, Studio 2',
    city: 'Dubai',
  },
  {
    // Live right now — started 45 min ago, runs for another 75.
    title: 'Parent Drop-In: Ask a Therapist',
    description: 'Open Q&A with our speech and occupational therapists. Bring your questions, no agenda.',
    eventType: EventCategory.SUPPORT_GROUP,
    format: EventFormat.VIRTUAL,
    startDate: hoursFromNow(-0.75),
    endDate: hoursFromNow(1.25),
    community: 'demo-clinic-parent-lounge',
    meetingLink: 'https://meet.upllyft.demo/drop-in',
  },
  {
    title: 'Early Signs of Autism — Awareness Session',
    description: 'What to look for in the first three years, and what to do next. Open to the wider community.',
    eventType: EventCategory.AWARENESS_CAMPAIGN,
    format: EventFormat.HYBRID,
    startDate: daysFromNow(2, 18),
    endDate: daysFromNow(2, 19),
    orgLevel: true,
    venue: 'Upllyft Demo Clinic, Main Hall',
    city: 'Dubai',
    meetingLink: 'https://meet.upllyft.demo/autism-awareness',
  },
  {
    title: 'Social Skills Playgroup',
    description: 'Structured play session for children aged 4–7, facilitated by Dr. Sarah Thomas.',
    eventType: EventCategory.SOCIAL_SKILLS,
    format: EventFormat.IN_PERSON,
    startDate: daysFromNow(5, 15),
    endDate: daysFromNow(5, 16),
    community: 'demo-clinic-sensory-ot',
    venue: 'Upllyft Demo Clinic, Play Room',
    city: 'Dubai',
    maxAttendees: 12,
  },
  {
    title: 'Speech Milestones: 2 to 5 Years',
    description: 'What typical speech development looks like, and when to seek a formal assessment.',
    eventType: EventCategory.WEBINAR,
    format: EventFormat.VIRTUAL,
    startDate: daysFromNow(9, 19),
    endDate: daysFromNow(9, 20),
    community: 'demo-clinic-speech-language',
    meetingLink: 'https://meet.upllyft.demo/speech-milestones',
  },
  {
    title: 'Team Case Conference',
    description: 'Monthly multidisciplinary review of active cases. Clinicians only.',
    eventType: EventCategory.TRAINING,
    format: EventFormat.VIRTUAL,
    startDate: daysFromNow(12, 8),
    endDate: daysFromNow(12, 10),
    community: 'demo-clinic-clinician-room',
    meetingLink: 'https://meet.upllyft.demo/case-conference',
  },
  {
    title: 'Music Therapy Taster',
    description: 'An introductory music therapy session exploring rhythm, turn-taking and joint attention.',
    eventType: EventCategory.MUSIC_THERAPY,
    format: EventFormat.IN_PERSON,
    startDate: daysFromNow(18, 16),
    endDate: daysFromNow(18, 17),
    orgLevel: true,
    venue: 'Upllyft Demo Clinic, Studio 1',
    city: 'Dubai',
    maxAttendees: 15,
  },
];

async function main() {
  console.log('Seeding org content…');

  const org = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!org) {
    throw new Error(`Organization "${ORG_SLUG}" not found — run seed-org.ts first.`);
  }

  const [admin, therapist] = await Promise.all([
    prisma.user.findUnique({ where: { email: ORG_ADMIN_EMAIL } }),
    prisma.user.findUnique({ where: { email: THERAPIST_EMAIL } }),
  ]);
  if (!admin) throw new Error(`Org admin "${ORG_ADMIN_EMAIL}" not found — run seed-org.ts first.`);

  // ── brand colours ──
  await prisma.organization.update({ where: { id: org.id }, data: BRAND });
  console.log(`  · brand colours set (${BRAND.primaryColor} / ${BRAND.secondaryColor} / ${BRAND.accentColor})`);

  // ── communities ──
  const communityIdBySlug = new Map<string, string>();

  for (const c of COMMUNITIES) {
    const community = await prisma.community.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        description: c.description,
        organizationId: org.id,
        isActive: true,
      },
      create: {
        slug: c.slug,
        name: c.name,
        description: c.description,
        type: c.type,
        condition: c.condition ?? null,
        isPrivate: c.isPrivate ?? false,
        tags: c.tags,
        organizationId: org.id,
        creatorId: admin.id,
        isActive: true,
      },
    });
    communityIdBySlug.set(c.slug, community.id);

    // Org admin owns every community; the therapist joins the clinical ones.
    const memberships: { userId: string; role: CommunityRole }[] = [
      { userId: admin.id, role: CommunityRole.ADMIN },
    ];
    if (therapist && c.slug !== 'demo-clinic-parent-lounge') {
      memberships.push({ userId: therapist.id, role: CommunityRole.MODERATOR });
    }

    for (const m of memberships) {
      await prisma.communityMember.upsert({
        where: { userId_communityId: { userId: m.userId, communityId: community.id } },
        update: { role: m.role, status: 'ACTIVE' },
        create: {
          userId: m.userId,
          communityId: community.id,
          role: m.role,
          status: 'ACTIVE',
        },
      });
    }

    await prisma.community.update({
      where: { id: community.id },
      data: { memberCount: memberships.length },
    });
  }
  console.log(`  · ${COMMUNITIES.length} communities upserted.`);

  // ── events ──
  // Clear the previous seeded batch so start dates stay relative to "now".
  const { count: removed } = await prisma.event.deleteMany({
    where: {
      tags: { has: SEED_TAG },
      OR: [{ organizationId: org.id }, { community: { organizationId: org.id } }],
    },
  });
  if (removed) console.log(`  · cleared ${removed} previously seeded events.`);

  for (const e of EVENTS) {
    await prisma.event.create({
      data: {
        title: e.title,
        description: e.description,
        eventType: e.eventType,
        format: e.format,
        startDate: e.startDate,
        endDate: e.endDate,
        createdBy: admin.id,
        // An event belongs to a community OR directly to the org, never both.
        ...(e.orgLevel
          ? { organizationId: org.id }
          : { communityId: communityIdBySlug.get(e.community!)! }),
        venue: e.venue ?? null,
        city: e.city ?? null,
        meetingLink: e.meetingLink ?? null,
        maxAttendees: e.maxAttendees ?? null,
        timezone: 'Asia/Dubai',
        ageGroup: [],
        languages: ['en'],
        accessibilityFeatures: [],
        tags: [SEED_TAG],
        status: 'PUBLISHED',
        isPublic: true,
      },
    });
  }

  const now = Date.now();
  const live = EVENTS.filter((e) => e.startDate.getTime() <= now && (e.endDate?.getTime() ?? 0) >= now).length;
  const upcoming = EVENTS.filter((e) => e.startDate.getTime() > now).length;
  const past = EVENTS.length - live - upcoming;

  console.log('\n──────────────────────────────────────────────');
  console.log(`Org content ready for ${org.name}`);
  console.log(`  Communities : ${COMMUNITIES.length}`);
  console.log(`  Events      : ${EVENTS.length}  (${past} past · ${live} live · ${upcoming} upcoming)`);
  console.log('──────────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
