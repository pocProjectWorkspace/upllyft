// prisma/seeds/seed-dr-meena-cases.ts
// Seeds 3 complete cases for dr.meena@therapy.com with realistic Indian child development therapy data
import {
  PrismaClient,
  Role,
  CaseStatus,
  IEPStatus,
  GoalStatus,
  MilestoneStatus,
  AttendanceStatus,
  SessionNoteFormat,
  CaseDocumentType,
  BillingStatus,
  ConsentType,
  WorksheetType,
  WorksheetStatus,
  WorksheetDifficulty,
  WorksheetDataSource,
  WorksheetAssignmentStatus,
  WorksheetColorMode,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient({ log: ['warn', 'error'] });

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  console.log('🌱 Seeding Dr. Meena case management data...\n');

  // ─── CLEANUP PREVIOUS SEED DATA ──────────────────────────
  console.log('Cleaning up previous Dr. Meena case data...');
  const existingCases = await prisma.case.findMany({
    where: { caseNumber: { startsWith: 'DRM-' } },
    select: { id: true },
  });
  const caseIds = existingCases.map((c) => c.id);

  if (caseIds.length > 0) {
    await prisma.sessionGoalProgress.deleteMany({ where: { session: { caseId: { in: caseIds } } } });
    await prisma.caseAuditLog.deleteMany({ where: { caseId: { in: caseIds } } });
    await prisma.caseConsent.deleteMany({ where: { caseId: { in: caseIds } } });
    await prisma.caseBilling.deleteMany({ where: { caseId: { in: caseIds } } });
    await prisma.caseShare.deleteMany({ where: { caseId: { in: caseIds } } });
    await prisma.caseDocument.deleteMany({ where: { caseId: { in: caseIds } } });
    await prisma.caseSession.deleteMany({ where: { caseId: { in: caseIds } } });
    await prisma.caseInternalNote.deleteMany({ where: { caseId: { in: caseIds } } });
    await prisma.worksheetAssignment.deleteMany({ where: { caseId: { in: caseIds } } });
    await prisma.worksheet.deleteMany({ where: { caseId: { in: caseIds } } });
    await prisma.iEPGoal.deleteMany({ where: { iep: { caseId: { in: caseIds } } } });
    await prisma.iEP.deleteMany({ where: { caseId: { in: caseIds } } });
    await prisma.milestone.deleteMany({ where: { plan: { caseId: { in: caseIds } } } });
    await prisma.milestonePlan.deleteMany({ where: { caseId: { in: caseIds } } });
    await prisma.caseTherapist.deleteMany({ where: { caseId: { in: caseIds } } });
    await prisma.case.deleteMany({ where: { id: { in: caseIds } } });
  }
  console.log(`  ✓ Cleaned up ${caseIds.length} existing DRM cases\n`);

  const passwordHash = await bcrypt.hash('Test@1234', 10);

  // ─── FIND OR CREATE DR. MEENA ──────────────────────────
  console.log('Looking up dr.meena@therapy.com...');
  let meenaUser = await prisma.user.findUnique({
    where: { email: 'dr.meena@therapy.com' },
  });

  if (!meenaUser) {
    console.log('  dr.meena@therapy.com not found, creating...');
    meenaUser = await prisma.user.create({
      data: {
        email: 'dr.meena@therapy.com',
        name: 'Dr. Meena Sharma',
        password: passwordHash,
        role: Role.THERAPIST,
        emailVerified: new Date(),
        userProfile: {
          create: {
            fullName: 'Dr. Meena Sharma',
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            phoneNumber: '+91 98765 43210',
            occupation: 'Child Development Therapist',
          },
        },
      },
    });
  } else {
    // Ensure password matches for testing
    await prisma.user.update({ where: { id: meenaUser.id }, data: { password: passwordHash } });
  }
  console.log(`  ✓ Dr. Meena user: ${meenaUser.id}`);

  // Find or create therapist profile
  let meenaProfile = await prisma.therapistProfile.findUnique({
    where: { userId: meenaUser.id },
  });

  if (!meenaProfile) {
    meenaProfile = await prisma.therapistProfile.create({
      data: {
        userId: meenaUser.id,
        bio: 'Pediatric developmental therapist with 12 years of experience specializing in autism spectrum disorders, ADHD, and speech-language delays. Certified in ABA, DIR/Floortime, and PECS. Fluent in English, Hindi, and Marathi.',
        specializations: ['Autism Spectrum Disorder', 'ADHD', 'Speech & Language Delay', 'Sensory Processing', 'ABA Therapy'],
        yearsExperience: 12,
        credentials: ['RCI-CL/12345', 'BCBA-D', 'IACC Certified'],
        title: 'Senior Child Development Therapist',
        languages: ['English', 'Hindi', 'Marathi'],
        acceptingBookings: true,
        isActive: true,
        defaultTimezone: 'Asia/Kolkata',
      },
    });
  }
  console.log(`  ✓ Dr. Meena therapist profile: ${meenaProfile.id}`);

  // ─── CREATE PARENT USERS ───────────────────────────────
  console.log('Creating parent users...');
  const parentConfigs = [
    { email: 'parent.kavita@test.com', name: 'Kavita Deshmukh', city: 'Mumbai', relationship: 'Mother' },
    { email: 'parent.sneha@test.com', name: 'Sneha Kulkarni', city: 'Pune', relationship: 'Mother' },
    { email: 'parent.ravi@test.com', name: 'Ravi Menon', city: 'Mumbai', relationship: 'Father' },
  ];

  const parents: any[] = [];
  for (const p of parentConfigs) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email,
        name: p.name,
        password: passwordHash,
        role: Role.USER,
        emailVerified: new Date(),
        userProfile: {
          create: {
            fullName: p.name,
            relationshipToChild: p.relationship,
            city: p.city,
            state: 'Maharashtra',
            country: 'India',
          },
        },
      },
      include: { userProfile: true },
    });
    parents.push(user);
  }
  console.log(`  ✓ ${parents.length} parents created`);

  // ─── CREATE CHILDREN ───────────────────────────────────
  console.log('Creating children...');

  const childConfigs = [
    {
      firstName: 'Arjun',
      nickname: 'Aju',
      dob: '2023-02-10',
      gender: 'Male',
      parentIdx: 0,
      hasCondition: true,
      diagnosisStatus: 'Autism Spectrum Disorder Level 1, ADHD Combined Type',
      schoolType: 'Mainstream with shadow teacher',
      grade: 'Nursery',
      primaryLanguage: 'Hindi',
      referralSource: 'Pediatric Neurologist (Dr. Rajesh Nair)',
      developmentalConcerns: 'Delayed speech milestones, limited eye contact, repetitive hand movements, difficulty with transitions, sensory sensitivities to loud sounds',
      delayedMilestones: true,
      delayedMilestonesDetails: 'First words at 22 months, not combining words at 30 months. Social smile present but limited reciprocal interaction.',
      eatingIssues: true,
      eatingDetails: 'Limited food repertoire — only accepts 6-7 foods. Aversion to textured foods. Prefers crunchy items.',
      sleepIssues: false,
      previousAssessments: true,
    },
    {
      firstName: 'Priya',
      nickname: 'Piyu',
      dob: '2021-01-15',
      gender: 'Female',
      parentIdx: 1,
      hasCondition: true,
      diagnosisStatus: 'Expressive Language Disorder, Receptive Language Delay',
      schoolType: 'Mainstream',
      grade: 'Senior KG',
      primaryLanguage: 'Marathi',
      referralSource: 'Speech-Language Pathologist (Dr. Swati Joshi, KEM Hospital)',
      developmentalConcerns: 'Significantly limited expressive vocabulary for age. Uses gestures and pointing more than words. Understands simple instructions but struggles with 2-step commands.',
      delayedMilestones: true,
      delayedMilestonesDetails: 'First words at 18 months. At 5 years, vocabulary approximately 80-100 words. Not using 3+ word sentences consistently.',
      eatingIssues: false,
      sleepIssues: false,
      previousAssessments: true,
    },
    {
      firstName: 'Rohan',
      nickname: 'Ro',
      dob: '2022-04-22',
      gender: 'Male',
      parentIdx: 2,
      hasCondition: false,
      diagnosisStatus: 'Pending — suspected sensory processing disorder',
      schoolType: 'Play school',
      grade: 'Playgroup',
      primaryLanguage: 'English',
      referralSource: 'Parent self-referral via Upllyft platform',
      developmentalConcerns: 'Extreme aversion to certain food textures, covers ears at everyday sounds (mixer, doorbell), avoids playground equipment, refuses to walk on grass or sand barefoot. Parents report frequent meltdowns during meal times and in noisy environments.',
      delayedMilestones: false,
      eatingIssues: true,
      eatingDetails: 'Severe food aversion — only accepts smooth purees, milk, and plain rice. Gags on any textured food. Refuses fruits and vegetables entirely.',
      sleepIssues: true,
      sleepDetails: 'Difficulty falling asleep in noisy environments. Needs complete darkness and white noise machine.',
      previousAssessments: false,
    },
  ];

  const children: any[] = [];
  for (const c of childConfigs) {
    const parent = parents[c.parentIdx];
    const child = await prisma.child.create({
      data: {
        profileId: parent.userProfile!.id,
        firstName: c.firstName,
        nickname: c.nickname,
        dateOfBirth: new Date(c.dob),
        gender: c.gender,
        hasCondition: c.hasCondition,
        diagnosisStatus: c.diagnosisStatus,
        schoolType: c.schoolType,
        grade: c.grade,
        primaryLanguage: c.primaryLanguage,
        referralSource: c.referralSource,
        developmentalConcerns: c.developmentalConcerns,
        delayedMilestones: c.delayedMilestones ?? false,
        delayedMilestonesDetails: c.delayedMilestonesDetails,
        eatingIssues: c.eatingIssues ?? false,
        eatingDetails: c.eatingDetails,
        sleepIssues: c.sleepIssues ?? false,
        sleepDetails: (c as any).sleepDetails,
        previousAssessments: c.previousAssessments ?? false,
        city: parentConfigs[c.parentIdx].city,
        state: 'Maharashtra',
      },
    });
    children.push(child);
  }
  console.log(`  ✓ ${children.length} children created`);

  // ─── CREATE CASES ──────────────────────────────────────
  console.log('Creating cases...');
  const now = new Date();
  const caseYear = now.getFullYear();
  const caseMonth = String(now.getMonth() + 1).padStart(2, '0');

  const caseConfigs = [
    { childIdx: 0, status: CaseStatus.ACTIVE, daysAgoOpened: 90, diagnosis: 'Autism Spectrum Disorder Level 1 (F84.0), ADHD Combined Type (F90.2)', referralSource: 'Dr. Rajesh Nair, Pediatric Neurologist, Lilavati Hospital, Mumbai', notes: 'Referred after ADOS-2 assessment confirmed ASD Level 1. Co-occurring ADHD diagnosed via Conners-3 parent/teacher rating scales. Family motivated and highly engaged in therapy process.' },
    { childIdx: 1, status: CaseStatus.ACTIVE, daysAgoOpened: 42, diagnosis: 'Expressive Language Disorder (F80.1), Receptive Language Delay (F80.2)', referralSource: 'Dr. Swati Joshi, SLP, KEM Hospital, Pune', notes: 'Bilingual household (Marathi/English). Speech assessment shows expressive language at 2.5-year level, receptive at 3.5-year level. Hearing assessment normal. No ASD indicators on M-CHAT-R.' },
    { childIdx: 2, status: CaseStatus.ACTIVE, daysAgoOpened: 7, diagnosis: 'Pending formal assessment — suspected Sensory Processing Disorder', referralSource: 'Parent self-referral', notes: 'Intake case. Parents describe significant sensory sensitivities: auditory hypersensitivity, tactile defensiveness (food textures, grass, sand), vestibular avoidance. Initial screening suggests sensory over-responsivity pattern. Full Sensory Profile-2 assessment scheduled.' },
  ];

  const cases: any[] = [];
  for (let i = 0; i < caseConfigs.length; i++) {
    const cfg = caseConfigs[i];
    const caseNumber = `DRM-${caseYear}${caseMonth}-${String(i + 1).padStart(3, '0')}`;

    const c = await prisma.case.create({
      data: {
        caseNumber,
        childId: children[cfg.childIdx].id,
        primaryTherapistId: meenaProfile.id,
        status: cfg.status,
        diagnosis: cfg.diagnosis,
        referralSource: cfg.referralSource,
        notes: cfg.notes,
        openedAt: daysAgo(cfg.daysAgoOpened),
      },
    });
    cases.push(c);
  }
  console.log(`  ✓ ${cases.length} cases created`);

  // ─── CASE 1: ARJUN — SESSIONS ─────────────────────────
  console.log('Creating sessions for Case 1 (Arjun)...');
  const arjunSessions = [
    {
      daysAgo: 84, duration: 60, type: 'Initial Assessment',
      format: SessionNoteFormat.NARRATIVE,
      raw: `Initial comprehensive assessment session with Arjun (3y) and mother Kavita. Conducted developmental history intake, behavioral observation, and preliminary screening.\n\nBehavioral Observations:\n- Arjun entered the room cautiously, did not make eye contact with therapist for first 10 minutes\n- Engaged in parallel play with train set; lined up trains by color rather than functional play\n- Demonstrated echolalia — repeated therapist\'s questions instead of answering\n- Showed distress when train set was put away (cried for 3 minutes, calmed with deep pressure)\n- Responded to name 2/5 times\n- Mother reports daily meltdowns during transitions, especially leaving playground\n\nStrengths identified: Strong visual memory, color/shape recognition above age level, affectionate with family members once comfortable.\n\nRecommendation: 2x weekly sessions — 1 ABA-based structured session + 1 DIR/Floortime play-based session. Begin sensory diet at home.`,
      structured: {
        objectives: 'Comprehensive developmental assessment and treatment planning',
        interventions: 'Developmental history intake, behavioral observation, M-CHAT-R/F, preliminary Sensory Profile screening',
        response: 'Arjun was initially anxious but gradually warmed up. Mother provided detailed history. Assessment confirmed ASD Level 1 presentation with co-occurring ADHD symptoms.',
        plan: 'Begin bi-weekly therapy: Monday (ABA structured) + Thursday (DIR/Floortime). Provide parent with visual schedule templates and sensory diet recommendations. Schedule follow-up ADOS-2 in 3 months.',
      },
      aiSummary: 'Initial assessment confirmed ASD Level 1 with ADHD. Key areas: social communication, transitions, sensory regulation. Strengths in visual processing. Recommended bi-weekly therapy starting immediately.',
    },
    {
      daysAgo: 77, duration: 50, type: 'ABA Structured Session',
      format: SessionNoteFormat.SOAP,
      raw: `S: Mother reports Arjun used visual schedule at home 3 out of 7 days. Meltdowns reduced from daily to 4-5 times/week. Arjun said "more train" spontaneously yesterday — first 2-word combination reported at home.\n\nO: DTT targeting receptive identification of body parts — Arjun correctly identified eyes, nose, mouth, hands (4/6 targets, 67%). Joint attention: pointed to airplane outside window and looked at therapist (spontaneous shared attention episode). Token board: earned 4/5 tokens before requesting break.\n\nA: Positive early response to structured approach. Joint attention emerging naturally which is encouraging. Receptive language improving faster than expressive. Token economy effective for maintaining engagement.\n\nP: Continue DTT for receptive ID, add 2 more body parts. Introduce PECS Phase I for requesting preferred items. Send parent video of token board technique for home use.`,
      structured: {
        objectives: 'Receptive identification of body parts, joint attention, token economy introduction',
        interventions: 'DTT (Discrete Trial Training), token board, naturalistic joint attention opportunities',
        response: 'Arjun identified 4/6 body parts correctly. Spontaneous joint attention observed. Completed token board with one break.',
        plan: 'Expand DTT targets, introduce PECS Phase I, parent training on token economy.',
      },
      aiSummary: null,
    },
    {
      daysAgo: 63, duration: 50, type: 'DIR/Floortime Session',
      format: SessionNoteFormat.NARRATIVE,
      raw: `Floortime play session. Set up preferred activity (train tracks). Followed Arjun\'s lead for 15 minutes — he allowed me to add tracks alongside his. Opened 4 circles of communication when I made train go "wrong way" — he looked at me, said "no," redirected my train, and smiled when I complied.\n\nSensory component: Introduced therapy putty during break. Arjun initially refused but accepted after watching me play with it. Tolerated putty for 2 minutes (new texture accepted — good progress on tactile sensitivity).\n\nParent coaching: Demonstrated Floortime approach to Kavita. She practiced joining Arjun\'s play — good natural instinct for following his lead. Suggested 20 minutes daily Floortime at home.`,
      structured: {
        objectives: 'Expand circles of communication, introduce new textures through play',
        interventions: 'DIR/Floortime, sensory integration through play, parent coaching',
        response: '4 circles of communication opened. Accepted new texture (therapy putty) for 2 minutes. Mother engaged well in coaching.',
        plan: 'Continue Floortime approach. Gradually increase sensory exposure. Parent to practice 20 min daily.',
      },
      aiSummary: 'Good progress in communication circles (4 opened). New texture accepted. Mother coached on Floortime technique for home practice.',
    },
    {
      daysAgo: 49, duration: 50, type: 'ABA Structured Session',
      format: SessionNoteFormat.SOAP,
      raw: `S: Mother reports using PECS at home for requesting. Arjun independently used "I want" + "train" card 3 times this week. School shadow teacher reports improved sitting tolerance during circle time (up to 8 minutes from 3).\n\nO: PECS Phase II: Arjun traveled across room to exchange picture card 8/10 trials. DTT body parts: 6/6 correct (mastered). New target: emotions (happy, sad, angry) — identified "happy" correctly in 4/5 trials. Token board: completed full 5-token set twice without break requests.\n\nA: Excellent progress on PECS Phase II — ready to move to Phase III (picture discrimination) next session. Body parts target mastered. Emotion recognition emerging. Increased tolerance for structured activities is significant.\n\nP: PECS Phase III introduction. Begin emotion recognition program. Coordinate with school shadow teacher on generalization targets.`,
      structured: {
        objectives: 'PECS Phase II mastery, new DTT targets (emotions), attention building',
        interventions: 'PECS Phase II exchange, DTT emotion identification, token economy',
        response: 'PECS Phase II: 8/10 correct. Body parts mastered. Emotions emerging (happy 4/5). Full token sets completed.',
        plan: 'PECS Phase III, emotion program, school coordination.',
      },
      aiSummary: 'Strong progress — PECS Phase II nearly mastered, body parts target achieved, emotion recognition beginning. School sitting tolerance improved significantly.',
    },
    {
      daysAgo: 35, duration: 55, type: 'DIR/Floortime Session',
      format: SessionNoteFormat.NARRATIVE,
      raw: `Productive session focusing on social reciprocity and pretend play. Arjun initiated play with kitchen set today — first time choosing a pretend play activity over trains. He "cooked" food and offered it to me saying "eat khana" (eat food). This is a significant milestone — combining pretend play with functional 2-word communication.\n\nWe expanded the play theme: I pretended to be hungry, he "cooked" more. He laughed when I said food was "too hot" and blew on it — shared humor is emerging. Total interaction maintained for 12 minutes with 8 circles of communication opened.\n\nSensory: Tolerated finger painting for 5 minutes today (was 0 minutes 6 weeks ago). Wiped hands on towel independently when done — good self-regulation.\n\nParent update: Kavita reports Arjun is starting to seek out his older sister for play. He brought her a toy yesterday and waited for response — huge social initiation milestone.`,
      structured: {
        objectives: 'Expand pretend play repertoire, social reciprocity, sensory tolerance',
        interventions: 'DIR/Floortime with pretend play themes, sensory integration (finger painting)',
        response: 'Arjun initiated pretend play, used functional 2-word phrase, maintained 12-min interaction with 8 communication circles. Finger painting tolerance improved to 5 min.',
        plan: 'Expand pretend play scenarios. Continue sensory integration. Encourage peer interaction opportunities.',
      },
      aiSummary: 'Major milestone: Arjun initiated pretend play and used functional 2-word phrase. Social reciprocity and sensory tolerance showing consistent improvement.',
    },
    {
      daysAgo: 21, duration: 50, type: 'ABA Structured Session',
      format: SessionNoteFormat.SOAP,
      raw: `S: Kavita reports using visual schedule consistently now. Transition meltdowns reduced to 1-2 per week (from daily at intake). Shadow teacher reports Arjun said "hi" to a classmate independently for first time.\n\nO: PECS Phase III (discrimination between 2 pictures): Arjun selected correct picture 9/10 trials for preferred items. Emotion recognition: identifies happy (5/5), sad (4/5), angry (3/5). New: social greetings program — waved "hi" to me at session start with verbal prompt; said "bye" independently at end. Self-regulation: used deep breathing card independently when frustrated during a difficult task.\n\nA: PECS Phase III progressing well. Emotion recognition improving steadily. Social greeting emerging. Independent use of self-regulation strategy is very encouraging — shows internalization of coping skills.\n\nP: PECS Phase III — increase to 3-picture discrimination. Continue emotion program, add "scared." Social stories for playground scenarios. Plan school visit to observe generalization.`,
      structured: {
        objectives: 'PECS Phase III discrimination, emotion recognition expansion, social greetings',
        interventions: 'PECS Phase III, DTT emotions, social greeting training, self-regulation cards',
        response: 'PECS Phase III: 9/10. Emotions: happy mastered, sad/angry emerging. Spontaneous "bye." Used breathing card independently.',
        plan: 'Expand PECS discrimination, add "scared" emotion, social stories, school visit.',
      },
      aiSummary: null,
    },
    {
      daysAgo: 14, duration: 50, type: 'Parent Training + Review',
      format: SessionNoteFormat.NARRATIVE,
      raw: `Mid-term parent training and progress review session with Kavita and her husband Ajay (father attending for first time).\n\nReviewed progress across all domains:\n- Communication: from 5-10 single words to 20+ 2-word combinations in 2.5 months\n- Social: spontaneous greetings, pretend play initiation, seeking sibling for play\n- Self-regulation: meltdowns 1-2/week (from 7+/week), uses deep breathing independently\n- Sensory: accepting 3 new textures (putty, finger paint, playdough)\n\nDemonstrated techniques to father:\n- Visual schedule implementation\n- PECS usage and reinforcement\n- Floortime play engagement\n- Sensory diet activities (heavy work, deep pressure)\n\nFather was receptive and committed to implementing strategies at home. Both parents expressed satisfaction with progress. Discussed IEP goals and adjusted targets upward for next quarter.\n\nHome program updated: Added structured social play dates (1x/week with neurotypical peer), daily sensory diet schedule, emotion coaching script for parents.`,
      structured: {
        objectives: 'Parent training for father, progress review, home program update',
        interventions: 'Parent modeling, demonstration of ABA/Floortime techniques, sensory diet education',
        response: 'Both parents engaged. Father committed to active participation. Progress exceeding initial projections across all domains.',
        plan: 'Continue current frequency. Add structured peer play dates. Update IEP goals. Next formal review in 6 weeks.',
      },
      aiSummary: 'Comprehensive progress review shows significant gains across all domains in 2.5 months. Father engaged in training. Home program expanded to include peer play dates and full sensory diet.',
    },
    {
      daysAgo: 7, duration: 50, type: 'ABA Structured Session',
      format: SessionNoteFormat.SOAP,
      raw: `S: Kavita reports successful play date with neighbor\'s child (Aarav and Veer played for 25 minutes). Arjun used PECS board to request "more blocks" from Veer. Father Ajay practicing Floortime in evenings — Arjun is responding well to dad\'s involvement.\n\nO: PECS Phase III with 3-picture discrimination: 8/10 correct. Beginning Phase IV (sentence strip: "I want" + item). Arjun constructed "I want ball" independently on first attempt. Emotion identification: all 4 basic emotions (happy, sad, angry, scared) at 80%+ accuracy. New: identifying emotions in picture book characters (3/5 correct — transfer to new context).\n\nSocial skills: Practiced turn-taking with board game. Arjun waited for turn 4/5 times with visual timer support. Said "my turn" appropriately.\n\nA: Ready for PECS Phase IV. Emotion program showing good generalization. Turn-taking with visual support effective. Peer play date success is very encouraging for social development.\n\nP: PECS Phase IV sentence construction. Emotion identification in naturalistic contexts. Plan second peer play date. Begin preparing for school transition to LKG (starts April).`,
      structured: {
        objectives: 'PECS Phase IV intro, emotion generalization, turn-taking',
        interventions: 'PECS sentence strip, emotion identification in books, turn-taking with visual timer',
        response: 'PECS Phase IV: first attempt successful. Emotions 80%+. Turn-taking 4/5 with timer. Peer play date went well.',
        plan: 'PECS Phase IV, naturalistic emotion practice, more peer play, school transition prep.',
      },
      aiSummary: 'Arjun progressing to PECS Phase IV. Emotions generalized to book characters. Peer play date successful. Excellent trajectory — preparing for LKG school transition.',
    },
  ];

  const arjunSessionRecords: any[] = [];
  for (const s of arjunSessions) {
    const session = await prisma.caseSession.create({
      data: {
        caseId: cases[0].id,
        therapistId: meenaUser.id,
        scheduledAt: daysAgo(s.daysAgo),
        actualDuration: s.duration,
        attendanceStatus: AttendanceStatus.PRESENT,
        sessionType: s.type,
        noteFormat: s.format,
        rawNotes: s.raw,
        structuredNotes: s.structured,
        aiSummary: s.aiSummary ?? undefined,
      },
    });
    arjunSessionRecords.push(session);
  }
  console.log(`  ✓ ${arjunSessionRecords.length} sessions for Arjun`);

  // ─── CASE 2: PRIYA — SESSIONS ─────────────────────────
  console.log('Creating sessions for Case 2 (Priya)...');
  const priyaSessions = [
    {
      daysAgo: 40, duration: 55, type: 'Initial Assessment',
      format: SessionNoteFormat.NARRATIVE,
      raw: `Initial speech-language assessment with Priya (5y) and mother Sneha.\n\nStandardized Assessment Results:\n- Receptive language (PPVT-4 adapted): Age equivalent 3.5 years (1.5-year delay)\n- Expressive language (Clinical observation): Age equivalent 2.5-3 years (2-2.5-year delay)\n- Articulation: Multiple phonological processes present — fronting, stopping, cluster reduction\n- Oral motor exam: Low tone in cheeks and lips; reduced tongue lateralization\n- Hearing: Normal (audiometry report from KEM Hospital, dated 2 months ago)\n\nBehavioral Observations:\n- Priya is a friendly, engaged child who makes good eye contact\n- Communicates primarily through gestures, pointing, and single words\n- Understands simple 1-step instructions consistently, struggles with 2-step\n- Uses approximately 80-100 words (parent report + session observation)\n- Attempts to combine words but productions often unintelligible to unfamiliar listeners\n\nBilingual context: Marathi at home, English at school. Mother reports better comprehension in Marathi. Code-mixing observed.\n\nRecommendation: 2x weekly speech therapy sessions focusing on expressive language building, articulation, and oral motor strengthening. Parent coaching essential for carry-over.`,
      structured: {
        objectives: 'Comprehensive speech-language assessment',
        interventions: 'PPVT-4, articulation screening, oral motor exam, language sample, parent interview',
        response: 'Priya was cooperative throughout. Results indicate significant expressive language delay with milder receptive delay. Articulation concerns secondary to language delay.',
        plan: 'Begin 2x/week sessions: language stimulation + articulation. Start oral motor exercises. Parent coaching on language expansion techniques.',
      },
      aiSummary: 'Initial SLP assessment reveals 2-2.5 year expressive delay, 1.5-year receptive delay. Articulation affected by phonological processes. Good prognosis given engagement level and parent motivation.',
    },
    {
      daysAgo: 33, duration: 45, type: 'Speech Therapy',
      format: SessionNoteFormat.SOAP,
      raw: `S: Sneha reports Priya said "mama pani de" (mama give water) at home — first 3-word combination! Mother has been using parallel talk and expansion techniques daily. School teacher notes improved participation in circle time.\n\nO: Oral motor warm-up: lip rounds (10 reps), tongue lateralization with lollipop (improved from last week). Target sounds /p/, /b/, /m/ in CV words: Priya produced correctly in 7/10 trials each. Language activity: named 8/12 common objects in picture cards. Carrier phrase "I want ___": used with 4 items with moderate cueing. Receptive: followed 2-step command "pick up the ball AND put it on the table" 3/5 times.\n\nA: Good progress on bilabial sounds. First 3-word combination at home is a significant milestone. Receptive 2-step commands emerging. Mother\'s consistent home practice is clearly accelerating progress.\n\nP: Continue oral motor exercises. Add /t/, /d/ targets. Expand carrier phrases to 3-word combinations. Begin thematic vocabulary units (animals, food, body parts). Send home practice cards for the week.`,
      structured: {
        objectives: 'Bilabial sound production, carrier phrases, 2-step commands',
        interventions: 'Oral motor exercises, articulation drills, picture naming, carrier phrase practice',
        response: 'Bilabials 7/10 correct. Named 8/12 objects. Carrier phrase with moderate cueing. 2-step commands: 3/5.',
        plan: 'Add /t/ /d/ targets, expand to 3-word combinations, thematic vocabulary.',
      },
      aiSummary: null,
    },
    {
      daysAgo: 26, duration: 45, type: 'Speech Therapy',
      format: SessionNoteFormat.SOAP,
      raw: `S: Mother reports Priya is using more words at home. Vocabulary seems to have "exploded" this week — mother counted 15 new words. Priya asked "kya hai?" (what is it?) for the first time while looking at a book.\n\nO: Thematic vocabulary — animals: Priya named 10/15 animals in picture cards (up from 6 last week). Produced /t/ correctly in initial position 6/10 trials, /d/ in 5/10. Sentence building: "I want [item]" independently with 6 items. "I see [animal]" with model for 4 items. Receptive: followed 2-step commands 4/5 times. Question comprehension: answered "what" questions 7/10, "where" questions 5/10.\n\nA: Vocabulary expanding rapidly — consistent with language burst pattern often seen when therapy begins at this age. Alveolar sounds emerging. Question asking is a huge pragmatic milestone (shows linguistic curiosity). Receptive gains supporting expressive growth.\n\nP: Continue thematic vocabulary (food theme next week). Expand sentence frames. Introduce "who" questions. Begin narrative skill building with simple stories. Consider group session for peer language modeling.`,
      structured: {
        objectives: 'Vocabulary expansion (animals), alveolar sounds, sentence building, question comprehension',
        interventions: 'Thematic picture cards, articulation drills, sentence frame practice, question-answer activities',
        response: 'Named 10/15 animals. /t/ 6/10, /d/ 5/10. Independent "I want" with 6 items. "What" questions 7/10.',
        plan: 'Food vocabulary theme, expand sentence frames, "who" questions, narrative skills.',
      },
      aiSummary: 'Vocabulary burst observed — 15 new words this week. First question asked spontaneously. Language development trajectory very positive.',
    },
    {
      daysAgo: 19, duration: 45, type: 'Speech Therapy',
      format: SessionNoteFormat.SOAP,
      raw: `S: Sneha reports Priya sang a nursery rhyme ("Twinkle Twinkle") at school — teacher was surprised. At home, Priya is now requesting food items by name instead of pointing. Also started saying "nahi" (no) emphatically — mother both happy and amused.\n\nO: Food vocabulary: named 12/15 items. Spontaneous language sample during play kitchen: 14 utterances in 10 min, MLU 2.3 words (up from 1.4 at assessment). Articulation: /t/ 8/10, /d/ 7/10, /k/ emerging (3/10). Narrative: retold "Very Hungry Caterpillar" with picture support — included 3 story elements (character, action, outcome). "Who" questions: 4/8 correct. Pragmatics: initiated conversation twice, maintained topic for 3 exchanges.\n\nA: MLU increase from 1.4 to 2.3 in 3 weeks is exceptional progress. Narrative skills emerging. Conversation initiation improving. Singing indicates phonological memory strengthening.\n\nP: Expand narrative activities. Introduce describing words (big/small, colors). Begin /k/ /g/ articulation focus. Plan parent workshop on reading aloud strategies. Consider reducing frequency to 1x/week in 4-6 weeks if progress continues.`,
      structured: {
        objectives: 'Food vocabulary, narrative skills, conversation initiation, /k/ introduction',
        interventions: 'Thematic vocabulary, language sample, story retell, conversation practice, articulation',
        response: 'MLU 2.3. Named 12/15 foods. Retold story with 3 elements. Initiated conversation twice. /k/ emerging.',
        plan: 'Narrative expansion, describing words, /k/ /g/ focus, parent reading workshop.',
      },
      aiSummary: 'Outstanding progress — MLU jumped from 1.4 to 2.3 in 3 weeks. Singing, story retelling, and conversation initiation all emerging. May be ready for reduced frequency soon.',
    },
    {
      daysAgo: 12, duration: 50, type: 'Speech Therapy + Parent Coaching',
      format: SessionNoteFormat.NARRATIVE,
      raw: `Combined session: 30 minutes direct therapy + 20 minutes parent coaching.\n\nDirect therapy:\n- Describing activity: Priya used "big red ball" and "small blue car" — first 3-word descriptive phrases! Color terms now functional (identifies and names 6 colors).\n- /k/ sound: 5/10 in isolation, 3/10 in words. Used tongue depressor for placement cue.\n- Story creation: We made a story about "Piyu ki kitty" (Priya\'s cat) using felt board. Priya contributed 6 sentences to the story with moderate support.\n- Pragmatics: took turns in storytelling, waited for my additions, added "and then..." transitions twice.\n\nParent coaching with Sneha:\n- Reviewed expansion technique: when Priya says "doggy run," mom says "Yes, the big doggy is running fast!"\n- Demonstrated shared book reading strategies: pause-point-praise, ask open questions\n- Discussed home literacy environment: recommended 15 min daily reading in both Marathi and English\n- Addressed Sneha\'s concern about bilingualism: reassured that bilingual exposure supports (not hinders) language development at this stage\n\nSneha is an excellent communication partner — she naturally uses many facilitative language strategies. Her consistent practice at home is a major factor in Priya\'s rapid progress.`,
      structured: {
        objectives: 'Descriptive language, /k/ articulation, story creation, parent coaching on expansion and reading',
        interventions: 'Descriptive activities, articulation with tactile cue, felt board storytelling, parent modeling',
        response: 'First 3-word descriptive phrases produced. /k/ improving. Story creation with 6 contributed sentences. Parent demonstrating excellent carry-over.',
        plan: 'Continue current approach. Begin preparing for progress report. Schedule meeting with school teacher for coordination.',
      },
      aiSummary: 'Priya producing 3-word descriptive phrases. Story creation skills emerging. Mother excellent communication partner. Progress exceeding expectations — consider reducing frequency at next review.',
    },
  ];

  const priyaSessionRecords: any[] = [];
  for (const s of priyaSessions) {
    const session = await prisma.caseSession.create({
      data: {
        caseId: cases[1].id,
        therapistId: meenaUser.id,
        scheduledAt: daysAgo(s.daysAgo),
        actualDuration: s.duration,
        attendanceStatus: AttendanceStatus.PRESENT,
        sessionType: s.type,
        noteFormat: s.format,
        rawNotes: s.raw,
        structuredNotes: s.structured,
        aiSummary: s.aiSummary ?? undefined,
      },
    });
    priyaSessionRecords.push(session);
  }
  console.log(`  ✓ ${priyaSessionRecords.length} sessions for Priya`);

  // ─── CASE 3: ROHAN — SESSION ──────────────────────────
  console.log('Creating session for Case 3 (Rohan)...');
  const rohanSession = await prisma.caseSession.create({
    data: {
      caseId: cases[2].id,
      therapistId: meenaUser.id,
      scheduledAt: daysAgo(5),
      actualDuration: 60,
      attendanceStatus: AttendanceStatus.PRESENT,
      sessionType: 'Initial Consultation / Intake Assessment',
      noteFormat: SessionNoteFormat.NARRATIVE,
      rawNotes: `Initial intake consultation with Rohan (4y) and both parents Ravi and Megha Menon.\n\nReferral Reason: Parents concerned about extreme food selectivity, noise sensitivity, and avoidance of playground equipment. No formal assessment done previously. Pediatrician said "he\'ll grow out of it" but parents feel concerns are increasing.\n\nParent Interview:\n- Food: Rohan accepts only smooth purees (dal, dahi), plain rice, milk, and 2 brands of biscuits. Gags on any food with texture. Mealtimes last 60-90 minutes with frequent crying. Has lost 1.5 kg in past 3 months.\n- Auditory: Covers ears at mixer grinder, pressure cooker whistle, doorbell, temple bells, dog barking. Has started refusing to go to birthday parties (music too loud).\n- Tactile: Refuses to walk barefoot on grass, sand, or rough surfaces. Removes socks if seams bother him. Doesn\'t like tags on clothing. Tolerates only 3-4 specific outfits.\n- Vestibular: Avoids swings, slides, and any equipment that takes feet off ground. Won\'t climb stairs without holding railing and parent\'s hand.\n- Proprioceptive: Seems to seek deep pressure — loves tight hugs, heavy blankets. Crashes into furniture frequently (parent unsure if intentional).\n\nBehavioral Observation:\n- Rohan stayed close to father initially. Made eye contact, smiled when addressed. Language age-appropriate — full sentences, asked "what is this?" about therapy toys.\n- Refused to touch playdough. Accepted dry sand briefly (10 seconds) then wiped hands on shirt.\n- Covered ears when another child cried in adjacent room.\n- Walked carefully around room, avoiding floor mats of different textures.\n- Good imaginative play with toy cars — created scenario of "going to the beach" (ironic given sand aversion).\n\nCognitive and language development appear age-appropriate. Social engagement good. Concerns are primarily sensory-motor in nature.\n\nPlan:\n1. Administer Sensory Profile-2 (parent questionnaire) — sent home today\n2. Schedule occupational therapy evaluation for detailed sensory-motor assessment\n3. Begin with sensory diet recommendations immediately (proprioceptive activities, gradual tactile exposure)\n4. Refer to pediatric nutritionist for food selectivity — weight loss is concerning\n5. Next appointment in 1 week to review Sensory Profile results and plan treatment`,
      structuredNotes: {
        objectives: 'Intake assessment for suspected sensory processing disorder',
        interventions: 'Developmental history, parent interview, behavioral observation, Sensory Profile-2 questionnaire provided',
        response: 'Rohan demonstrated clear sensory over-responsivity patterns across auditory, tactile, and vestibular domains. Proprioceptive seeking also observed. Cognitive and language age-appropriate.',
        plan: 'Sensory Profile-2 completion, OT evaluation, sensory diet initiation, nutritionist referral for weight management.',
      },
      aiSummary: 'Intake assessment reveals significant sensory over-responsivity across multiple domains. Language and cognition age-appropriate. Immediate priorities: Sensory Profile-2, OT evaluation, nutritionist referral for concerning weight loss.',
    },
  });
  console.log(`  ✓ 1 session for Rohan`);

  // ─── IEPs + GOALS ─────────────────────────────────────
  console.log('Creating IEPs and goals...');

  // Case 1: Arjun — 4 goals
  const arjunIep = await prisma.iEP.create({
    data: {
      caseId: cases[0].id,
      version: 1,
      status: IEPStatus.ACTIVE,
      createdById: meenaUser.id,
      approvedByTherapistAt: daysAgo(80),
      approvedByParentAt: daysAgo(78),
      reviewDate: daysFromNow(10),
      accommodations: {
        classroom: ['Visual schedule on desk', 'Preferential seating away from window', 'Transition warnings 5 minutes before activity change', 'Noise-cancelling headphones available'],
        sensory: ['Fidget tool allowed during circle time', 'Movement break every 20 minutes', 'Weighted lap pad during table work'],
        communication: ['PECS board available at all times', 'Allow extra response time (10 seconds)', 'Use visual instructions alongside verbal'],
      },
      servicesTracking: {
        'ABA Therapy': { frequency: '1x/week', duration: '50 min', provider: 'Dr. Meena Sharma' },
        'DIR/Floortime': { frequency: '1x/week', duration: '50 min', provider: 'Dr. Meena Sharma' },
        'Shadow Teacher': { frequency: 'Daily', duration: 'Full school day', provider: 'School-provided' },
      },
    },
  });

  const arjunGoals = [
    {
      domain: 'COMMUNICATION',
      goalText: 'Arjun will use PECS sentence strips to construct 3-4 word requests (e.g., "I want red ball") independently in 8/10 opportunities across home and school settings, as measured by therapist data collection and parent/teacher report.',
      targetDate: daysFromNow(90),
      currentProgress: 65,
      status: GoalStatus.IN_PROGRESS,
      baseline: 'At intake: 5-10 single words, no PECS usage. Currently: PECS Phase III, 20+ 2-word combinations.',
    },
    {
      domain: 'SOCIAL',
      goalText: 'Arjun will initiate and maintain reciprocal play interactions with a peer for at least 10 minutes, including turn-taking and sharing, in 3/5 opportunities during structured play dates, as measured by therapist observation and parent report.',
      targetDate: daysFromNow(90),
      currentProgress: 45,
      status: GoalStatus.IN_PROGRESS,
      baseline: 'At intake: parallel play only, no peer initiation. Currently: initiates with sibling, one successful peer play date (25 min).',
    },
    {
      domain: 'BEHAVIORAL',
      goalText: 'Arjun will independently use a self-regulation strategy (deep breathing, sensory tool, or break card) when frustrated or during transitions, reducing meltdowns to ≤1 per week, as measured by parent daily behavior log.',
      targetDate: daysFromNow(60),
      currentProgress: 70,
      status: GoalStatus.IN_PROGRESS,
      baseline: 'At intake: 7+ meltdowns/week, no self-regulation strategies. Currently: 1-2 meltdowns/week, uses deep breathing card independently.',
    },
    {
      domain: 'MOTOR',
      goalText: 'Arjun will demonstrate improved fine motor coordination by completing age-appropriate activities (pegboard, bead stringing, crayon grasp) with minimal assistance, in 4/5 trials, as measured by occupational therapy observation checklist.',
      targetDate: daysFromNow(120),
      currentProgress: 35,
      status: GoalStatus.IN_PROGRESS,
      baseline: 'At intake: palmar grasp, unable to complete pegboard. Currently: transitioning to tripod grasp, pegboard in 4 min (from 6 min).',
    },
  ];

  for (let g = 0; g < arjunGoals.length; g++) {
    await prisma.iEPGoal.create({
      data: {
        iepId: arjunIep.id,
        domain: arjunGoals[g].domain,
        goalText: arjunGoals[g].goalText,
        targetDate: arjunGoals[g].targetDate,
        currentProgress: arjunGoals[g].currentProgress,
        status: arjunGoals[g].status,
        linkedScreeningIndicators: { baseline: arjunGoals[g].baseline },
        order: g,
      },
    });
  }

  // Case 2: Priya — 3 goals
  const priyaIep = await prisma.iEP.create({
    data: {
      caseId: cases[1].id,
      version: 1,
      status: IEPStatus.ACTIVE,
      createdById: meenaUser.id,
      approvedByTherapistAt: daysAgo(35),
      approvedByParentAt: daysAgo(33),
      reviewDate: daysFromNow(50),
      accommodations: {
        classroom: ['Seat near teacher for auditory access', 'Visual aids for instructions', 'Buddy system for group activities'],
        communication: ['Allow Marathi responses in English-medium class', 'Provide picture cues for new vocabulary', 'Extra time for verbal responses'],
      },
      servicesTracking: {
        'Speech Therapy': { frequency: '2x/week', duration: '45 min', provider: 'Dr. Meena Sharma' },
        'School Coordination': { frequency: 'Monthly', duration: '30 min', provider: 'Dr. Meena Sharma + Class Teacher' },
      },
    },
  });

  const priyaGoals = [
    {
      domain: 'COMMUNICATION',
      goalText: 'Priya will increase her Mean Length of Utterance (MLU) to 3.5+ words during spontaneous conversation, using a variety of sentence types (declarative, interrogative, imperative), in 80% of communicative attempts, as measured by monthly language samples.',
      targetDate: daysFromNow(90),
      currentProgress: 55,
      status: GoalStatus.IN_PROGRESS,
      baseline: 'At assessment: MLU 1.4. Current: MLU 2.3. Target: 3.5+',
    },
    {
      domain: 'COMMUNICATION',
      goalText: 'Priya will follow 2-step unrelated instructions (e.g., "Give me the spoon and sit on the chair") in 8/10 trials, and answer who/what/where questions about a simple story in 7/10 trials, as measured by therapist data collection.',
      targetDate: daysFromNow(60),
      currentProgress: 50,
      status: GoalStatus.IN_PROGRESS,
      baseline: 'At assessment: 2-step commands 1/5, question comprehension limited. Current: 2-step 4/5, "what" 7/10, "where" 5/10.',
    },
    {
      domain: 'COMMUNICATION',
      goalText: 'Priya will produce target sounds /t/, /d/, /k/, /g/ correctly in the initial position of words in 8/10 trials during structured activities and 5/10 during conversation, as measured by articulation probes.',
      targetDate: daysFromNow(120),
      currentProgress: 40,
      status: GoalStatus.IN_PROGRESS,
      baseline: 'At assessment: fronting and stopping errors consistent. Current: /t/ 8/10, /d/ 7/10, /k/ 5/10, /g/ not yet targeted.',
    },
  ];

  for (let g = 0; g < priyaGoals.length; g++) {
    await prisma.iEPGoal.create({
      data: {
        iepId: priyaIep.id,
        domain: priyaGoals[g].domain,
        goalText: priyaGoals[g].goalText,
        targetDate: priyaGoals[g].targetDate,
        currentProgress: priyaGoals[g].currentProgress,
        status: priyaGoals[g].status,
        linkedScreeningIndicators: { baseline: priyaGoals[g].baseline },
        order: g,
      },
    });
  }
  console.log(`  ✓ 2 IEPs with 7 goals created`);

  // ─── MILESTONE PLANS ───────────────────────────────────
  console.log('Creating milestone plans...');

  // Case 1: Arjun — 5 milestones
  const arjunPlan = await prisma.milestonePlan.create({
    data: {
      caseId: cases[0].id,
      version: 1,
      status: 'active',
      sharedWithParent: true,
    },
  });

  const arjunMilestones = [
    { domain: 'COMMUNICATION', description: 'Uses PECS to request preferred items independently', status: MilestoneStatus.ACHIEVED, achievedAt: daysAgo(45), expectedAge: '24-30 months', order: 0 },
    { domain: 'SOCIAL', description: 'Responds to name and makes eye contact consistently', status: MilestoneStatus.ACHIEVED, achievedAt: daysAgo(60), expectedAge: '12 months', order: 1 },
    { domain: 'BEHAVIORAL', description: 'Uses self-regulation strategy independently when frustrated', status: MilestoneStatus.ACHIEVED, achievedAt: daysAgo(14), expectedAge: '36 months', order: 2 },
    { domain: 'SOCIAL', description: 'Engages in cooperative play with a peer for 10+ minutes', status: MilestoneStatus.ON_TRACK, expectedAge: '36-48 months', order: 3 },
    { domain: 'COMMUNICATION', description: 'Uses 3-4 word sentences to express wants, needs, and observations', status: MilestoneStatus.ON_TRACK, expectedAge: '30-36 months', order: 4 },
  ];

  for (const m of arjunMilestones) {
    await prisma.milestone.create({
      data: {
        planId: arjunPlan.id,
        domain: m.domain,
        description: m.description,
        status: m.status,
        expectedAge: m.expectedAge,
        achievedAt: m.achievedAt,
        order: m.order,
      },
    });
  }

  // Case 2: Priya — 3 milestones
  const priyaPlan = await prisma.milestonePlan.create({
    data: {
      caseId: cases[1].id,
      version: 1,
      status: 'active',
      sharedWithParent: true,
    },
  });

  const priyaMilestones = [
    { domain: 'COMMUNICATION', description: 'Produces 100+ functional words across home and school settings', status: MilestoneStatus.ACHIEVED, achievedAt: daysAgo(10), expectedAge: '18-24 months', order: 0 },
    { domain: 'COMMUNICATION', description: 'Consistently uses 3-word combinations in spontaneous speech', status: MilestoneStatus.ON_TRACK, expectedAge: '24-30 months', order: 1 },
    { domain: 'COMMUNICATION', description: 'Retells a simple story with beginning, middle, and end', status: MilestoneStatus.EMERGING, expectedAge: '48-60 months', order: 2 },
  ];

  for (const m of priyaMilestones) {
    await prisma.milestone.create({
      data: {
        planId: priyaPlan.id,
        domain: m.domain,
        description: m.description,
        status: m.status,
        expectedAge: m.expectedAge,
        achievedAt: m.achievedAt,
        order: m.order,
      },
    });
  }

  // Case 3: Rohan — 1 milestone
  const rohanPlan = await prisma.milestonePlan.create({
    data: {
      caseId: cases[2].id,
      version: 1,
      status: 'active',
      sharedWithParent: false,
    },
  });

  await prisma.milestone.create({
    data: {
      planId: rohanPlan.id,
      domain: 'ADAPTIVE',
      description: 'Intake assessment completed and Sensory Profile-2 administered',
      status: MilestoneStatus.ACHIEVED,
      achievedAt: daysAgo(5),
      expectedAge: 'N/A',
      order: 0,
    },
  });
  console.log(`  ✓ 3 milestone plans with 9 milestones created`);

  // ─── DOCUMENTS ─────────────────────────────────────────
  console.log('Creating documents...');
  const documents = [
    // Case 1: Arjun — 4 documents
    { caseIdx: 0, type: CaseDocumentType.ASSESSMENT, title: 'Intake Assessment Form — Arjun Deshmukh', content: 'Comprehensive intake form documenting developmental history, medical history, family background, and presenting concerns. Completed by mother Kavita Deshmukh on initial visit. Includes ADOS-2 referral report from Dr. Rajesh Nair, Lilavati Hospital.', fileUrl: null },
    { caseIdx: 0, type: CaseDocumentType.CONSENT, title: 'Consent for Treatment — Arjun Deshmukh', content: 'Signed consent for ABA therapy, DIR/Floortime, and sensory integration interventions. Includes consent for video recording of therapy sessions for training purposes. Signed by both parents Kavita and Ajay Deshmukh.', fileUrl: null },
    { caseIdx: 0, type: CaseDocumentType.PROGRESS_REPORT, title: 'Monthly Progress Report — Arjun — Month 2', content: `Progress Report: Arjun Deshmukh (DOB: 10-Feb-2023)\nReporting Period: Month 2 of Therapy\nTherapist: Dr. Meena Sharma\n\nCommunication: PECS usage progressing from Phase II to Phase III. 20+ 2-word combinations. First spontaneous 2-word utterance at home.\nSocial: Pretend play emerging. Joint attention improved. Initiating interactions with family members.\nBehavioral: Meltdowns reduced from 7+/week to 1-2/week. Independent use of deep breathing strategy.\nSensory: Tolerating 3 new textures. Visual schedule used consistently.\nMotor: Pegboard time improved. Transitioning to tripod grasp.\n\nOverall: Exceeding initial projections. Strong family involvement accelerating progress.`, fileUrl: null },
    { caseIdx: 0, type: CaseDocumentType.OTHER, title: 'Referral Letter — Dr. Rajesh Nair, Pediatric Neurologist', content: 'Referral from Dr. Rajesh Nair, Department of Pediatric Neurology, Lilavati Hospital, Mumbai. ADOS-2 Module 1 administered. Comparison score: 7 (autism spectrum). Recommendations: intensive behavioral intervention, speech therapy, occupational therapy for sensory concerns.', fileUrl: null },

    // Case 2: Priya — 3 documents
    { caseIdx: 1, type: CaseDocumentType.ASSESSMENT, title: 'Intake Form — Priya Kulkarni', content: 'Intake assessment documenting speech-language history, developmental milestones, bilingual exposure (Marathi/English), and school performance. Includes audiometry report from KEM Hospital (normal hearing).', fileUrl: null },
    { caseIdx: 1, type: CaseDocumentType.CONSENT, title: 'Consent for Speech Therapy — Priya Kulkarni', content: 'Signed consent for speech-language therapy services including direct therapy, parent coaching, and school consultation. Signed by mother Sneha Kulkarni.', fileUrl: null },
    { caseIdx: 1, type: CaseDocumentType.ASSESSMENT, title: 'Speech-Language Assessment Report — Priya Kulkarni', content: `Speech-Language Assessment Report\nClient: Priya Kulkarni (DOB: 15-Jan-2021, Age: 5y 1m)\nAssessment Date: ${daysAgo(40).toLocaleDateString()}\nAssessor: Dr. Meena Sharma, SLP\n\nTests Administered: PPVT-4 (adapted), Informal articulation screening, Oral motor exam, Language sample\n\nResults:\n- Receptive Language: Age equivalent 3.5 years (1.5-year delay)\n- Expressive Language: Age equivalent 2.5-3 years (2-2.5-year delay)\n- MLU: 1.4 (expected for age: 4.0-5.0)\n- Articulation: Multiple phonological processes (fronting, stopping, cluster reduction)\n- Oral Motor: Low tone in facial muscles, reduced tongue lateralization\n\nDiagnosis: Expressive Language Disorder (F80.1), Receptive Language Delay (F80.2)\nPrognosis: Good — high engagement, strong parent support, no comorbid conditions\nRecommendation: 2x/week speech therapy`, fileUrl: null },

    // Case 3: Rohan — 2 documents
    { caseIdx: 2, type: CaseDocumentType.OTHER, title: 'Referral Notes — Rohan Menon (Parent Self-Referral)', content: 'Parent self-referral via Upllyft platform. Father Ravi Menon describes concerns about food selectivity (accepts only 5-6 food items), noise sensitivity (covers ears at everyday household sounds), and avoidance of playground equipment. Pediatrician previously reassured parents. Parents seeking specialist evaluation.', fileUrl: null },
    { caseIdx: 2, type: CaseDocumentType.ASSESSMENT, title: 'Parent Questionnaire — Sensory Concerns — Rohan Menon', content: 'Detailed parent questionnaire completed by both parents documenting sensory behaviors across domains:\n- Auditory: 8/10 sensitivity (covers ears at mixer, doorbell, temple bells, dogs, parties)\n- Tactile: 9/10 sensitivity (food textures, barefoot on grass/sand, clothing tags, sock seams)\n- Vestibular: 7/10 avoidance (swings, slides, stairs, climbing)\n- Proprioceptive: 6/10 seeking (tight hugs, heavy blanket, crashing into furniture)\n- Visual: 3/10 (minimal concerns)\n- Olfactory: 4/10 (mild sensitivity to strong cooking smells)\n\nSensory Profile-2 questionnaire sent home for formal scoring.', fileUrl: null },
  ];

  for (const doc of documents) {
    await prisma.caseDocument.create({
      data: {
        caseId: cases[doc.caseIdx].id,
        type: doc.type,
        title: doc.title,
        content: doc.content,
        fileUrl: doc.fileUrl,
        createdById: meenaUser.id,
      },
    });
  }
  console.log(`  ✓ ${documents.length} documents created`);

  // ─── CONSENTS ──────────────────────────────────────────
  console.log('Creating consents...');
  const consents = [
    // Case 1: Arjun — 2 signed
    { caseIdx: 0, type: ConsentType.TREATMENT, parentIdx: 0, notes: 'Consent for ABA therapy, DIR/Floortime, and sensory integration. Includes video recording consent.' },
    { caseIdx: 0, type: ConsentType.SHARING, parentIdx: 0, notes: 'Consent to share progress reports with shadow teacher and school SENCO coordinator.' },
    // Case 2: Priya — 2 signed
    { caseIdx: 1, type: ConsentType.TREATMENT, parentIdx: 1, notes: 'Consent for speech-language therapy and parent coaching sessions.' },
    { caseIdx: 1, type: ConsentType.SHARING, parentIdx: 1, notes: 'Consent to share assessment reports with school class teacher for classroom accommodations.' },
    // Case 3: Rohan — 1 pending
    { caseIdx: 2, type: ConsentType.TREATMENT, parentIdx: 2, notes: 'Consent for initial assessment and sensory evaluation. Pending formal signature — verbal consent obtained during intake session.' },
  ];

  for (const consent of consents) {
    await prisma.caseConsent.create({
      data: {
        caseId: cases[consent.caseIdx].id,
        type: consent.type,
        grantedById: parents[consent.parentIdx].id,
        validUntil: daysFromNow(365),
        notes: consent.notes,
      },
    });
  }
  console.log(`  ✓ ${consents.length} consents created`);

  // ─── BILLING ───────────────────────────────────────────
  console.log('Creating billing records...');
  const billingRecords = [
    // Case 1: Arjun — 3 invoices (2 paid, 1 pending)
    { caseIdx: 0, code: '97153', amount: 3500, status: BillingStatus.PAID, paidAt: daysAgo(60), label: 'ABA Therapy — Month 1 (4 sessions)' },
    { caseIdx: 0, code: '97153', amount: 3500, status: BillingStatus.PAID, paidAt: daysAgo(30), label: 'ABA + Floortime — Month 2 (4 sessions)' },
    { caseIdx: 0, code: '97153', amount: 3500, status: BillingStatus.PENDING, paidAt: null, label: 'ABA + Floortime — Month 3 (4 sessions)' },
    // Case 2: Priya — 2 invoices (1 paid, 1 pending)
    { caseIdx: 1, code: '92507', amount: 2500, status: BillingStatus.PAID, paidAt: daysAgo(15), label: 'Speech Therapy — Weeks 1-3 (6 sessions)' },
    { caseIdx: 1, code: '92507', amount: 2500, status: BillingStatus.PENDING, paidAt: null, label: 'Speech Therapy — Weeks 4-6 (4 sessions)' },
    // Case 3: Rohan — 1 invoice (pending)
    { caseIdx: 2, code: '96112', amount: 4000, status: BillingStatus.PENDING, paidAt: null, label: 'Initial Comprehensive Assessment' },
  ];

  for (const bill of billingRecords) {
    await prisma.caseBilling.create({
      data: {
        caseId: cases[bill.caseIdx].id,
        serviceCode: bill.code,
        amount: bill.amount,
        status: bill.status,
        paidAt: bill.paidAt,
      },
    });
  }
  console.log(`  ✓ ${billingRecords.length} billing records created`);

  // ─── WORKSHEETS + ASSIGNMENTS ──────────────────────────
  console.log('Creating worksheets and assignments...');

  // Create 3 worksheets for Arjun (2 assigned) and 1 for Priya (1 assigned)
  const worksheets = [
    {
      title: 'Emotion Faces — Identify Happy, Sad, Angry, Scared',
      type: WorksheetType.VISUAL_SUPPORT,
      subType: 'Emotion Recognition',
      childIdx: 0,
      caseIdx: 0,
      difficulty: WorksheetDifficulty.DEVELOPING,
      targetDomains: ['SOCIAL', 'COMMUNICATION'],
      content: {
        sections: [
          { type: 'instruction', text: 'Look at each face. Can you name the emotion? Point to the correct face when asked.' },
          { type: 'matching', items: [
            { emotion: 'Happy', image: 'happy_face.png', scenario: 'Aarav got a new toy!' },
            { emotion: 'Sad', image: 'sad_face.png', scenario: 'The ice cream fell on the ground.' },
            { emotion: 'Angry', image: 'angry_face.png', scenario: 'Someone took Aarav\'s turn.' },
            { emotion: 'Scared', image: 'scared_face.png', scenario: 'A very loud noise happened.' },
          ]},
        ],
      },
      metadata: { generatedFrom: 'IEP Goal - Emotion Recognition', ageRange: '3-5 years', languageLevel: 'Pre-verbal to early verbal' },
    },
    {
      title: 'PECS Sentence Building — "I Want" + Item',
      type: WorksheetType.ACTIVITY,
      subType: 'AAC / PECS Practice',
      childIdx: 0,
      caseIdx: 0,
      difficulty: WorksheetDifficulty.DEVELOPING,
      targetDomains: ['COMMUNICATION'],
      content: {
        sections: [
          { type: 'instruction', text: 'Practice building sentences using the "I want" card and item pictures. Parent: model the sentence strip, then let the child build independently.' },
          { type: 'activity', items: ['ball', 'train', 'biscuit', 'water', 'book', 'blocks'] },
          { type: 'parentTip', text: 'Praise every attempt. If child points instead of using PECS, gently redirect to the sentence strip. Keep preferred items visible but out of reach.' },
        ],
      },
      metadata: { generatedFrom: 'IEP Goal - Communication', ageRange: '2-4 years', pecPhase: 'Phase IV' },
    },
    {
      title: 'Story Sequencing — "The Very Hungry Caterpillar"',
      type: WorksheetType.ACTIVITY,
      subType: 'Narrative Skills',
      childIdx: 1,
      caseIdx: 1,
      difficulty: WorksheetDifficulty.FOUNDATIONAL,
      targetDomains: ['COMMUNICATION'],
      content: {
        sections: [
          { type: 'instruction', text: 'Cut out the pictures and put them in order to retell the story. Help Priya tell what happens first, next, and last.' },
          { type: 'sequencing', items: [
            { order: 1, description: 'A tiny caterpillar hatches from an egg' },
            { order: 2, description: 'The caterpillar eats lots of food' },
            { order: 3, description: 'The caterpillar builds a cocoon' },
            { order: 4, description: 'A beautiful butterfly comes out!' },
          ]},
          { type: 'parentTip', text: 'Read the book first, then do the activity. Use "first," "then," "next," "last" words. Accept Marathi responses — bilingual retelling is great!' },
        ],
      },
      metadata: { generatedFrom: 'IEP Goal - Narrative Skills', ageRange: '4-6 years', bilingualSupport: true },
    },
  ];

  const createdWorksheets: any[] = [];
  for (const ws of worksheets) {
    const worksheet = await prisma.worksheet.create({
      data: {
        title: ws.title,
        type: ws.type,
        subType: ws.subType,
        content: ws.content,
        metadata: ws.metadata,
        status: WorksheetStatus.PUBLISHED,
        colorMode: WorksheetColorMode.FULL_COLOR,
        difficulty: ws.difficulty,
        targetDomains: ws.targetDomains,
        dataSource: WorksheetDataSource.IEP_GOALS,
        createdById: meenaUser.id,
        childId: children[ws.childIdx].id,
        caseId: cases[ws.caseIdx].id,
        conditionTags: ws.childIdx === 0 ? ['ASD', 'ADHD'] : ['Speech Delay'],
      },
    });
    createdWorksheets.push(worksheet);
  }

  // Create assignments: 2 for Arjun, 1 for Priya
  const assignments = [
    { worksheetIdx: 0, childIdx: 0, parentIdx: 0, caseIdx: 0, status: WorksheetAssignmentStatus.COMPLETED, notes: 'Practice emotion identification daily. Use real situations to label emotions too.', dueDate: daysAgo(7), completedAt: daysAgo(5) },
    { worksheetIdx: 1, childIdx: 0, parentIdx: 0, caseIdx: 0, status: WorksheetAssignmentStatus.ASSIGNED, notes: 'Start PECS sentence building at home. Begin with 3 most preferred items.', dueDate: daysFromNow(7), completedAt: null },
    { worksheetIdx: 2, childIdx: 1, parentIdx: 1, caseIdx: 1, status: WorksheetAssignmentStatus.IN_PROGRESS, notes: 'Read the book together first, then try the sequencing activity. Let Priya use Marathi or English.', dueDate: daysFromNow(5), completedAt: null },
  ];

  for (const a of assignments) {
    await prisma.worksheetAssignment.create({
      data: {
        worksheetId: createdWorksheets[a.worksheetIdx].id,
        assignedById: meenaUser.id,
        assignedToId: parents[a.parentIdx].id,
        childId: children[a.childIdx].id,
        caseId: cases[a.caseIdx].id,
        status: a.status,
        notes: a.notes,
        dueDate: a.dueDate,
        completedAt: a.completedAt,
        viewedAt: a.status !== WorksheetAssignmentStatus.ASSIGNED ? daysAgo(3) : undefined,
      },
    });
  }
  console.log(`  ✓ ${createdWorksheets.length} worksheets + ${assignments.length} assignments created`);

  // ─── AUDIT LOGS ────────────────────────────────────────
  console.log('Creating audit logs...');
  const auditLogs = [
    // Case 1: Arjun
    { caseIdx: 0, action: 'CASE_CREATED', entityType: 'Case', daysAgo: 90, changes: { status: 'ACTIVE', diagnosis: 'ASD Level 1, ADHD Combined Type' } },
    { caseIdx: 0, action: 'IEP_CREATED', entityType: 'IEP', daysAgo: 80, changes: { version: 1, goals: 4 } },
    { caseIdx: 0, action: 'DOCUMENT_UPLOADED', entityType: 'CaseDocument', daysAgo: 88, changes: { title: 'Intake Assessment Form — Arjun Deshmukh' } },
    { caseIdx: 0, action: 'DOCUMENT_UPLOADED', entityType: 'CaseDocument', daysAgo: 85, changes: { title: 'Consent for Treatment — Arjun Deshmukh' } },
    { caseIdx: 0, action: 'DOCUMENT_UPLOADED', entityType: 'CaseDocument', daysAgo: 20, changes: { title: 'Monthly Progress Report — Arjun — Month 2' } },
    { caseIdx: 0, action: 'WORKSHEET_ASSIGNED', entityType: 'WorksheetAssignment', daysAgo: 14, changes: { worksheet: 'Emotion Faces' } },
    { caseIdx: 0, action: 'WORKSHEET_ASSIGNED', entityType: 'WorksheetAssignment', daysAgo: 3, changes: { worksheet: 'PECS Sentence Building' } },
    // Case 2: Priya
    { caseIdx: 1, action: 'CASE_CREATED', entityType: 'Case', daysAgo: 42, changes: { status: 'ACTIVE', diagnosis: 'Expressive Language Disorder' } },
    { caseIdx: 1, action: 'IEP_CREATED', entityType: 'IEP', daysAgo: 35, changes: { version: 1, goals: 3 } },
    { caseIdx: 1, action: 'DOCUMENT_UPLOADED', entityType: 'CaseDocument', daysAgo: 40, changes: { title: 'Speech-Language Assessment Report' } },
    { caseIdx: 1, action: 'WORKSHEET_ASSIGNED', entityType: 'WorksheetAssignment', daysAgo: 5, changes: { worksheet: 'Story Sequencing' } },
    // Case 3: Rohan
    { caseIdx: 2, action: 'CASE_CREATED', entityType: 'Case', daysAgo: 7, changes: { status: 'ACTIVE (Intake phase)', diagnosis: 'Pending — suspected SPD' } },
    { caseIdx: 2, action: 'DOCUMENT_UPLOADED', entityType: 'CaseDocument', daysAgo: 7, changes: { title: 'Referral Notes — Rohan Menon' } },
    { caseIdx: 2, action: 'SESSION_SCHEDULED', entityType: 'CaseSession', daysAgo: 5, changes: { type: 'Initial Consultation / Intake Assessment' } },
  ];

  for (const log of auditLogs) {
    await prisma.caseAuditLog.create({
      data: {
        caseId: cases[log.caseIdx].id,
        userId: meenaUser.id,
        action: log.action,
        entityType: log.entityType,
        entityId: cases[log.caseIdx].id,
        changes: log.changes,
        timestamp: daysAgo(log.daysAgo),
      },
    });
  }
  console.log(`  ✓ ${auditLogs.length} audit log entries created`);

  // ─── INTERNAL NOTES ────────────────────────────────────
  console.log('Creating internal notes...');
  const internalNotes = [
    { caseIdx: 0, content: 'Father Ajay attended parent training session for first time. Very engaged, asking good questions about ABA techniques. Should continue involving both parents.' },
    { caseIdx: 0, content: 'School shadow teacher Reshma called — reporting improved behavior in classroom. Arjun sitting for 10 minutes now during circle time. Coordinate school visit next month.' },
    { caseIdx: 0, content: 'Consider referring to pediatric OT for fine motor concerns. Current progress is good but dedicated OT may accelerate handwriting readiness.' },
    { caseIdx: 1, content: 'Sneha asked about bilingualism impact on speech therapy. Reassured that bilingual exposure is beneficial. Recommended maintaining both Marathi and English at home.' },
    { caseIdx: 1, content: 'Priya\'s progress is exceptionally fast — may be able to reduce to 1x/week after next month. Discuss with parent at review.' },
    { caseIdx: 2, content: 'Parents seemed relieved to have concerns validated after pediatrician dismissed them. Emphasized that early intervention for sensory processing is highly effective at this age.' },
    { caseIdx: 2, content: 'Weight loss of 1.5 kg in 3 months is concerning. Prioritize nutritionist referral. May need to coordinate with pediatrician for nutritional supplements.' },
  ];

  for (const note of internalNotes) {
    await prisma.caseInternalNote.create({
      data: {
        caseId: cases[note.caseIdx].id,
        authorId: meenaUser.id,
        content: note.content,
      },
    });
  }
  console.log(`  ✓ ${internalNotes.length} internal notes created`);

  // ─── SUMMARY ───────────────────────────────────────────
  console.log('\n✅ Dr. Meena case seed complete!');
  console.log('─────────────────────────────────────────');
  console.log(`  Therapist:          Dr. Meena Sharma (dr.meena@therapy.com)`);
  console.log(`  Parents:            ${parents.length}`);
  console.log(`  Children:           ${children.length}`);
  console.log(`  Cases:              ${cases.length}`);
  console.log(`    Case 1 (Arjun):   ACTIVE — ASD + ADHD, 8 sessions, IEP (4 goals), 5 milestones`);
  console.log(`    Case 2 (Priya):   ACTIVE — Speech Delay, 5 sessions, IEP (3 goals), 3 milestones`);
  console.log(`    Case 3 (Rohan):   ACTIVE (Intake) — Suspected SPD, 1 session, no IEP yet`);
  console.log(`  Sessions:           ${arjunSessionRecords.length + priyaSessionRecords.length + 1}`);
  console.log(`  IEPs:               2 (7 goals total)`);
  console.log(`  Milestone Plans:    3 (9 milestones total)`);
  console.log(`  Documents:          ${documents.length}`);
  console.log(`  Consents:           ${consents.length}`);
  console.log(`  Billing:            ${billingRecords.length}`);
  console.log(`  Worksheets:         ${createdWorksheets.length} (${assignments.length} assignments)`);
  console.log(`  Audit Logs:         ${auditLogs.length}`);
  console.log(`  Internal Notes:     ${internalNotes.length}`);
  console.log('─────────────────────────────────────────\n');
  console.log('🔑 Login: dr.meena@therapy.com / Therapist@123 (existing account)');
  console.log('   Parents: parent.kavita@test.com, parent.sneha@test.com, parent.ravi@test.com / Test@1234');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
