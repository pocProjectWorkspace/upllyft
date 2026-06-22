#!/bin/sh
set -e
cd /app/apps/api

# ---------------------------------------------------------------------------
# Schema-drift guard.
#
# The app reads from DATABASE_URL (url) at runtime, but `prisma db push` writes
# to DIRECT_URL (directUrl). If those two point at DIFFERENT databases, db push
# updates one DB while the app queries another — the schema silently drifts and
# you get runtime errors like:
#   "The column therapist_profiles.licenseAuthority does not exist".
#
# For a correct Supabase setup both URLs share the same project ref (the 20-char
# token in the user/host) and only differ by pooler(6543) vs direct(5432). We
# extract that ref from each URL (with the password stripped first so it can't
# false-match) and refuse to start if two different refs are confidently found.
# ---------------------------------------------------------------------------
db_ref() {
  # strip the password, then grab the first 20-char lowercase token (Supabase ref)
  printf '%s' "$1" | sed -E 's#(://[^:]+:)[^@]+@#\1@#' | grep -oiE '[a-z0-9]{20}' | head -n1
}

if [ -n "$DATABASE_URL" ] && [ -n "$DIRECT_URL" ]; then
  RT_REF=$(db_ref "$DATABASE_URL")
  MIG_REF=$(db_ref "$DIRECT_URL")
  echo "DB ref (DATABASE_URL / runtime): ${RT_REF:-unknown}"
  echo "DB ref (DIRECT_URL / db push):   ${MIG_REF:-unknown}"
  if [ -n "$RT_REF" ] && [ -n "$MIG_REF" ] && [ "$RT_REF" != "$MIG_REF" ]; then
    echo "FATAL: DATABASE_URL and DIRECT_URL point to different databases ($RT_REF vs $MIG_REF)."
    echo "       'prisma db push' would update the wrong DB, leaving the running app drifted."
    echo "       Fix the Railway env vars so both point at the same Postgres, then redeploy."
    exit 1
  fi
fi

echo "Running Prisma schema sync (db push)..."
npx prisma db push --skip-generate
echo "Starting application..."
node dist/main.js
