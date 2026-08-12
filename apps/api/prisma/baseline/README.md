# Prisma schema baseline

## Why this exists

The schema was grown with a mix of `prisma migrate`, `prisma db push`, and hand-applied
`.sql` files. As a result `prisma/migrations/` **cannot rebuild the database**: 46 of 155
tables have no `CREATE TABLE` in any migration folder, and the whole `care_journey_*`
evolution plus the `session_types.setBy`/`edited` columns live only in loose `.sql` files
(which Prisma ignores) or were pushed directly. On production, `_prisma_migrations` is empty.

This directory is the authoritative, git-tracked full schema and the procedure to make
`prisma migrate` the single path forward. Nothing here is auto-applied.

## Files

- **`0_init.sql`** — the complete current schema (all 155 models, 156 tables), generated
  offline via `prisma migrate diff --from-empty --to-schema-datamodel`. `CREATE EXTENSION
  IF NOT EXISTS vector;` is prepended because the schema uses the pgvector `vector` type.
- **`prod-catchup_session_type_provenance.sql`** — idempotent `ALTER`s for the one known
  post-`reviews_handover` drift (`setBy`/`edited`). Use this to unblock `fix/v5 → main`
  quickly if you are not yet ready for the full baseline adoption below.

## Use case A — rebuild a fresh database from git (safe, no coordination)

Point at an **empty** database and run `0_init.sql`. That's the whole schema.

```bash
psql "$FRESH_DATABASE_URL" -f prisma/baseline/0_init.sql
```

Do **not** run this against a database that already has tables — it will error on the
existing objects. It is for brand-new environments only.

## Use case B — adopt as the Prisma baseline (coordinated; do with a human)

Goal: make `prisma migrate deploy` the way schema changes reach every environment, without
re-creating the tables that already exist.

> ⚠️ Run these steps against dev first, verify, then prod. Do **not** `prisma migrate deploy`
> against prod before the `resolve` step — with an empty `_prisma_migrations` it would try to
> CREATE every table and fail. Take a `pg_dump` of prod first.

**0. Verify the baseline matches reality (per environment).** This is the load-bearing check
— if it is not empty, that delta is real drift and must be reconciled before adopting:

```bash
prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script
# expect: no statements. If it emits SQL, that is drift between the DB and schema.prisma.
```

**1. Restructure the migrations folder** (one commit, on a branch):
- move the 35 timestamped folders and the loose `*.sql` / `create-indexes.js` / `package.json`
  into `prisma/migrations-archive-pre-baseline/` (keep them for history — don't delete);
- create `prisma/migrations/0_init/migration.sql` as a copy of `0_init.sql`;
- keep `prisma/migrations/migration_lock.toml`.

**2. Mark it applied on each existing database** (records it as done without running it):

```bash
# if _prisma_migrations already has rows from the old folders, clear them first so status is clean:
#   psql "$DATABASE_URL" -c 'DELETE FROM "_prisma_migrations";'
prisma migrate resolve --applied 0_init      # run with DATABASE_URL pointed at dev, then prod
prisma migrate status                        # expect: "Database schema is up to date!"
```

**3. From here on**, schema changes are normal `prisma migrate dev` (local) →
`prisma migrate deploy` (prod). No more hand-applied SQL.

## Regenerating `0_init.sql`

If the schema changes before adoption, regenerate:

```bash
cd apps/api
prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > /tmp/b.sql
# then re-prepend the CREATE EXTENSION line (see top of the current 0_init.sql).
```
