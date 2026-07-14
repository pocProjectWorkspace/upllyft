import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../src/prisma/prisma.module';
import { EmailModule } from '../src/email/email.module';
import { EmailService } from '../src/email/email.service';
import { NurseryService } from '../src/nursery/nursery.service';
import { ClaimsService } from '../src/child-claims/claims.service';
import { grantConsent, resolveChildAccess } from '../src/common/consent';
import { childInFacility, childOnRoster } from '../src/common/child-scope';
import { prisma, scope, mkFacility, mkStaff, mkUser, cleanup, type Scope } from './helpers/fixtures';

/**
 * The nursery roster and the guardian claim.
 *
 * Two things are load-bearing and everything else is detail:
 *
 *   1. ADDING A CHILD TO A ROSTER GRANTS THE NURSERY NOTHING. No consent row is created
 *      by staff, ever. The affiliation lands at PENDING_CONSENT; the guardian's own act
 *      of consent is what opens the record.
 *
 *   2. THE GUARDIAN'S REAL EMAIL NEVER TOUCHES A `User` ROW. It lives on the Guardian
 *      record and the claim. The walk-in flow used to put it on a passwordless User,
 *      which left the guardian unable to register ("user already exists") AND unable to
 *      log in (no password) — an audit found ZERO of 44 such guardians in either database
 *      had ever obtained a password.
 */
describe('Nursery roster + parent claim', () => {
  const s: Scope = scope('t-claim');
  let mod: TestingModule;
  let nursery: NurseryService;
  let claims: ClaimsService;
  const sent: { to: string; html: string }[] = [];

  let facilityId: string;
  let roomId: string;
  let owner: any;
  let keyworker: any;
  let kwMemberId: string;

  const tokenFrom = (html: string) => html.match(/\/claim\/([a-f0-9]{64})/)![1];
  const lastToken = () => tokenFrom(sent[sent.length - 1].html);

  beforeAll(async () => {
    mod = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, EmailModule],
      providers: [NurseryService, ClaimsService],
    })
      // The claim token is only ever emailed, and only its SHA-256 is stored. Capturing
      // the outgoing mail is the only honest way to get it — the alternative would be
      // leaking the token into an API response purely to make it testable.
      .overrideProvider(EmailService)
      .useValue({
        sendEmail: async (o: any) => {
          sent.push({ to: String(o.to), html: o.html });
          return { success: true };
        },
      })
      .compile();

    nursery = mod.get(NurseryService);
    claims = mod.get(ClaimsService);

    const f = await mkFacility(s, 'Sunrise', 'NURSERY');
    facilityId = f.facility.id;
    roomId = (await prisma.room.create({ data: { facilityId, name: 'Butterflies' } })).id;

    owner = await mkStaff(s, facilityId, 'owner', 'OWNER');
    keyworker = await mkStaff(s, facilityId, 'kw', 'KEYWORKER');
    kwMemberId = keyworker.member.id;
  });

  afterAll(async () => {
    await cleanup(s);
    await prisma.$disconnect();
    await mod.close();
  });

  const add = (firstName: string, guardianEmail: string, extra: any = {}) =>
    nursery.addChild(owner.actor, facilityId, {
      firstName,
      dateOfBirth: '2023-03-12',
      gender: 'female',
      guardianName: `Guardian of ${firstName}`,
      guardianEmail,
      ...extra,
    } as any);

  it('a KEYWORKER may not enrol — they observe, they do not enrol', async () => {
    await expect(add('Nope', s.email('nope'))).resolves.toBeTruthy();
    await expect(
      nursery.addChild(keyworker.actor, facilityId, {
        firstName: 'Nope2',
        dateOfBirth: '2023-03-12',
        gender: 'female',
        guardianName: 'X',
        guardianEmail: s.email('nope2'),
      } as any),
    ).rejects.toThrow(/requires one of/i);
  });

  describe('adding a child grants the nursery nothing', () => {
    it('lands at PENDING_CONSENT with no consent row, and the gate refuses', async () => {
      const email = s.email('aisha-parent');
      const a = await add('Aisha', email, { roomId, keyworkerId: kwMemberId });

      const aff = await prisma.childAffiliation.findUniqueOrThrow({ where: { id: a.affiliationId } });
      expect(aff.status).toBe('PENDING_CONSENT');
      expect(aff.roomId).toBe(roomId);
      expect(aff.keyworkerId).toBe(kwMemberId);

      // NOTHING was consented on the guardian's behalf.
      await expect(prisma.childConsent.count({ where: { childId: a.childId } })).resolves.toBe(0);

      const gate = await resolveChildAccess(prisma, {
        childId: a.childId,
        facilityId,
        capability: 'canObserve',
        requiredScope: 'OBSERVATIONS_ONLY',
        consentType: 'DATA_PROCESSING',
      });
      expect(gate.allowed).toBe(false);
      // ...and it says WHY honestly, rather than claiming a child on its own roster is
      // "not affiliated" — which is what a keyworker would read.
      expect(gate.reason).toMatch(/guardian has not yet granted/i);

      // On the roster (so consent can be chased), not in the record.
      await expect(prisma.child.count({ where: { id: a.childId, ...childOnRoster(facilityId) } })).resolves.toBe(1);
      await expect(prisma.child.count({ where: { id: a.childId, ...childInFacility(facilityId) } })).resolves.toBe(0);
    });
  });

  describe('the shadow-account trap is designed out', () => {
    it("never puts the guardian's real email on a User, and leaves it free to register", async () => {
      const email = s.email('free-parent');
      const a = await add('Freya', email);

      // The trap: this address must NOT be taken.
      await expect(prisma.user.findUnique({ where: { email } })).resolves.toBeNull();

      const placeholder = await prisma.child.findUniqueOrThrow({
        where: { id: a.childId },
        select: { profile: { select: { user: { select: { email: true } } } } },
      });
      expect(placeholder.profile.user.email).toMatch(/^placeholder\..*@ancc\.internal$/);

      const guardian = await prisma.guardian.findFirstOrThrow({ where: { childId: a.childId } });
      expect(guardian.email).toBe(email);
      expect(guardian.hasAuthorityToConsent).toBe(true);
      expect(guardian.userId).toBeNull();

      // The guardian can now create the account they knowingly asked for.
      const registered = await prisma.user.create({
        data: { email, name: 'Freya Parent', role: 'USER', password: 'hashed' },
      });
      expect(registered.id).toBeTruthy();
    });
  });

  describe('claiming', () => {
    it('preview is minimised for an unauthenticated bearer', async () => {
      await add('Layla', s.email('layla-parent'));
      const preview: any = await claims.preview(lastToken());

      expect(preview.childFirstName).toBe('Layla');
      expect(preview.facilityName).toBe('Sunrise');
      // A link-holder is PROBABLY the guardian, but all we know is they hold a link.
      expect(preview).not.toHaveProperty('dateOfBirth');
    });

    it('ADOPT: the placeholder becomes the parent’s child, and the shadow is deleted', async () => {
      const email = s.email('adopt-parent');
      const a = await add('Amir', email);
      const token = lastToken();

      const shadow = await prisma.child.findUniqueOrThrow({
        where: { id: a.childId },
        select: { profile: { select: { userId: true } } },
      });
      const shadowUserId = shadow.profile.userId;

      const parent = await prisma.user.create({
        data: { email, name: 'Amir Parent', role: 'USER', password: 'hashed' },
      });

      const accepted = await claims.accept(token, parent.id);
      expect(accepted.merged).toBe(false);
      expect(accepted.childId).toBe(a.childId);
      // Claiming is NOT consenting.
      expect(accepted.consentRequired).toBe(true);

      const after = await prisma.child.findUniqueOrThrow({
        where: { id: a.childId },
        select: { profile: { select: { userId: true } } },
      });
      expect(after.profile.userId).toBe(parent.id);

      // The shadow existed only to satisfy Child.profileId. It must be gone.
      await expect(prisma.user.count({ where: { id: shadowUserId } })).resolves.toBe(0);

      const aff = await prisma.childAffiliation.findUniqueOrThrow({ where: { id: a.affiliationId } });
      expect(aff.status).toBe('PENDING_CONSENT');
    });

    it('MERGE: one child record survives — the locked principle', async () => {
      const email = s.email('merge-parent');
      const parent = await mkUser(s, 'merge-parent-user');
      const profile = await prisma.userProfile.create({
        data: { userId: parent.id, fullName: 'Rahul', email: parent.email },
      });
      const realChild = await prisma.child.create({
        data: { profileId: profile.id, firstName: 'Vihaan', dateOfBirth: new Date('2022-06-01'), gender: 'male' },
      });

      const b = await add('Vihaan', email, { dateOfBirth: '2022-06-01', gender: 'male' });
      const token = lastToken();
      expect(b.childId).not.toBe(realChild.id); // a placeholder second Vihaan, for now

      const cand = await claims.candidates(token, parent.id);
      expect(cand.yourChildren.map((c: any) => c.id)).toContain(realChild.id);

      const merged = await claims.accept(token, parent.id, realChild.id);
      expect(merged.merged).toBe(true);
      expect(merged.childId).toBe(realChild.id);

      // The placeholder is deleted; exactly ONE Vihaan remains.
      await expect(prisma.child.findUnique({ where: { id: b.childId } })).resolves.toBeNull();
      await expect(
        prisma.child.count({ where: { firstName: 'Vihaan', profile: { userId: parent.id } } }),
      ).resolves.toBe(1);

      const aff = await prisma.childAffiliation.findUniqueOrThrow({ where: { id: b.affiliationId } });
      expect(aff.childId).toBe(realChild.id);

      // The guardian's contact details survive the merge. They were on the placeholder's
      // Guardian row, which cascade-deletes with it — losing them would leave the nursery
      // unable to contact the guardian of a child on its own roster.
      const g = await prisma.guardian.findFirst({ where: { childId: realChild.id, userId: parent.id } });
      expect(g?.email).toBe(email);
      expect(g?.hasAuthorityToConsent).toBe(true);
    });

    it('a used token cannot be replayed, and a garbage token 404s', async () => {
      const email = s.email('replay-parent');
      await add('Replay', email);
      const token = lastToken();
      const parent = await prisma.user.create({
        data: { email, name: 'R', role: 'USER', password: 'x' },
      });

      await claims.accept(token, parent.id);
      await expect(claims.accept(token, parent.id)).rejects.toThrow(/already been claimed/i);
      await expect(claims.preview('deadbeef'.repeat(8))).rejects.toThrow(/not valid/i);
    });

    it('only token HASHES are stored — a leaked database yields no working links', async () => {
      await add('Hashed', s.email('hash-parent'));
      const token = lastToken();
      const stored = await prisma.childClaim.findMany({
        where: { facilityId },
        select: { tokenHash: true },
      });
      expect(stored.every(c => c.tokenHash !== token)).toBe(true);
    });

    it('DISPUTE needs no account, and ends the affiliation immediately', async () => {
      const c = await add('Wrong', s.email('stranger'));
      const token = lastToken();

      // Requiring someone to sign up in order to say "that is not my child" guarantees
      // they never say it — and we would keep the affiliation.
      const disputed = await claims.dispute(token, 'Not my child');
      expect(disputed.disputed).toBe(true);

      const aff = await prisma.childAffiliation.findUniqueOrThrow({ where: { id: c.affiliationId } });
      expect(aff.status).toBe('ENDED');
      expect(aff.endedAt).not.toBeNull();

      await expect(
        prisma.child.count({ where: { id: c.childId, ...childOnRoster(facilityId) } }),
      ).resolves.toBe(0);
    });
  });

  describe('consent is what opens the gate', () => {
    it('the guardian granting consent activates the affiliation', async () => {
      const email = s.email('consent-parent');
      const a = await add('Consented', email);
      const token = lastToken();
      const parent = await prisma.user.create({
        data: { email, name: 'C', role: 'USER', password: 'x' },
      });
      await claims.accept(token, parent.id);

      await grantConsent(prisma, {
        childId: a.childId,
        facilityId,
        type: 'DATA_PROCESSING',
        purpose: 'Nursery observations',
        grantedByUserId: parent.id,
      });

      const aff = await prisma.childAffiliation.findUniqueOrThrow({ where: { id: a.affiliationId } });
      expect(aff.status).toBe('ACTIVE');

      const gate = await resolveChildAccess(prisma, {
        childId: a.childId,
        facilityId,
        capability: 'canObserve',
        requiredScope: 'OBSERVATIONS_ONLY',
        consentType: 'DATA_PROCESSING',
      });
      expect(gate.allowed).toBe(true);

      // ...but a nursery STILL cannot diagnose, consent or no consent. Consent can never
      // grant a capability the facility type does not have.
      const diagnose = await resolveChildAccess(prisma, {
        childId: a.childId,
        facilityId,
        capability: 'canDiagnose',
        requiredScope: 'FULL_CLINICAL',
        consentType: 'DATA_PROCESSING',
      });
      expect(diagnose.allowed).toBe(false);
      expect(diagnose.reason).toMatch(/cannot perform this action/i);
    });
  });
});
