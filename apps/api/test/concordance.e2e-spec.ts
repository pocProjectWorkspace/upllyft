import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../src/prisma/prisma.module';
import { ConcordanceService } from '../src/assessments/concordance.service';
import { grantConsent } from '../src/common/consent';
import { attachChildToFacility } from '../src/common/child-scope';
import { prisma, scope, mkFacility, mkStaff, mkParentWithChild, cleanup, type Scope } from './helpers/fixtures';

/**
 * Multi-informant concordance — the reason any of this exists.
 *
 * The assertions that matter most are about what it REFUSES to say. A domain the nursery
 * could not observe is NOT agreement, NOT disagreement, and above all NOT reassurance.
 * Letting a keyworker's blind spot read as "the nursery isn't worried" would fabricate a
 * consensus out of silence — which is precisely the failure this feature exists to
 * prevent, and it would do it in the direction of NOT referring a child.
 */
describe('Concordance — home vs nursery', () => {
  const s: Scope = scope('t-conc');
  let mod: TestingModule;
  let svc: ConcordanceService;

  let facilityId: string;
  let edu: any;
  let parentActor: any;
  let childId: string;
  let parentA: string;
  let eduA: string;

  /** A persisted domainScores blob, shaped the way the scorer writes it. */
  const D = (riskIndex: number, status: string, name: string) => ({
    domainName: name,
    riskIndex,
    status,
    tier2Required: false,
    coverage: status === 'INSUFFICIENT_DATA' ? 0.2 : 1,
    observedCount: status === 'INSUFFICIENT_DATA' ? 1 : 5,
    availableCount: 5,
  });

  beforeAll(async () => {
    mod = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
      providers: [ConcordanceService],
    }).compile();
    svc = mod.get(ConcordanceService);

    facilityId = (await mkFacility(s, 'Sunrise', 'NURSERY')).facility.id;
    edu = await mkStaff(s, facilityId, 'kw', 'KEYWORKER');

    const p = await mkParentWithChild(s, 'Nour', '2023-02-01');
    parentActor = { id: p.user.id, role: 'USER' };
    childId = p.child.id;

    await attachChildToFacility(prisma, childId, facilityId, { type: 'ENROLLED' });
    await grantConsent(prisma, {
      childId,
      facilityId,
      type: 'ASSESSMENT',
      purpose: 'Screening',
      grantedByUserId: p.user.id,
    });

    parentA = (
      await prisma.assessment.create({
        data: {
          childId,
          ageGroup: '24-36-months',
          status: 'TIER2_REQUIRED',
          tier1Completed: true,
          tier1CompletedAt: new Date(),
          informantType: 'PARENT',
          respondentId: p.user.id,
          domainScores: {
            sensoryProcessing: D(0.7, 'RED', 'Sensory Processing'),
            socialEmotional: D(0.1, 'GREEN', 'Social-Emotional'),
            speechLanguage: D(0.5, 'RED', 'Speech & Language'),
            grossMotor: D(0.1, 'GREEN', 'Gross Motor'),
          },
        },
      })
    ).id;
  });

  afterAll(async () => {
    await cleanup(s);
    await prisma.$disconnect();
    await mod.close();
  });

  it('with only one informant it says which is missing, rather than guessing', async () => {
    const c: any = await svc.getConcordance(childId, parentActor);
    expect(c.available).toBe(false);
    expect(c.reason).toMatch(/nursery screening/i);
  });

  describe('with both informants', () => {
    beforeAll(async () => {
      eduA = (
        await prisma.assessment.create({
          data: {
            childId,
            ageGroup: '24-36-months',
            status: 'TIER2_REQUIRED',
            tier1Completed: true,
            tier1CompletedAt: new Date(),
            informantType: 'EDUCATOR',
            respondentId: edu.user.id,
            facilityId,
            domainScores: {
              // The keyworker could not observe sensory at all.
              sensoryProcessing: D(0, 'INSUFFICIENT_DATA', 'Sensory Processing'),
              socialEmotional: D(0.6, 'RED', 'Social-Emotional'),
              speechLanguage: D(0.55, 'RED', 'Speech & Language'),
              grossMotor: D(0.05, 'GREEN', 'Gross Motor'),
            },
          },
        })
      ).id;
    });

    const get = async () => {
      const c: any = await svc.getConcordance(childId, edu.actor);
      return { c, by: (id: string) => c.domains.find((d: any) => d.domainId === id) };
    };

    it('a TIER2_REQUIRED screening is comparable — tier 1 is enough', async () => {
      // Requiring status COMPLETED was a bug: a screening that flags a concern moves to
      // TIER2_REQUIRED, so the children who flagged something — precisely the ones this
      // comparison exists for — would never have gotten one.
      const { c } = await get();
      expect(c.available).toBe(true);
    });

    it('both concerned -> AGREE_CONCERN, the strongest signal short of a clinician', async () => {
      const { by } = await get();
      expect(by('speechLanguage').concordance).toBe('AGREE_CONCERN');
    });

    it('nursery flags, home does not -> EDUCATOR_ONLY (group demands surface it)', async () => {
      const { by } = await get();
      expect(by('socialEmotional').concordance).toBe('EDUCATOR_ONLY');
      expect(by('socialEmotional').interpretation).toMatch(/demands of a group/i);
    });

    it('both fine -> AGREE_TYPICAL', async () => {
      const { by } = await get();
      expect(by('grossMotor').concordance).toBe('AGREE_TYPICAL');
    });

    it('THE REFUSAL: an unobservable domain is NOT agreement and NOT reassurance', async () => {
      const { by } = await get();
      const sens = by('sensoryProcessing');

      expect(sens.concordance).toBe('NOT_COMPARABLE');
      expect(sens.concordance).not.toBe('AGREE_TYPICAL');
      expect(sens.interpretation).toMatch(/not the same as them having no concerns/i);

      // ...and the parent's RED flag is NOT cancelled out by the nursery's silence.
      expect(sens.parent.status).toBe('RED');
      expect(sens.delta).toBeNull();
    });

    it('the summary leads with the agreed concern', async () => {
      const { c } = await get();
      expect(c.summary.headline).toMatch(/agree there is difficulty/i);
      expect(c.summary.agreedConcern).toContain('Speech & Language');
      expect(c.summary.educatorOnly).toContain('Social-Emotional');
      expect(c.summary.notComparable).toContain('Sensory Processing');
    });

    it('PARENT_ONLY does not treat a settled nursery report as the parent being wrong', async () => {
      // The child who holds it together all day and falls apart at the school gate. This
      // pattern is routinely mistaken for a parenting problem.
      await prisma.assessment.update({
        where: { id: eduA },
        data: { domainScores: { sensoryProcessing: D(0.05, 'GREEN', 'Sensory Processing') } },
      });
      await prisma.assessment.update({
        where: { id: parentA },
        data: { domainScores: { sensoryProcessing: D(0.8, 'RED', 'Sensory Processing') } },
      });

      const { by } = await get();
      expect(by('sensoryProcessing').concordance).toBe('PARENT_ONLY');
      expect(by('sensoryProcessing').interpretation).toMatch(/does not mean the parent is mistaken/i);
    });

    it('screenings too far apart are not compared — that would be time, not setting', async () => {
      await prisma.assessment.update({
        where: { id: parentA },
        data: { tier1CompletedAt: new Date(Date.now() - 200 * 86_400_000), completedAt: null },
      });

      const c: any = await svc.getConcordance(childId, parentActor);
      expect(c.available).toBe(false);
      expect(c.reason).toMatch(/days apart/i);
    });
  });
});
