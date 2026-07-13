/**
 * Phase E backfill: CaseConsent -> ChildConsent.
 *
 * ADDITIVE — `case_consents` is untouched and stays authoritative until its readers
 * migrate. Each row is projected onto the child + facility it actually concerned:
 *
 *   CaseConsent.caseId -> case.childId          (the child it was always about)
 *   CaseConsent.caseId -> case.clinicId         (the facility it was granted to;
 *                                                Facility.id = Clinic.id)
 *   + the matching ChildAffiliation, where one exists
 *
 * `migratedFromCaseConsentId` records provenance and makes the job idempotent.
 *
 * A consent whose case has no clinic cannot be attributed to a facility — it is
 * carried over with a null facilityId and REPORTED, not guessed. A consent
 * misattributed to the wrong facility is worse than one that is missing: it would
 * silently authorise a facility the guardian never agreed to.
 *
 * Usage (from apps/api):
 *   DATABASE_URL="<url>" node_modules/.bin/ts-node --transpile-only \
 *     prisma/seeds/backfill-consents.ts [--dry-run]
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY = process.argv.includes('--dry-run');

const log = (s = '') => console.log(s);

async function main() {
  log(`\n=== backfill-consents ${DRY ? '(DRY RUN)' : ''} ===\n`);

  const caseConsents = await prisma.caseConsent.findMany({
    select: {
      id: true,
      type: true,
      grantedById: true,
      grantedByGuardianId: true,
      consentVersionId: true,
      purpose: true,
      recipient: true,
      scope: true,
      validFrom: true,
      validUntil: true,
      revokedAt: true,
      notes: true,
      caseId: true,
      case: { select: { childId: true, clinicId: true } },
    },
  });

  log(`case_consents: ${caseConsents.length}`);

  let created = 0;
  let skipped = 0;
  let unattributed = 0;

  for (const cc of caseConsents) {
    const existing = await prisma.childConsent.findUnique({
      where: { migratedFromCaseConsentId: cc.id },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const childId = cc.case.childId;
    const facilityId = cc.case.clinicId; // Facility.id = Clinic.id

    if (!facilityId) {
      unattributed++;
      log(`  ! consent ${cc.id.slice(0, 8)} (${cc.type}) — case has no clinic; carried over unattributed`);
    }

    // Link to the live affiliation, when one exists.
    const affiliation = facilityId
      ? await prisma.childAffiliation.findFirst({
          where: { childId, facilityId, endedAt: null },
          select: { id: true },
        })
      : null;

    if (!DRY) {
      await prisma.childConsent.create({
        data: {
          childId,
          facilityId,
          affiliationId: affiliation?.id ?? null,
          caseId: cc.caseId,
          guardianId: cc.grantedByGuardianId,
          grantedById: cc.grantedById,
          type: cc.type,
          purpose: cc.purpose,
          recipient: cc.recipient,
          scope: cc.scope ?? undefined,
          consentVersionId: cc.consentVersionId,
          validFrom: cc.validFrom,
          validUntil: cc.validUntil,
          revokedAt: cc.revokedAt,
          notes: cc.notes,
          migratedFromCaseConsentId: cc.id,
        },
      });
    }
    created++;
  }

  log(`\n  created:      ${created}`);
  log(`  already done: ${skipped}`);
  if (unattributed) {
    log(`  UNATTRIBUTED: ${unattributed}  <- case had no clinic; facilityId is null.`);
    log(`                These grant nothing until a facility is set. Do NOT guess one.`);
  }

  // ── reconcile ───────────────────────────────────────────────────────────
  const [ccTotal, childTotal] = await Promise.all([
    prisma.caseConsent.count(),
    prisma.childConsent.count({ where: { migratedFromCaseConsentId: { not: null } } }),
  ]);

  log(`\n  reconcile: ${ccTotal} case_consents -> ${childTotal} migrated child_consents`);
  if (!DRY && ccTotal !== childTotal) {
    throw new Error('Reconciliation failed — counts do not match.');
  }
  log('');
}

main()
  .catch((e) => {
    console.error('\nBACKFILL FAILED:', e.message, '\n');
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
