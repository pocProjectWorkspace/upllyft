/**
 * Backfill regional fields for existing data
 * Run: npx tsx prisma/backfill-regional-fields.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Backfilling regional fields...\n');

  // ── 1. Update Starwalkers Organization ─────────────────────────────────
  const org = await prisma.organization.findUnique({ where: { slug: 'starwalkers' } });
  if (org) {
    await prisma.organization.update({
      where: { id: org.id },
      data: { region: 'AE' },
    });
    console.log('Organization "Starwalkers" -> region: AE');
  }

  // ── 2. Update all clinics linked to Starwalkers (or any existing clinics) ──
  const clinics = await prisma.clinic.findMany({
    include: {
      therapists: { select: { specializations: true } },
    },
  });

  for (const clinic of clinics) {
    // Collect all unique specializations from the clinic's therapists
    const allSpecs = [...new Set(clinic.therapists.flatMap((t) => t.specializations))];

    await prisma.clinic.update({
      where: { id: clinic.id },
      data: {
        country: 'AE',
        isPublic: true,
        specializations: allSpecs,
        description: clinic.description || `${clinic.name} — a leading pediatric therapy center providing comprehensive developmental care.`,
      },
    });
    console.log(`Clinic "${clinic.name}" -> country: AE, specializations: [${allSpecs.join(', ')}]`);
  }

  // ── 3. Update users who belong to clinics (admin + therapists) ─────────
  for (const clinic of clinics) {
    // Update clinic admin
    await prisma.user.update({
      where: { id: clinic.adminId },
      data: { country: 'AE' },
    });
    console.log(`Clinic admin (${clinic.adminId}) -> country: AE`);

    // Update therapists in this clinic
    const therapists = await prisma.therapistProfile.findMany({
      where: { clinicId: clinic.id },
      select: { userId: true },
    });
    for (const t of therapists) {
      await prisma.user.update({
        where: { id: t.userId },
        data: { country: 'AE' },
      });
    }
    console.log(`  ${therapists.length} therapists -> country: AE`);
  }

  // ── 4. Summary of existing users without country ───────────────────────
  const usersWithoutCountry = await prisma.user.count({ where: { country: null } });
  console.log(`\n${usersWithoutCountry} users still have no country set.`);
  console.log('These users will see the region picker when they next visit web-booking.');

  console.log('\nBackfill complete.');
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
