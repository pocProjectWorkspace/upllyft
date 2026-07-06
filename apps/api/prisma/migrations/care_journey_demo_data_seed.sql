-- Care Journey — full demo data for UPL-DEMO-0001 (Aarav) across phases 2-6.
-- Populates the Care Journey tabs that hydrate from the DB (Intake, Sessions,
-- Assessment Reviews), advances journeyStage for the stepper, and updates the
-- triage row for audit consistency. Consultation/Triage tabs are form-only in
-- the UI, so the care_plan + triage rows are for integrity/linking/journey.
--
-- Idempotent: fixed record ids + ON CONFLICT / delete-demo-then-insert.
-- Portable: resolves case/child/therapist by natural keys; links assessment
-- disciplines to existing signed clinical_records by subquery. Re-runnable.

DO $seed$
DECLARE
  v_case   text;
  v_child  text;
  v_ther   text;   -- Dr. Sarah Thomas User id
  v_prof   text;   -- her therapist_profiles id
  v_speech text;   -- signed Speech assessment clinical_record
  v_occ    text;   -- OT sensory assessment clinical_record
BEGIN
  SELECT id, "childId" INTO v_case, v_child FROM cases WHERE "caseNumber" = 'UPL-DEMO-0001';
  IF v_case IS NULL THEN RAISE NOTICE 'UPL-DEMO-0001 not found; skipping'; RETURN; END IF;
  SELECT id INTO v_ther FROM "User" WHERE email = 'therapist@upllyft.demo' LIMIT 1;
  SELECT id INTO v_prof FROM therapist_profiles WHERE "userId" = v_ther LIMIT 1;
  SELECT id INTO v_speech FROM clinical_records
    WHERE "caseId" = v_case AND discipline = 'SPEECH' AND "activityType" = 'ASSESSMENT' AND status = 'SIGNED' LIMIT 1;
  SELECT id INTO v_occ FROM clinical_records
    WHERE "caseId" = v_case AND discipline = 'OCCUPATIONAL' AND "activityType" = 'ASSESSMENT' LIMIT 1;

  -- ── Journey stage (drives the stepper: intake→triage→consultation→therapy done) ──
  UPDATE cases SET "journeyStage" = 'IN_ASSESSMENT' WHERE id = v_case;

  -- ── Phase 3: Triage — confirm the existing PENDING row (MDT pathway) ──
  UPDATE triage_reviews SET
    status         = 'DECIDED',
    decision       = 'PROCEED',
    "riskLevel"    = 'LOW',
    pathway        = 'MDT_ASSESSMENT',
    notes          = 'Accepted for MDT assessment. Speech-language delay with social-communication concerns and mild sensory sensitivities; no red flags. Coordinated Speech + Occupational Therapy + Psychology assessment. Parent to be notified in-app.',
    "aiSummary"    = 'Aarav presents with speech and language delay and emerging social-communication difficulties alongside mild sensory sensitivities (auditory/tactile). No safeguarding or medical red flags. Recommended pathway: multidisciplinary assessment across Speech & Language Therapy, Occupational Therapy and Psychology to clarify the developmental profile and inform intervention.',
    "decisionData" = jsonb_build_object(
      'primaryTherapistId', v_prof,
      'secondaryTherapistIds', '[]'::jsonb,
      'appointment', jsonb_build_object('type','MDT assessment','scheduledAt','2026-07-15T09:30:00.000Z','durationMin',90,'location','Clinic — Room 3'),
      'notify', jsonb_build_object('channel','app','requireAck',true,'message','Aarav has been accepted for a multidisciplinary assessment. His first appointment is booked — please review and acknowledge.'),
      'riskFlags', jsonb_build_object('Seizure instability',false,'Swallowing / aspiration risk',false,'Acute mental-health concern',false,'Self-harm indication',false,'Abuse / neglect concern',false,'Medical instability',false)
    ),
    "confirmedAt"  = TIMESTAMP '2026-07-05 10:00:00',
    "updatedAt"    = CURRENT_TIMESTAMP
  WHERE "caseId" = v_case;

  -- ── Phase 2: Client Intake (SUMMARISED → renders the filled summary) ──
  INSERT INTO case_intakes (
    id, "caseId", state, data, "presentingConcern", "referralQuestions", "parentGoals",
    "urgencyFlag", "aiSummary", "consentAssessment", "consentTherapy", "consentSharing",
    "consentAi", "recordedBy", "summarisedAt", "createdById", "createdAt", "updatedAt"
  ) VALUES (
    'demo-intake-0001', v_case, 'SUMMARISED',
    jsonb_build_object(
      'clientName','Aarav (Aaru)',
      'dobAge','14 May 2020 · 6 yrs',
      'gender','Male',
      'languages','English (primary), Malayalam (home)',
      'parent','Mother (primary caregiver)',
      'school','Little Stars Nursery — KG1',
      'pregnancyBirth','Full-term, uncomplicated delivery. No birth complications reported. Gross-motor milestones within normal limits; sitting and walking on time.',
      'medicalDiagnoses','Query Autism Spectrum Disorder — currently under assessment. No formal diagnosis yet. Not on any medication.',
      'hearingVision','No known vision or hearing concerns reported by family.',
      'familyComposition','Lives with mother; bilingual household (English/Malayalam). Nationality: Indian. Referral via parent.',
      'schoolHistory','Attends Little Stars Nursery (KG1). Teacher notes difficulty following group instructions and joining peer play; benefits from adult support.'
    ),
    'Delayed speech with reduced eye contact and limited functional communication. First words ~2y, first phrases ~3.5y. Food selectivity (prefers dry/crunchy textures). Difficulty following group instructions and joining peer play at nursery.',
    ARRAY['Speech / language','Sensory'],
    ARRAY['Talk in sentences','Follow nursery routines','Reduce frustration'],
    'Low — no safeguarding or medical red flags; routine developmental pathway',
    'Aarav (6y) referred for speech/language and sensory concerns. Presents with expressive-language delay, reduced eye contact and joint attention, limited functional communication, and social-communication difficulties, plus mild sensory sensitivities (auditory and food textures). Query Autism Spectrum Disorder under assessment. Bilingual English/Malayalam household. Parent goals: talk in sentences, follow nursery routines, reduce frustration. Urgency low. Recommended focus: speech-language therapy plus play-based social-communication and sensory support.',
    true, true, true, true, 'Dr. Sarah Thomas', TIMESTAMP '2026-07-05 09:30:00',
    v_ther, TIMESTAMP '2026-07-05 09:00:00', CURRENT_TIMESTAMP
  )
  ON CONFLICT ("caseId") DO UPDATE SET
    state = EXCLUDED.state, data = EXCLUDED.data, "presentingConcern" = EXCLUDED."presentingConcern",
    "referralQuestions" = EXCLUDED."referralQuestions", "parentGoals" = EXCLUDED."parentGoals",
    "urgencyFlag" = EXCLUDED."urgencyFlag", "aiSummary" = EXCLUDED."aiSummary",
    "consentAssessment" = EXCLUDED."consentAssessment", "consentTherapy" = EXCLUDED."consentTherapy",
    "consentSharing" = EXCLUDED."consentSharing", "consentAi" = EXCLUDED."consentAi",
    "recordedBy" = EXCLUDED."recordedBy", "summarisedAt" = EXCLUDED."summarisedAt",
    "updatedAt" = CURRENT_TIMESTAMP;

  -- ── Phase 3: Consultation → Care Plan (THERAPY block, active, parent accepted) ──
  INSERT INTO care_plans (
    id, "caseId", "consultationRecordId", recommendation, disciplines, "primaryTherapistId",
    "startDate", "timeOfDay", "daysOfWeek", "sessionCount", "packageName", "unitPrice",
    currency, "totalAmount", "paymentStatus", status, "parentAcceptedAt", "lockedAt",
    "createdById", "createdAt", "updatedAt"
  ) VALUES (
    'demo-careplan-0001', v_case, NULL, 'THERAPY',
    ARRAY['SPEECH','OCCUPATIONAL']::"TherapyDiscipline"[], v_ther,
    TIMESTAMP '2026-06-15 16:00:00', '16:00', ARRAY[1,4], 12, 'Therapy block', 1800,
    'INR', 21600, 'PAID', 'ACTIVE', TIMESTAMP '2026-06-12 10:30:00', TIMESTAMP '2026-06-12 10:30:00',
    v_ther, TIMESTAMP '2026-06-12 10:30:00', CURRENT_TIMESTAMP
  )
  ON CONFLICT (id) DO UPDATE SET
    recommendation = EXCLUDED.recommendation, disciplines = EXCLUDED.disciplines,
    "primaryTherapistId" = EXCLUDED."primaryTherapistId", "startDate" = EXCLUDED."startDate",
    "sessionCount" = EXCLUDED."sessionCount", "totalAmount" = EXCLUDED."totalAmount",
    "paymentStatus" = EXCLUDED."paymentStatus", status = EXCLUDED.status,
    "parentAcceptedAt" = EXCLUDED."parentAcceptedAt", "lockedAt" = EXCLUDED."lockedAt",
    "updatedAt" = CURRENT_TIMESTAMP;

  -- ── Phase 3/4: Sessions — 12-session Mon/Thu series (6 past SIGNED + 6 upcoming) ──
  DELETE FROM case_sessions WHERE "caseId" = v_case AND id LIKE 'demo-sess-%';
  INSERT INTO case_sessions (
    id, "caseId", "therapistId", "scheduledAt", "actualDuration", "attendanceStatus",
    "sessionType", location, discipline, "carePlanId", "noteFormat", "structuredNotes",
    "noteStatus", "signedAt", "clinicalFlag", "createdAt", "updatedAt"
  )
  SELECT
    'demo-sess-' || lpad(v.n::text, 2, '0'), v_case, v_ther, v.sched, v.dur, 'PRESENT',
    'Therapy block', 'Clinic — Room 2', v.disc::"TherapyDiscipline", 'demo-careplan-0001',
    v.fmt::"SessionNoteFormat", v.notes::jsonb, v.nstatus::"SessionNoteStatus", v.signed,
    false, v.sched, CURRENT_TIMESTAMP
  FROM (VALUES
    (1,  TIMESTAMP '2026-06-15 16:00:00', 'SPEECH',       45, 'SOAP', '{"subjective":"Aarav arrived settled with mother. Parent reports two new single words used at home this week.","objective":"Expressive labelling with picture cards, 20 trials: 12/20 accurate spontaneous, 5/20 with phonemic cue. Joint attention sustained ~3 min in structured play.","assessment":"Emerging single-word expressive vocabulary. Attention to task improving in a low-stimulation setting.","plan":"Continue core-vocabulary targets; send home picture-exchange cards; coordinate with OT on shared regulation goals."}', 'SIGNED', TIMESTAMP '2026-06-15 17:05:00'),
    (2,  TIMESTAMP '2026-06-18 16:00:00', 'OCCUPATIONAL', 45, 'SOAP', '{"subjective":"Mother reports Aarav tolerated a new food texture once this week. Remains sensitive to loud noise.","objective":"Sensory-play circuit completed with two prompts. Pincer grasp emerging on threading task, 6/10 beads. Sought deep-pressure input independently.","assessment":"Mild sensory-processing differences; fine-motor skills developing. Responds well to a predictable sensory diet.","plan":"Introduce graded texture exposure; continue proprioceptive input; share home sensory-diet plan with parent."}', 'SIGNED', TIMESTAMP '2026-06-18 17:05:00'),
    (3,  TIMESTAMP '2026-06-22 16:00:00', 'SPEECH',       45, 'SOAP', '{"subjective":"Parent notes Aarav attempted a two-word phrase (more juice) at home.","objective":"Modelled two-word combinations across 15 trials: 6/15 imitated, 2/15 spontaneous. Increased eye contact during turn-taking games.","assessment":"Beginning two-word combinations with modelling. Social engagement improving in 1:1.","plan":"Target functional two-word phrases; expand requesting; continue joint-attention routines."}', 'SIGNED', TIMESTAMP '2026-06-22 17:05:00'),
    (4,  TIMESTAMP '2026-06-25 16:00:00', 'OCCUPATIONAL', 45, 'SOAP', '{"subjective":"Calmer transitions reported at nursery after visual schedule introduced.","objective":"Followed a 3-step visual schedule with one prompt. Completed crayon-grasp task with tripod grasp emerging. Tolerated brief messy-play.","assessment":"Improved self-regulation with visual supports; fine-motor and tolerance progressing.","plan":"Maintain visual schedule; grade messy-play exposure; add scissor-skill pre-cursors."}', 'SIGNED', TIMESTAMP '2026-06-25 17:05:00'),
    (5,  TIMESTAMP '2026-06-29 16:00:00', 'SPEECH',       45, 'SOAP', '{"subjective":"Mother reports increased spontaneous naming of familiar objects at home.","objective":"Spontaneous labelling 14/20 across daily-routine vocabulary; used two two-word phrases spontaneously. Sustained shared attention ~5 min.","assessment":"Steady expressive-vocabulary growth; two-word phrases generalising. Attention and engagement improving.","plan":"Introduce 5 new functional words; begin early sentence carriers (I want ___); continue school liaison."}', 'SIGNED', TIMESTAMP '2026-06-29 17:05:00'),
    (6,  TIMESTAMP '2026-07-02 16:00:00', 'OCCUPATIONAL', 45, 'SOAP', '{"subjective":"Parent reports Aarav now tries two previously-avoided food textures.","objective":"Completed fine-motor circuit with tripod grasp on 7/10 items. Regulated independently using sensory corner twice. Threading 8/10 beads.","assessment":"Consolidating fine-motor and self-regulation gains; food-texture tolerance broadening.","plan":"Progress scissor skills; continue graded texture programme; review sensory diet with parent and school."}', 'SIGNED', TIMESTAMP '2026-07-02 17:05:00'),
    (7,  TIMESTAMP '2026-07-06 16:00:00', 'SPEECH',       NULL, NULL, NULL, 'DRAFT', NULL),
    (8,  TIMESTAMP '2026-07-09 16:00:00', 'OCCUPATIONAL', NULL, NULL, NULL, 'DRAFT', NULL),
    (9,  TIMESTAMP '2026-07-13 16:00:00', 'SPEECH',       NULL, NULL, NULL, 'DRAFT', NULL),
    (10, TIMESTAMP '2026-07-16 16:00:00', 'OCCUPATIONAL', NULL, NULL, NULL, 'DRAFT', NULL),
    (11, TIMESTAMP '2026-07-20 16:00:00', 'SPEECH',       NULL, NULL, NULL, 'DRAFT', NULL),
    (12, TIMESTAMP '2026-07-23 16:00:00', 'OCCUPATIONAL', NULL, NULL, NULL, 'DRAFT', NULL)
  ) AS v(n, sched, disc, dur, fmt, notes, nstatus, signed);

  -- ── Phase 4: Assessment Reviews — SINGLE Speech (shared) + MDT (Speech/OT/Psych) ──
  INSERT INTO assessment_reviews (
    id, "caseId", type, phase, title, "scopeApproved", "dayMode", "questionnaireSent",
    "schoolInputRequested", "paymentStatus", "meetingAt", "syncMode", "reportText", approval,
    "reportDocumentId", recipients, "sharedAt", "createdById", "createdAt", "updatedAt"
  ) VALUES
    (
      'demo-arev-single-0001', v_case, 'SINGLE', 'SHARED', 'Speech & Language assessment', true,
      'single_day', true, true, 'PAID', NULL, NULL,
      'Aarav (6y) presents with an expressive-language delay of approximately 12 months and mild social-communication difficulties. Receptive language is a relative strength. Play is largely functional with emerging symbolic play. Recommendation: continue twice-weekly speech therapy with a focus on two-word phrase expansion and social communication; review in 12 weeks; liaise with nursery.',
      'approved', NULL, '{"parent":true,"school":true,"doctor":false}'::jsonb,
      TIMESTAMP '2026-06-10 15:00:00', v_ther, TIMESTAMP '2026-06-01 09:00:00', CURRENT_TIMESTAMP
    ),
    (
      'demo-arev-mdt-0001', v_case, 'MDT', 'REPORT', 'MDT developmental assessment', true,
      'multi_day', true, true, 'PAID', TIMESTAMP '2026-07-04 11:00:00', 'in_person',
      'Multidisciplinary assessment of Aarav (6y). Speech & Language: expressive delay ~12 months, emerging two-word phrases, receptive skills stronger. Occupational Therapy: mild sensory-processing differences (auditory/tactile), fine-motor skills developing, responds well to a sensory diet and visual supports. Psychology: cognitive skills broadly age-expected; social-communication profile consistent with the speech findings; query ASD to be monitored. Consensus: coordinated Speech + OT therapy block, parent coaching and school liaison; formal developmental review in 12 weeks.',
      'approved', NULL, NULL, NULL, v_ther, TIMESTAMP '2026-06-20 09:00:00', CURRENT_TIMESTAMP
    )
  ON CONFLICT (id) DO UPDATE SET
    type = EXCLUDED.type, phase = EXCLUDED.phase, title = EXCLUDED.title,
    "scopeApproved" = EXCLUDED."scopeApproved", "questionnaireSent" = EXCLUDED."questionnaireSent",
    "schoolInputRequested" = EXCLUDED."schoolInputRequested", "paymentStatus" = EXCLUDED."paymentStatus",
    "meetingAt" = EXCLUDED."meetingAt", "syncMode" = EXCLUDED."syncMode", "reportText" = EXCLUDED."reportText",
    approval = EXCLUDED.approval, recipients = EXCLUDED.recipients, "sharedAt" = EXCLUDED."sharedAt",
    "updatedAt" = CURRENT_TIMESTAMP;

  INSERT INTO assessment_disciplines (
    id, "assessmentReviewId", discipline, status, assignee, "clinicalRecordId", "reportTitle", flagged, "createdAt", "updatedAt"
  ) VALUES
    ('demo-adis-single-sp', 'demo-arev-single-0001', 'SPEECH',       'SUBMITTED', 'Dr. Sarah Thomas', v_speech, 'Speech & Language Assessment Report', false, TIMESTAMP '2026-06-01 09:00:00', CURRENT_TIMESTAMP),
    ('demo-adis-mdt-sp',    'demo-arev-mdt-0001',    'SPEECH',       'SUBMITTED', 'Dr. Sarah Thomas', v_speech, 'Speech & Language findings',        false, TIMESTAMP '2026-06-20 09:00:00', CURRENT_TIMESTAMP),
    ('demo-adis-mdt-ot',    'demo-arev-mdt-0001',    'OCCUPATIONAL', 'SUBMITTED', 'Dr. Sarah Thomas', v_occ,    'Occupational Therapy findings',     false, TIMESTAMP '2026-06-20 09:00:00', CURRENT_TIMESTAMP),
    ('demo-adis-mdt-psy',   'demo-arev-mdt-0001',    'PSYCHOLOGY',   'SUBMITTED', 'Dr. Sarah Thomas', NULL,     'Psychology / cognitive findings',   false, TIMESTAMP '2026-06-20 09:00:00', CURRENT_TIMESTAMP)
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status, assignee = EXCLUDED.assignee, "clinicalRecordId" = EXCLUDED."clinicalRecordId",
    "reportTitle" = EXCLUDED."reportTitle", flagged = EXCLUDED.flagged, "updatedAt" = CURRENT_TIMESTAMP;

  RAISE NOTICE 'Care Journey demo data seeded for % (case %)', 'UPL-DEMO-0001', v_case;
END $seed$;
