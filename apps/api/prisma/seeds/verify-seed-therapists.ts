/**
 * Mark the SEED/DEMO therapist profiles as VERIFIED so the demo's case-assignment
 * flow keeps working now that the licence gate is enforced on both paths.
 *
 * ⚠️ THIS IS NOT A CREDENTIAL CHECK. It asserts nothing about a real licence. It
 * exists because every therapist on the demo databases is a seeded account with no
 * licence at all, and the (correct) gate would otherwise block every case.
 *
 * DO NOT run this against a database containing real practising clinicians, and do
 * not carry this pattern into go-live. Real clinicians must be verified against an
 * actual licence through PATCH /admin/therapists/:id/credentials — which is the
 * entire point of the gate.
 *
 * Only touches profiles whose user email matches a known seed domain. Anything else
 * is left PENDING on purpose.
 *
 *   DATABASE_URL="<url>" node_modules/.bin/ts-node --transpile-only \
 *     prisma/seeds/verify-seed-therapists.ts [--dry-run]
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY = process.argv.includes('--dry-run');

/** Seed/demo accounts only. A real clinician's email will not match these. */
const SEED_PATTERNS = [/@therapy\.com$/i, /@upllyft\.demo$/i];

const isSeed = (email: string) => SEED_PATTERNS.some((re) => re.test(email));

async function main() {
  console.log(`\n=== verify-seed-therapists ${DRY ? '(DRY RUN)' : ''} ===`);
  console.log('    NOT a credential check — seed/demo accounts only.\n');

  const profiles = await prisma.therapistProfile.findMany({
    select: {
      id: true,
      credentialStatus: true,
      licenceExpiry: true,
      user: { select: { email: true } },
    },
  });

  // Licence valid for a year — enough for a demo, short enough to expire loudly.
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 1);

  let verified = 0;
  let skipped = 0;

  for (const p of profiles) {
    const email = p.user?.email ?? '';

    if (!isSeed(email)) {
      console.log(`  SKIP     ${email.padEnd(34)} not a seed account — left ${p.credentialStatus}`);
      skipped++;
      continue;
    }
    if (p.credentialStatus === 'VERIFIED') {
      console.log(`  already  ${email}`);
      continue;
    }

    console.log(`  ${DRY ? 'would verify' : 'VERIFIED    '} ${email.padEnd(34)} (was ${p.credentialStatus})`);
    if (!DRY) {
      await prisma.therapistProfile.update({
        where: { id: p.id },
        data: {
          credentialStatus: 'VERIFIED',
          licenceExpiry: p.licenceExpiry ?? expiry,
          licenceNumber: p.id.slice(0, 10).toUpperCase(),
        },
      });
    }
    verified++;
  }

  const now = await prisma.therapistProfile.groupBy({
    by: ['credentialStatus'],
    _count: true,
  });
  console.log(`\n  verified: ${verified}   non-seed left alone: ${skipped}`);
  console.log(`  now: ${now.map((r) => `${r.credentialStatus}=${r._count}`).join('  ')}\n`);
}

main()
  .catch((e) => {
    console.error('\nFAILED:', e.message, '\n');
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
