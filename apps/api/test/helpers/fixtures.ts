import { PrismaClient } from '@prisma/client';

/**
 * Fixtures for the DB-backed specs.
 *
 * EVERYTHING CREATED HERE IS SYNTHETIC and lives on `@ancc.internal`, which is the
 * domain the platform mints for itself and behind which there is never a human. The
 * tests then delete exactly what they made.
 *
 * That matters more here than in a normal codebase: this database holds real children
 * entered by real families. A test that leaves rows behind, or worse mutates an existing
 * child, is not a flaky test — it is a data incident. Hence `scope()`, which namespaces
 * every row to one run, and `cleanup()`, which removes them by that namespace only.
 */
export const prisma = new PrismaClient();

export interface Scope {
  tag: string;
  email: (name: string) => string;
}

export function scope(prefix: string): Scope {
  const tag = `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return { tag, email: (name: string) => `${tag}.${name}@ancc.internal` };
}

export async function mkUser(s: Scope, name: string, role: any = 'USER') {
  return prisma.user.create({
    data: { email: s.email(name), name, role, password: 'x', isEmailVerified: true },
  });
}

export async function mkParentWithChild(
  s: Scope,
  childName: string,
  dob: string,
  opts: { gender?: string } = {},
) {
  const user = await mkUser(s, `parent-${childName}`);
  const profile = await prisma.userProfile.create({
    data: { userId: user.id, fullName: user.name!, email: user.email },
  });
  const child = await prisma.child.create({
    data: {
      profileId: profile.id,
      firstName: childName,
      dateOfBirth: new Date(dob),
      gender: opts.gender ?? 'female',
    },
  });
  await prisma.guardian.create({
    data: {
      childId: child.id,
      userId: user.id,
      fullName: user.name!,
      email: user.email,
      relationship: 'LEGAL_GUARDIAN',
      hasAuthorityToConsent: true,
      isPrimaryContact: true,
    },
  });
  return { user, profile, child };
}

export async function mkFacility(
  s: Scope,
  name: string,
  type: 'NURSERY' | 'SCHOOL' | 'CLINIC',
  opts: { withLegacyClinic?: boolean } = {},
) {
  const org = await prisma.organization.create({
    data: {
      name: `${name} org`,
      slug: `${s.tag}-${name.toLowerCase().replace(/\W+/g, '-')}`,
      kind: type === 'CLINIC' ? 'CLINIC_GROUP' : 'NURSERY_GROUP',
    },
  });
  const facility = await prisma.facility.create({
    data: {
      organizationId: org.id,
      type,
      name,
      slug: `${s.tag}-${name.toLowerCase().replace(/\W+/g, '-')}-f`,
    },
  });

  // A BACKFILLED clinic shares its id with the legacy `Clinic` row — which is what every
  // clinic facility in dev and prod actually looks like, and what `Child.clinicId` (an FK
  // to Clinic, not Facility) depends on.
  if (type === 'CLINIC' && opts.withLegacyClinic) {
    const admin = await mkUser(s, `admin-${name}`, 'ADMIN');
    await prisma.clinic.create({ data: { id: facility.id, name, adminId: admin.id } });
  }

  return { org, facility };
}

export async function mkStaff(s: Scope, facilityId: string, name: string, role: any) {
  const user = await mkUser(s, name, 'EDUCATOR');
  const member = await prisma.facilityMember.create({
    data: { facilityId, userId: user.id, role, status: 'ACTIVE' },
  });
  return { user, member, actor: { id: user.id, role: 'EDUCATOR' } };
}

/**
 * Delete everything this run created, by namespace. Order matters — children hang off
 * profiles by a CASCADING FK, so profiles must go after the children that point at them.
 */
export async function cleanup(s: Scope) {
  const users = await prisma.user.findMany({
    where: { email: { contains: s.tag } },
    select: { id: true, userProfile: { select: { id: true, children: { select: { id: true } } } } },
  });
  const userIds = users.map(u => u.id);
  const profileIds = users.map(u => u.userProfile?.id).filter(Boolean) as string[];

  const orgs = await prisma.organization.findMany({
    where: { slug: { contains: s.tag } },
    select: { id: true },
  });
  const orgIds = orgs.map(o => o.id);
  const facs = await prisma.facility.findMany({
    where: { organizationId: { in: orgIds } },
    select: { id: true },
  });
  const facIds = facs.map(f => f.id);

  // Children reachable either through this run's profiles or its facilities — a merged
  // child may have moved profiles mid-test.
  const kids = await prisma.child.findMany({
    where: {
      OR: [
        { profileId: { in: profileIds } },
        { affiliations: { some: { facilityId: { in: facIds } } } },
      ],
    },
    select: { id: true, profile: { select: { id: true, userId: true, user: { select: { email: true } } } } },
  });
  const kidIds = kids.map(k => k.id);

  // The SHADOW accounts behind any placeholder children this run created.
  //
  // They are `placeholder.<uuid>@ancc.internal` and therefore carry no run tag, so the
  // tag-based sweep below misses them entirely. A spec that creates a placeholder and
  // never claims it (a dispute, or just a roster row) would strand one every run —
  // which is a leak in the TEST, but it accumulates in a real database, so it is worth
  // closing. Captured HERE, while the children still point at them.
  const shadowUserIds = kids
    .filter(k => k.profile?.user?.email?.startsWith('placeholder.'))
    .map(k => k.profile!.userId);
  const shadowProfileIds = kids
    .filter(k => k.profile?.user?.email?.startsWith('placeholder.'))
    .map(k => k.profile!.id);

  await prisma.assessmentResponse.deleteMany({ where: { assessment: { childId: { in: kidIds } } } });
  await prisma.assessment.deleteMany({ where: { childId: { in: kidIds } } });
  await prisma.childClaim.deleteMany({ where: { OR: [{ childId: { in: kidIds } }, { facilityId: { in: facIds } }] } });
  await prisma.childConsent.deleteMany({ where: { childId: { in: kidIds } } });
  await prisma.childAffiliation.deleteMany({ where: { childId: { in: kidIds } } });
  await prisma.guardian.deleteMany({ where: { childId: { in: kidIds } } });
  await prisma.child.deleteMany({ where: { id: { in: kidIds } } });

  await prisma.facilityMember.deleteMany({ where: { facilityId: { in: facIds } } });
  await prisma.room.deleteMany({ where: { facilityId: { in: facIds } } });
  await prisma.clinic.deleteMany({ where: { id: { in: facIds } } });
  await prisma.facility.deleteMany({ where: { id: { in: facIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });

  await prisma.userProfile.deleteMany({ where: { id: { in: [...profileIds, ...shadowProfileIds] } } });
  await prisma.user.deleteMany({ where: { id: { in: [...userIds, ...shadowUserIds] } } });
}

/** Any placeholder shadow left behind by a test is a leak — assert on this. */
export async function orphanShadowCount(): Promise<number> {
  return prisma.user.count({
    where: { email: { startsWith: 'placeholder.' }, userProfile: { children: { none: {} } } },
  });
}
