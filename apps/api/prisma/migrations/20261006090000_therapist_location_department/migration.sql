-- Relevant therapist discovery: location columns + backfills. Additive and IDEMPOTENT.
--
-- Parent search now filters by where a therapist practises and by discipline:
--   * an independent therapist's location is therapist_profiles.country/city
--   * a clinic therapist's location is clinics.country/city
--   * discipline is therapist_profiles.department (DepartmentKey)
-- The backfills only fill NULLs, so re-running never overwrites what a person set.

ALTER TABLE "therapist_profiles" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "clinics"            ADD COLUMN IF NOT EXISTS "city" TEXT;

-- 1. Department from title first, then specializations — the same keyword rules,
--    in the same order, as classifyDiscipline() in marketplace/matching/matching.util.ts
--    (Postgres ARE uses \y for a word boundary where JS uses \b).
WITH src AS (
  SELECT "id",
         coalesce("title", '')                          AS t,
         array_to_string("specializations", ' | ')      AS s
    FROM "therapist_profiles"
   WHERE "department" IS NULL
), classified AS (
  SELECT "id",
         coalesce(
           CASE
             WHEN t ~* 'speech|slp|language (therap|path|develop)|aac\y|articulat|augmentative' THEN 'speech'
             WHEN t ~* 'occupational|sensory integration|fine motor|daily living' THEN 'ot'
             WHEN t ~* 'behaviou?r analy|\yaba\y|applied behavio|bcba|bcaba|verbal behavior' THEN 'aba'
             WHEN t ~* 'psycholog' THEN 'psychology'
             WHEN t ~* 'physical therap|physiotherap|gross motor' THEN 'physio'
             WHEN t ~* 'special education|special educator' THEN 'specialed'
           END,
           CASE
             WHEN s ~* 'speech|slp|language (therap|path|develop)|aac\y|articulat|augmentative' THEN 'speech'
             WHEN s ~* 'occupational|sensory integration|fine motor|daily living' THEN 'ot'
             WHEN s ~* 'behaviou?r analy|\yaba\y|applied behavio|bcba|bcaba|verbal behavior' THEN 'aba'
             WHEN s ~* 'psycholog' THEN 'psychology'
             WHEN s ~* 'physical therap|physiotherap|gross motor' THEN 'physio'
             WHEN s ~* 'special education|special educator' THEN 'specialed'
           END
         ) AS dept
    FROM src
)
UPDATE "therapist_profiles" tp
   SET "department" = c.dept
  FROM classified c
 WHERE tp."id" = c."id" AND c.dept IS NOT NULL;

-- 2. Independent therapists' country: the user's country, else their chosen region,
--    else what their default timezone implies. Clinic therapists use the clinic's.
UPDATE "therapist_profiles" tp
   SET "country" = coalesce(
         CASE upper(trim(u."country"))
           WHEN 'IN' THEN 'IN' WHEN 'INDIA' THEN 'IN'
           WHEN 'AE' THEN 'AE' WHEN 'UAE' THEN 'AE' WHEN 'UNITED ARAB EMIRATES' THEN 'AE'
           WHEN 'SA' THEN 'SA' WHEN 'KSA' THEN 'SA' WHEN 'SAUDI ARABIA' THEN 'SA'
         END,
         CASE upper(trim(u."preferredRegion")) WHEN 'IN' THEN 'IN' WHEN 'AE' THEN 'AE' WHEN 'SA' THEN 'SA' END,
         CASE tp."defaultTimezone"
           WHEN 'Asia/Kolkata' THEN 'IN' WHEN 'Asia/Calcutta' THEN 'IN'
           WHEN 'Asia/Dubai' THEN 'AE' WHEN 'Asia/Riyadh' THEN 'SA'
         END
       )
  FROM "User" u
 WHERE u."id" = tp."userId"
   AND tp."clinicId" IS NULL
   AND (tp."country" IS NULL OR trim(tp."country") = '');

-- 3. Independent therapists' city from the user profile.
UPDATE "therapist_profiles" tp
   SET "city" = nullif(trim(u."city"), '')
  FROM "User" u
 WHERE u."id" = tp."userId"
   AND tp."clinicId" IS NULL
   AND tp."city" IS NULL;

-- 4. UAE clinics: the emirate is the city parents search by.
UPDATE "clinics"
   SET "city" = CASE "emirate"::text
         WHEN 'ABU_DHABI' THEN 'Abu Dhabi'
         WHEN 'DUBAI' THEN 'Dubai'
         WHEN 'SHARJAH' THEN 'Sharjah'
         WHEN 'AJMAN' THEN 'Ajman'
         WHEN 'UMM_AL_QUWAIN' THEN 'Umm Al Quwain'
         WHEN 'RAS_AL_KHAIMAH' THEN 'Ras Al Khaimah'
         WHEN 'FUJAIRAH' THEN 'Fujairah'
       END
 WHERE "city" IS NULL AND "emirate" IS NOT NULL;
