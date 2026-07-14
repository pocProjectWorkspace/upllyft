/**
 * Backfill CaseTherapist.permissions.
 *
 * `clinic-patients.assignTherapist` created CaseTherapist rows with NO permissions
 * — an empty `{}`. CaseAccessGuard falls through to `permissions.canEdit` for anyone
 * who is not the case's `primaryTherapistId`, and `{}` means `canEdit === undefined
 * === denied`.
 *
 * Result: a therapist assigned through that path could OPEN a case but not create an
 * IEP, add a goal, or write a note. Which is exactly the tester's report: "I couldn't
 * create IEP for a new case."
 *
 * The code path is fixed; this repairs the rows it already wrote.
 *
 * Also repairs the duplicate-PRIMARY rows it created: it hardcoded `role: 'PRIMARY'`
 * for anyone joining an existing case, so cases ended up with several "PRIMARY"
 * therapists while `Case.primaryTherapistId` pointed at exactly one. The extra
 * PRIMARY rows were a lie that granted nothing — they are demoted to SECONDARY (with
 * edit rights), which is what they always actually were.
 *
 *   DATABASE_URL="<url>" node_modules/.bin/ts-node --transpile-only \
 *     prisma/seeds/backfill-case-therapist-permissions.ts [--dry-run]
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY = process.argv.includes('--dry-run');

const FULL = { canEdit: true, canViewNotes: true, canManageGoals: true };

async function main() {
  console.log(`\n=== backfill-case-therapist-permissions ${DRY ? '(DRY RUN)' : ''} ===\n`);

  const rows = await prisma.caseTherapist.findMany({
    where: { removedAt: null },
    select: {
      id: true,
      role: true,
      permissions: true,
      therapistId: true,
      case: { select: { caseNumber: true, primaryTherapistId: true } },
      therapist: { select: { user: { select: { email: true } } } },
    },
  });

  let fixedPerms = 0;
  let fixedRole = 0;

  for (const r of rows) {
    const perms = (r.permissions as Record<string, unknown> | null) ?? {};
    const isRealPrimary = r.case.primaryTherapistId === r.therapistId;
    const email = r.therapist?.user?.email ?? '?';

    const needsPerms = perms.canEdit === undefined;
    // A "PRIMARY" row that is not the case's actual primary is a lie.
    const needsRole = r.role === 'PRIMARY' && !isRealPrimary;

    if (!needsPerms && !needsRole) continue;

    const parts: string[] = [];
    if (needsPerms) parts.push('permissions={} -> full');
    if (needsRole) parts.push('role PRIMARY -> SECONDARY (not the case primary)');

    console.log(`  ${r.case.caseNumber}  ${email.padEnd(26)} ${parts.join('; ')}`);

    if (!DRY) {
      await prisma.caseTherapist.update({
        where: { id: r.id },
        data: {
          ...(needsPerms ? { permissions: FULL } : {}),
          ...(needsRole ? { role: 'SECONDARY' as const } : {}),
        },
      });
    }
    if (needsPerms) fixedPerms++;
    if (needsRole) fixedRole++;
  }

  // Nobody should be left unable to edit a case they are assigned to.
  const stillBroken = await prisma.caseTherapist.count({
    where: { removedAt: null, permissions: { equals: {} } },
  });

  console.log(`\n  permissions repaired: ${fixedPerms}`);
  console.log(`  duplicate PRIMARY demoted: ${fixedRole}`);
  console.log(`  rows still with empty permissions: ${DRY ? '(dry run)' : stillBroken}\n`);
}

main()
  .catch((e) => {
    console.error('\nFAILED:', e.message, '\n');
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
