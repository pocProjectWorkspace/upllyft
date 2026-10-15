import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AccountDeletionService, isDeletedAccountEmail } from './account-deletion.service';

/** Prisma double: counts default to 0, every write is recorded on `tx`. */
function setup(user: { role: string; email?: string } | null, counts: Partial<Record<'clinic' | 'facility' | 'cases', number>> = {}) {
  const tx = {
    user: { update: jest.fn() },
    userProfile: { updateMany: jest.fn() },
    child: { updateMany: jest.fn() },
    therapistProfile: { updateMany: jest.fn() },
    message: { updateMany: jest.fn() },
    miraMessage: { updateMany: jest.fn() },
    fcmToken: { deleteMany: jest.fn() },
    emailOutbox: { deleteMany: jest.fn() },
  };
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(user && { id: 'u1', email: 'parent@mail.com', ...user }),
    },
    clinic: { count: jest.fn().mockResolvedValue(counts.clinic ?? 0) },
    facilityMember: { count: jest.fn().mockResolvedValue(counts.facility ?? 0) },
    case: { count: jest.fn().mockResolvedValue(counts.cases ?? 0) },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const audit = { log: jest.fn() };
  return { service: new AccountDeletionService(prisma as any, audit as any), tx, audit };
}

describe('AccountDeletionService.deleteOwnAccount', () => {
  it('anonymises a parent so they can no longer sign in', async () => {
    const { service, tx, audit } = setup({ role: 'USER' });
    await expect(service.deleteOwnAccount('u1')).resolves.toMatchObject({ success: true });

    const data = tx.user.update.mock.calls[0][0].data;
    expect(data).toMatchObject({ name: '[deleted]', password: null, googleId: null, phone: null });
    expect(isDeletedAccountEmail(data.email)).toBe(true);
    expect(tx.child.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { profile: { userId: 'u1' } } }));
    expect(tx.miraMessage.updateMany).toHaveBeenCalled();
    expect(tx.fcmToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(tx.emailOutbox.deleteMany).toHaveBeenCalledWith({ where: { toEmail: 'parent@mail.com', sentAt: null } });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'DELETE', resourceId: 'u1' }));
  });

  it('takes a therapist off Find care', async () => {
    const { service, tx } = setup({ role: 'THERAPIST' });
    await service.deleteOwnAccount('u1');
    expect(tx.therapistProfile.updateMany.mock.calls[0][0].data).toMatchObject({ isActive: false, acceptingBookings: false });
  });

  it.each([
    ['an admin', { role: 'ADMIN' }, {}],
    ['an organisation account', { role: 'ORGANIZATION' }, {}],
    ['a clinic owner', { role: 'THERAPIST' }, { clinic: 1 }],
    ['a nursery owner', { role: 'USER' }, { facility: 1 }],
    ['a primary therapist with open cases', { role: 'THERAPIST' }, { cases: 2 }],
  ])('refuses %s and changes nothing', async (_label, user, counts) => {
    const { service, tx } = setup(user, counts);
    await expect(service.deleteOwnAccount('u1')).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('treats an already-deleted account as not found', async () => {
    const { service } = setup({ role: 'USER', email: 'deleted-u1@deleted.upllyft.com' });
    await expect(service.deleteOwnAccount('u1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
