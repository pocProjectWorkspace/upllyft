#!/usr/bin/env node
/**
 * One-off: make the `library-resources` storage bucket private.
 *
 * Library files used to be served by permanent public URLs, so an organisation-only
 * file could be opened by anyone holding the link. The API now hands out short-lived
 * signed URLs (which work on public AND private buckets); flipping the bucket private
 * is what makes the old public links stop working.
 *
 * ORDER MATTERS: run this only AFTER the API that serves signed URLs is live in that
 * environment — an older API would still be handing out the public links this breaks.
 *
 *   node -r dotenv/config scripts/make-library-bucket-private.mjs          # dry run
 *   node -r dotenv/config scripts/make-library-bucket-private.mjs --apply  # do it
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Idempotent.
 */
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'library-resources';
const apply = process.argv.includes('--apply');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

const supabase = createClient(url, key);
const host = new URL(url).host;

const { data: bucket, error } = await supabase.storage.getBucket(BUCKET);
if (error) {
  console.log(`${host}: bucket "${BUCKET}" not found (${error.message}) — the API creates it private on first upload.`);
  process.exit(0);
}

if (!bucket.public) {
  console.log(`${host}: bucket "${BUCKET}" is already private. Nothing to do.`);
  process.exit(0);
}

if (!apply) {
  console.log(`${host}: bucket "${BUCKET}" is PUBLIC. Re-run with --apply to make it private.`);
  process.exit(0);
}

const { error: updateError } = await supabase.storage.updateBucket(BUCKET, { public: false });
if (updateError) {
  console.error(`${host}: failed — ${updateError.message}`);
  process.exit(1);
}
console.log(`${host}: bucket "${BUCKET}" is now private.`);
