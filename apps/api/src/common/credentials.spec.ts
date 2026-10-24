import { ForbiddenException } from '@nestjs/common';
import { CredentialStatus } from '@prisma/client';
import { assertTherapistAssignable, therapistAssignability } from './credentials';

const DAY = 24 * 60 * 60 * 1000;

describe('therapistAssignability', () => {
  it('allows a verified, unexpired licence', () => {
    expect(
      therapistAssignability({ credentialStatus: CredentialStatus.VERIFIED, licenceExpiry: new Date(Date.now() + DAY) }),
    ).toEqual({ assignable: true, reason: null });
  });

  it('refuses a licence that is not verified yet, with the reason', () => {
    const result = therapistAssignability({ credentialStatus: CredentialStatus.PENDING, licenceExpiry: null });
    expect(result.assignable).toBe(false);
    expect(result.reason).toMatch(/not verified/);
  });

  it('refuses an expired licence, with the reason', () => {
    const result = therapistAssignability({
      credentialStatus: CredentialStatus.VERIFIED,
      licenceExpiry: new Date(Date.now() - DAY),
    });
    expect(result.assignable).toBe(false);
    expect(result.reason).toMatch(/expired/);
  });

  it('gives the same reason the gate throws, so the picker and the API agree', () => {
    const profile = { credentialStatus: CredentialStatus.PENDING, licenceExpiry: null };
    expect(() => assertTherapistAssignable(profile)).toThrow(
      new ForbiddenException(therapistAssignability(profile).reason!),
    );
  });
});
