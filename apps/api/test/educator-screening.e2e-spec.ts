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
    it('in the nursery band, the educator answers the FULL tier-1 form', async () => {
      // This is the right answer, not a bug: every tier-1 item for a 2-3 year old is
      // something a keyworker watches daily — running, blocks, two-word phrases, peer
      // play, spoon, handwashing. The home-only items in this band sit in tier 2.
      const eduA = await create(edu.actor);
      const parA = await create(parentUser);

      const eduForm: any = await svc.getTier1Questionnaire(eduA.id, edu.user.id);
      const parForm: any = await svc.getTier1Questionnaire(parA.id, parentUser.id);
      const count = (f: any) => f.domains.reduce((n: number, d: any) => n + d.questions.length, 0);

      expect(eduForm.informantType).toBe('EDUCATOR');
      expect(count(eduForm)).toBe(count(parForm));
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

  describe('unreviewed clinical content never reaches a child', () => {
    it('items pending clinical review are excluded from BOTH forms', async () => {
      // 28 educator-only items (circle time, turn-taking among peers, group instructions,
      // drop-off separation) are authored and sitting in the bank, but written by an
      // engineer against public guidance — enough to draft, not enough to screen with.
      // They carry clinicalReview: PENDING and must not be asked or scored until a
      // clinician signs off. This is the test that stops them leaking out early.
      const eduA = await create(edu.actor);
      const parA = await create(parentUser);

      const eduForm: any = await svc.getTier1Questionnaire(eduA.id, edu.user.id);
      const parForm: any = await svc.getTier1Questionnaire(parA.id, parentUser.id);

      const allItems = [...eduForm.domains, ...parForm.domains].flatMap((d: any) => d.questions);
      expect(allItems.length).toBeGreaterThan(0);
      expect(allItems.some((q: any) => q.clinicalReview === 'PENDING')).toBe(false);

      // Specifically: none of the group-context items are being asked yet.
      const questions = allItems.map((q: any) => q.question);
      expect(questions.some((q: string) => /whole group|circle|turn/i.test(q) && /this child/i.test(q))).toBe(false);
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
