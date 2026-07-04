/**
 * Demo seed — showcases the clinical template engine end to end.
 * Creates a therapist + admin login, a patient with rich intake, a case, and
 * completed assessments (with AI insights + report), a template-driven session
 * note, and an IEP with goals.
 *
 *   pnpm --filter @upllyft/api exec tsx prisma/seeds/seed-demo.ts
 *
 * Idempotent (upserts by email / caseNumber). Uses ANTHROPIC/OPENAI keys from
 * the environment to pre-generate insights + a report for one assessment.
 */
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import { ClinicalRecordsService } from '../../src/clinical-records/clinical-records.service';
import { ClinicalInsightsService } from '../../src/clinical-records/clinical-insights.service';
import { ClinicalRecordReportService } from '../../src/clinical-records/clinical-record-report.service';

dotenv.config();
const prisma = new PrismaClient();
const audit: any = { log: () => {} };
const config = new ConfigService();

const PASSWORD = 'Demo@1234';
const THERAPIST_EMAIL = 'therapist@upllyft.demo';
const ADMIN_EMAIL = 'admin@upllyft.demo';
const PARENT_EMAIL = 'parent@upllyft.demo';

async function user(email: string, name: string, role: Role, pw: string) {
  const password = await bcrypt.hash(pw, 10);
  return prisma.user.upsert({
    where: { email },
    update: { password, role, name },
    create: { email, name, role, password },
  });
}

async function main() {
  console.log('Seeding demo data…');

  // ── users ──
  const therapist = await user(THERAPIST_EMAIL, 'Dr. Sarah Thomas', Role.THERAPIST, PASSWORD);
  const therapistProfile = await prisma.therapistProfile.upsert({
    where: { userId: therapist.id },
    update: { specializations: ['Speech & Language Therapy', 'Occupational Therapy'] },
    create: { userId: therapist.id, specializations: ['Speech & Language Therapy', 'Occupational Therapy'] },
  });
  await user(ADMIN_EMAIL, 'Clinic Admin', Role.ADMIN, PASSWORD);
  const parent = await user(PARENT_EMAIL, 'Priya Menon', Role.USER, PASSWORD);
  const parentProfile = await prisma.userProfile.upsert({
    where: { userId: parent.id },
    update: { fullName: 'Priya Menon', relationshipToChild: 'Mother', phoneNumber: '+971 50 123 4567', email: PARENT_EMAIL },
    create: { userId: parent.id, fullName: 'Priya Menon', relationshipToChild: 'Mother', phoneNumber: '+971 50 123 4567', email: PARENT_EMAIL },
  });

  // ── patient (rich intake for prefill) ──
  const child =
    (await prisma.child.findFirst({ where: { firstName: 'Aarav', profileId: parentProfile.id } })) ??
    (await prisma.child.create({
      data: {
        profileId: parentProfile.id,
        firstName: 'Aarav',
        nickname: 'Aaru',
        dateOfBirth: new Date('2020-05-14'),
        gender: 'Male',
        primaryLanguage: 'English, Malayalam',
        currentSchool: 'Little Stars Nursery',
        grade: 'KG1',
        nationality: 'India',
        referralSource: 'Parent',
        caregiverRelationship: 'Mother',
        developmentalConcerns: 'Delayed speech, reduced eye contact, limited functional communication.',
        delayedMilestones: true,
        delayedMilestonesDetails: 'First words ~2y, first phrases ~3.5y. Motor milestones within normal limits.',
        currentMedicalConditions: 'Query Autism Spectrum Disorder (under assessment).',
        takingMedications: false,
        sleepIssues: false,
        eatingIssues: true,
        eatingDetails: 'Food selectivity — prefers dry/crunchy foods; avoids mixed textures.',
        teacherConcerns: 'Difficulty following group instructions and joining peer play.',
      },
    }));

  // ── case ──
  const kase = await prisma.case.upsert({
    where: { caseNumber: 'UPL-DEMO-0001' },
    update: { childId: child.id, primaryTherapistId: therapistProfile.id, status: 'ACTIVE', diagnosis: 'Query ASD with speech-language delay', referralSource: 'Parent' },
    create: { caseNumber: 'UPL-DEMO-0001', childId: child.id, primaryTherapistId: therapistProfile.id, status: 'ACTIVE', diagnosis: 'Query ASD with speech-language delay', referralSource: 'Parent' },
  });

  // ── signed consent (PDPL gate) ──
  const existingConsent = await prisma.consentForm.findFirst({ where: { patientId: parent.id, status: 'SIGNED' } });
  if (!existingConsent) {
    await prisma.consentForm.create({ data: { patientId: parent.id, intakeId: 'demo-intake', sentBy: therapist.id, status: 'SIGNED' } });
  }

  const records = new ClinicalRecordsService(prisma as any, audit);
  const insights = new ClinicalInsightsService(config, prisma as any, records);
  const report = new ClinicalRecordReportService(config, prisma as any, records);

  const tpl = async (code: string) => prisma.clinicalTemplate.findFirstOrThrow({ where: { code, organizationId: null } });

  // ── Assessment 1: Speech & Language (with AI insights + report) ──
  const slp = await tpl('SLP_ASSESSMENT');
  await prisma.clinicalRecord.deleteMany({ where: { caseId: kase.id, templateCode: 'SLP_ASSESSMENT' } });
  const slpRec = await prisma.clinicalRecord.create({
    data: {
      caseId: kase.id, templateId: slp.id, templateCode: slp.code, templateVersion: slp.version,
      discipline: slp.discipline, activityType: slp.activityType, therapistId: therapist.id,
      title: 'Initial Speech & Language Assessment', status: 'SIGNED', signedAt: new Date(), signatureName: 'Dr. Sarah Thomas',
      answers: {
        clientFullName: 'Aarav (Aaru)', assessmentType: 'Initial', assessmentLanguages: 'English & Malayalam; interpreter not required',
        reasonForReferral: 'Parents report reduced communication, poor eye contact and limited functional speech at 5 years.',
        sourcesReviewed: ['Parent interview', 'Teacher report', 'Prior reports'],
        developmentalHistory: 'First words ~2y, first phrases ~3.5y. Hearing screening passed. No seizures. Food selectivity noted.',
        receptiveLanguage: 'Understands common nouns/verbs, follows simple one-step commands; difficulty with WH-questions and two-step instructions.',
        expressiveLanguage: 'Uses 2-3 word phrases with prompting; perseverative speech and verbal stereotypies present.',
        speechSound: 'Reduced intelligibility to unfamiliar listeners; limited phoneme inventory.',
        pragmatic: 'Poor eye contact, limited joint attention, reduced turn-taking and reciprocity; requests by pulling caregivers.',
        oralMotor: 'Structurally normal; oral sensory-seeking (mouthing objects) and food selectivity.',
        clinicalImpression: 'Profile consistent with social communication difficulties and mixed receptive-expressive language delay (~27-30 month level on REELS).',
        recommendations: 'Weekly SLT, parent coaching (modelling, expansion), AAC/visual supports, OT referral for sensory needs.',
        reviewPlan: 'Review in 3 months with progress on functional communication goals.',
      },
    },
  });
  if (config.get('ANTHROPIC_API_KEY')) {
    console.log('  · generating Claude insights for SLP assessment…');
    try { await insights.generate(kase.id, slpRec.id, therapist.id); } catch (e: any) { console.log('    (insights skipped:', e?.message, ')'); }
  }
  if (config.get('OPENAI_API_KEY')) {
    console.log('  · generating narrative report for SLP assessment…');
    try { await report.generate(kase.id, slpRec.id, therapist.id, 'PROFESSIONAL'); } catch (e: any) { console.log('    (report skipped:', e?.message, ')'); }
  }

  // ── Assessment 2: Occupational Therapy (draft — for live "generate insights" demo) ──
  const ot = await tpl('OT_ASSESSMENT');
  await prisma.clinicalRecord.deleteMany({ where: { caseId: kase.id, templateCode: 'OT_ASSESSMENT' } });
  await prisma.clinicalRecord.create({
    data: {
      caseId: kase.id, templateId: ot.id, templateCode: ot.code, templateVersion: ot.version,
      discipline: ot.discipline, activityType: ot.activityType, therapistId: therapist.id,
      title: 'Occupational Therapy Sensory Assessment', status: 'DRAFT',
      answers: {
        clientFullName: 'Aarav (Aaru)', assessmentType: 'Initial',
        reasonForReferral: 'Sensory-seeking behaviours, mouthing, food selectivity and difficulty with fine-motor school tasks.',
        sensoryProcessing: 'Oral and proprioceptive seeking; over-responsive to unexpected loud sounds; frequent mouthing of objects.',
        fineMotor: 'Immature pencil grasp; difficulty with in-hand manipulation and using scissors.',
        adlSelfCare: ['Feeding', 'Dressing'],
        schoolParticipation: 'Struggles to remain seated for table-top tasks; needs frequent movement breaks.',
        strengths: 'Enjoys movement play, puzzles and construction toys; good gross-motor coordination.',
        recommendations: 'OT 1×/week, sensory diet, seating/positioning supports, graded exposure for feeding.',
      },
    },
  });

  // ── Template-driven session note (Speech) ──
  const slpNote = await tpl('SLP_SESSION_NOTE');
  await prisma.caseSession.deleteMany({ where: { caseId: kase.id, sessionType: 'In-person', noteFormat: 'CUSTOM' } });
  await prisma.caseSession.create({
    data: {
      caseId: kase.id, therapistId: therapist.id, scheduledAt: new Date(), actualDuration: 45,
      attendanceStatus: 'PRESENT', sessionType: 'In-person', noteFormat: 'CUSTOM', noteStatus: 'SIGNED', signedAt: new Date(),
      structuredNotes: {
        templateId: slpNote.id, templateCode: slpNote.code, templateVersion: slpNote.version,
        answers: {
          clientFullName: 'Aarav (Aaru)', sessionType: 'Individual',
          goalAddressed: 'Functional requesting using AAC', target: 'Requesting 3 preferred items with a picture card',
          activityMaterials: 'Bubbles, snack, picture cards', cueingLevel: 'Model',
          trialsAccuracy: [{ target: 'Request "bubbles"', trials: 10, accuracy: 70 }, { target: 'Request "more"', trials: 10, accuracy: 60 }],
          generalisation: 'Emerging with mother during snack routine.',
          subjective: 'Parent reports Aarav used a picture card at home twice this week.',
          objective: 'Independent requesting on 65% of trials with picture card; reduced pulling behaviour.',
          assessment: 'Good progress toward functional requesting; ready to add a third card.',
          plan: 'Introduce third picture card; coach parent on modelling during play.',
        },
      },
    },
  });

  // ── IEP with goals (existing Goals & IEPs tab) ──
  const existingIep = await prisma.iEP.findFirst({ where: { caseId: kase.id } });
  const iep = existingIep ?? (await prisma.iEP.create({ data: { caseId: kase.id, createdById: therapist.id, status: 'ACTIVE', reviewDate: new Date(Date.now() + 90 * 864e5) } }));
  const goalCount = await prisma.iEPGoal.count({ where: { iepId: iep.id } });
  if (goalCount === 0) {
    await prisma.iEPGoal.createMany({
      data: [
        { iepId: iep.id, domain: 'COMMUNICATION', goalText: 'Use 3-4 word phrases to request and comment across 3 settings in 80% of opportunities within 3 months.' },
        { iepId: iep.id, domain: 'SOCIAL', goalText: 'Initiate joint attention with a familiar adult ≥5 times per 15-minute session within 3 months.' },
        { iepId: iep.id, domain: 'SELF_CARE', goalText: 'Tolerate two new food textures at snack time in 60% of opportunities within 6 weeks.' },
      ],
    });
  }

  console.log('\n──────────────────────────────────────────────');
  console.log('Demo data ready. Case UPL-DEMO-0001 — patient Aarav.');
  console.log('Logins (password for all):', PASSWORD);
  console.log('  Therapist :', THERAPIST_EMAIL);
  console.log('  Admin     :', ADMIN_EMAIL);
  console.log('  Parent    :', PARENT_EMAIL);
  console.log('Includes: 2 assessments (SLP signed + AI insights + report, OT draft),');
  console.log('          1 template-driven session note, IEP with 3 goals.');
  console.log('──────────────────────────────────────────────');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
