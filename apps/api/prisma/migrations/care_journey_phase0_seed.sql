-- Care Journey — seed configurable care-plan pricing defaults (handoff Stage 3 values).
-- Idempotent: upsert keyed by recommendation.
INSERT INTO "care_plan_pricing_defaults"
  ("id", "recommendation", "label", "unitPrice", "defaultCount", "defaultDaysPerWeek", "defaultDays", "packageType", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'THERAPY',           'Therapy block',                1800, 12, 2, ARRAY[1,4], 'block',      CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'SINGLE_ASSESSMENT', 'Single-discipline assessment', 3500, 1,  1, ARRAY[3],   'assessment', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'MDT_ASSESSMENT',    'Multidisciplinary assessment', 6000, 2,  1, ARRAY[3],   'assessment', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'COACHING',          'Parent coaching',              1500, 3,  1, ARRAY[5],   'coaching',   CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'NONE',              'Monitor',                      0,    0,  0, ARRAY[]::integer[], NULL,  CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'REFERRAL',          'External referral',            0,    0,  0, ARRAY[]::integer[], NULL,  CURRENT_TIMESTAMP)
ON CONFLICT ("recommendation") DO UPDATE SET
  "label"              = EXCLUDED."label",
  "unitPrice"          = EXCLUDED."unitPrice",
  "defaultCount"       = EXCLUDED."defaultCount",
  "defaultDaysPerWeek" = EXCLUDED."defaultDaysPerWeek",
  "defaultDays"        = EXCLUDED."defaultDays",
  "packageType"        = EXCLUDED."packageType",
  "updatedAt"          = CURRENT_TIMESTAMP;
