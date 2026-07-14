/**
 * Tag every screening item with `observableBy` — who is actually in a position to
 * answer it.
 *
 * WHY: an educator screening is only worth anything if the educator is asked things
 * they can see. A keyworker cannot answer "does your child sleep through the night";
 * asking anyway produces a NOT_OBSERVED at best, and at worst a guess that we then
 * treat as signal. This tags the item bank once, in the file, rather than deciding it
 * at runtime with a regex nobody can audit.
 *
 * THE CARVE-OUT IS DELIBERATELY SMALL, because the honest answer is that a nursery
 * observes most of this — running, blocks, two-word phrases, peer play, messy play,
 * mealtimes, toileting, dressing, responding to their name. Several domains a nursery
 * sees BETTER than a parent (a parent never watches their child in a group of twenty).
 * The genuine blind spots are narrow: sleep, bathing, teeth-brushing, home chores,
 * siblings.
 *
 * Everything else is handled per-child at answer time by NOT_OBSERVED — "I could have
 * seen this, but I haven't with this child" — which is a different statement from
 * "nobody at a nursery could ever see this".
 *
 * Idempotent. Run:  node_modules/.bin/ts-node --transpile-only prisma/seeds/tag-item-observability.ts [--write]
 */
import * as fs from 'fs';
import * as path from 'path';

const DIR = path.join(__dirname, '../../src/assessments/questionnaires');
const WRITE = process.argv.includes('--write');

/**
 * Structurally invisible to nursery staff. Narrow on purpose — see the header.
 *
 * ERR TOWARD INCLUDING THE EDUCATOR. `NOT_OBSERVED` is the safety net: a keyworker who
 * simply hasn't seen a given child do a given thing says so, per child, and it costs
 * us nothing. But excluding an item HERE removes it from the educator form forever —
 * so a bad exclusion destroys signal permanently and silently.
 *
 * That asymmetry is why "chores" is NOT a blanket exclusion. "Help with simple chores
 * (e.g. put toys away)" and "(putting toys away, napkins on table)" are nursery
 * routines — tidy-up time and laying the table for snack. A keyworker watches both
 * every single day. Only the activities that genuinely only happen at home are cut.
 */
const HOME_ONLY = [
  /\b(sleep|asleep|bedtime|nap at home|through the night|wake (up )?at night|night ?time)\b/i,
  /\b(bath|bathing|bathtime|shower)\b/i,
  /\bbrush(ing)? (their |the )?teeth\b/i,
  /\bpersonal hygiene\b/i,
  /\b(sibling|brother|sister)\b/i,
  /\bat home\b/i,
  /\bfamily member/i,
];

/**
 * Domestic ACTIVITIES — but only where the item is asking whether the child actually
 * DOES them, i.e. in adaptive/self-care. The same words appear in cognitive items
 * about IMITATION ("imitate adults doing household tasks (sweeping, cooking)"), and
 * that is pretend play in the home corner — which every nursery has, and which a
 * keyworker watches daily. Excluding those would have cut real, observable cognitive
 * signal on the strength of a keyword.
 */
const HOME_ACTIVITY = [
  /\b(making|make) (their )?bed\b/i,
  /\bfeed (a |the )?pet\b/i,
  /\b(microwave|toaster|household appliance)\b/i,
  /\b(sweeping|cooking|laundry|vacuuming)\b/i,
  /\bhousehold chores\b/i,
];

const SELF_CARE_DOMAINS = new Set(['adaptiveSelfCare']);

const isHomeOnly = (q: string, domainId: string) =>
  HOME_ONLY.some((re) => re.test(q)) ||
  (SELF_CARE_DOMAINS.has(domainId) && HOME_ACTIVITY.some((re) => re.test(q)));

let total = 0;
const parentOnly: string[] = [];

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).sort()) {
  const full = path.join(DIR, file);
  const doc = JSON.parse(fs.readFileSync(full, 'utf-8'));

  for (const domain of doc.domains ?? []) {
    for (const tier of ['tier1', 'tier2'] as const) {
      for (const q of domain[tier] ?? []) {
        total++;
        const home = isHomeOnly(q.question, domain.id);
        q.observableBy = home ? ['PARENT'] : ['PARENT', 'EDUCATOR'];
        if (home) parentOnly.push(`${doc.ageGroup.padEnd(14)} ${domain.id.padEnd(18)} ${q.id.padEnd(12)} ${q.question}`);
      }
    }
  }

  if (WRITE) fs.writeFileSync(full, JSON.stringify(doc, null, 2) + '\n');
}

console.log(`\n${total} items tagged.`);
console.log(`  PARENT + EDUCATOR : ${total - parentOnly.length}`);
console.log(`  PARENT only       : ${parentOnly.length}\n`);
console.log('PARENT-ONLY items (a keyworker cannot observe these — review this list):\n');
for (const p of parentOnly) console.log('  ' + p);
console.log(WRITE ? '\n✅ written' : '\n(dry run — pass --write to apply)');
