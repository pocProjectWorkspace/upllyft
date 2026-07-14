#!/usr/bin/env node
/**
 * Guard: the API's facility-capability map must match packages/types.
 *
 * The API cannot import @upllyft/types at runtime (not a dependency; Nest's build
 * does not resolve the raw TS it exports), so the map is mirrored in
 * src/common/facility-capabilities.ts. A mirror that can drift is worse than no
 * mirror: the web apps would say a nursery cannot diagnose while the API happily
 * lets it. This fails the build if they disagree.
 *
 *   node scripts/check-capability-parity.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../..', import.meta.url).pathname;
const API_FILE = join(ROOT, 'apps/api/src/common/facility-capabilities.ts');
const TYPES_FILE = join(ROOT, 'packages/types/src/facility.ts');

const CAPS = [
  'canCreateCase',
  'canDiagnose',
  'canWriteClinicalNotes',
  'canScreen',
  'canObserve',
  'canRaiseConcern',
  'canBill',
];
const TYPES = ['CLINIC', 'NURSERY', 'SCHOOL'];

/** Pull each facility type's capability block out of a FACILITY_CAPABILITIES literal. */
function parse(file) {
  const src = readFileSync(file, 'utf8');
  const start = src.indexOf('FACILITY_CAPABILITIES');
  if (start === -1) throw new Error(`FACILITY_CAPABILITIES not found in ${file}`);
  const body = src.slice(start);

  const out = {};
  for (const type of TYPES) {
    const m = body.match(new RegExp(`${type}:\\s*\\{([\\s\\S]*?)\\}`, 'm'));
    if (!m) throw new Error(`${type} block not found in ${file}`);
    const block = m[1];

    const entry = {};
    for (const cap of CAPS) {
      const cm = block.match(new RegExp(`${cap}:\\s*(true|false)`));
      if (!cm) throw new Error(`${type}.${cap} missing in ${file}`);
      entry[cap] = cm[1] === 'true';
    }
    const sm = block.match(/maxDataScope:\s*'([A-Z_]+)'/);
    if (!sm) throw new Error(`${type}.maxDataScope missing in ${file}`);
    entry.maxDataScope = sm[1];

    // validAuthorities is written as a named const (HEALTH_AUTHORITIES /
    // EDUCATION_AUTHORITIES) in both files, so resolve the alias to the literal
    // list — comparing the alias NAMES would pass even if the two files defined
    // those aliases differently, which is exactly the drift we are guarding.
    const am = block.match(/validAuthorities:\s*([A-Z_]+)/);
    if (!am) throw new Error(`${type}.validAuthorities missing in ${file}`);
    const alias = am[1];
    const dm = src.match(new RegExp(`const ${alias}\\s*=\\s*\\[([^\\]]*)\\]`));
    if (!dm) throw new Error(`${alias} not defined in ${file}`);
    entry.validAuthorities = dm[1]
      .split(',')
      .map(s => s.trim().replace(/['"]/g, ''))
      .filter(Boolean)
      .sort()
      .join('|');

    out[type] = entry;
  }
  return out;
}

const api = parse(API_FILE);
const types = parse(TYPES_FILE);

const diffs = [];
for (const type of TYPES) {
  for (const key of [...CAPS, 'maxDataScope', 'validAuthorities']) {
    if (api[type][key] !== types[type][key]) {
      diffs.push(`  ${type}.${key}: api=${api[type][key]}  types=${types[type][key]}`);
    }
  }
}

if (diffs.length) {
  console.error('\n✖ facility capability maps have DRIFTED:\n');
  console.error(diffs.join('\n'));
  console.error('\n  apps/api/src/common/facility-capabilities.ts');
  console.error('  packages/types/src/facility.ts');
  console.error('\nThese must agree — otherwise the UI and the API disagree about what a');
  console.error('nursery is allowed to do, and the API is the one that matters.\n');
  process.exit(1);
}

console.log(`✔ capability maps agree (${TYPES.length} types × ${CAPS.length + 2} keys, incl. licence authorities)`);
