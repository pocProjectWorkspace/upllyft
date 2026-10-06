import { ForbiddenException } from '@nestjs/common';
import { MiraService } from '../src/mira/mira.service';
import { prisma, scope, mkUser, mkParentWithChild, cleanup, type Scope } from './helpers/fixtures';

/**
 * Mira reads a child's conditions, diagnoses and latest screening into the prompt it
 * sends to OpenAI. The child id arrives in the request body, so it must be checked
 * against the caller: their profile's child, or one they are a listed guardian of.
 * Before this, any signed-in user could get answers built on another family's child.
 */
describe('Mira — child access', () => {
  const s: Scope = scope('t-mira');
  // No OpenAI call is reached on any path tested here.
  const mira = new MiraService(prisma as any, { get: () => 'test' } as any, {} as any, {} as any);

  afterAll(async () => {
    await prisma.miraConversation.deleteMany({ where: { user: { email: { contains: s.tag } } } });
    await cleanup(s);
    await prisma.$disconnect();
  });

  it('lets a parent use their own child', async () => {
    const { user, child } = await mkParentWithChild(s, 'Own', '2021-03-01');
    await expect(mira.assertOwnChild(user.id, child.id)).resolves.toBeUndefined();
  });

  it('lets a listed guardian who does not own the profile use the child', async () => {
    const { child } = await mkParentWithChild(s, 'Shared', '2021-03-01');
    const coParent = await mkUser(s, 'co-parent');
    await prisma.guardian.create({
      data: {
        childId: child.id,
        userId: coParent.id,
        fullName: 'Co Parent',
        email: coParent.email,
        relationship: 'LEGAL_GUARDIAN',
      },
    });
    await expect(mira.assertOwnChild(coParent.id, child.id)).resolves.toBeUndefined();
  });

  it("refuses another family's child, and an unknown id, with the same error", async () => {
    const { child: theirs } = await mkParentWithChild(s, 'Theirs', '2020-06-01');
    const stranger = await mkUser(s, 'stranger');

    await expect(mira.assertOwnChild(stranger.id, theirs.id)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(mira.assertOwnChild(stranger.id, 'no-such-child')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('chat() rejects a foreign child before saving a conversation or calling the AI', async () => {
    const { child: theirs } = await mkParentWithChild(s, 'Target', '2020-06-01');
    const stranger = await mkUser(s, 'prober');

    await expect(mira.chat(stranger.id, 'How is this child doing?', undefined, theirs.id)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(await prisma.miraConversation.count({ where: { userId: stranger.id } })).toBe(0);
  });

  it('no child selected is still allowed', async () => {
    const parent = await mkUser(s, 'no-child');
    await expect(mira.assertOwnChild(parent.id, undefined)).resolves.toBeUndefined();
  });
});
