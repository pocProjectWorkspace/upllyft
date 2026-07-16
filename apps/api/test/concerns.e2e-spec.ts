import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../src/prisma/prisma.module';
import { NotificationModule } from '../src/notification/notification.module';
import { ConcernsService } from '../src/concerns/concerns.service';
import { ConcernCoachingService } from '../src/concerns/concern-coaching.service';
import { grantConsent, revokeConsent } from '../src/common/consent';
import { attachChildToFacility } from '../src/common/child-scope';
import { prisma, scope, mkFacility, mkStaff, mkParentWithChild, cleanup, type Scope } from './helpers/fixtures';

/**
 * The concern → conversation pathway (F6).
 *
 * Two things are load-bearing:
 *   1. WHO may raise — the inclusion lead / owner / admin, never a plain keyworker, and only
 *      with an ACTIVE, consented enrolment.
 *   2. WHAT the parent sees — the shared summary and nothing else. The private staff coaching
 *      must never cross to the guardian path.
 *
 * The coaching AI is STUBBED here (the real thing would hit Anthropic — non-deterministic and
 * slow). This spec tests the concerns SERVICE — the gate, the evidence gathering, the
 * draft→share→acknowledge lifecycle, and the staff/parent boundary. The real coaching output
 * (incl. that it never diagnoses) is tested in concern-coaching.e2e-spec.
 */
describe('Concerns (F6 coached conversation)', () => {
  const s: Scope = scope('t-concern');
  let mod: TestingModule;
  let svc: ConcernsService;

  let facilityId: string;
  let lead: any;      // INCLUSION_LEAD — may raise
  let keyworker: any; // KEYWORKER — may not raise
  let outsider: any;  // staffs another nursery
  let parentActor: any;
  let childId: string;

  beforeAll(async () => {
    mod = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, NotificationModule],
      providers: [ConcernsService, ConcernCoachingService],
    })
      // Stub the AI so this suite is deterministic and offline. It returns distinct staff
      // and parent text that echoes the child's name — enough to test the service's plumbing.
      .overrideProvider(ConcernCoachingService)
      .useValue({
        coach: async (input: any) => ({
          staffCoaching: `STAFF GUIDANCE: how to raise this with ${input.childFirstName}'s parent.`,
          parentSummary: `Hello — we'd love a quick chat about how ${input.childFirstName} is getting on.`,
          model: 'stub',
        }),
      })
      .compile();
    svc = mod.get(ConcernsService);

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

    // Some evidence: two CONCERN observations, domain-tagged.
    const aff = await prisma.childAffiliation.findFirstOrThrow({ where: { childId, facilityId } });
    for (const [domain, note] of [
      ['speechLanguage', 'Still mostly single words; other children struggle to understand her.'],
      ['socialEmotional', 'Plays alongside but rarely with other children.'],
    ] as const) {
      await prisma.observation.create({
        data: { childId, affiliationId: aff.id, facilityId, authorId: keyworker.user.id, type: 'CONCERN', domain, note },
      });
    }
  });

  afterAll(async () => {
    await cleanup(s);
    await prisma.$disconnect();
    await mod.close();
  });

  describe('who may raise', () => {
    it('a KEYWORKER cannot raise — they observe; the inclusion lead escalates', async () => {
      await expect(svc.raise(keyworker.actor, facilityId, childId, {})).rejects.toThrow(/requires one of/i);
    });

    it('an outsider from another nursery cannot raise', async () => {
      await expect(svc.raise(outsider.actor, facilityId, childId, {})).rejects.toThrow();
    });

    it('cannot raise with no evidence recorded', async () => {
      const p2 = await mkParentWithChild(s, 'Empty', '2023-02-01');
      await attachChildToFacility(prisma, p2.child.id, facilityId, { type: 'ENROLLED' });
      await grantConsent(prisma, { childId: p2.child.id, facilityId, type: 'DATA_PROCESSING', purpose: 'x', grantedByUserId: p2.user.id });
      await expect(svc.raise(lead.actor, facilityId, p2.child.id, {})).rejects.toThrow(/nothing to raise/i);
    });
  });

  describe('raising generates coaching + a draft, from the recorded evidence', () => {
    let concernId: string;

    it('the inclusion lead can raise, and it lands as a DRAFT with both parts', async () => {
      const c = await svc.raise(lead.actor, facilityId, childId, {});
      concernId = c.id;

      expect(c.status).toBe('DRAFT');
      // Domains gathered from the concern observations.
      expect(c.domains).toEqual(expect.arrayContaining(['speechLanguage', 'socialEmotional']));
      // Private coaching for staff, and a parent draft — both present, and DIFFERENT.
      expect(c.staffCoaching).toBeTruthy();
      expect(c.parentSummary).toBeTruthy();
      expect(c.staffCoaching).not.toEqual(c.parentSummary);
      // Evidence snapshot.
      expect(c.evidence.concernObservations).toBe(2);
    });

    it('the parent draft speaks to the parent, by the child’s name', async () => {
      const all = await svc.listForFacility(lead.actor, facilityId, childId);
      const c = all.find((x) => x.id === concernId)!;
      expect(c.parentSummary).toContain('Mira');
    });

    it('the summary can be edited while DRAFT', async () => {
      const edited = await svc.updateSummary(lead.actor, facilityId, concernId, {
        parentSummary: 'We would love a quick chat about how Mira is getting on.',
      });
      expect(edited.parentSummary).toContain('quick chat');
    });

    it('a parent CANNOT see a DRAFT — only what has been shared', async () => {
      const parentView = await svc.listForGuardian(parentActor, childId);
      expect(parentView.length).toBe(0);
    });

    describe('once shared', () => {
      beforeAll(async () => {
        await svc.share(lead.actor, facilityId, concernId);
      });

      it('the guardian now sees it — the summary, never the private coaching', async () => {
        const parentView: any[] = await svc.listForGuardian(parentActor, childId);
        expect(parentView.length).toBe(1);
        const c = parentView[0];
        expect(c.summary).toContain('quick chat');
        expect(c.facilityName).toBe('Willow');
        // The private staff coaching must NOT be on the guardian shape.
        expect(c).not.toHaveProperty('staffCoaching');
      });

      it('the guardian can acknowledge, with a response', async () => {
        await svc.acknowledge(parentActor, childId, concernId, { response: 'Thank you — yes, let’s talk.' });
        const c = (await svc.listForGuardian(parentActor, childId))[0] as any;
        expect(c.status).toBe('ACKNOWLEDGED');
        expect(c.yourResponse).toContain('let’s talk');
      });

      it('a shared concern can no longer be edited', async () => {
        await expect(
          svc.updateSummary(lead.actor, facilityId, concernId, { parentSummary: 'changed' }),
        ).rejects.toThrow(/already been shared/i);
      });
    });
  });

  describe('revocation stops NEW concerns, but the parent keeps what was shared', () => {
    it('after the guardian withdraws consent, the lead cannot raise again — the parent still sees the old one', async () => {
      await revokeConsent(prisma, childId, facilityId, 'DATA_PROCESSING');
      await expect(svc.raise(lead.actor, facilityId, childId, {})).rejects.toThrow(/No active|guardian/i);
      // The already-shared concern is still visible to the parent — it is about their child.
      const parentView = await svc.listForGuardian(parentActor, childId);
      expect(parentView.length).toBeGreaterThan(0);
    });
  });
});
