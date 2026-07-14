#!/usr/bin/env node
/**
 * Guard: no NEW reads/writes of the deprecated `Child.clinicId`.
 *
 * The additive tenancy migration (docs/tenancy-and-multi-setting-model.md) has one
 * real failure mode: while both models coexist, new code reaches for the old FK
 * because it is still there and it is easier. That is how a migration stalls
 * half-done and leaves two half-models forever. This check is the thing that stops
 * it, and it is NOT optional.
 *
 * A baseline of known, allowed sites is listed below. Anything else fails.
 * To migrate a file: switch it to `childInFacility()` / `attachChildToFacility()`
 * from src/common/child-scope.ts and REMOVE it from the baseline.
 *
 * The baseline may only ever shrink. Adding to it needs a very good reason.
 *
 *   node scripts/check-no-child-clinicid.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');

/**
 * Files still permitted to touch Child.clinicId, and why.
 * REMOVE entries as they migrate. Never add without justification.
 */
const BASELINE = new Map([
  [
    'common/child-scope.ts',
    'owns the dual-write + the affiliation predicate — this is the file that ends the deprecation',
  ],
  [
    'common/tenant-scope.ts',
    'resolves the clinic scope off the JWT; the id doubles as the facilityId until Phase F',
  ],
  [
    'clinic-patients/clinic-patients.service.ts',
    'MIGRATED (D + D2) — the remaining `clinicId` is the inbound scope param name only',
  ],
  ['auth/auth.service.ts', 'mints the clinicId claim; resolves it from FacilityMember (D2)'],
  ['auth/strategies/jwt.strategy.ts', 'propagates the clinicId claim'],
  ['admin/admin.service.ts', 'platform admin: clinic CRUD + data export'],
  ['clinic/clinic.service.ts', 'Clinic entity CRUD'],
  ['clinic-tracking/clinic-tracking.service.ts', 'Booking.clinicId, not Child.clinicId'],
  ['clinic-orchestration/lead.service.ts', 'Lead.clinicId'],
  ['clinic-orchestration/triage.service.ts', 'Clinic-scoped triage queue'],
  ['clinic-orchestration/ehr-export.service.ts', 'EhrExport.clinicId'],
  ['clinic-orchestration/clinic-orchestration.controller.ts', 'passes clinic scope through'],
  ['clinic-orchestration/dto/orchestration.dto.ts', 'DTO field'],
  ['clinic-intake/consent-template.service.ts', 'ConsentTemplate.clinicId'],
  [
    'clinic-intake/case-intake.service.ts',
    'reads Case.clinicId as the FACILITY the intake consent is granted to (ids preserved)',
  ],
  ['clinic-intake/consent-template.controller.ts', 'passes clinic scope through'],
  ['clinic-intake/dto/clinic-intake.dto.ts', 'DTO field'],
  ['payer/payer.service.ts', 'InsurancePolicy/PreAuth clinic scope'],
  ['marketplace/clinic/clinic-marketplace.service.ts', 'public clinic directory'],
  ['marketplace/clinic/clinic-marketplace.controller.ts', 'public clinic directory'],
  ['case-triage/case-triage.service.ts', 'Case.clinicId'],
  ['common/guards/tenant.guard.ts', 'reads the clinicId claim'],
  ['admin/admin.controller.ts', 'passes clinic scope through'],
  // clinic-outcomes/* — MIGRATED (Phase D). Deliberately absent: it must stay clean.
]);

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) yield p;
  }
}

const offenders = [];

for (const file of walk(SRC)) {
  const rel = relative(SRC, file);
  if (BASELINE.has(rel)) continue;

  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) return;
    if (/\bclinicId\b/.test(line)) {
      offenders.push({ file: rel, line: i + 1, text: line.trim() });
    }
  });
}

if (offenders.length) {
  console.error('\n✖ New reference(s) to the deprecated `clinicId`:\n');
  for (const o of offenders) {
    console.error(`  apps/api/src/${o.file}:${o.line}`);
    console.error(`    ${o.text}\n`);
  }
  console.error('`Child.clinicId` is deprecated — a single nullable FK cannot express a child');
  console.error('who is at a nursery AND a clinic. Use src/common/child-scope.ts:');
  console.error('  reads:  childInFacility(facilityId)  /  sessionInFacility(facilityId)');
  console.error('  writes: attachChildToFacility(prisma, childId, facilityId)\n');
  console.error('See docs/tenancy-and-multi-setting-model.md.\n');
  process.exit(1);
}

console.log(`✔ no new clinicId references (${BASELINE.size} known sites baselined)`);
