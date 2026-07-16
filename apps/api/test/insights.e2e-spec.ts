import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../src/prisma/prisma.module';
import { InsightsService } from '../src/insights/insights.service';
import { grantConsent } from '../src/common/consent';
import { attachChildToFacility } from '../src/common/child-scope';
import { prisma, scope, mkFacility, mkStaff, mkParentWithChild, cleanup, type Scope } from './helpers/fixtures';

/**
 * Setting-level insights + equity (F10).
 *
 * Two things matter: it is FACILITY-SCOPED (a child at another nursery must never inflate this
 * nursery's counts — the clinic-outcomes leak lesson), and only leadership may read it.
 */
describe('Insights (F10)', () => {
  const s: Scope = scope('t-insights');
  let mod: TestingModule;
  let svc: InsightsService;

  let facilityId: string;
  let otherFacilityId: string;
  let lead: any;
  let keyworker: any;
  let outsider: any;

  const enrol = async (name: string, gender: string, fac: string, flagged: string[] | null) => {
    const p = await mkParentWithChild(s, name, '2023-01-01', { gender });
    await attachChildToFacility(prisma, p.child.id, fac, { type: 'ENROLLED' });
    await grantConsent(prisma, { childId: p.child.id, facilityId: fac, type: 'DATA_PROCESSING', purpose: 'x', grantedByUserId: p.user.id });
    if (flagged) {
      await prisma.assessment.create({
        data: { childId: p.child.id, ageGroup: '24-36-months', informantType: 'EDUCATOR', facilityId: fac, tier1Completed: true, tier1CompletedAt: new Date(), flaggedDomains: flagged },
      });
    }
    return p.child.id;
  };

  beforeAll(async () => {
    mod = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
      providers: [InsightsService],
    }).compile();
    svc = mod.get(InsightsService);

    facilityId = (await mkFacility(s, 'Willow', 'NURSERY')).facility.id;
    otherFacilityId = (await mkFacility(s, 'Other', 'NURSERY')).facility.id;
    lead = await mkStaff(s, facilityId, 'lead', 'INCLUSION_LEAD');
    keyworker = await mkStaff(s, facilityId, 'kw', 'KEYWORKER');
    outsider = await mkStaff(s, otherFacilityId, 'outsider', 'INCLUSION_LEAD');

    await enrol('Ali', 'male', facilityId, ['speechLanguage']);
    await enrol('Bea', 'female', facilityId, ['speechLanguage']);
    await enrol('Cai', 'male', facilityId, null);
    // A child at ANOTHER nursery, flagged on a domain nobody here has — must NOT leak in.
    await enrol('Zed', 'male', otherFacilityId, ['visionHearing']);
  });

  afterAll(async () => {
    await cleanup(s);
    await prisma.$disconnect();
    await mod.close();
  });

  it('a KEYWORKER cannot read insights', async () => {
    await expect(svc.facilityInsights(keyworker.actor, facilityId)).rejects.toThrow(/requires one of/i);
  });

  it('an outsider is told the facility does not exist', async () => {
    await expect(svc.facilityInsights(outsider.actor, facilityId)).rejects.toThrow(/not found/i);
  });

  it('the lead sees the setting counts — and ONLY this setting', async () => {
    const ins = await svc.facilityInsights(lead.actor, facilityId);

    expect(ins.headcount.active).toBe(3);
    expect(ins.headcount.identified).toBe(2); // Ali + Bea

    const speech = ins.domainFlags.find((d) => d.domain === 'speechLanguage');
    expect(speech?.count).toBe(2);
    // The other nursery's child was flagged on visionHearing — it must not appear here.
    expect(ins.domainFlags.some((d) => d.domain === 'visionHearing')).toBe(false);
  });

  it('reports identification rate by group (equity)', async () => {
    const ins = await svc.facilityInsights(lead.actor, facilityId);

    const male = ins.equity.byGender.find((g) => g.group === 'male');
    const female = ins.equity.byGender.find((g) => g.group === 'female');
    expect(male?.total).toBe(2); // Ali, Cai
    expect(male?.identified).toBe(1); // Ali
    expect(female?.total).toBe(1); // Bea
    expect(female?.identified).toBe(1);
    expect(female?.rate).toBe(1);
  });
});
