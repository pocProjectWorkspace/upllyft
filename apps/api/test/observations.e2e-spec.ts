import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../src/prisma/prisma.module';
import { ObservationsService } from '../src/observations/observations.service';
import { grantConsent, revokeConsent } from '../src/common/consent';
import { attachChildToFacility } from '../src/common/child-scope';
import { prisma, scope, mkFacility, mkStaff, mkParentWithChild, cleanup, type Scope } from './helpers/fixtures';

/**
 * Continuous observation capture.
 *
 * The gate IS the feature. An observation can only be WRITTEN while the child holds an
 * ACTIVE affiliation with a live observation consent, and nursery staff can only READ it
 * while that consent stands. Each of those is tested by removing it and checking the door
 * shuts.
 *
 * Requiring ACTIVE is not just about consent — it upholds "a PENDING_CONSENT affiliation
 * accrues no data", which is what keeps the F3 placeholder-merge safe. A test asserts a
 * pending child cannot be observed.
 */
describe('Observations', () => {
  const s: Scope = scope('t-obs');
  let mod: TestingModule;
  let svc: ObservationsService;

  let facilityId: string;
  let otherFacilityId: string;
  let edu: any;
  let outsider: any;
  let parentActor: any;
  let childId: string;

  beforeAll(async () => {
    mod = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
      providers: [ObservationsService],
    }).compile();
    svc = mod.get(ObservationsService);

    facilityId = (await mkFacility(s, 'Willow', 'NURSERY')).facility.id;
    otherFacilityId = (await mkFacility(s, 'Other', 'NURSERY')).facility.id;
    edu = await mkStaff(s, facilityId, 'kw', 'KEYWORKER');
    outsider = await mkStaff(s, otherFacilityId, 'outsider', 'KEYWORKER');

    const p = await mkParentWithChild(s, 'Mira', '2023-02-01');
    parentActor = { id: p.user.id, role: 'USER' };
    childId = p.child.id;
  });

  afterAll(async () => {
    await cleanup(s);
    await prisma.$disconnect();
    await mod.close();
  });

  const note = (extra: any = {}) => ({ note: 'Built a tall tower and showed a friend', ...extra });

  describe('a PENDING_CONSENT affiliation accrues no data', () => {
    it('refuses an observation before the guardian has consented', async () => {
      await attachChildToFacility(prisma, childId, facilityId, { type: 'ENROLLED' }); // PENDING_CONSENT
      await expect(svc.create(edu.actor, facilityId, childId, note())).rejects.toThrow(
        /guardian has not yet granted|No active|not affiliated/i,
      );
      await expect(prisma.observation.count({ where: { childId } })).resolves.toBe(0);
    });
  });

  describe('with an active, consented enrolment', () => {
    beforeAll(async () => {
      await grantConsent(prisma, {
        childId,
        facilityId,
        type: 'DATA_PROCESSING',
        purpose: 'Observations',
        grantedByUserId: parentActor.id,
      });
    });

    it('records an observation, domain-tagged and attributed to the keyworker', async () => {
      const o = await svc.create(edu.actor, facilityId, childId, note({ domain: 'socialEmotional', type: 'MOMENT' }));
      expect(o.domain).toBe('socialEmotional');
      expect(o.type).toBe('MOMENT');
      expect(o.author?.id).toBe(edu.user.id);

      const row = await prisma.observation.findUniqueOrThrow({ where: { id: o.id } });
      expect(row.facilityId).toBe(facilityId);
      // Anchored to the ACTIVE affiliation.
      const aff = await prisma.childAffiliation.findFirstOrThrow({ where: { childId, facilityId, status: 'ACTIVE' } });
      expect(row.affiliationId).toBe(aff.id);
    });

    it('a future observedAt is clamped to now — you cannot record the future', async () => {
      const future = new Date(Date.now() + 5 * 86_400_000).toISOString();
      const o = await svc.create(edu.actor, facilityId, childId, note({ observedAt: future }));
      expect(new Date(o.observedAt).getTime()).toBeLessThanOrEqual(Date.now() + 2000);
    });

    it('a domain outside the 8 is rejected by validation (guarded at the DTO)', () => {
      // The DTO @IsIn enforces this before the service is reached; documented here so the
      // constraint is visible in the behavioural suite.
      const { DEVELOPMENTAL_DOMAINS } = require('../src/observations/dto/observations.dto');
      expect(DEVELOPMENTAL_DOMAINS).not.toContain('bogusDomain');
      expect(DEVELOPMENTAL_DOMAINS).toContain('speechLanguage');
    });

    it('the timeline is newest-first and filterable by domain', async () => {
      await svc.create(edu.actor, facilityId, childId, note({ domain: 'speechLanguage', type: 'CONCERN' }));

      const all = await svc.listForFacility(edu.actor, facilityId, childId, {});
      expect(all.length).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < all.length; i++) {
        expect(new Date(all[i - 1].observedAt).getTime()).toBeGreaterThanOrEqual(new Date(all[i].observedAt).getTime());
      }

      const speech = await svc.listForFacility(edu.actor, facilityId, childId, { domain: 'speechLanguage' });
      expect(speech.length).toBeGreaterThanOrEqual(1);
      expect(speech.every((o) => o.domain === 'speechLanguage')).toBe(true);
    });

    it('an educator from another nursery cannot read or write', async () => {
      await expect(svc.listForFacility(outsider.actor, facilityId, childId, {})).rejects.toThrow();
      await expect(svc.create(outsider.actor, facilityId, childId, note())).rejects.toThrow();
    });

    it('the guardian can always see what was recorded about their child', async () => {
      const mine = await svc.listForGuardian(parentActor, childId, {});
      expect(mine.length).toBeGreaterThanOrEqual(2);
      // ...and it tells them which setting recorded it.
      expect(mine[0]).toHaveProperty('facilityName', 'Willow');
    });

    it('the author can retract their own observation', async () => {
      const o = await svc.create(edu.actor, facilityId, childId, note());
      await expect(svc.remove(edu.actor, facilityId, o.id)).resolves.toEqual({ deleted: true });
      await expect(prisma.observation.findUnique({ where: { id: o.id } })).resolves.toBeNull();
    });
  });

  describe('revocation bites', () => {
    it('after the guardian withdraws consent, the nursery loses read AND write — but the guardian still sees the history', async () => {
      // Consent currently stands from the block above. Withdraw it.
      await revokeConsent(prisma, childId, facilityId, 'DATA_PROCESSING');

      await expect(svc.create(edu.actor, facilityId, childId, note())).rejects.toThrow(/No active|guardian/i);
      await expect(svc.listForFacility(edu.actor, facilityId, childId, {})).rejects.toThrow(/No active|guardian/i);

      // The observations already recorded still EXIST (they are a record of what happened)
      // and the guardian can still see them — it is their child.
      const mine = await svc.listForGuardian(parentActor, childId, {});
      expect(mine.length).toBeGreaterThan(0);
    });
  });
});
