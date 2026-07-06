-- Care Journey — Phase 5 seed (Referral / Escalation demo records for UPL-DEMO-0001).
-- Portable across environments: resolves case/child/therapist by natural keys
-- (caseNumber + therapist email) rather than hard-coded cuids, so the SAME file
-- seeds dev and prod correctly. Idempotent: fixed record ids + ON CONFLICT upsert.
-- Requires the Phase 5 migration (care_journey_phase5_escalation.sql) applied first.

-- Drop the smoke-test placeholder left over from build-out (demo case only; no-op elsewhere).
DELETE FROM "case_incidents" ci
USING "cases" c
WHERE ci."caseId" = c."id"
  AND c."caseNumber" = 'UPL-DEMO-0001'
  AND ci."riskLabel" = 'Smoke-test concern';

INSERT INTO "case_incidents" (
  "id", "caseId", "childId", "raisedById", "raisedFromModule",
  "category", "urgency", "status", "description",
  "riskLabel", "referralTarget", "reviewerNote",
  "reviewerApproved", "consentObtained", "shareScope",
  "followUpOutcome", "sentAt", "closedAt", "closedById",
  "createdAt", "updatedAt"
)
SELECT v."id", c."id", c."childId", t."id", v."raisedFromModule",
       v."category"::"IncidentCategory", v."urgency"::"IncidentUrgency", v."status"::"IncidentStatus", v."description",
       v."riskLabel", v."referralTarget", v."reviewerNote",
       v."reviewerApproved", v."consentObtained", v."shareScope",
       v."followUpOutcome", v."sentAt", v."closedAt",
       CASE WHEN v."closedAt" IS NOT NULL THEN t."id" ELSE NULL END,
       v."createdAt", v."updatedAt"
FROM (SELECT "id", "childId" FROM "cases" WHERE "caseNumber" = 'UPL-DEMO-0001' LIMIT 1) c
CROSS JOIN (SELECT "id" FROM "User" WHERE "email" = 'therapist@upllyft.demo' LIMIT 1) t
CROSS JOIN (
  VALUES
    -- 1) OPEN — safeguarding concern just raised from Triage, awaiting clinical lead review.
    (
      'demo-esc-open-0001', 'Triage',
      'ABUSE_NEGLECT', 'URGENT', 'OPEN',
      'Parent reported repeated missed meals and unsupervised periods at home; needs safeguarding review before any external contact.',
      'Possible neglect — missed meals reported', NULL::text, NULL::text,
      false, false, NULL::jsonb,
      NULL::text, NULL::timestamptz, NULL::timestamptz,
      CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days'
    ),
    -- 2) REFERRAL_SENT — urgent medical referral out to paediatrician, awaiting follow-up.
    (
      'demo-esc-sent-0002', 'Triage',
      'MEDICAL_INSTABILITY', 'URGENT', 'REFERRAL_SENT',
      'Suspected seizure activity observed during two sessions; referred for paediatric neurological assessment.',
      'Suspected seizure activity', 'Doctor / paediatrician',
      'Two witnessed episodes of staring with unresponsiveness (~20s) and post-episode fatigue. Requesting urgent paediatric review to rule out absence seizures.',
      true, true,
      '{"Presenting concern summary": true, "Current risk flags": true, "Relevant assessment findings": true, "Current care plan overview": false}'::jsonb,
      NULL::text, CURRENT_TIMESTAMP - INTERVAL '5 days', NULL::timestamptz,
      CURRENT_TIMESTAMP - INTERVAL '6 days', CURRENT_TIMESTAMP - INTERVAL '5 days'
    ),
    -- 3) CLOSED — behavioural referral completed; parent attended, escalation closed.
    (
      'demo-esc-closed-0003', 'Escalation',
      'SEVERE_BEHAVIOUR', 'ROUTINE', 'CLOSED',
      'Escalating aggression at home beyond current behaviour plan; referred to psychiatry. Parent attended appointment, plan updated.',
      'Escalating aggression at home', 'Psychiatrist',
      'Frequency and intensity of aggressive episodes at home rising despite in-clinic strategies. Requesting psychiatric consultation for medication review.',
      true, true,
      '{"Presenting concern summary": true, "Current risk flags": true, "Relevant assessment findings": true, "Current care plan overview": true}'::jsonb,
      'yes', CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP - INTERVAL '8 days',
      CURRENT_TIMESTAMP - INTERVAL '22 days', CURRENT_TIMESTAMP - INTERVAL '8 days'
    )
) AS v(
  "id", "raisedFromModule",
  "category", "urgency", "status", "description",
  "riskLabel", "referralTarget", "reviewerNote",
  "reviewerApproved", "consentObtained", "shareScope",
  "followUpOutcome", "sentAt", "closedAt",
  "createdAt", "updatedAt"
)
ON CONFLICT ("id") DO UPDATE SET
  "caseId"           = EXCLUDED."caseId",
  "childId"          = EXCLUDED."childId",
  "raisedById"       = EXCLUDED."raisedById",
  "category"         = EXCLUDED."category",
  "urgency"          = EXCLUDED."urgency",
  "status"           = EXCLUDED."status",
  "description"      = EXCLUDED."description",
  "riskLabel"        = EXCLUDED."riskLabel",
  "referralTarget"   = EXCLUDED."referralTarget",
  "reviewerNote"     = EXCLUDED."reviewerNote",
  "reviewerApproved" = EXCLUDED."reviewerApproved",
  "consentObtained"  = EXCLUDED."consentObtained",
  "shareScope"       = EXCLUDED."shareScope",
  "followUpOutcome"  = EXCLUDED."followUpOutcome",
  "sentAt"           = EXCLUDED."sentAt",
  "closedAt"         = EXCLUDED."closedAt",
  "closedById"       = EXCLUDED."closedById",
  "updatedAt"        = CURRENT_TIMESTAMP;
