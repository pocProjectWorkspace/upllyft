-- IEP.title — the plan's name, as the clinician typed it.
--
-- The UI has always collected this and REQUIRED it, but there was no column, so the
-- global ValidationPipe (`whitelist: true`) silently stripped the field and every IEP
-- was created untitled. Silent data loss, and it made the create dialog look broken.
--
-- Idempotent.
ALTER TABLE "ieps" ADD COLUMN IF NOT EXISTS "title" TEXT;
