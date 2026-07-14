/**
 * READ-ONLY audit of shadow guardian accounts. Performs no writes.
 *
 * A "shadow" user is one created on a guardian's behalf by staff (walk-in intake,
 * and — once F3 lands — nursery rostering): `password: null`, `googleId: null`.
 * They cannot log in (validateUser returns null on !password) and cannot register
 * (register throws ConflictException on an existing email). The ONLY way in is a
 * password reset, which forgotPassword will happily issue for a passwordless
 * account — but nobody tells the guardian that, because they don't know the
 * account exists. That is the trap this audit sizes.
 *
 * Two populations, with very different meanings:
 *
 *   REACHABLE  — real email. A human is behind this address. They can recover via
 *                forgot-password but have no way to know they should. These are
 *                the ones that need telling, and the ones a fix must unblock.
 *   UNREACHABLE — synthetic email (@ancc.internal). No human behind the name;
 *                the address routes nowhere. Nothing to notify, nothing to fix.
 *
 * Emails are MASKED by default. These are parents' personal addresses, which is
 * more than the staff emails inspect-clinic-tenancy.ts prints. Pass --show-emails
 * only when you actually intend to contact them. Child names are never printed.
 *
 *   DATABASE_URL="<url>" node_modules/.bin/ts-node --transpile-only \
 *     prisma/seeds/audit-shadow-guardians.ts [--show-emails]
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SHOW_EMAILS = process.argv.includes('--show-emails');

/** Addresses the platform mints for itself — no human is behind them. */
const SYNTHETIC_DOMAINS = ['@ancc.internal', '@upllyft.demo'];
const isSynthetic = (email: string) => SYNTHETIC_DOMAINS.some(d => email.endsWith(d));

function mask(email: string): string {
  if (SHOW_EMAILS || isSynthetic(email)) return email;
  const [local, domain] = email.split('@');
  const head = local.slice(0, 2);
  return `${head}${'*'.repeat(Math.max(local.length - 2, 3))}@${domain ?? '?'}`;
}

(async () => {
  const shadows = await prisma.user.findMany({
    where: { password: null, googleId: null },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      isEmailVerified: true,
      resetPasswordToken: true,
      userProfile: {
        select: {
          children: {
            select: { id: true, walkinCreatedByAdmin: true, clinicId: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const withChildren = shadows.filter(s => (s.userProfile?.children.length ?? 0) > 0);
  const reachable = withChildren.filter(s => !isSynthetic(s.email));
  const unreachable = withChildren.filter(s => isSynthetic(s.email));
  const childless = shadows.filter(s => (s.userProfile?.children.length ?? 0) === 0);

  console.log('\n========== SHADOW GUARDIAN AUDIT (read-only) ==========\n');
  console.log(`passwordless, non-OAuth users:     ${shadows.length}`);
  console.log(`  ...holding >=1 child:            ${withChildren.length}`);
  console.log(`     REACHABLE  (real email):      ${reachable.length}   <-- a human is locked out of a UX dead end`);
  console.log(`     UNREACHABLE (synthetic):      ${unreachable.length}   <-- no human; nothing to notify`);
  console.log(`  ...holding no child:             ${childless.length}`);

  const totalUsers = await prisma.user.count();
  const oauthOnly = await prisma.user.count({ where: { password: null, NOT: { googleId: null } } });
  console.log(`\n(context: ${totalUsers} users total; ${oauthOnly} are OAuth-only and are NOT affected)`);

  if (reachable.length) {
    console.log('\n--- REACHABLE shadow guardians (real people) ---');
    for (const s of reachable) {
      const kids = s.userProfile?.children ?? [];
      const walkins = kids.filter(k => k.walkinCreatedByAdmin).length;
      console.log(
        `  ${mask(s.email).padEnd(34)} ${kids.length} child(ren)` +
          `${walkins ? `, ${walkins} walk-in-created` : ''}` +
          `  created ${s.createdAt.toISOString().slice(0, 10)}` +
          `${s.resetPasswordToken ? '  [reset pending]' : ''}`,
      );
    }
    console.log(
      '\n  These accounts can ONLY be entered via forgot-password. The guardian has\n' +
        '  no way to discover that. Fix = let them in, or re-home the child under an\n' +
        '  account they knowingly create.',
    );
  }

  if (unreachable.length) {
    console.log('\n--- UNREACHABLE shadow guardians (synthetic, no human) ---');
    for (const s of unreachable) {
      console.log(`  ${s.email.padEnd(34)} ${s.userProfile?.children.length} child(ren)`);
    }
  }

  // Walk-in children whose guardian somehow DOES have a password — i.e. already
  // resolved. Useful as a denominator: has anyone ever escaped this state?
  const walkinTotal = await prisma.child.count({ where: { walkinCreatedByAdmin: true } });
  const walkinEscaped = await prisma.child.count({
    where: { walkinCreatedByAdmin: true, profile: { user: { NOT: { password: null } } } },
  });
  console.log(
    `\nwalk-in-created children: ${walkinTotal} total, ${walkinEscaped} whose guardian now has a password`,
  );

  console.log('\n=======================================================\n');
  await prisma.$disconnect();
})().catch(async e => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
