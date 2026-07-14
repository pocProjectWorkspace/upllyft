import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../src/prisma/prisma.module';
import { EmailModule } from '../src/email/email.module';
import { EmailService } from '../src/email/email.service';
import { NotificationModule } from '../src/notification/notification.module';
import { ChildClaimsModule } from '../src/child-claims/child-claims.module';
import { ClinicPatientsService } from '../src/clinic-patients/clinic-patients.service';
import { ClaimsService } from '../src/child-claims/claims.service';
import { grantConsent } from '../src/common/consent';
import { prisma, scope, mkFacility, cleanup, type Scope } from './helpers/fixtures';

/**
 * The clinic walk-in.
 *
 * It used to mint a `User` on the guardian's REAL email with no password ("walk-in
 * patients log in via magic link later" — a magic link that was never built). That
 * guardian could then neither register (`register()` throws "User already exists") nor
 * log in (`validateUser()` returns null without a password). The only door left was a
 * password reset for an account they had no idea existed, and nobody ever found it: an
 * audit found ZERO of 44 such guardians across both databases had ever obtained a
 * password.
 *
 * The fix must also NOT break the clinic's own UI: staff read parent contact from the
 * Guardian row now, because the shadow profile's address is synthetic. Showing clinic
 * staff `placeholder.9f3c…@ancc.internal` where the family's email should be would be a
 * regression dressed up as a fix.
 */
describe('Clinic walk-in — the shadow-account trap', () => {
  const s: Scope = scope('t-walkin');
  let mod: TestingModule;
  let svc: ClinicPatientsService;
  let claims: ClaimsService;
  const sent: { to: string; html: string; subject: string }[] = [];

  let facilityId: string;
  let adminId: string;
  let guardianEmail: string;
  let res: any;
  let shadowUserId: string;

  const tokenFrom = (html: string) => html.match(/\/claim\/([a-f0-9]{64})/)![1];

  beforeAll(async () => {
    mod = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        EmailModule,
        NotificationModule,
        ChildClaimsModule,
      ],
      providers: [ClinicPatientsService],
    })
      .overrideProvider(EmailService)
      .useValue({
        sendEmail: async (o: any) => {
          sent.push({ to: String(o.to), html: o.html, subject: o.subject });
          return { success: true };
        },
      })
      .compile();

    svc = mod.get(ClinicPatientsService);
    claims = mod.get(ClaimsService);

    const f = await mkFacility(s, 'Walkin Clinic', 'CLINIC', { withLegacyClinic: true });
    facilityId = f.facility.id;
    const clinic = await prisma.clinic.findUniqueOrThrow({ where: { id: facilityId } });
    adminId = clinic.adminId!;

    guardianEmail = s.email('walkin-parent');

    res = await svc.createWalkinPatient(
      {
        firstName: 'Zayn',
        dateOfBirth: '2021-04-05',
        gender: 'male',
        guardianName: 'Imran Q',
        guardianEmail,
        guardianPhone: '+971500000000',
        primaryConcern: 'Speech delay',
      } as any,
      adminId,
      facilityId,
    );

    const kid = await prisma.child.findUniqueOrThrow({
      where: { id: res.id },
      select: { profile: { select: { userId: true } } },
    });
    shadowUserId = kid.profile.userId;
  });

  afterAll(async () => {
    await cleanup(s);
    await prisma.user.deleteMany({ where: { id: shadowUserId } });
    await prisma.$disconnect();
    await mod.close();
  });

  it('creates the walk-in and sends a claim', () => {
    expect(res.id).toBeTruthy();
    expect(res.claimSent).toBe(true);
  });

  it("the guardian's REAL email is NOT in the User table", async () => {
    await expect(prisma.user.findUnique({ where: { email: guardianEmail } })).resolves.toBeNull();
  });

  it('the child hangs off a SYNTHETIC shadow profile', async () => {
    const kid = await prisma.child.findUniqueOrThrow({
      where: { id: res.id },
      select: {
        walkinCreatedByAdmin: true,
        clinicStatus: true,
        developmentalConcerns: true,
        profile: { select: { user: { select: { email: true } } } },
      },
    });

    expect(kid.profile.user.email).toMatch(/^placeholder\..*@ancc\.internal$/);
    // ...and the clinical intake data is preserved, not lost in the refactor.
    expect(kid.walkinCreatedByAdmin).toBe(true);
    expect(kid.clinicStatus).toBe('INTAKE');
    expect(kid.developmentalConcerns).toBe('Speech delay');
  });

  it("the guardian's real email lives on the Guardian row", async () => {
    const g = await prisma.guardian.findFirstOrThrow({ where: { childId: res.id } });
    expect(g.email).toBe(guardianEmail);
  });

  it('the guardian can now register with their own address — the trap is gone', async () => {
    const parent = await prisma.user.create({
      data: { email: guardianEmail, name: 'Imran Q', role: 'USER', password: 'hashed' },
    });
    expect(parent.id).toBeTruthy();
  });

  // NOTE ON ORDERING: these tests are a SEQUENCE — the claim (below) repoints the child
  // to the real parent and deletes the shadow, so anything asserting the pre-claim state
  // must run before it. They are deliberately flat rather than grouped in nested
  // `describe`s, because jest runs nested describes AFTER the top-level `it`s in a block,
  // which silently reorders them and made these fail against a state they never expected.

  it('the walk-in response returns the real email and flags them off-platform', () => {
    expect(res.parent.email).toBe(guardianEmail);
    expect(res.parent.onPlatform).toBe(false);
  });

  it('the patient LIST shows the real email, never placeholder.…@ancc.internal', async () => {
    const list: any = await svc.listPatients({ page: 1, limit: 50 } as any, facilityId);
    const row = list.data.find((p: any) => p.id === res.id);

    expect(row.parent.email).toBe(guardianEmail);
    // The shadow's address is `placeholder.<uuid>@ancc.internal`. THAT is what must never
    // reach clinic staff — not the domain itself, which the test fixtures also use.
    expect(row.parent.email).not.toMatch(/^placeholder\./);
    expect(row.parent.name).toBe('Imran Q');
    // Not yet claimed — this is who staff should be chasing.
    expect(row.parent.onPlatform).toBe(false);
  });

  it('the F2 consent gate still binds on DETAIL — list is not read', async () => {
    await expect(svc.getPatientDetail(res.id, facilityId)).rejects.toThrow(/consent/i);
  });

  it('the claim email says something TRUE for a clinic', () => {
    // A nursery has seen nothing and is asking permission. Telling a parent who just
    // walked INTO a clinic "we can't see anything about your child" would be a
    // transparent lie — and it is the version that gets forwarded to a regulator.
    const last = sent[sent.length - 1];
    expect(last.to).toBe(guardianEmail);
    expect(last.html).not.toMatch(/cannot see anything/i);
    expect(last.subject).toMatch(/records/i);
  });

  it('the guardian can claim it, and the shadow account is deleted', async () => {
    const parent = await prisma.user.findUniqueOrThrow({ where: { email: guardianEmail } });
    const token = tokenFrom(sent[sent.length - 1].html);

    const claimed = await claims.accept(token, parent.id);
    expect(claimed.childId).toBe(res.id);

    const after = await prisma.child.findUniqueOrThrow({
      where: { id: res.id },
      select: { profile: { select: { userId: true } } },
    });
    expect(after.profile.userId).toBe(parent.id);

    // The shadow existed only to satisfy the FK. It must never be loggable-into.
    await expect(prisma.user.count({ where: { id: shadowUserId } })).resolves.toBe(0);
  });

  it('after consent, DETAIL opens and is still honest about the parent', async () => {
    const parent = await prisma.user.findUniqueOrThrow({ where: { email: guardianEmail } });
    await grantConsent(prisma, {
      childId: res.id,
      facilityId,
      type: 'ASSESSMENT',
      purpose: 'Clinic intake',
      grantedByUserId: parent.id,
    });

    const detail: any = await svc.getPatientDetail(res.id, facilityId);
    expect(detail.id).toBe(res.id);
    expect(detail.parent.email).toBe(guardianEmail);
    // parentProfile must never leak the synthetic address either.
    expect(detail.parentProfile.email).toBe(guardianEmail);
    expect(detail.parentProfile.email).not.toMatch(/^placeholder\./);
  });
});
