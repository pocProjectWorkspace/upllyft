/**
 * Phase C backfill: project the existing Clinic world onto the Facility model.
 *
 * ADDITIVE — nothing is deleted or repointed. `clinics` stays authoritative until
 * readers are migrated (Phase D). Each Clinic gets a Facility with the SAME id, so
 * foreign keys can later be repointed without rewriting a single id.
 *
 *   Clinic                  -> Facility(type: CLINIC, id = clinic.id)
 *   Clinic.adminId          -> FacilityMember(OWNER)
 *   TherapistProfile.clinicId -> FacilityMember(THERAPIST)
 *   Child.clinicId          -> ChildAffiliation(PATIENT, ACTIVE, FULL_CLINICAL)
 *
 * Children with NO clinicId are B2C (parent-only) and get NO affiliation. That is
 * correct: they have never engaged a facility. Do not sweep them in.
 *
 * Facility.organizationId is REQUIRED (every facility belongs to an account), but
 * some clinics have none — those get an Organization created for them.
 *
 * Usage (from apps/api):
 *   DATABASE_URL="<url>" node_modules/.bin/ts-node --transpile-only \
 *     prisma/seeds/backfill-facilities.ts [--dry-run]
 *
 * Idempotent. Re-running is a clean no-op.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY = process.argv.includes('--dry-run');

const log = (s = '') => console.log(s);
const act = (s: string) => log(`  ${DRY ? '[dry-run] would' : 'DID:'} ${s}`);

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'facility';

/** Facility.slug is unique — de-duplicate against what already exists. */
async function uniqueSlug(base: string, selfId: string): Promise<string> {
  let slug = base;
  for (let n = 2; ; n++) {
    const clash = await prisma.facility.findUnique({ where: { slug }, select: { id: true } });
    if (!clash || clash.id === selfId) return slug;
    slug = `${base}-${n}`;
  }
}

async function main() {
  log(`\n=== backfill-facilities ${DRY ? '(DRY RUN)' : ''} ===`);

  const clinics = await prisma.clinic.findMany({
    select: {
      id: true,
      name: true,
      adminId: true,
      organizationId: true,
      licenseNo: true,
      licenseAuthority: true,
      emirate: true,
      complianceStatus: true,
      logoUrl: true,
      primaryColor: true,
      address: true,
      phone: true,
      email: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  log(`\n[1] clinics -> facilities  (${clinics.length} clinics)`);

  for (const c of clinics) {
    const existing = await prisma.facility.findUnique({
      where: { id: c.id },
      select: { id: true },
    });

    if (existing) {
      // MUST short-circuit before the org block below. Creating the org first
      // would mint a fresh Organization on EVERY re-run (clinic.organizationId is
      // never written back, so the "clinic had none" branch stays true forever)
      // and quietly accumulate orphan orgs.
      log(`  "${c.name}" — facility exists, skipping`);
    } else {
      // Every facility belongs to an account. Clinics predate that rule, so a
      // clinic without an organization gets one.
      let organizationId = c.organizationId;
      if (!organizationId) {
        const base = slugify(`${c.name}-org`);
        let orgSlug = base;
        for (let n = 2; ; n++) {
          const clash = await prisma.organization.findUnique({
            where: { slug: orgSlug },
            select: { id: true },
          });
          if (!clash) break;
          orgSlug = `${base}-${n}`;
        }

        act(`create Organization "${c.name}" (clinic had none)`);
        if (!DRY) {
          const org = await prisma.organization.create({
            data: { name: c.name, slug: orgSlug, kind: 'CLINIC_GROUP' },
            select: { id: true },
          });
          organizationId = org.id;
        }
      }

      const slug = await uniqueSlug(slugify(c.name), c.id);
      act(`Facility "${c.name}" (id preserved: ${c.id.slice(0, 10)}…, slug ${slug})`);
      if (!DRY && organizationId) {
        await prisma.facility.create({
          data: {
            id: c.id, // SAME id — lets Phase D repoint FKs without rewriting ids
            organizationId,
            type: 'CLINIC',
            name: c.name,
            slug,
            licenseNo: c.licenseNo,
            licenseAuthority: c.licenseAuthority,
            emirate: c.emirate,
            complianceStatus: c.complianceStatus,
            logoUrl: c.logoUrl,
            primaryColor: c.primaryColor,
            address: c.address,
            phone: c.phone,
            email: c.email,
            migratedFromClinicId: c.id,
          },
        });
      }
    }

    // adminId -> OWNER (upsert: no-op once present)
    const hadOwner = await prisma.facilityMember.findUnique({
      where: { userId_facilityId: { userId: c.adminId, facilityId: c.id } },
      select: { id: true },
    });
    if (!hadOwner) {
      act(`FacilityMember(OWNER) for clinic admin`);
      if (!DRY && (existing || !DRY)) {
        await prisma.facilityMember.upsert({
          where: { userId_facilityId: { userId: c.adminId, facilityId: c.id } },
          create: { facilityId: c.id, userId: c.adminId, role: 'OWNER', status: 'ACTIVE' },
          update: {},
        });
      }
    }
  }

  // ── therapists ────────────────────────────────────────────────────────────
  log('\n[2] therapist profiles -> facility members');
  const therapists = await prisma.therapistProfile.findMany({
    where: { clinicId: { not: null } },
    select: { clinicId: true, userId: true, user: { select: { email: true } } },
  });

  let therapistsAdded = 0;
  for (const t of therapists) {
    const already = await prisma.facilityMember.findUnique({
      where: { userId_facilityId: { userId: t.userId, facilityId: t.clinicId! } },
      select: { id: true },
    });
    if (already) continue; // also protects an OWNER from being downgraded to THERAPIST

    act(`FacilityMember(THERAPIST) ${t.user?.email}`);
    therapistsAdded++;
    if (!DRY) {
      await prisma.facilityMember.create({
        data: {
          facilityId: t.clinicId!,
          userId: t.userId,
          role: 'THERAPIST',
          status: 'ACTIVE',
        },
      });
    }
  }
  if (!therapists.length) log('  (none)');
  else if (!therapistsAdded) log('  (all already members)');

  // ── children ──────────────────────────────────────────────────────────────
  log('\n[3] children -> affiliations');
  const children = await prisma.child.findMany({
    where: { clinicId: { not: null } },
    select: { id: true, clinicId: true },
  });

  let created = 0;
  for (const child of children) {
    const existing = await prisma.childAffiliation.findFirst({
      where: { childId: child.id, facilityId: child.clinicId!, endedAt: null },
      select: { id: true },
    });
    if (existing) continue;

    if (!DRY) {
      await prisma.childAffiliation.create({
        data: {
          childId: child.id,
          facilityId: child.clinicId!,
          type: 'PATIENT',
          status: 'ACTIVE',
          dataScope: 'FULL_CLINICAL', // clinic default; a nursery would be OBSERVATIONS_ONLY
        },
      });
    }
    created++;
  }
  act(`${created} ChildAffiliation(PATIENT, ACTIVE, FULL_CLINICAL)`);

  // ── reconcile ─────────────────────────────────────────────────────────────
  log('\n[4] reconciliation');
  const [clinicCount, facilityCount, clinicChildren, affiliated, b2c] = await Promise.all([
    prisma.clinic.count(),
    prisma.facility.count({ where: { type: 'CLINIC' } }),
    prisma.child.count({ where: { clinicId: { not: null } } }),
    prisma.childAffiliation.count({ where: { type: 'PATIENT', status: 'ACTIVE' } }),
    prisma.child.count({ where: { clinicId: null } }),
  ]);

  const ok = (n: string, a: number, b: number) =>
    log(`  ${a === b ? 'OK  ' : 'MISMATCH'} ${n}: ${a} vs ${b}`);

  ok('clinics -> CLINIC facilities', clinicCount, facilityCount);
  ok('children with clinicId -> PATIENT affiliations', clinicChildren, affiliated);
  log(`  ---  B2C children (no clinic, no affiliation): ${b2c}  <- CORRECT, leave alone`);

  if (!DRY && (clinicCount !== facilityCount || clinicChildren !== affiliated)) {
    throw new Error('Reconciliation failed — counts do not match. Investigate before Phase D.');
  }

  log('');
}

main()
  .catch((e) => {
    console.error('\nBACKFILL FAILED:', e.message, '\n');
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
