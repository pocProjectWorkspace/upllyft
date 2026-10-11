#!/usr/bin/env node
/**
 * Generates src/faq/faq-seed.ts from docs/faq-content.md (the Help Center starter
 * content). Run after editing the doc:  node apps/api/scripts/generate-faq-seed.mjs
 *
 * Doc format:
 *   ## Category name <!-- slug AUDIENCE -->        AUDIENCE: PARENT | THERAPIST | FACILITY | ALL
 *   **12. Question text?** <!-- optional-slug -->
 *   Answer paragraphs until the next question or heading (blank lines kept).
 * An answer containing "[" (a placeholder) is seeded unpublished.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const docPath = resolve(here, '../../../docs/faq-content.md');
const outPath = resolve(here, '../src/faq/faq-seed.ts');

const AUDIENCES = new Set(['PARENT', 'THERAPIST', 'FACILITY', 'ALL']);
const toSlug = (text) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');

const lines = readFileSync(docPath, 'utf8').replace(/\r\n/g, '\n').split('\n');
const categories = [];
let category = null;
let item = null;

const finishItem = () => {
  if (!item) return;
  const answer = item.lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!answer) throw new Error(`No answer for "${item.question}"`);
  category.items.push({ slug: item.slug, question: item.question, answer, published: !answer.includes('[') });
  item = null;
};

for (const line of lines) {
  const heading = line.match(/^## (.+?) <!-- ([a-z0-9-]+) ([A-Z]+) -->$/);
  if (heading) {
    finishItem();
    const [, name, slug, audience] = heading;
    if (!AUDIENCES.has(audience)) throw new Error(`Unknown audience ${audience} on "${name}"`);
    category = { slug, name, audience, items: [] };
    categories.push(category);
    continue;
  }
  const question = line.match(/^\*\*\d+\. (.+?)\*\*(?: <!-- ([a-z0-9-]+) -->)?$/);
  if (question && category) {
    finishItem();
    item = { question: question[1], slug: question[2] || toSlug(question[1]), lines: [] };
    continue;
  }
  if (line.startsWith('---') || line.startsWith('## ')) {
    finishItem();
    if (line.startsWith('## ')) category = null; // a plain heading ends the categories
    continue;
  }
  if (item) item.lines.push(line);
}
finishItem();

const all = categories.flatMap((c) => c.items);
const dupes = (list) => list.filter((s, i) => list.indexOf(s) !== i);
const dupe = [...dupes(categories.map((c) => c.slug)), ...dupes(all.map((i) => i.slug))];
if (dupe.length) throw new Error(`Duplicate slugs: ${dupe.join(', ')}`);

const header = `/**
 * Starter Help Center content. GENERATED from docs/faq-content.md by
 * scripts/generate-faq-seed.mjs; edit the doc and re-run the script, not this file.
 *
 * The API inserts it once, when faq_categories is empty (FaqService.onModuleInit); after
 * that the admin console (/admin/faq) owns the content. Items whose answer still has a
 * [bracketed] placeholder start unpublished.
 */

export type FaqAudience = 'PARENT' | 'THERAPIST' | 'FACILITY' | 'ALL';

export interface FaqSeedCategory {
  slug: string;
  name: string;
  audience: FaqAudience;
  items: Array<{ slug: string; question: string; answer: string; published: boolean }>;
}

export const FAQ_SEED: FaqSeedCategory[] = `;
writeFileSync(outPath, `${header}${JSON.stringify(categories, null, 2)};\n`);

const drafts = all.filter((i) => !i.published).length;
console.log(`faq-seed.ts: ${categories.length} categories, ${all.length} items (${drafts} unpublished)`);
for (const c of categories) console.log(`  ${c.audience.padEnd(9)} ${c.slug}: ${c.items.length}`);
