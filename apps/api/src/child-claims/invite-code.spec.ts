import { INVITE_CODE_LENGTH, inviteCodeFor, inviteCodeHash, isInviteCode, normaliseInviteCode } from './claims.service';

describe('invite codes', () => {
  const token = 'a'.repeat(64);
  const secret = 'test-secret';

  it('is derived from the token: stable, 4-4-4 grouped, no look-alike characters', () => {
    const code = inviteCodeFor(token, secret);
    expect(code).toBe(inviteCodeFor(token, secret));
    expect(code).toMatch(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
    expect(normaliseInviteCode(code)).toHaveLength(INVITE_CODE_LENGTH);
    expect(isInviteCode(code)).toBe(true);
    expect(isInviteCode(token)).toBe(false);
  });

  it('changes when the token rotates, and depends on the server secret', () => {
    expect(inviteCodeFor(token, secret)).not.toBe(inviteCodeFor('b'.repeat(64), secret));
    expect(inviteCodeFor(token, secret)).not.toBe(inviteCodeFor(token, 'other-secret'));
  });

  it('matches however the parent types it, and the stored hash is keyed', () => {
    const code = inviteCodeFor(token, secret);
    const typed = ` ${code.toLowerCase().replace(/-/g, ' ')} `;
    expect(inviteCodeHash(typed, secret)).toBe(inviteCodeHash(code, secret));
    expect(inviteCodeHash(code, secret)).not.toBe(inviteCodeHash(code, 'other-secret'));
  });
});
