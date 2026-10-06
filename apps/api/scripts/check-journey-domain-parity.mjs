#!/usr/bin/env node
/**
 * Guard: the Resources-journey area list exists three times — the API and the mobile
 * app cannot import @upllyft/types — so the JOURNEY_DOMAINS arrays must stay identical.
 *
 *   node scripts/check-journey-domain-parity.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const FILES = [
  join(ROOT, 'apps/api/src/resource-journey/domains.ts'),
  join(ROOT, 'packages/types/src/resource-journey.ts'),
  join(ROOT, 'apps/mobile/lib/journey.ts'),
];

function domainsArray(file) {
  const src = readFileSync(file, 'utf8');
  const start = src.indexOf('export const JOURNEY_DOMAINS');
  const end = src.indexOf('] as const;', start);
  if (start < 0 || end < 0) throw new Error(`JOURNEY_DOMAINS not found in ${file}`);
  return src.slice(start, end).replace(/\s+/g, '');
}

const [api, ...copies] = FILES.map(domainsArray);
if (copies.some((c) => c !== api)) {
  console.error('✖ JOURNEY_DOMAINS differs between:\n  ' + FILES.join('\n  '));
  console.error('Change one, change the other.');
  process.exit(1);
}
console.log('✔ journey areas agree (api ↔ @upllyft/types ↔ mobile)');
