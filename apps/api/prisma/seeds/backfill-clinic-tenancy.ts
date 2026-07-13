/**
 * Backfill: give clinic-owned data an explicit tenant.
 *
 * Context — clinic-scoped endpoints used to fail OPEN: `req.user.clinicId` was
 * never populated (JwtStrategy dropped the claim), so `...(clinicId ? {clinicId} : {})`
 * degraded into a platform-wide read. Scoping is now fail-CLOSED, so anything
 * without a clinicId is invisible to clinic surfaces. This attaches the data that
 * legitimately belongs to a clinic.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 *   Children with NO case are B2C (parent-only) users. They have never engaged a
 *   clinic and MUST stay unowned. A clinic dashboard listing them would be the bug,
 *   not the fix. Do not sweep them into a clinic.
 *
 * ATTRIBUTION RULE (evidence-based, never guessed)
 *   child.clinicId := the clinic of the child's case, where the case's clinic is
 *   either its own `clinicId` or, failing that, its primary therapist's clinic.
 *   If a child's cases disagree, it is SKIPPED and reported — misattributing a
 *   child IS a cross-tenant leak, just pointing the other way.
 *
 * Environments differ and MUST NOT be assumed. Run `inspect-clinic-tenancy.ts`
 * first. (dev had 5 clinics and 64 children; prod had 0 clinics and 24.)
 *
 * Usage (from apps/api):
 *   DATABASE_URL="<url>" node_modules/.bin/ts-node --transpile-only \
 *     prisma/seeds/backfill-clinic-tenancy.ts --env=prod [--dry-run]
 *
 * Idempotent. Re-running is a clean no-op.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DRY = process.argv.includes('--dry-run');
const ENV = (process.argv.find((a) => a.startsWith('--env='))?.split('=')[1] ?? '') as
  | 'dev'
  | 'prod'
  | '';

interface ClinicSpec {
  name: string;
  adminEmail: string;
  /** Attach to an existing Organization by slug, if present. */
  orgSlug?: string;
  therapistEmails: string[];
}

interface Plan {
  clinics: ClinicSpec[];
  /** Promote these users to SUPERADMIN (platform-wide scope). */
  promoteToSuperadmin?: string[];
  /** Delete these clinics — ONLY if still completely empty at run time. */
  deleteIfEmpty?: { name: string; adminEmail: string }[];
}

const PLANS: Record<'dev' | 'prod', Plan> = {
  // dev already had real clinics; this only places the strays.
  dev: {
    clinics: [
      {
        name: 'Upllyft Demo Clinic',
        adminEmail: 'admin@upllyft.demo',
        therapistEmails: ['therapist@upllyft.demo', 'therapist2@upllyft.demo'],
      },
      {
        name: 'Wings Rehabilitation - Dubai',
        adminEmail: 'dr.singh@therapy.com',
        therapistEmails: ['dr.singh@therapy.com'],
      },
      {
        name: 'Al Noor Community Clinic',
        adminEmail: 'admin@ancc.ae',
        therapistEmails: ['dr.nair@therapy.com', 'dr.verma@therapy.com', 'dr.reddy@therapy.com'],
      },
    ],
    deleteIfEmpty: [
      { name: 'Starwalkers - Dubai', adminEmail: 'dr.meena@therapy.com' },
      { name: 'Wings - dubai Branch', adminEmail: 'ali.ahmed@starwalkers.com' },
    ],
  },

  // prod had ZERO clinics — both are created here.
  prod: {
    clinics: [
      {
        name: 'Upllyft Clinic',
        adminEmail: 'admin@upllyft.com',
        therapistEmails: [
          'dr.meena@therapy.com',
          'dr.singh@therapy.com',
          'dr.nair@therapy.com',
          'dr.verma@therapy.com',
          'dr.reddy@therapy.com',
        ],
      },
      {
        name: 'Upllyft Demo Clinic',
        adminEmail: 'admin@upllyft.demo',
        orgSlug: 'upllyft-demo-clinic', // org of this name already exists in prod
        therapistEmails: ['therapist@upllyft.demo', 'therapist2@upllyft.demo'],
      },
    ],
    promoteToSuperadmin: ['admin@upllyft.com'],
  },
};

const log = (s = '') => console.log(s);
const act = (s: string) => log(`  ${DRY ? '[dry-run] would' : 'DID:'} ${s}`);

async function main() {
  if (ENV !== 'dev' && ENV !== 'prod') {
    throw new Error('Pass --env=dev or --env=prod. Refusing to guess the environment.');
  }
  const plan = PLANS[ENV];

  log(`\n=== backfill-clinic-tenancy  env=${ENV} ${DRY ? '(DRY RUN)' : ''} ===`);

  // ── 1. Clinics + their staff ──────────────────────────────────────────────
  //
  // In --dry-run the clinics aren't really created, so the therapist->clinic links
  // stage [2] depends on don't exist yet. We record the links this run WOULD make
  // in `projected` and let stage [2] read through it, so a dry run reports the true
  // outcome instead of a misleading zero.
  const projected = new Map<string, string>(); // therapistProfileId -> clinic label

  log('\n[1] clinics and staff');
  for (const spec of plan.clinics) {
    const admin = await prisma.user.findUnique({
      where: { email: spec.adminEmail },
      select: { id: true, adminOfClinic: { select: { id: true, name: true } } },
    });
    if (!admin) {
      log(`  SKIP "${spec.name}" — admin ${spec.adminEmail} not found`);
      continue;
    }

    // Clinic.adminId is @unique, so the admin is the natural idempotency key.
    let clinicId = admin.adminOfClinic?.id ?? null;

    if (clinicId) {
      log(`  "${admin.adminOfClinic!.name}" exists (admin ${spec.adminEmail})`);
    } else {
      const org = spec.orgSlug
        ? await prisma.organization.findUnique({
            where: { slug: spec.orgSlug },
            select: { id: true },
          })
        : null;
      if (spec.orgSlug && !org) log(`  (org "${spec.orgSlug}" not found — creating clinic without it)`);

      act(`create clinic "${spec.name}" (admin ${spec.adminEmail}${org ? `, org ${spec.orgSlug}` : ''})`);
      if (!DRY) {
        const created = await prisma.clinic.create({
          data: {
            name: spec.name,
            adminId: admin.id,
            organizationId: org?.id ?? null,
            complianceStatus: 'ACTIVE', // case creation is gated on ACTIVE
          },
          select: { id: true },
        });
        clinicId = created.id;
      }
    }

    for (const email of spec.therapistEmails) {
      const t = await prisma.therapistProfile.findFirst({
        where: { user: { email }, clinicId: null },
        select: { id: true },
      });
      if (!t) {
        log(`    ${email} — already has a clinic, or no therapist profile`);
        continue;
      }
      act(`attach therapist ${email} -> ${spec.name}`);
      projected.set(t.id, clinicId ?? `(pending) ${spec.name}`);
      if (!DRY && clinicId) {
        await prisma.therapistProfile.update({ where: { id: t.id }, data: { clinicId } });
      }
    }
  }

  // ── 2. Attribute cases + children by evidence ─────────────────────────────
  log('\n[2] attribute cases + children');

  /** The clinic a case belongs to: its own, else its primary therapist's (incl. links stage [1] just made). */
  const clinicOfCase = (c: {
    clinicId: string | null;
    primaryTherapist: { id: string; clinicId: string | null } | null;
  }): string | null => {
    if (c.clinicId) return c.clinicId;
    const t = c.primaryTherapist;
    if (!t) return null;
    return t.clinicId ?? projected.get(t.id) ?? null;
  };

  const orphanCases = await prisma.case.findMany({
    where: { clinicId: null },
    select: {
      id: true,
      caseNumber: true,
      primaryTherapist: { select: { id: true, clinicId: true } },
    },
  });

  let casesFixed = 0;
  for (const c of orphanCases) {
    const clinicId = clinicOfCase({ clinicId: null, primaryTherapist: c.primaryTherapist });
    if (!clinicId) {
      log(`  SKIP case ${c.caseNumber} — primary therapist has no clinic`);
      continue;
    }
    act(`case ${c.caseNumber} -> ${clinicId.startsWith('(pending)') ? clinicId : clinicId.slice(0, 10) + '…'}`);
    if (!DRY) await prisma.case.update({ where: { id: c.id }, data: { clinicId } });
    casesFixed++;
  }
  if (!orphanCases.length) log('  (no unattached cases)');

  // Children follow their case(s) — but only if the cases agree.
  const orphanChildren = await prisma.child.findMany({
    where: { clinicId: null, cases: { some: {} } },
    select: {
      id: true,
      cases: {
        select: { clinicId: true, primaryTherapist: { select: { id: true, clinicId: true } } },
      },
    },
  });

  let childrenFixed = 0;
  let ambiguous = 0;
  for (const child of orphanChildren) {
    const clinicIds = [...new Set(child.cases.map(clinicOfCase).filter((x): x is string => !!x))];
    if (clinicIds.length === 0) continue;
    if (clinicIds.length > 1) {
      ambiguous++;
      log(`  SKIP child ${child.id.slice(0, 10)}… — cases span ${clinicIds.length} clinics; assign manually`);
      continue;
    }
    if (!DRY) await prisma.child.update({ where: { id: child.id }, data: { clinicId: clinicIds[0] } });
    childrenFixed++;
  }
  act(`attribute ${casesFixed} cases and ${childrenFixed} children (${ambiguous} ambiguous, skipped)`);

  // ── 3. Role promotions ────────────────────────────────────────────────────
  if (plan.promoteToSuperadmin?.length) {
    log('\n[3] role promotions');
    for (const email of plan.promoteToSuperadmin) {
      const u = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
      if (!u) {
        log(`  SKIP ${email} — not found`);
        continue;
      }
      if (u.role === 'SUPERADMIN') {
        log(`  ${email} — already SUPERADMIN`);
        continue;
      }
      act(`promote ${email}: ${u.role} -> SUPERADMIN (platform-wide scope)`);
      if (!DRY) await prisma.user.update({ where: { id: u.id }, data: { role: 'SUPERADMIN' } });
    }
  }

  // ── 4. Delete empty duplicate clinics ─────────────────────────────────────
  if (plan.deleteIfEmpty?.length) {
    log('\n[4] empty duplicate clinics');
    for (const target of plan.deleteIfEmpty) {
      const clinic = await prisma.clinic.findFirst({
        where: { name: target.name, admin: { email: target.adminEmail } },
        select: {
          id: true,
          name: true,
          _count: { select: { children: true, therapists: true, cases: true, bookings: true } },
        },
      });
      if (!clinic) {
        log(`  "${target.name}" — not found (already removed?)`);
        continue;
      }
      const n = clinic._count;
      const total = n.children + n.therapists + n.cases + n.bookings;
      if (total > 0) {
        // Re-checked at run time on purpose: stage [1] may have just populated it.
        log(
          `  REFUSING to delete "${clinic.name}" — no longer empty ` +
            `(children=${n.children} therapists=${n.therapists} cases=${n.cases} bookings=${n.bookings})`,
        );
        continue;
      }
      act(`DELETE empty clinic "${clinic.name}"`);
      if (!DRY) await prisma.clinic.delete({ where: { id: clinic.id } });
    }
  }

  // ── 5. What remains ───────────────────────────────────────────────────────
  log('\n[5] remaining unowned');
  const b2c = await prisma.child.count({ where: { clinicId: null, cases: { none: {} } } });
  const stillOrphanWithCase = await prisma.child.count({
    where: { clinicId: null, cases: { some: {} } },
  });
  const orphanT = await prisma.therapistProfile.count({ where: { clinicId: null } });

  log(`  B2C children (no case):            ${b2c}   <- CORRECT, leave unowned`);
  log(`  children with a case, still unowned: ${stillOrphanWithCase}   <- should be 0`);
  log(`  therapists with no clinic:          ${orphanT}   <- should be 0`);

  log(
    '\nNOTE: tenant claims are re-derived on token refresh, so existing sessions ' +
      'self-heal within ~15 min. No forced re-login.\n',
  );
}

main()
  .catch((e) => {
    console.error('\nBACKFILL FAILED:', e.message, '\n');
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
