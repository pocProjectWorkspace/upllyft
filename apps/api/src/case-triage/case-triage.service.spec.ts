import { ForbiddenException } from '@nestjs/common';
import { CredentialStatus, TriageDecision, TriagePathway } from '@prisma/client';
import { CaseTriageService } from './case-triage.service';

const DAY = 24 * 60 * 60 * 1000;
const verified = { credentialStatus: CredentialStatus.VERIFIED, licenceExpiry: new Date(Date.now() + DAY) };

function setup(licences: Record<string, { credentialStatus: CredentialStatus; licenceExpiry: Date | null }>) {
  const prisma: any = {
    case: {
      findUnique: jest.fn().mockResolvedValue({ id: 'case-1', journeyStage: 'TRIAGE' }),
      update: jest.fn().mockResolvedValue({}),
    },
    triageReview: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'triage-1' }),
      update: jest.fn(),
    },
    therapistProfile: {
      findMany: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve(
          (where.id.in as string[]).filter((id) => licences[id]).map((id) => ({ id, ...licences[id] })),
        ),
      ),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    caseTherapist: { upsert: jest.fn().mockResolvedValue({}) },
    caseSession: { create: jest.fn() },
    assessmentReview: { findFirst: jest.fn().mockResolvedValue({ id: 'existing' }), create: jest.fn() },
    caseAuditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  return { service: new CaseTriageService(prisma), prisma };
}

const proceed = (primaryTherapistId: string, secondaryTherapistIds: string[] = []) => ({
  decision: TriageDecision.PROCEED,
  pathway: TriagePathway.CONSULTATION_ONLY,
  primaryTherapistId,
  secondaryTherapistIds,
});

describe('CaseTriageService.confirm licence gate', () => {
  it('assigns verified therapists', async () => {
    const { service, prisma } = setup({ p1: verified, s1: verified });

    await service.confirm('case-1', 'admin-1', proceed('p1', ['s1']));

    expect(prisma.caseTherapist.upsert).toHaveBeenCalledTimes(2);
  });

  it('refuses an unverified primary therapist and writes nothing', async () => {
    const { service, prisma } = setup({ p1: { credentialStatus: CredentialStatus.PENDING, licenceExpiry: null } });

    await expect(service.confirm('case-1', 'admin-1', proceed('p1'))).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.triageReview.create).not.toHaveBeenCalled();
    expect(prisma.caseTherapist.upsert).not.toHaveBeenCalled();
  });

  it('refuses a secondary therapist whose licence has expired', async () => {
    const { service, prisma } = setup({
      p1: verified,
      s1: { credentialStatus: CredentialStatus.VERIFIED, licenceExpiry: new Date(Date.now() - DAY) },
    });

    await expect(service.confirm('case-1', 'admin-1', proceed('p1', ['s1']))).rejects.toThrow(/expired/);

    expect(prisma.caseTherapist.upsert).not.toHaveBeenCalled();
  });

  it('does not check licences when nobody is being assigned', async () => {
    const { service, prisma } = setup({});

    await service.confirm('case-1', 'admin-1', { decision: TriageDecision.REQUEST_MORE_INFO });

    expect(prisma.therapistProfile.findMany).not.toHaveBeenCalled();
  });
});
