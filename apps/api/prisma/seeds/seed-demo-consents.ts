/**
 * Grant consent for SYNTHETIC children only, so the demo keeps working now that the
 * consent gate is enforced.
 *
 * ⚠️ THE WHOLE POINT OF THIS SCRIPT IS WHAT IT REFUSES TO DO.
 *
 * A consent record asserts that a named human agreed to something. For a seeded
 * account (`parent@upllyft.demo`, `walkin.*@ancc.internal`) there is no human behind
 * the name, so writing one is just seeding.
 *
 * For a REAL guardian — a tester who signed up with their own email and entered their
 * own child — it is a false statement about a real person, and it also defeats the
 * gate: if every child has a consent row, `hasConsent()` returns true for everyone and
 * the gate protects nobody. Those families grant consent themselves, via
 * POST /child-consent/grant. That is one tap, and it is the flow that most needs
 * testing before a nursery's procurement review ever sees it.
 *
 * So: synthetic accounts are seeded. Real accounts are listed and left alone.
 *
 *   DATABASE_URL="<url>" node_modules/.bin/ts-node --transpile-only \
 *     prisma/seeds/seed-demo-consents.ts [--dry-run]
 */
import { PrismaClient, ConsentType } from '@prisma/client';
import { grantConsent } from '../../src/common/consent';

const prisma = new PrismaClient();
const DRY = process.argv.includes('--dry-run');

/** No human behind these. Anything else is a real person. */
const SYNTHETIC = [/@upllyft\.demo$/i, /@ancc\.internal$/i, /@(test|example)\.com$/i];
const isSynthetic = (email: string) => SYNTHETIC.some((re) => re.test(email));

const TYPES: ConsentType[] = [
  ConsentType.ASSESSMENT,
  ConsentType.TREATMENT,
  ConsentType.REPORT_SHARING,
  ConsentType.DATA_PROCESSING,
];

async function main() {
  console.log(`\n=== seed-demo-consents ${DRY ? '(DRY RUN)' : ''} ===`);
  console.log('    synthetic accounts only — real guardians consent for themselves\n');

  const affiliations = await prisma.childAffiliation.findMany({
    where: { status: 'ACTIVE', endedAt: null },
    select: {
      childId: true,
      facilityId: true,
      child: {
        select: {
          firstName: true,
          profile: { select: { userId: true, user: { select: { email: true } } } },
        },
      },
      facility: { select: { name: true } },
    },
  });

  let seeded = 0;
  const realFamilies: string[] = [];

  for (const a of affiliations) {
    const email = a.child.profile?.user?.email ?? '';
    const guardianUserId = a.child.profile?.userId;
    if (!guardianUserId) continue;

    if (!isSynthetic(email)) {
      realFamilies.push(`${a.child.firstName.padEnd(16)} ${email}`);
      continue;
    }

    for (const type of TYPES) {
      if (!DRY) {
        await grantConsent(prisma, {
          childId: a.childId,
          facilityId: a.facilityId,
          type,
          purpose: 'Seeded for demo — synthetic account, no human data subject',
          grantedByUserId: guardianUserId,
        });
      }
    }
    console.log(`  seeded   ${a.child.firstName.padEnd(16)} -> ${a.facility.name}`);
    seeded++;
  }

  if (realFamilies.length) {
    console.log(`\n  LEFT ALONE — real guardians (${realFamilies.length}):`);
    for (const r of realFamilies) console.log(`    ${r}`);
    console.log(`\n  These families grant consent themselves: POST /child-consent/grant`);
    console.log(`  Until they do, their record is locked to the facility — which is the`);
    console.log(`  gate working, and the flow that needs testing.`);
  }

  const total = await prisma.childConsent.count({ where: { revokedAt: null } });
  console.log(`\n  synthetic children seeded: ${seeded}`);
  console.log(`  active consents now: ${total}\n`);
}

main()
  .catch((e) => {
    console.error('\nFAILED:', e.message, '\n');
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
