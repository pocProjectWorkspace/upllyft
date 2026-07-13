/**
 * READ-ONLY tenancy inspection. Performs no writes.
 *
 * Run before backfilling any environment — placement decisions must be based on
 * that environment's actual data, never assumed from another. Deliberately does
 * not print child names (patient PII); staff emails ARE printed because they are
 * what placement decisions key on.
 *
 *   DATABASE_URL="<url>" node_modules/.bin/ts-node --transpile-only \
 *     prisma/seeds/inspect-clinic-tenancy.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  const [clinicCount, childTotal, childUnowned, tTotal, tUnowned] = await Promise.all([
    prisma.clinic.count(),
    prisma.child.count(),
    prisma.child.count({ where: { clinicId: null } }),
    prisma.therapistProfile.count(),
    prisma.therapistProfile.count({ where: { clinicId: null } }),
  ]);

  console.log('\n============ TENANCY INSPECTION (read-only) ============\n');
  console.log(`clinics:    ${clinicCount}`);
  console.log(`children:   ${childUnowned}/${childTotal} unowned`);
  console.log(`therapists: ${tUnowned}/${tTotal} unowned`);

  const clinics = await prisma.clinic.findMany({
    select: {
      name: true,
      complianceStatus: true,
      organizationId: true,
      admin: { select: { email: true } },
      _count: { select: { children: true, therapists: true, cases: true, bookings: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log('\n--- CLINICS ---');
  for (const c of clinics) {
    const n = c._count;
    const empty = n.children + n.therapists + n.cases + n.bookings === 0 ? '  <-- EMPTY' : '';
    console.log(
      `  ${c.name.padEnd(30)} admin=${(c.admin?.email ?? '-').padEnd(30)} ` +
        `children=${String(n.children).padStart(3)} therapists=${String(n.therapists).padStart(2)} ` +
        `cases=${String(n.cases).padStart(3)} status=${c.complianceStatus}${empty}`,
    );
  }

  // How do the unowned children break down?
  const attributable = await prisma.child.findMany({
    where: { clinicId: null, cases: { some: { clinicId: { not: null } } } },
    select: { cases: { where: { clinicId: { not: null } }, select: { clinic: { select: { name: true } } } } },
  });
  const caseNoClinic = await prisma.child.count({
    where: {
      clinicId: null,
      cases: { some: {} },
      NOT: { cases: { some: { clinicId: { not: null } } } },
    },
  });
  const b2c = await prisma.child.count({ where: { clinicId: null, cases: { none: {} } } });

  const byClinic: Record<string, number> = {};
  for (const c of attributable) {
    const n = c.cases[0]?.clinic?.name ?? '?';
    byClinic[n] = (byClinic[n] ?? 0) + 1;
  }

  console.log('\n--- UNOWNED CHILDREN, BROKEN DOWN ---');
  console.log(`  auto-attributable via their case's clinic: ${attributable.length}`);
  for (const [name, n] of Object.entries(byClinic)) console.log(`      -> ${name}: ${n}`);
  console.log(`  has case(s) but NO clinic on any case:      ${caseNoClinic}   <-- needs a human decision`);
  console.log(`  no case at all (B2C parent-only):           ${b2c}   <-- CORRECT to leave unowned`);

  // Orphan therapists: can any be attributed?
  const orphanTs = await prisma.therapistProfile.findMany({
    where: { clinicId: null },
    select: {
      user: { select: { email: true, role: true } },
      primaryCases: { select: { clinic: { select: { name: true } } } },
    },
  });
  console.log('\n--- THERAPISTS WITH NO CLINIC ---');
  if (!orphanTs.length) console.log('  (none)');
  for (const t of orphanTs) {
    const cl = [...new Set(t.primaryCases.map((c) => c.clinic?.name).filter(Boolean))];
    console.log(
      `  ${(t.user?.email ?? '-').padEnd(34)} role=${String(t.user?.role).padEnd(10)} ` +
        `cases=${String(t.primaryCases.length).padStart(2)} -> ${cl.length ? cl.join(', ') : 'NO SIGNAL — needs placement'}`,
    );
  }

  // ADMIN users who own no clinic would 403 on web-admin under fail-closed scoping.
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { email: true, adminOfClinic: { select: { name: true } } },
  });
  console.log('\n--- ADMIN USERS (403 on web-admin if no clinic) ---');
  for (const a of admins) {
    console.log(
      `  ${a.email.padEnd(34)} clinic=${a.adminOfClinic?.name ?? '*** NONE -> would 403 ***'}`,
    );
  }

  console.log('\n=======================================================\n');
  await prisma.$disconnect();
})();
