import { ForbiddenException } from '@nestjs/common';
import { AssessmentsService } from '../src/assessments/assessments.service';
import { CasesService } from '../src/cases/cases.service';
import { CareWaitlistService } from '../src/care-waitlist/care-waitlist.service';
import { prisma, scope, mkUser, mkParentWithChild, cleanup, type Scope } from './helpers/fixtures';

/**
 * Product decisions of 2026-09-30.
 *
 * #8  A screening shared with a professional exposes scores + summary, the answers
 *     only on the parent's opt-in; sharing grants reading, never answering, deleting
 *     or re-sharing; and the share ends when the professional's case closes.
 * #1  The care waitlist: joining is idempotent, and a provider joining in the
 *     family's country notifies them once.
 */
describe('Backlog decisions (#1 waitlist, #8 screening sharing)', () => {
  const s: Scope = scope('t-bklg');
  const notify = jest.fn().mockResolvedValue(undefined);
  const assessments = new AssessmentsService(
    prisma as any,
    {} as any,
    {} as any,
    { createNotification: notify } as any,
  );
  const cases = new CasesService(prisma as any);
  const waitlist = new CareWaitlistService(prisma as any, { createNotification: notify } as any);
  const caseIds: string[] = [];

  afterAll(async () => {
    await prisma.caseAuditLog.deleteMany({ where: { caseId: { in: caseIds } } });
    await prisma.case.deleteMany({ where: { id: { in: caseIds } } });
    await prisma.careWaitlistEntry.deleteMany({ where: { user: { email: { contains: s.tag } } } });
    await prisma.therapistProfile.deleteMany({ where: { user: { email: { contains: s.tag } } } });
    await cleanup(s);
    await prisma.$disconnect();
  });

  async function screenedChild(name: string) {
    const { user: parent, child } = await mkParentWithChild(s, name, '2022-01-01');
    const assessment = await prisma.assessment.create({
      data: {
        childId: child.id,
        ageGroup: '24-36',
        status: 'COMPLETED',
        completedAt: new Date(),
        respondentId: parent.id,
        responses: {
          create: [{ tier: 1, domain: 'speechLanguage', questionId: 'q1', answer: 'NO', score: 0 }],
        },
      },
    });
    return { parent, child, assessment };
  }

  async function therapist(name: string) {
    const user = await mkUser(s, name, 'THERAPIST');
    const profile = await prisma.therapistProfile.create({ data: { userId: user.id } });
    return { user, profile };
  }

  describe('#8 screening sharing', () => {
    it('a share recipient sees scores and summary, not the answers, unless the parent opted in', async () => {
      const { parent, assessment } = await screenedChild('Scope');
      const t = await therapist('share-viewer');

      await assessments.shareAssessment(assessment.id, { therapistId: t.profile.id } as any, parent.id);
      const seen = (await assessments.getAssessment(assessment.id, t.user.id)) as any;
      expect(seen.responses).toEqual([]);
      expect(seen.responsesWithheld).toBe(true);
      expect(seen.domainScores ?? null).toEqual(assessment.domainScores ?? null);

      // The parent still sees everything.
      const own = (await assessments.getAssessment(assessment.id, parent.id)) as any;
      expect(own.responses).toHaveLength(1);
      expect(own.responsesWithheld).toBeUndefined();

      // Opt-in: re-share with answers after revoking.
      await prisma.assessmentShare.updateMany({ where: { assessmentId: assessment.id }, data: { isActive: false } });
      await assessments.shareAssessment(
        assessment.id,
        { therapistId: t.profile.id, includeResponses: true } as any,
        parent.id,
      );
      const withAnswers = (await assessments.getAssessment(assessment.id, t.user.id)) as any;
      expect(withAnswers.responses).toHaveLength(1);
    });

    it('a share recipient cannot answer, delete, re-share, or pull the detailed PDF', async () => {
      const { parent, assessment } = await screenedChild('Locked');
      const t = await therapist('share-locked');
      const other = await therapist('share-third');
      await assessments.shareAssessment(assessment.id, { therapistId: t.profile.id } as any, parent.id);

      await expect(assessments.getTier1Questionnaire(assessment.id, t.user.id)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        assessments.submitTier1Responses(assessment.id, { responses: [] } as any, t.user.id),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(assessments.deleteAssessment(assessment.id, t.user.id)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        assessments.shareAssessment(assessment.id, { therapistId: other.profile.id } as any, t.user.id),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(assessments.downloadReport(assessment.id, 'DETAILED', t.user.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );

      expect(await prisma.assessment.count({ where: { id: assessment.id } })).toBe(1);
    });

    it('closing the case ends the case therapist’s access, unless they are on another open case', async () => {
      const { parent, child, assessment } = await screenedChild('Closing');
      const leaving = await therapist('case-leaving');
      const staying = await therapist('case-staying');
      for (const t of [leaving, staying]) {
        await assessments.shareAssessment(assessment.id, { therapistId: t.profile.id } as any, parent.id);
      }

      const closing = await prisma.case.create({
        data: { caseNumber: `${s.tag}-1`, childId: child.id, primaryTherapistId: leaving.profile.id },
      });
      const other = await prisma.case.create({
        data: { caseNumber: `${s.tag}-2`, childId: child.id, primaryTherapistId: staying.profile.id },
      });
      caseIds.push(closing.id, other.id);
      await prisma.caseTherapist.create({ data: { caseId: closing.id, therapistId: staying.profile.id } });

      await cases.updateCaseStatus(closing.id, parent.id, { status: 'DISCHARGED' } as any);

      const shares = await prisma.assessmentShare.findMany({ where: { assessmentId: assessment.id } });
      const active = (userId: string) => shares.find((x) => x.sharedWith === userId)?.isActive;
      expect(active(leaving.user.id)).toBe(false);
      expect(active(staying.user.id)).toBe(true);
    });
  });

  describe('#1 care waitlist', () => {
    it('joining is idempotent and a provider joining in that country notifies the family once', async () => {
      // A country code no real family has, so notifying never touches real waitlist rows
      // in the shared database.
      const here = `Z${s.tag}`.toUpperCase();
      const elsewhere = `Y${s.tag}`.toUpperCase();
      const parent = await mkUser(s, 'waiting-parent');
      const first = await waitlist.join(parent.id, { country: here.toLowerCase(), concern: 'speech' });
      const again = await waitlist.join(parent.id, { country: here, concern: 'speech' });
      expect(again.id).toBe(first.id);
      expect(first.country).toBe(here);

      notify.mockClear();
      await waitlist.notifyProviderJoined({ country: elsewhere, kind: 'therapist', name: 'Elsewhere' });
      expect(notify.mock.calls.some(([n]) => n.userId === parent.id)).toBe(false);

      await waitlist.notifyProviderJoined({ country: here, kind: 'clinic', name: 'New Clinic' });
      expect(notify.mock.calls.filter(([n]) => n.userId === parent.id)).toHaveLength(1);
      const entry = await prisma.careWaitlistEntry.findUniqueOrThrow({ where: { id: first.id } });
      expect(entry.status).toBe('NOTIFIED');

      notify.mockClear();
      await waitlist.notifyProviderJoined({ country: here, kind: 'clinic', name: 'Second Clinic' });
      expect(notify.mock.calls.some(([n]) => n.userId === parent.id)).toBe(false);
    });

    it('a parent cannot join the waitlist for someone else’s child', async () => {
      const { child } = await mkParentWithChild(s, 'NotYours', '2021-05-05');
      const stranger = await mkUser(s, 'wl-stranger');
      await expect(waitlist.join(stranger.id, { childId: child.id })).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
