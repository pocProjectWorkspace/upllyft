import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../src/prisma/prisma.module';
import { NotificationModule } from '../src/notification/notification.module';
import { HandoverService } from '../src/handover/handover.service';
import { grantConsent, revokeConsent } from '../src/common/consent';
import { attachChildToFacility } from '../src/common/child-scope';
import { prisma, scope, mkFacility, mkStaff, mkParentWithChild, cleanup, type Scope } from './helpers/fixtures';

/**
 * The onward handover record (F11).
 *
 * Load-bearing: a handover LEAVES the setting only after the GUARDIAN authorises that specific
 * onward disclosure. Assembling is a staff action; disclosing is the family's decision.
 */
describe('Handover records (F11)', () => {
  const s: Scope = scope('t-handover');
  let mod: TestingModule;
  let svc: HandoverService;

  let facilityId: string;
  let lead: any;
  let keyworker: any;
  let outsider: any;
  let parentActor: any;
  let childId: string;

  beforeAll(async () => {
    mod = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, NotificationModule],
      providers: [HandoverService],
    }).compile();
    svc = mod.get(HandoverService);

    facilityId = (await mkFacility(s, 'Willow', 'NURSERY')).facility.id;
    const otherFac = (await mkFacility(s, 'Other', 'NURSERY')).facility.id;
    lead = await mkStaff(s, facilityId, 'lead', 'INCLUSION_LEAD');
    keyworker = await mkStaff(s, facilityId, 'kw', 'KEYWORKER');
    outsider = await mkStaff(s, otherFac, 'outsider', 'INCLUSION_LEAD');

    const p = await mkParentWithChild(s, 'Mira', '2022-05-01'); // ~4yo, moving to school
    parentActor = { id: p.user.id, role: 'USER' };
    childId = p.child.id;

    await attachChildToFacility(prisma, childId, facilityId, { type: 'ENROLLED' });
    await grantConsent(prisma, {
      childId, facilityId, type: 'DATA_PROCESSING', purpose: 'Observations', grantedByUserId: p.user.id,
    });

    // A little evidence so the assembled snapshot is non-trivial.
    const aff = await prisma.childAffiliation.findFirstOrThrow({ where: { childId, facilityId } });
    await prisma.observation.create({
      data: { childId, affiliationId: aff.id, facilityId, authorId: keyworker.user.id, type: 'CONCERN', domain: 'speechLanguage', note: 'Single words mostly.' },
    });
  });

  afterAll(async () => {
    await cleanup(s);
    await prisma.$disconnect();
    await mod.close();
  });

  describe('who may assemble', () => {
    it('a KEYWORKER cannot generate a handover', async () => {
      await expect(svc.generate(keyworker.actor, facilityId, childId, { recipientType: 'SCHOOL' })).rejects.toThrow(/requires one of/i);
    });
    it('an outsider cannot', async () => {
      await expect(svc.generate(outsider.actor, facilityId, childId, { recipientType: 'SCHOOL' })).rejects.toThrow(/not found/i);
    });
  });

  describe('assemble → guardian authorises → share', () => {
    let handoverId: string;

    it('the lead assembles a DRAFT with a snapshot and a narrative', async () => {
      const h = await svc.generate(lead.actor, facilityId, childId, { recipientType: 'SCHOOL', recipientName: 'Oakfield Primary' });
      handoverId = h.id;
      expect(h.status).toBe('DRAFT');
      expect(h.summary).toContain('Mira');
      expect(h.snapshot).toBeTruthy();
      expect((h.snapshot as any).observations.concerns).toBe(1);
      expect(h.guardianAuthorised).toBe(false);
    });

    it('it CANNOT be shared before the guardian authorises it', async () => {
      await expect(svc.share(lead.actor, facilityId, handoverId)).rejects.toThrow(/not yet authorised/i);
    });

    it('the guardian sees it pending, and authorises it', async () => {
      const before: any[] = await svc.listForGuardian(parentActor, childId);
      expect(before.length).toBe(1);
      expect(before[0].authorised).toBe(false);

      await svc.authorize(parentActor, childId, handoverId);
      const after = (await svc.listForGuardian(parentActor, childId))[0] as any;
      expect(after.authorised).toBe(true);
    });

    it('now the lead can share it, and it cannot be edited afterwards', async () => {
      const shared = await svc.share(lead.actor, facilityId, handoverId);
      expect(shared.status).toBe('SHARED');
      await expect(svc.update(lead.actor, facilityId, handoverId, { summary: 'x' })).rejects.toThrow(/already been shared/i);
    });
  });

  describe('revocation', () => {
    it('after the guardian withdraws consent, the lead cannot assemble a new handover', async () => {
      await revokeConsent(prisma, childId, facilityId, 'DATA_PROCESSING');
      await expect(svc.generate(lead.actor, facilityId, childId, { recipientType: 'CLINICIAN' })).rejects.toThrow(/consent|granted access|active/i);
    });
  });
});
