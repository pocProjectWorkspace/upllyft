import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../src/prisma/prisma.module';
import { NotificationModule } from '../src/notification/notification.module';
import { SupportPlansService } from '../src/support-plans/support-plans.service';
import { grantConsent, revokeConsent } from '../src/common/consent';
import { attachChildToFacility } from '../src/common/child-scope';
import { prisma, scope, mkFacility, mkStaff, mkParentWithChild, cleanup, type Scope } from './helpers/fixtures';

/**
 * In-setting support plans + the graduated approach (F7), and the interventions on them (F8).
 *
 * Two things are load-bearing, and they mirror the concern pathway (F6):
 *   1. WHO may plan — the inclusion lead / owner / admin, never a plain keyworker, and only
 *      with an ACTIVE, consented enrolment.
 *   2. WHAT the parent sees — a SHARED plan's parent summary, its outcomes, and the HOME
 *      strategies. Never the staff notes, never a DRAFT, never an in-setting-only intervention.
 */
describe('Support plans (F7 graduated approach + F8 interventions)', () => {
  const s: Scope = scope('t-support');
  let mod: TestingModule;
  let svc: SupportPlansService;

  let facilityId: string;
  let lead: any; // INCLUSION_LEAD — may plan
  let keyworker: any; // KEYWORKER — may not
  let outsider: any; // staffs another nursery
  let parentActor: any;
  let childId: string;

  beforeAll(async () => {
    mod = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, NotificationModule],
      providers: [SupportPlansService],
    }).compile();
    svc = mod.get(SupportPlansService);

    facilityId = (await mkFacility(s, 'Willow', 'NURSERY')).facility.id;
    const otherFac = (await mkFacility(s, 'Other', 'NURSERY')).facility.id;
    lead = await mkStaff(s, facilityId, 'lead', 'INCLUSION_LEAD');
    keyworker = await mkStaff(s, facilityId, 'kw', 'KEYWORKER');
    outsider = await mkStaff(s, otherFac, 'outsider', 'INCLUSION_LEAD');

    const p = await mkParentWithChild(s, 'Mira', '2023-02-01');
    parentActor = { id: p.user.id, role: 'USER' };
    childId = p.child.id;

    await attachChildToFacility(prisma, childId, facilityId, { type: 'ENROLLED' });
    await grantConsent(prisma, {
      childId, facilityId, type: 'DATA_PROCESSING', purpose: 'Observations', grantedByUserId: p.user.id,
    });
  });

  afterAll(async () => {
    await cleanup(s);
    await prisma.$disconnect();
    await mod.close();
  });

  describe('who may plan', () => {
    it('a KEYWORKER cannot open a plan — they observe; the inclusion lead plans', async () => {
      await expect(
        svc.create(keyworker.actor, facilityId, childId, { title: 'x' }),
      ).rejects.toThrow(/requires one of/i);
    });

    it('an outsider from another nursery cannot — the facility does not exist to them', async () => {
      await expect(
        svc.create(outsider.actor, facilityId, childId, { title: 'x' }),
      ).rejects.toThrow(/not found/i);
    });

    it('cannot plan for a child whose guardian has not consented', async () => {
      const p2 = await mkParentWithChild(s, 'Nc', '2023-02-01');
      await attachChildToFacility(prisma, p2.child.id, facilityId, { type: 'ENROLLED' });
      // Enrolled but PENDING_CONSENT — no consent granted.
      await expect(
        svc.create(lead.actor, facilityId, p2.child.id, { title: 'x' }),
      ).rejects.toThrow(/consent|granted access/i);
    });
  });

  describe('the plan lifecycle: draft → share → review', () => {
    let planId: string;
    let outcomeId: string;

    it('the lead opens a DRAFT plan with an initial outcome', async () => {
      const plan = await svc.create(lead.actor, facilityId, childId, {
        title: 'Settling & early talk',
        domains: ['speechLanguage', 'socialEmotional'],
        staffNotes: 'Keyworker to model two-word phrases at snack.',
        outcomes: [
          {
            domain: 'speechLanguage',
            outcomeText: 'Mira uses two-word phrases to ask for things at snack time.',
            successCriteria: 'Seen on 3 of 5 days across a fortnight.',
            reviewIntervalDays: 14,
          },
        ],
      });
      planId = plan.id;
      outcomeId = plan.outcomes[0].id;

      expect(plan.status).toBe('DRAFT');
      expect(plan.outcomes).toHaveLength(1);
      expect(plan.staffNotes).toBeTruthy();
    });

    it('a HOME strategy and an IN_SETTING strategy can be recorded against the outcome', async () => {
      await svc.addIntervention(lead.actor, facilityId, planId, outcomeId, {
        kind: 'HOME',
        title: 'Snack-time choices at home',
        description: 'Offer two options and pause for Mira to name one.',
      });
      const plan = await svc.addIntervention(lead.actor, facilityId, planId, outcomeId, {
        kind: 'IN_SETTING',
        title: 'Adult modelling at the water tray',
      });
      const outcome = plan.outcomes.find((o: any) => o.id === outcomeId)!;
      expect(outcome.interventions).toHaveLength(2);
    });

    it('a DRAFT cannot be reviewed, and the parent cannot see it', async () => {
      await expect(
        svc.addReview(lead.actor, facilityId, planId, { decision: 'CONTINUE' }),
      ).rejects.toThrow(/share the plan/i);

      const parentView = await svc.listForGuardian(parentActor, childId);
      expect(parentView.length).toBe(0);
    });

    it('sharing requires a parent summary', async () => {
      await expect(svc.share(lead.actor, facilityId, planId)).rejects.toThrow(/summary/i);
      await svc.update(lead.actor, facilityId, planId, {
        summary: 'We are helping Mira settle and start using short phrases. Here is how you can help at home.',
      });
    });

    describe('once shared', () => {
      beforeAll(async () => {
        await svc.share(lead.actor, facilityId, planId);
      });

      it('the guardian sees the plan — summary, outcomes, HOME strategies, but NOT staff notes', async () => {
        const parentView: any[] = await svc.listForGuardian(parentActor, childId);
        expect(parentView.length).toBe(1);
        const plan = parentView[0];
        expect(plan.summary).toContain('settle');
        expect(plan.facilityName).toBe('Willow');
        expect(plan).not.toHaveProperty('staffNotes');

        // Outcomes carry only their HOME strategies to the parent — never the in-setting one.
        const outcome = plan.outcomes[0];
        expect(outcome.homeStrategies).toHaveLength(1);
        expect(outcome.homeStrategies[0].title).toMatch(/home/i);
      });

      it('a review advances the cycle: progress is snapshotted, the plan stays active', async () => {
        const plan = await svc.addReview(lead.actor, facilityId, planId, {
          decision: 'CONTINUE',
          progressNote: 'Beginning to use single words to request. Continue.',
          outcomeUpdates: [{ outcomeId, progress: 40, status: 'IN_PROGRESS' }],
          nextReviewDate: '2026-08-15',
        });
        expect(plan.status).toBe('ACTIVE');
        expect(plan.reviews).toHaveLength(1);
        expect(plan.outcomes[0].currentProgress).toBe(40);
        expect(plan.outcomes[0].status).toBe('IN_PROGRESS');
      });

      it('the guardian can acknowledge, with a response', async () => {
        await svc.acknowledge(parentActor, childId, planId, { response: 'Thank you — we will try the snack-time idea.' });
        const plan = (await svc.listForGuardian(parentActor, childId))[0] as any;
        expect(plan.acknowledgedAt).toBeTruthy();
        expect(plan.yourResponse).toContain('snack-time');
      });

      it('closing the plan via a review moves it to CLOSED, and it can no longer be edited', async () => {
        const plan = await svc.addReview(lead.actor, facilityId, planId, {
          decision: 'CLOSE',
          progressNote: 'Outcome met — using two-word phrases reliably.',
          outcomeUpdates: [{ outcomeId, progress: 100, status: 'ACHIEVED' }],
        });
        expect(plan.status).toBe('CLOSED');

        await expect(
          svc.update(lead.actor, facilityId, planId, { summary: 'changed' }),
        ).rejects.toThrow(/closed/i);
      });
    });
  });

  describe('revocation stops NEW plans, but the parent keeps what was shared', () => {
    it('after the guardian withdraws consent, the lead cannot open a new plan — the shared one remains', async () => {
      await revokeConsent(prisma, childId, facilityId, 'DATA_PROCESSING');
      await expect(
        svc.create(lead.actor, facilityId, childId, { title: 'another' }),
      ).rejects.toThrow(/consent|granted access|active/i);

      const parentView = await svc.listForGuardian(parentActor, childId);
      expect(parentView.length).toBeGreaterThan(0);
    });
  });
});
