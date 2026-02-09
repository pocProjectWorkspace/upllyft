// prisma/seeds/seed-case-management.ts
// Seeds case management data: 6 children, 6 cases, sessions, IEPs, milestones, documents, billing, consents, audit logs
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
  CaseTherapistRole,
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
  console.log('🌱 Seeding case management data...\n');

  // ─── CLEANUP PREVIOUS SEED DATA ──────────────────────────
  console.log('Cleaning up previous case management data...');
  await prisma.sessionGoalProgress.deleteMany({});
  await prisma.caseAuditLog.deleteMany({});
  await prisma.caseConsent.deleteMany({});
  await prisma.caseBilling.deleteMany({});
  await prisma.caseShare.deleteMany({});
  await prisma.caseDocument.deleteMany({});
  await prisma.caseSession.deleteMany({});
  await prisma.caseInternalNote.deleteMany({});
  await prisma.iEPGoal.deleteMany({});
  await prisma.iEP.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.milestonePlan.deleteMany({});
  await prisma.caseTherapist.deleteMany({});
  await prisma.case.deleteMany({});
  console.log('  ✓ Cleaned up\n');

  const passwordHash = await bcrypt.hash('Test@1234', 10);

  // ─── 1. CREATE PARENT USERS ───────────────────────────────
  console.log('Creating parent users...');
  const parents = [];
  const parentData = [
    { email: 'parent.anita@test.com', name: 'Anita Gupta' },
    { email: 'parent.vikram@test.com', name: 'Vikram Malhotra' },
    { email: 'parent.sunita@test.com', name: 'Sunita Joshi' },
    { email: 'parent.ramesh@test.com', name: 'Ramesh Iyer' },
    { email: 'parent.deepa@test.com', name: 'Deepa Nair' },
    { email: 'parent.amit@test.com', name: 'Amit Sharma' },
  ];

  for (const p of parentData) {
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
            relationshipToChild: 'Parent',
            city: 'Mumbai',
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

  // ─── 2. CREATE THERAPIST USERS + PROFILES ─────────────────
  console.log('Creating therapist users...');
  const therapistData = [
    { email: 'therapist.meena@test.com', name: 'Dr. Meena Patel', specialization: 'Autism & ABA', license: 'PSY-MH-001' },
    { email: 'therapist.arjun@test.com', name: 'Dr. Arjun Singh', specialization: 'Speech Therapy', license: 'SLP-KA-002' },
    { email: 'therapist.lakshmi@test.com', name: 'Dr. Lakshmi Reddy', specialization: 'Occupational Therapy', license: 'OT-TN-003' },
  ];

  const therapistUsers = [];
  const therapistProfiles = [];

  for (const t of therapistData) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: {
        email: t.email,
        name: t.name,
        password: passwordHash,
        role: Role.THERAPIST,
        emailVerified: new Date(),
        userProfile: {
          create: {
            fullName: t.name,
            city: 'Bangalore',
            state: 'Karnataka',
            country: 'India',
          },
        },
      },
    });
    therapistUsers.push(user);

    const tp = await prisma.therapistProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        specializations: [t.specialization],
        yearsExperience: 10,
        credentials: [t.license],
        title: t.specialization,
        acceptingBookings: true,
      },
    });
    therapistProfiles.push(tp);
  }
  console.log(`  ✓ ${therapistUsers.length} therapists created`);

  // ─── 3. CREATE CHILDREN ───────────────────────────────────
  console.log('Creating children...');
  const childData = [
    { firstName: 'Aarav', dob: '2019-03-15', gender: 'Male', diagnosis: 'ASD Level 1', parentIdx: 0 },
    { firstName: 'Diya', dob: '2020-07-22', gender: 'Female', diagnosis: 'Speech Delay', parentIdx: 1 },
    { firstName: 'Kabir', dob: '2018-11-08', gender: 'Male', diagnosis: 'ADHD Combined Type', parentIdx: 2 },
    { firstName: 'Ananya', dob: '2021-01-30', gender: 'Female', diagnosis: 'Global Developmental Delay', parentIdx: 3 },
    { firstName: 'Rohan', dob: '2019-09-12', gender: 'Male', diagnosis: 'Sensory Processing Disorder', parentIdx: 4 },
    { firstName: 'Priya', dob: '2020-05-05', gender: 'Female', diagnosis: 'Down Syndrome', parentIdx: 5 },
  ];

  const children = [];
  for (const c of childData) {
    const parent = parents[c.parentIdx];
    const child = await prisma.child.create({
      data: {
        profileId: parent.userProfile!.id,
        firstName: c.firstName,
        dateOfBirth: new Date(c.dob),
        gender: c.gender,
        hasCondition: true,
        diagnosisStatus: c.diagnosis,
        referralSource: 'Pediatrician',
        primaryLanguage: 'English',
        schoolType: 'Mainstream',
        grade: 'Pre-school',
      },
    });
    children.push(child);
  }
  console.log(`  ✓ ${children.length} children created`);

  // ─── 4. CREATE CASES ──────────────────────────────────────
  console.log('Creating cases...');
  const caseConfigs = [
    { childIdx: 0, therapistIdx: 0, status: CaseStatus.ACTIVE, daysAgoOpened: 90 },
    { childIdx: 1, therapistIdx: 1, status: CaseStatus.ACTIVE, daysAgoOpened: 60 },
    { childIdx: 2, therapistIdx: 2, status: CaseStatus.ACTIVE, daysAgoOpened: 120 },
    { childIdx: 3, therapistIdx: 0, status: CaseStatus.INTAKE, daysAgoOpened: 7 },
    { childIdx: 4, therapistIdx: 2, status: CaseStatus.ON_HOLD, daysAgoOpened: 45 },
    { childIdx: 5, therapistIdx: 1, status: CaseStatus.ACTIVE, daysAgoOpened: 75 },
  ];

  const cases = [];
  for (let i = 0; i < caseConfigs.length; i++) {
    const cfg = caseConfigs[i];
    const caseNumber = `CM-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`;
    const c = await prisma.case.create({
      data: {
        caseNumber,
        childId: children[cfg.childIdx].id,
        primaryTherapistId: therapistProfiles[cfg.therapistIdx].id,
        status: cfg.status,
        openedAt: daysAgo(cfg.daysAgoOpened),
      },
    });
    cases.push(c);
  }
  console.log(`  ✓ ${cases.length} cases created`);

  // ─── 5. ADD SECONDARY THERAPISTS ──────────────────────────
  console.log('Adding secondary therapists...');
  await prisma.caseTherapist.createMany({
    data: [
      { caseId: cases[0].id, therapistId: therapistProfiles[1].id, role: CaseTherapistRole.SECONDARY },
      { caseId: cases[2].id, therapistId: therapistProfiles[0].id, role: CaseTherapistRole.CONSULTANT },
      { caseId: cases[5].id, therapistId: therapistProfiles[2].id, role: CaseTherapistRole.SECONDARY },
    ],
  });
  console.log(`  ✓ 3 secondary therapist assignments`);

  // ─── 6. CREATE CONSENTS ───────────────────────────────────
  console.log('Creating consents...');
  const consentEntries = [];
  for (let i = 0; i < cases.length; i++) {
    const parentUser = parents[i];
    // All active cases get TREATMENT + ASSESSMENT consent
    if (caseConfigs[i].status === CaseStatus.ACTIVE) {
      for (const type of [ConsentType.TREATMENT, ConsentType.ASSESSMENT, ConsentType.SHARING]) {
        consentEntries.push({
          caseId: cases[i].id,
          type,
          grantedById: parentUser.id,
          validUntil: daysFromNow(365),
        });
      }
    } else if (caseConfigs[i].status === CaseStatus.INTAKE) {
      // Intake only has TREATMENT
      consentEntries.push({
        caseId: cases[i].id,
        type: ConsentType.TREATMENT,
        grantedById: parentUser.id,
        validUntil: daysFromNow(365),
      });
    }
  }
  await prisma.caseConsent.createMany({ data: consentEntries });
  console.log(`  ✓ ${consentEntries.length} consents created`);

  // ─── 7. CREATE IEPs + GOALS ───────────────────────────────
  console.log('Creating IEPs and goals...');
  const activeCaseIndices = [0, 1, 2, 5]; // Active cases
  const ieps = [];
  const iepGoalSets: { description: string; domain: string; progress: number; status: GoalStatus }[][] = [
    // Case 0: ASD child
    [
      { description: 'Initiate greetings with peers 4 out of 5 opportunities', domain: 'SOCIAL', progress: 60, status: GoalStatus.IN_PROGRESS },
      { description: 'Follow 2-step instructions independently', domain: 'COMMUNICATION', progress: 40, status: GoalStatus.IN_PROGRESS },
      { description: 'Transition between activities without behavioral outbursts', domain: 'BEHAVIORAL', progress: 75, status: GoalStatus.IN_PROGRESS },
      { description: 'Maintain joint attention for 3+ minutes during play', domain: 'SOCIAL', progress: 50, status: GoalStatus.IN_PROGRESS },
    ],
    // Case 1: Speech Delay
    [
      { description: 'Produce 50+ functional words', domain: 'COMMUNICATION', progress: 65, status: GoalStatus.IN_PROGRESS },
      { description: 'Combine 2 words to form requests', domain: 'COMMUNICATION', progress: 30, status: GoalStatus.IN_PROGRESS },
      { description: 'Respond to yes/no questions accurately 80% of time', domain: 'COMMUNICATION', progress: 55, status: GoalStatus.IN_PROGRESS },
    ],
    // Case 2: ADHD
    [
      { description: 'Remain seated during structured activities for 15 minutes', domain: 'BEHAVIORAL', progress: 45, status: GoalStatus.IN_PROGRESS },
      { description: 'Complete assigned tasks with no more than 1 verbal prompt', domain: 'COGNITIVE', progress: 35, status: GoalStatus.IN_PROGRESS },
      { description: 'Use self-regulation strategies when frustrated', domain: 'BEHAVIORAL', progress: 20, status: GoalStatus.NOT_STARTED },
      { description: 'Raise hand before speaking in group settings', domain: 'SOCIAL', progress: 50, status: GoalStatus.IN_PROGRESS },
    ],
    // Case 5: Down Syndrome
    [
      { description: 'Use PECS to make choices between 2 items', domain: 'COMMUNICATION', progress: 80, status: GoalStatus.IN_PROGRESS },
      { description: 'Stack 5 blocks independently', domain: 'MOTOR', progress: 90, status: GoalStatus.IN_PROGRESS },
      { description: 'Feed self with spoon with minimal spillage', domain: 'SELF_CARE', progress: 70, status: GoalStatus.IN_PROGRESS },
      { description: 'Walk up stairs with alternating feet (with railing)', domain: 'MOTOR', progress: 40, status: GoalStatus.IN_PROGRESS },
    ],
  ];

  for (let idx = 0; idx < activeCaseIndices.length; idx++) {
    const caseIdx = activeCaseIndices[idx];
    const therapistUser = therapistUsers[caseConfigs[caseIdx].therapistIdx];

    const iep = await prisma.iEP.create({
      data: {
        caseId: cases[caseIdx].id,
        version: 1,
        status: IEPStatus.ACTIVE,
        createdById: therapistUser.id,
        approvedByTherapistAt: daysAgo(30),
        approvedByParentAt: daysAgo(28),
        reviewDate: daysFromNow(90),
        accommodations: {
          classroom: ['Preferential seating', 'Visual schedule', 'Frequent breaks'],
          testing: ['Extended time', 'Quiet environment'],
        },
      },
    });
    ieps.push(iep);

    // Create goals
    const goals = iepGoalSets[idx];
    for (let g = 0; g < goals.length; g++) {
      await prisma.iEPGoal.create({
        data: {
          iepId: iep.id,
          domain: goals[g].domain,
          goalText: goals[g].description,
          currentProgress: goals[g].progress,
          status: goals[g].status,
          targetDate: daysFromNow(180),
          order: g,
        },
      });
    }
  }
  console.log(`  ✓ ${ieps.length} IEPs with goals created`);

  // ─── 8. CREATE MILESTONE PLANS ────────────────────────────
  console.log('Creating milestone plans...');
  const milestonePlans = [];
  const milestoneData: { domain: string; description: string; status: MilestoneStatus; expectedAge: string }[][] = [
    // Case 0: ASD
    [
      { domain: 'SOCIAL', description: 'Responds to name consistently', status: MilestoneStatus.ACHIEVED, expectedAge: '12 months' },
      { domain: 'SOCIAL', description: 'Engages in parallel play', status: MilestoneStatus.ACHIEVED, expectedAge: '24 months' },
      { domain: 'SOCIAL', description: 'Initiates play with peers', status: MilestoneStatus.ON_TRACK, expectedAge: '36 months' },
      { domain: 'COMMUNICATION', description: 'Uses 2-word phrases', status: MilestoneStatus.ACHIEVED, expectedAge: '24 months' },
      { domain: 'COMMUNICATION', description: 'Asks "why" questions', status: MilestoneStatus.DELAYED, expectedAge: '36 months' },
    ],
    // Case 1: Speech Delay
    [
      { domain: 'COMMUNICATION', description: 'Babbles with consonant sounds', status: MilestoneStatus.ACHIEVED, expectedAge: '8 months' },
      { domain: 'COMMUNICATION', description: 'Says first words', status: MilestoneStatus.ACHIEVED, expectedAge: '12 months' },
      { domain: 'COMMUNICATION', description: 'Vocabulary of 50+ words', status: MilestoneStatus.ON_TRACK, expectedAge: '24 months' },
      { domain: 'COMMUNICATION', description: 'Combines 2-3 word sentences', status: MilestoneStatus.DELAYED, expectedAge: '24 months' },
    ],
  ];

  for (let idx = 0; idx < 2; idx++) {
    const caseIdx = activeCaseIndices[idx];
    const plan = await prisma.milestonePlan.create({
      data: {
        caseId: cases[caseIdx].id,
        version: 1,
        status: 'active',
        sharedWithParent: true,
      },
    });
    milestonePlans.push(plan);

    for (let m = 0; m < milestoneData[idx].length; m++) {
      const md = milestoneData[idx][m];
      await prisma.milestone.create({
        data: {
          planId: plan.id,
          domain: md.domain,
          description: md.description,
          expectedAge: md.expectedAge,
          status: md.status,
          achievedAt: md.status === MilestoneStatus.ACHIEVED ? daysAgo(30) : undefined,
          order: m,
        },
      });
    }
  }
  console.log(`  ✓ ${milestonePlans.length} milestone plans created`);

  // ─── 9. CREATE SESSIONS ───────────────────────────────────
  console.log('Creating sessions...');
  let sessionCount = 0;
  const sessionNotes = [
    { raw: 'Child engaged well with structured activities today. Made eye contact 6 times during circle time. Struggled with transitions but responded to visual timer.', objectives: 'Improve social engagement and transition tolerance', interventions: 'Visual timer, social stories, structured play' },
    { raw: 'Practiced speech sounds /s/ and /r/. Child produced /s/ correctly in 7/10 trials. /r/ still emerging. Used PECS for requesting during snack time.', objectives: 'Improve articulation of target sounds', interventions: 'Articulation drills, PECS board, positive reinforcement' },
    { raw: 'Worked on fine motor skills. Child completed pegboard activity in 4 minutes (improvement from 6 min last week). Handwriting exercises showed better grip.', objectives: 'Enhance fine motor coordination', interventions: 'Pegboard, handwriting practice, putty exercises' },
    { raw: 'Focus session on attention and impulse control. Child used stop-and-think card 3 times independently. Stayed seated for 12 minutes during coloring (up from 8 min).', objectives: 'Increase attention span and self-regulation', interventions: 'Stop-and-think cards, token economy, timed activities' },
    { raw: 'Parent training session. Reviewed home program implementation. Parent demonstrated ABA techniques correctly. Discussed adjustments to reinforcement schedule.', objectives: 'Parent coaching on home program', interventions: 'Parent modeling, feedback, home program review' },
  ];

  for (let caseIdx = 0; caseIdx < 4; caseIdx++) { // First 4 cases (active + ADHD)
    const ci = activeCaseIndices[caseIdx];
    const therapistUser = therapistUsers[caseConfigs[ci].therapistIdx];
    const numSessions = [8, 6, 10, 5][caseIdx];

    for (let s = 0; s < numSessions; s++) {
      const noteIdx = s % sessionNotes.length;
      const note = sessionNotes[noteIdx];
      const formats: SessionNoteFormat[] = [SessionNoteFormat.SOAP, SessionNoteFormat.DAP, SessionNoteFormat.NARRATIVE];

      await prisma.caseSession.create({
        data: {
          caseId: cases[ci].id,
          therapistId: therapistUser.id,
          scheduledAt: daysAgo((numSessions - s) * 7), // weekly sessions going back
          actualDuration: [45, 50, 60, 55, 45][s % 5],
          attendanceStatus: s === 2 && caseIdx === 2 ? AttendanceStatus.CANCELLED : AttendanceStatus.PRESENT,
          sessionType: 'Individual',
          noteFormat: formats[s % 3],
          rawNotes: note.raw,
          structuredNotes: {
            objectives: note.objectives,
            interventions: note.interventions,
            response: 'Child was cooperative and showed improvement from previous session.',
            plan: 'Continue current approach. Increase difficulty of tasks next session.',
          },
          aiSummary: s % 3 === 0 ? `Session ${s + 1} focused on ${note.objectives.toLowerCase()}. Notable progress observed in target areas. Recommended to maintain current intervention frequency.` : undefined,
        },
      });
      sessionCount++;
    }
  }
  console.log(`  ✓ ${sessionCount} sessions created`);

  // ─── 10. CREATE DOCUMENTS ─────────────────────────────────
  console.log('Creating documents...');
  let docCount = 0;
  for (let i = 0; i < 4; i++) {
    const ci = activeCaseIndices[i];
    const therapistUser = therapistUsers[caseConfigs[ci].therapistIdx];
    const child = children[caseConfigs[ci].childIdx];

    // Progress report
    await prisma.caseDocument.create({
      data: {
        caseId: cases[ci].id,
        type: CaseDocumentType.PROGRESS_REPORT,
        title: `Progress Report - ${child.firstName} - Q1 2026`,
        content: `Quarterly progress report for ${child.firstName}. The child has shown consistent improvement across all target domains. Key highlights include improved social engagement, better attention span, and emerging communication skills. Specific goal progress is documented in the attached IEP progress monitoring data.`,
        createdById: therapistUser.id,
      },
    });
    docCount++;

    // Initial assessment
    await prisma.caseDocument.create({
      data: {
        caseId: cases[ci].id,
        type: CaseDocumentType.ASSESSMENT,
        title: `Initial Assessment - ${child.firstName}`,
        content: `Comprehensive developmental assessment conducted. Standardized tools used: Bayley-4, ADOS-2, Vineland-3. Results indicate areas of strength in visual processing and areas of need in social communication and adaptive behavior.`,
        createdById: therapistUser.id,
      },
    });
    docCount++;
  }
  console.log(`  ✓ ${docCount} documents created`);

  // ─── 11. CREATE BILLING ENTRIES ───────────────────────────
  console.log('Creating billing entries...');
  let billingCount = 0;
  for (let i = 0; i < 4; i++) {
    const ci = activeCaseIndices[i];
    const amounts = [2500, 3000, 2000, 3500, 2500];
    const codes = ['97530', '92507', '97110', '97153', '90837'];
    const descriptions = ['Therapeutic Activities', 'Speech Therapy', 'OT Treatment', 'ABA Therapy', 'Psychotherapy'];

    for (let b = 0; b < 4; b++) {
      const codeIdx = (i + b) % 5;
      await prisma.caseBilling.create({
        data: {
          caseId: cases[ci].id,
          serviceCode: codes[codeIdx],
          amount: amounts[codeIdx],
          status: b < 2 ? BillingStatus.PAID : b === 2 ? BillingStatus.SUBMITTED : BillingStatus.PENDING,
          paidAt: b < 2 ? daysAgo(30 - b * 15) : undefined,
        },
      });
      billingCount++;
    }
  }
  console.log(`  ✓ ${billingCount} billing entries created`);

  // ─── 12. CREATE AUDIT LOGS ────────────────────────────────
  console.log('Creating audit logs...');
  let auditCount = 0;
  for (let i = 0; i < cases.length; i++) {
    const therapistUser = therapistUsers[caseConfigs[i].therapistIdx];

    await prisma.caseAuditLog.create({
      data: {
        caseId: cases[i].id,
        userId: therapistUser.id,
        action: 'CASE_CREATED',
        entityType: 'Case',
        entityId: cases[i].id,
        changes: { status: 'ACTIVE' },
        timestamp: daysAgo(caseConfigs[i].daysAgoOpened),
      },
    });
    auditCount++;

    if (caseConfigs[i].status === CaseStatus.ON_HOLD) {
      await prisma.caseAuditLog.create({
        data: {
          caseId: cases[i].id,
          userId: therapistUser.id,
          action: 'STATUS_CHANGED',
          entityType: 'Case',
          entityId: cases[i].id,
          changes: { from: 'ACTIVE', to: 'ON_HOLD' },
          timestamp: daysAgo(10),
        },
      });
      auditCount++;
    }
  }
  console.log(`  ✓ ${auditCount} audit log entries created`);

  // ─── 13. CREATE INTERNAL NOTES ────────────────────────────
  console.log('Creating internal notes...');
  const internalNotes = [
    'Parent reported child had a good week at home. Sleeping better.',
    'School teacher mentioned improved attention in class. Will coordinate for next meeting.',
    'Consider adding sensory diet recommendations to home program.',
    'Insurance pre-authorization received for next 20 sessions.',
    'Parent requested schedule change to accommodate school timings.',
  ];

  let noteCount = 0;
  for (let i = 0; i < 4; i++) {
    const ci = activeCaseIndices[i];
    const therapistUser = therapistUsers[caseConfigs[ci].therapistIdx];

    for (let n = 0; n < 2; n++) {
      await prisma.caseInternalNote.create({
        data: {
          caseId: cases[ci].id,
          authorId: therapistUser.id,
          content: internalNotes[(i * 2 + n) % internalNotes.length],
        },
      });
      noteCount++;
    }
  }
  console.log(`  ✓ ${noteCount} internal notes created`);

  // ─── SUMMARY ──────────────────────────────────────────────
  console.log('\n✅ Case management seed complete!');
  console.log('─────────────────────────────────');
  console.log(`  Parents:          ${parents.length}`);
  console.log(`  Therapists:       ${therapistUsers.length}`);
  console.log(`  Children:         ${children.length}`);
  console.log(`  Cases:            ${cases.length}`);
  console.log(`  IEPs:             ${ieps.length}`);
  console.log(`  Milestone Plans:  ${milestonePlans.length}`);
  console.log(`  Sessions:         ${sessionCount}`);
  console.log(`  Documents:        ${docCount}`);
  console.log(`  Billing entries:  ${billingCount}`);
  console.log(`  Consents:         ${consentEntries.length}`);
  console.log(`  Audit logs:       ${auditCount}`);
  console.log(`  Internal notes:   ${noteCount}`);
  console.log('─────────────────────────────────\n');
  console.log('🔑 Login credentials: any parent/therapist email above with password: Test@1234');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
