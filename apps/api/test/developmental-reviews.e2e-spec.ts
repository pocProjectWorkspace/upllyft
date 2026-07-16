import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../src/prisma/prisma.module';
import { NotificationModule } from '../src/notification/notification.module';
import { DevelopmentalReviewsService } from '../src/developmental-reviews/developmental-reviews.service';
import { grantConsent, revokeConsent } from '../src/common/consent';
import { attachChildToFacility } from '../src/common/child-scope';
import { prisma, scope, mkFacility, mkStaff, mkParentWithChild, cleanup, type Scope } from './helpers/fixtures';

/**
 * The early developmental review (~age 2) (F9).
 *
 * It REUSES the F4 screening (here we insert a completed educator Assessment directly, which
 * is what the review reads) and follows the nursery pattern: inclusion-role gate + ASSESSMENT
 * consent; the guardian sees only a SHARED review.
 */
describe('Developmental reviews (F9)', () => {
  const s: Scope = scope('t-devreview');
  let mod: TestingModule;
  let svc: DevelopmentalReviewsService;

  let facilityId: string;
  let lead: any;
  let keyworker: any;
  let outsider: any;
  let parentActor: any;
  let childId: string;

  const insertEducatorScreening = (cid: string, flagged: string[]) =>
    prisma.assessment.create({
      data: {
        childId: cid,
        ageGroup: '24-36-months',
        informantType: 'EDUCATOR',
        facilityId,
        tier1Completed: true,
        tier1CompletedAt: new Date(),
        flaggedDomains: flagged,
      },
    });

  beforeAll(async () => {
    mod = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, NotificationModule],
      providers: [DevelopmentalReviewsService],
    }).compile();
    svc = mod.get(DevelopmentalReviewsService);

    facilityId = (await mkFacility(s, 'Willow', 'NURSERY')).facility.id;
    const otherFac = (await mkFacility(s, 'Other', 'NURSERY')).facility.id;
    lead = await mkStaff(s, facilityId, 'lead', 'INCLUSION_LEAD');
    keyworker = await mkStaff(s, facilityId, 'kw', 'KEYWORKER');
    outsider = await mkStaff(s, otherFac, 'outsider', 'INCLUSION_LEAD');

    // ~26 months old at the time of writing → within the review band.
    const p = await mkParentWithChild(s, 'Mira', '2024-05-01');
    parentActor = { id: p.user.id, role: 'USER' };
    childId = p.child.id;

    await attachChildToFacility(prisma, childId, facilityId, { type: 'ENROLLED' });
    await grantConsent(prisma, {
      childId, facilityId, type: 'ASSESSMENT', purpose: 'Screening', grantedByUserId: p.user.id,
    });
  });

  afterAll(async () => {
    await cleanup(s);
    await prisma.$disconnect();
    await mod.close();
  });

  describe('who may review', () => {
    it('a KEYWORKER cannot create a review', async () => {
      await expect(svc.create(keyworker.actor, facilityId, childId, {})).rejects.toThrow(/requires one of/i);
    });
    it('an outsider cannot', async () => {
      await expect(svc.create(outsider.actor, facilityId, childId, {})).rejects.toThrow(/not found/i);
    });
    it('cannot review a child with no completed screening', async () => {
      await expect(svc.create(lead.actor, facilityId, childId, {})).rejects.toThrow(/screening.*first/i);
    });
  });

  describe('assembling from the screening, then sharing', () => {
    let reviewId: string;

    it('the lead assembles a review — a DRAFT built from the flagged screening', async () => {
      await insertEducatorScreening(childId, ['speechLanguage']);
      const review = await svc.create(lead.actor, facilityId, childId, {});
      reviewId = review.id;

      expect(review.status).toBe('DRAFT');
      expect(review.flaggedDomains).toEqual(['speechLanguage']);
      expect(review.ageMonths).toBeGreaterThanOrEqual(20);
      expect(review.summary).toContain('Mira');
      expect(review.summary.toLowerCase()).toContain('talking'); // human phrasing of speechLanguage
      expect(review.recommendation).toBeTruthy();
    });

    it('the summary is editable while DRAFT, and a parent cannot see it', async () => {
      const edited = await svc.updateSummary(lead.actor, facilityId, reviewId, { summary: 'A warm plain-language summary for Mira’s family.' });
      expect(edited.summary).toContain('warm');
      expect((await svc.listForGuardian(parentActor, childId)).length).toBe(0);
    });

    describe('once shared', () => {
      beforeAll(async () => { await svc.share(lead.actor, facilityId, reviewId); });

      it('the guardian sees the review', async () => {
        const view: any[] = await svc.listForGuardian(parentActor, childId);
        expect(view.length).toBe(1);
        expect(view[0].summary).toContain('warm');
        expect(view[0].facilityName).toBe('Willow');
        expect(view[0]).not.toHaveProperty('evidence');
      });

      it('the guardian can acknowledge with a response', async () => {
        await svc.acknowledge(parentActor, childId, reviewId, { response: 'Thank you.' });
        const v = (await svc.listForGuardian(parentActor, childId))[0] as any;
        expect(v.status).toBe('ACKNOWLEDGED');
        expect(v.yourResponse).toContain('Thank you');
      });

      it('a shared review can no longer be edited', async () => {
        await expect(svc.updateSummary(lead.actor, facilityId, reviewId, { summary: 'x' })).rejects.toThrow(/already been shared/i);
      });
    });
  });

  describe('the due list', () => {
    it('lists an in-band child with no review, and drops them once reviewed', async () => {
      const p2 = await mkParentWithChild(s, 'Sam', '2024-04-01'); // ~27 months → in band
      await attachChildToFacility(prisma, p2.child.id, facilityId, { type: 'ENROLLED' });
      await grantConsent(prisma, { childId: p2.child.id, facilityId, type: 'ASSESSMENT', purpose: 'x', grantedByUserId: p2.user.id });

      let due = await svc.due(lead.actor, facilityId);
      expect(due.some((d) => d.childId === p2.child.id)).toBe(true);

      await insertEducatorScreening(p2.child.id, []);
      await svc.create(lead.actor, facilityId, p2.child.id, {});
      due = await svc.due(lead.actor, facilityId);
      expect(due.some((d) => d.childId === p2.child.id)).toBe(false);
    });
  });

  describe('revocation', () => {
    it('after the guardian withdraws ASSESSMENT consent, the lead cannot review again', async () => {
      await revokeConsent(prisma, childId, facilityId, 'ASSESSMENT');
      await expect(svc.create(lead.actor, facilityId, childId, {})).rejects.toThrow(/consent|granted access|active/i);
    });
  });
});
