import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../src/prisma/prisma.module';
import { NotificationModule } from '../src/notification/notification.module';
import { AssessmentsService } from '../src/assessments/assessments.service';
import { ScoringService } from '../src/assessments/scoring.service';
import { ReportGeneratorService } from '../src/assessments/report-generator.service';
import { grantConsent, revokeConsent } from '../src/common/consent';
import { attachChildToFacility } from '../src/common/child-scope';
import { prisma, scope, mkFacility, mkStaff, mkParentWithChild, cleanup, type Scope } from './helpers/fixtures';

/**
 * The educator screening path.
 *
 * Screening used to be guardian-only: every path threw unless `child.profile.userId ===
 * userId`. This adds an educator route BESIDE it, gated on four things in order —
 * capability, active affiliation, an ASSESSMENT consent, and scope. Each is tested by
 * REMOVING it and checking the door shuts.
 *
 * The ASSESSMENT consent is deliberately SEPARATE from the observation consent. A parent
 * who agreed a nursery may note how their child plays has not thereby agreed to a
 * structured developmental questionnaire producing a scored, referable report. Rolling
 * the second into the first is exactly the silent scope creep consent exists to prevent.
 */
describe('Educator-administered screening', () => {
  const s: Scope = scope('t-edu');
  let mod: TestingModule;
  let svc: AssessmentsService;

  let facilityId: string;
  let otherFacilityId: string;
  let edu: any;
  let outsider: any;
  let parentUser: any;
  let childId: string;

  const AGE = '24-36-months';

  beforeAll(async () => {
    mod = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, NotificationModule],
      providers: [AssessmentsService, ScoringService, ReportGeneratorService],
    }).compile();
    svc = mod.get(AssessmentsService);

    facilityId = (await mkFacility(s, 'Willow', 'NURSERY')).facility.id;
    otherFacilityId = (await mkFacility(s, 'Other', 'NURSERY')).facility.id;
    edu = await mkStaff(s, facilityId, 'kw', 'KEYWORKER');
    outsider = await mkStaff(s, otherFacilityId, 'outsider', 'KEYWORKER');

    const p = await mkParentWithChild(s, 'Sami', '2023-01-10', { gender: 'male' });
    parentUser = { id: p.user.id, role: 'USER' };
    childId = p.child.id;
  });

  afterAll(async () => {
    await cleanup(s);
    await prisma.$disconnect();
    await mod.close();
  });

  const create = (actor: any, cid = childId, age = AGE) =>
    svc.createAssessment({ childId: cid, ageGroup: age } as any, actor);

  it('the guardian route is unchanged', async () => {
    const a = await create(parentUser);
    const row = await prisma.assessment.findUniqueOrThrow({ where: { id: a.id } });

    expect(row.informantType).toBe('PARENT');
    expect(row.facilityId).toBeNull();
    expect(row.respondentId).toBe(parentUser.id);
  });

  describe('the educator route is closed until every gate opens', () => {
    it('refused when the child is not enrolled', async () => {
      await expect(create(edu.actor)).rejects.toThrow(/do not have access/i);
    });

    it('refused when enrolled but the guardian has not consented at all', async () => {
      await attachChildToFacility(prisma, childId, facilityId, { type: 'ENROLLED' });
      await expect(create(edu.actor)).rejects.toThrow(/guardian has not yet granted/i);
    });

    it('the OBSERVATION consent alone does NOT authorise screening', async () => {
      await grantConsent(prisma, {
        childId,
        facilityId,
        type: 'DATA_PROCESSING',
        purpose: 'Observations',
        grantedByUserId: parentUser.id,
      });
      await expect(create(edu.actor)).rejects.toThrow(/No active ASSESSMENT consent/i);
    });

    it('with a SEPARATE ASSESSMENT consent, the educator may screen', async () => {
      await grantConsent(prisma, {
        childId,
        facilityId,
        type: 'ASSESSMENT',
        purpose: 'Developmental screening',
        grantedByUserId: parentUser.id,
      });

      const a = await create(edu.actor);
      const row = await prisma.assessment.findUniqueOrThrow({ where: { id: a.id } });

      expect(row.informantType).toBe('EDUCATOR');
      expect(row.facilityId).toBe(facilityId);
      expect(row.respondentId).toBe(edu.user.id);
    });

    it('an educator from a DIFFERENT nursery is still shut out', async () => {
      await expect(create(outsider.actor)).rejects.toThrow(/do not have access/i);
    });
  });

  describe('the educator is only asked what a keyworker can see', () => {
    it('in the nursery band, the educator gets every shared item PLUS the educator-only ones', async () => {
      // Before the group-context items were clinically approved (2026-07-15), the two
      // forms had the SAME count here: every tier-1 item for a 2-3 year old is something
      // a keyworker watches daily, and the home-only items sit in tier 2. Now the educator
      // ALSO gets the educator-only items (whole-group instructions, turn-taking, circle
      // time) that a parent cannot answer — so the educator form is STRICTLY LARGER. That
      // gap is the nursery's observational advantage, made concrete.
      const eduA = await create(edu.actor);
      const parA = await create(parentUser);

      const eduForm: any = await svc.getTier1Questionnaire(eduA.id, edu.user.id);
      const parForm: any = await svc.getTier1Questionnaire(parA.id, parentUser.id);
      const count = (f: any) => f.domains.reduce((n: number, d: any) => n + d.questions.length, 0);

      expect(eduForm.informantType).toBe('EDUCATOR');
      expect(count(eduForm)).toBeGreaterThan(count(parForm));

      // And every item the PARENT is asked in this band, the educator is also asked —
      // the educator superset contains the shared items, it does not swap them out.
      // Compared by item id, NOT text: the shared items are re-voiced for the educator
      // (below), and concordance itself pairs the two informants by id, never by wording.
      const eduIds = new Set(eduForm.domains.flatMap((d: any) => d.questions.map((q: any) => q.id)));
      const parIds = parForm.domains.flatMap((d: any) => d.questions.map((q: any) => q.id));
      expect(parIds.every((id: string) => eduIds.has(id))).toBe(true);

      // The shared item bank is authored in the parent's voice. The educator reads it about
      // the child in front of them — "this child", never "your child" — while the parent
      // keeps the original wording. Same id, informant-appropriate voice.
      const eduTexts = eduForm.domains.flatMap((d: any) => d.questions.map((q: any) => q.question));
      const parTexts = parForm.domains.flatMap((d: any) => d.questions.map((q: any) => q.question));
      expect(eduTexts.some((q: string) => /your child/i.test(q))).toBe(false);
      expect(parTexts.some((q: string) => /your child/i.test(q))).toBe(true);
    });

    it('in a band where a home-only item is in tier 1, the educator is not asked it', async () => {
      const older = await mkParentWithChild(s, 'Omar', '2021-02-01', { gender: 'male' });
      const olderParent = { id: older.user.id, role: 'USER' };
      await attachChildToFacility(prisma, older.child.id, facilityId, { type: 'ENROLLED' });
      await grantConsent(prisma, {
        childId: older.child.id,
        facilityId,
        type: 'ASSESSMENT',
        purpose: 'Screening',
        grantedByUserId: older.user.id,
      });

      const eduA = await create(edu.actor, older.child.id, '4-5-years');
      const parA = await create(olderParent, older.child.id, '4-5-years');

      const eduForm: any = await svc.getTier1Questionnaire(eduA.id, edu.user.id);
      const parForm: any = await svc.getTier1Questionnaire(parA.id, older.user.id);
      const items = (f: any) => f.domains.flatMap((d: any) => d.questions.map((q: any) => q.question));

      expect(items(eduForm).length).toBeLessThan(items(parForm).length);
      expect(items(eduForm).some((q: string) => /brush.*teeth/i.test(q))).toBe(false);
      expect(items(parForm).some((q: string) => /brush.*teeth/i.test(q))).toBe(true);
    });
  });

  describe('clinical review gates what reaches a child', () => {
    it('an item still pending clinical review is never asked or scored', async () => {
      // The PERMANENT guard, independent of what has been approved so far. Any item
      // carrying clinicalReview: PENDING is a draft a clinician has not signed off, and
      // it must not appear in either form. (The 28 educator group-context items were
      // approved on 2026-07-15, so this is currently vacuously true — but the guard
      // stays, because the NEXT batch of drafts will lean on it.)
      const eduA = await create(edu.actor);
      const parA = await create(parentUser);

      const eduForm: any = await svc.getTier1Questionnaire(eduA.id, edu.user.id);
      const parForm: any = await svc.getTier1Questionnaire(parA.id, parentUser.id);

      const allItems = [...eduForm.domains, ...parForm.domains].flatMap((d: any) => d.questions);
      expect(allItems.length).toBeGreaterThan(0);
      expect(allItems.some((q: any) => q.clinicalReview === 'PENDING')).toBe(false);
    });

    it('the APPROVED educator group-context items now appear in the educator form', async () => {
      // The inverse of the pre-activation test: these items (group instructions, circle
      // time, waiting a turn among peers) were held out until clinical sign-off, and are
      // now live. Their presence is the proof the activation actually took.
      const eduA = await create(edu.actor);
      const eduForm: any = await svc.getTier1Questionnaire(eduA.id, edu.user.id);
      const questions = eduForm.domains.flatMap((d: any) => d.questions).map((q: any) => q.question);

      expect(
        questions.some((q: string) => /whole group|circle|turn/i.test(q) && /this child/i.test(q)),
      ).toBe(true);
    });

    it('...but the parent form is not given those educator-only items', async () => {
      const parA = await create(parentUser);
      const parForm: any = await svc.getTier1Questionnaire(parA.id, parentUser.id);
      const questions = parForm.domains.flatMap((d: any) => d.questions).map((q: any) => q.question);

      // "does THIS child follow a whole-group instruction" is educator-voiced and
      // observableBy EDUCATOR only — a parent never sees it.
      expect(
        questions.some((q: string) => /whole group/i.test(q) && /this child/i.test(q)),
      ).toBe(false);
    });

    it('a parent is never shown an EDUCATOR-only item', async () => {
      const parA = await create(parentUser);
      const parForm: any = await svc.getTier1Questionnaire(parA.id, parentUser.id);
      const items = parForm.domains.flatMap((d: any) => d.questions);

      expect(
        items.every((q: any) => !q.observableBy || q.observableBy.includes('PARENT')),
      ).toBe(true);
    });
  });

  describe('revocation bites', () => {
    it('when the guardian withdraws consent, the nursery loses the screening it ran itself', async () => {
      const a = await create(edu.actor);
      const lead = await mkStaff(s, facilityId, 'lead', 'INCLUSION_LEAD');

      // A colleague can read it while the consent stands...
      await expect(svc.getAssessment(a.id, lead.user.id)).resolves.toMatchObject({ id: a.id });

      await revokeConsent(prisma, childId, facilityId, 'ASSESSMENT');

      // ...and cannot the moment it doesn't. Access is RE-CHECKED, not inferred from the
      // facilityId on the row — otherwise revocation would be cosmetic for exactly the
      // data that matters most.
      await expect(svc.getAssessment(a.id, lead.user.id)).rejects.toThrow(/No active ASSESSMENT consent/i);
      await expect(create(edu.actor)).rejects.toThrow(/No active ASSESSMENT consent/i);

      // The parent, of course, still has their own screening.
      const parentOwn = await create(parentUser);
      await expect(svc.getAssessment(parentOwn.id, parentUser.id)).resolves.toMatchObject({ id: parentOwn.id });
    });
  });
});
