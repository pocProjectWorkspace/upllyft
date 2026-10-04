import { UsersService } from '../src/users/users.service';
import { prisma, scope, mkUser, cleanup, type Scope } from './helpers/fixtures';

/**
 * Login, Google sign-in and forgot-password all find the account by email.
 * Registration stores it lower-cased; people type it however their keyboard does
 * (phones capitalise the first letter), which used to surface as "Invalid credentials".
 */
describe('Email lookup is case- and whitespace-insensitive', () => {
  const s: Scope = scope('t-email');
  const users = new UsersService(prisma as any);

  afterAll(async () => {
    await cleanup(s);
    await prisma.$disconnect();
  });

  it('finds a lower-cased account from a capitalised, space-padded email', async () => {
    const user = await mkUser(s, 'pooja');
    const typed = `  ${user.email.charAt(0).toUpperCase()}${user.email.slice(1).toUpperCase()} `;

    const found = await users.findByEmail(typed);

    expect(found?.id).toBe(user.id);
  });

  it('still returns null for an email with no account', async () => {
    expect(await users.findByEmail(s.email('nobody'))).toBeNull();
  });
});
