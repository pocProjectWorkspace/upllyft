/**
 * Record the outcome of a CLINICAL REVIEW of the educator-only screening items.
 *
 * The 28 educator items (group instructions, circle time, turn-taking among peers,
 * drop-off separation, peer intelligibility) were drafted by an engineer against public
 * developmental guidance. They carry `clinicalReview: "PENDING"` and are EXCLUDED from the
 * screening form and from scoring until a clinician signs them off. This script is how that
 * sign-off is recorded — it does NOT decide anything, it writes down a decision a human
 * already made.
 *
 * WHAT IT DOES, and only this:
 *   - flips `clinicalReview` PENDING -> APPROVED for the items you name
 *   - optionally sets `redFlag: true` on approved items the reviewer designated as red flags
 *     (a red flag triggers a tier-2 probe and escalation, so this is a clinical call and is
 *      left entirely to the reviewer)
 *
 * WHAT IT WILL NOT DO:
 *   - touch any item that is not currently PENDING (it never un-approves, and never alters
 *     the 641 already-live items)
 *   - flag an item it is not also approving
 *   - reword anything — rewording is a manual edit to the JSON, done before approval
 *
 * Items are named by a QUALIFIED KEY `ageGroup::id`, because the short id (e.g. T1_SL_E01)
 * repeats across age bands. The review-packet artifact emits exactly this format.
 *
 * DRY RUN BY DEFAULT. Pass --write to apply. Idempotent.
 *
 *   # approve a specific set (what the artifact produces):
 *   node_modules/.bin/ts-node --transpile-only prisma/seeds/approve-educator-items.ts \
 *     --approve="24-36-months::T1_SL_E01,3-4-years::T1_SE_E01" \
 *     --redflag="24-36-months::T1_SL_E01" --write
 *
 *   # approve the entire pending set (clinician signed off all 28):
 *   node_modules/.bin/ts-node --transpile-only prisma/seeds/approve-educator-items.ts --all --write
 *
 *   # see what is still pending:
 *   node_modules/.bin/ts-node --transpile-only prisma/seeds/approve-educator-items.ts --list
 */
import * as fs from 'fs';
import * as path from 'path';

const DIR = path.join(__dirname, '../../src/assessments/questionnaires');
const WRITE = process.argv.includes('--write');
const ALL = process.argv.includes('--all');
const LIST = process.argv.includes('--list');

function argList(flag: string): Set<string> {
  const raw = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (!raw) return new Set();
  return new Set(
    raw
      .slice(flag.length + 1)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

const approveKeys = argList('--approve');
const redflagKeys = argList('--redflag');

interface PendingItem {
  key: string;
  file: string;
  doc: any;
  item: any;
  ageGroup: string;
  domain: string;
}

// Gather every PENDING educator item across all bands.
const pending: PendingItem[] = [];
for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.json'))) {
  const full = path.join(DIR, file);
  const doc = JSON.parse(fs.readFileSync(full, 'utf-8'));
  for (const domain of doc.domains ?? []) {
    for (const tier of ['tier1', 'tier2'] as const) {
      for (const item of domain[tier] ?? []) {
        if (item.clinicalReview === 'PENDING') {
          pending.push({
            key: `${doc.ageGroup}::${item.id}`,
            file: full,
            doc,
            item,
            ageGroup: doc.ageGroup,
            domain: domain.id,
          });
        }
      }
    }
  }
}

const byKey = new Map(pending.map((p) => [p.key, p]));

if (LIST) {
  console.log(`\n${pending.length} item(s) awaiting clinical review:\n`);
  for (const p of pending) {
    console.log(`  ${p.key}`);
    console.log(`      ${p.item.question}`);
  }
  process.exit(0);
}

// ── Validate the request BEFORE touching anything ──────────────────────────────
const errors: string[] = [];

const targets = ALL ? new Set(byKey.keys()) : approveKeys;

if (!ALL && targets.size === 0) {
  console.error('\nNothing to approve. Pass --approve="ag::id,..." , or --all, or --list.\n');
  process.exit(1);
}

for (const key of targets) {
  if (!byKey.has(key)) {
    errors.push(`--approve names "${key}", which is not a pending educator item. (Typo? Already approved? Use --list.)`);
  }
}
for (const key of redflagKeys) {
  if (!targets.has(key)) {
    errors.push(`--redflag names "${key}", but that item is not being approved in this run. A red flag can only be set on an item you are approving.`);
  }
}

if (errors.length) {
  console.error('\n✘ Refusing to run — the request does not line up:\n');
  for (const e of errors) console.error(`  ${e}`);
  console.error('');
  process.exit(1);
}

// ── Apply (or dry-run) ─────────────────────────────────────────────────────────
const touchedFiles = new Set<string>();
const approved: string[] = [];
const flagged: string[] = [];

for (const key of targets) {
  const p = byKey.get(key)!;
  p.item.clinicalReview = 'APPROVED';
  approved.push(key);
  if (redflagKeys.has(key)) {
    p.item.redFlag = true;
    flagged.push(key);
  }
  touchedFiles.add(p.file);
}

if (WRITE) {
  // Re-serialise each touched file once. The item objects were mutated in place inside
  // their parent doc, so writing the doc persists the change.
  const writtenDocs = new Map<string, any>();
  for (const p of pending) {
    if (touchedFiles.has(p.file)) writtenDocs.set(p.file, p.doc);
  }
  for (const [file, doc] of writtenDocs) {
    fs.writeFileSync(file, JSON.stringify(doc, null, 2) + '\n');
  }
}

const stillPending = pending.length - approved.length;

console.log(`\n${WRITE ? '✅ APPLIED' : '(dry run — pass --write to apply)'}\n`);
console.log(`  approved:      ${approved.length}`);
console.log(`  of which red-flagged: ${flagged.length}`);
console.log(`  still pending: ${stillPending}`);
if (flagged.length) {
  console.log('\n  red-flagged (will trigger a tier-2 probe + escalation):');
  for (const k of flagged) console.log(`    ${k}`);
}
console.log(
  '\nNext: `pnpm --filter @upllyft/api test:e2e` (the PENDING-exclusion test now confirms\n' +
    'the approved items appear), then commit the questionnaire JSON changes and deploy.\n',
);
