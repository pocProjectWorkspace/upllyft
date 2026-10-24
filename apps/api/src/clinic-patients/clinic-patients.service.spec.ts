import { CredentialStatus } from '@prisma/client';
import { ClinicPatientsService } from './clinic-patients.service';

const DAY = 24 * 60 * 60 * 1000;

function profile(id: string, credentialStatus: CredentialStatus, licenceExpiry: Date | null = null) {
  return {
    id: `profile-${id}`,
    specializations: ['Speech Therapy'],
    credentialStatus,
    licenceExpiry,
    user: { id, name: `Therapist ${id}`, email: `${id}@example.com`, image: null, specialization: null },
  };
}

function setup(profiles: unknown[]) {
  const prisma: any = { therapistProfile: { findMany: jest.fn().mockResolvedValue(profiles) } };
  return { service: new ClinicPatientsService(prisma, {} as any, {} as any), prisma };
}

describe('ClinicPatientsService.getTherapistsList', () => {
  it('says which therapists can be assigned and why the others cannot', async () => {
    const { service } = setup([
      profile('verified', CredentialStatus.VERIFIED, new Date(Date.now() + DAY)),
      profile('pending', CredentialStatus.PENDING),
      profile('expired', CredentialStatus.VERIFIED, new Date(Date.now() - DAY)),
    ]);

    const list = await service.getTherapistsList('clinic-1');

    expect(list.map((t) => [t.id, t.assignable])).toEqual([
      ['verified', true],
      ['pending', false],
      ['expired', false],
    ]);
    expect(list[0].unassignableReason).toBeNull();
    expect(list[1].unassignableReason).toMatch(/not verified/);
    expect(list[2].unassignableReason).toMatch(/expired/);
  });

  it('still lists unverified therapists, so the clinic can see who needs verifying', async () => {
    const { service, prisma } = setup([profile('pending', CredentialStatus.PENDING)]);

    const list = await service.getTherapistsList('clinic-1');

    expect(list).toHaveLength(1);
    expect(prisma.therapistProfile.findMany.mock.calls[0][0].where).not.toHaveProperty('credentialStatus');
  });
});
