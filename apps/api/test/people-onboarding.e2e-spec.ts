import { BadRequestException, ForbiddenException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { NotificationEmailService } from '../src/notification/notification-email.service';
import { OnboardingScopeService } from '../src/people-onboarding/onboarding-scope';
import { ParentInvitationService, acceptPlatformInvitations } from '../src/people-onboarding/parent-invitation.service';
import { TherapistOnboardingService } from '../src/people-onboarding/therapist-onboarding.service';
import { prisma, scope, mkUser, cleanup, type Scope } from './helpers/fixtures';

/**
 * Therapist onboarding, family invitations and notification emails against the real
 * database. Email is a fake that records what would be sent — nothing leaves the test.
 * Addresses use the run tag (deleted by cleanup) on the reserved `.test` TLD.
 */
describe('People onboarding + notification email', () => {
  const s: Scope = scope('t-onb');
  const sent: Array<{ to: string; subject: string; html?: string }> = [];
  const email: any = {
    sendEmail: jest.fn(async (o: any) => {
      sent.push(o);
      return { success: true, messageId: 'fake', timestamp: new Date() };
    }),
    brandedHtml: (o: any) => `<h1>${o.heading}</h1>${o.bodyHtml}${o.cta ? `<a href="${o.cta.url}">${o.cta.label}</a>` : ''}`,
  };
  const config: any = { get: () => 'https://app.example.test' };
  const scopes = new OnboardingScopeService(prisma as any);
  const therapists = new TherapistOnboardingService(prisma as any, email, config);
  const invites = new ParentInvitationService(prisma as any, email, config);
  const notificationEmail = new NotificationEmailService(prisma as any, email, config);
  const addr = (n: string) => `${n}.${s.tag}@upllyft-e2e.test`;
  const flush = () => new Promise((r) => setTimeout(r, 300)); // invites are sent after the response

  let admin: any;
  let orgAdmin: any;
  let outsider: any;
  let org: any;

  beforeAll(async () => {
    admin = await mkUser(s, 'admin', 'ADMIN');
    orgAdmin = await mkUser(s, 'orgadmin', 'USER');
    outsider = await mkUser(s, 'outsider', 'USER');
    org = await prisma.organization.create({ data: { name: `${s.tag} Centre`, slug: `${s.tag}-centre` } });
    await prisma.organizationMember.create({ data: { userId: orgAdmin.id, organizationId: org.id, role: 'ADMIN', status: 'ACTIVE' } });
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({ where: { email: { contains: s.tag } }, select: { id: true } });
    const ids = users.map((u) => u.id);
    await prisma.platformInvitation.deleteMany({ where: { OR: [{ email: { contains: s.tag } }, { invitedById: { in: ids } }] } });
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    await prisma.therapistOrganizationLink.deleteMany({ where: { organizationId: org.id } });
    await prisma.organizationMember.deleteMany({ where: { organizationId: org.id } });
    await prisma.therapistProfile.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { email: { contains: s.tag }, NOT: { email: { endsWith: '@ancc.internal' } } } });
    await cleanup(s);
    await prisma.$disconnect();
  });

  const asAdmin = () => ({ id: admin.id, role: 'ADMIN', email: admin.email });
  const asOrgAdmin = () => ({ id: orgAdmin.id, role: 'USER', email: orgAdmin.email });

  it('scopes: platform needs an admin; an organisation needs its own admin', async () => {
    await expect(scopes.platform(asOrgAdmin())).rejects.toBeInstanceOf(ForbiddenException);
    await expect(scopes.organization({ id: outsider.id, role: 'USER' }, org.slug)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(scopes.organization(asOrgAdmin(), org.slug)).resolves.toMatchObject({ organizationId: org.id });
  });

  it('platform admin creates one therapist: account, pending profile, set-password email', async () => {
    const report = await therapists.createOne(
      asAdmin(),
      { name: 'Asha Rao', email: addr('asha').toUpperCase(), title: 'Speech-Language Pathologist', specializations: ['Language Delay'], country: 'UAE' },
      await scopes.platform(asAdmin()),
    );
    expect(report.outcome).toBe('created');
    await flush();
    const user = await prisma.user.findUnique({ where: { email: addr('asha') }, include: { therapistProfile: true } });
    expect(user).toMatchObject({ role: 'THERAPIST', country: 'AE' });
    expect(user!.resetPasswordToken).toBeTruthy();
    expect(user!.therapistProfile).toMatchObject({ department: 'speech', credentialStatus: 'PENDING', country: 'AE' });
    const mail = sent.find((m) => m.to === addr('asha'));
    expect(mail?.html).toContain(`/reset-password?token=${user!.resetPasswordToken}`);

    await expect(therapists.createOne(asAdmin(), { name: 'x', email: 'not-an-email' }, await scopes.platform(asAdmin()))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('org admin imports a sheet: preview first, then create / link / skip / error per row', async () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['Name', 'Email', 'Title', 'Specializations', 'Country'],
        ['Ravi Kumar', addr('ravi'), 'Occupational Therapist', 'Sensory Integration', 'India'],
        ['Asha Rao', addr('asha'), '', '', ''], // existing therapist → linked into the org
        ['Outsider', outsider.email, '', '', ''], // a parent account → error
        ['', 'broken', '', '', ''],
      ]),
      'Sheet1',
    );
    const file = { buffer: XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer };
    const orgScope = await scopes.organization(asOrgAdmin(), org.slug);

    const preview = await therapists.importFile(asOrgAdmin(), file, orgScope, true);
    expect(preview).toMatchObject({ dryRun: true, total: 4, created: 1, linked: 1, errors: 2 });
    expect(await prisma.user.count({ where: { email: addr('ravi') } })).toBe(0);

    const result = await therapists.importFile(asOrgAdmin(), file, orgScope, false);
    expect(result.rows.map((r) => r.outcome)).toEqual(['created', 'linked', 'error', 'error']);
    expect(result.rows[2].message).toContain('not a therapist');

    const ravi = await prisma.user.findUnique({
      where: { email: addr('ravi') },
      include: { organizationMemberships: true, therapistProfile: { include: { organizationLinks: true } } },
    });
    expect(ravi!.organizationMemberships[0]).toMatchObject({ organizationId: org.id, status: 'ACTIVE', memberType: 'Therapist' });
    expect(ravi!.therapistProfile!.organizationLinks[0]).toMatchObject({ organizationId: org.id, status: 'APPROVED' });
    const asha = await prisma.user.findUnique({ where: { email: addr('asha') }, include: { therapistProfile: { include: { organizationLinks: true } } } });
    expect(asha!.therapistProfile!.organizationLinks.map((l) => l.organizationId)).toContain(org.id);

    // Running the same file again changes nothing.
    const again = await therapists.importFile(asOrgAdmin(), file, orgScope, false);
    expect(again.rows.slice(0, 2).map((r) => r.outcome)).toEqual(['exists', 'exists']);
  });

  it('family invitations: invite, skip duplicates and accounts, resend guard, accept on registration', async () => {
    const orgScope = await scopes.organization(asOrgAdmin(), org.slug);
    const res = await invites.inviteList(
      asOrgAdmin(),
      { invites: [{ email: addr('priya'), name: 'Priya' }, { email: outsider.email }, { email: 'bad' }] },
      orgScope,
    );
    expect(res.rows.map((r) => r.outcome)).toEqual(['invited', 'registered', 'error']);
    await flush();
    const inv = await prisma.platformInvitation.findFirst({ where: { email: addr('priya') } });
    expect(inv).toMatchObject({ organizationId: org.id, status: 'PENDING' });
    expect(sent.find((m) => m.to === addr('priya'))?.html).toContain(`/register?invite=${inv!.token}`);

    const again = await invites.inviteList(asOrgAdmin(), { invites: [{ email: addr('priya') }] }, orgScope);
    expect(again.rows[0].outcome).toBe('already-invited');
    await expect(invites.resend(asOrgAdmin(), inv!.id, orgScope)).rejects.toBeInstanceOf(BadRequestException);

    // Another organisation's admin cannot see or touch it.
    const list = await invites.list(orgScope, {});
    expect(list.invitations.map((i) => i.email)).toContain(addr('priya'));
    await expect(invites.cancel(inv!.id, { organizationId: 'someone-else', organizationName: 'X' })).rejects.toThrow();

    expect(await invites.verify(inv!.token)).toMatchObject({ email: addr('priya'), organizationName: org.name, status: 'PENDING' });

    const parent = await prisma.user.create({ data: { email: addr('priya'), name: 'Priya', role: 'USER', password: 'x' } });
    await acceptPlatformInvitations(prisma as any, parent);
    expect(await prisma.platformInvitation.findUnique({ where: { id: inv!.id } })).toMatchObject({ status: 'ACCEPTED', acceptedUserId: parent.id });
  });

  it('notification emails: high priority now, the rest in the digest, each exactly once', async () => {
    const parent = await prisma.user.findUniqueOrThrow({ where: { email: addr('priya') } });
    const before = sent.length;

    const urgent = await prisma.notification.create({
      data: { userId: parent.id, type: 'RESOURCE_ASSIGNED', title: 'New activity to try', message: 'Feelings Cards', priority: 'high', actionUrl: '/resources?tab=mine' },
    });
    await notificationEmail.onCreated(urgent);
    expect(sent.length).toBe(before + 1);
    expect(sent[sent.length - 1].html).toContain('https://app.example.test/resources?tab=mine');
    expect((await prisma.notification.findUnique({ where: { id: urgent.id } }))!.emailedAt).toBeTruthy();

    const low = await prisma.notification.create({ data: { userId: parent.id, type: 'COMMENT', title: 'New reply', message: 'Someone replied', priority: 'low' } });
    await notificationEmail.onCreated(low);
    expect(sent.length).toBe(before + 1); // waits for the digest

    const run1 = await notificationEmail.sendDigests();
    expect(run1.emailed).toBeGreaterThanOrEqual(1);
    expect(sent.filter((m) => m.to === addr('priya') && /update/.test(m.subject))).toHaveLength(1);
    const run2 = await notificationEmail.sendDigests();
    expect(sent.filter((m) => m.to === addr('priya') && /update/.test(m.subject))).toHaveLength(1);
    expect(run2.notifications).toBe(0);

    // A user who chose "never" gets nothing.
    await prisma.userPreferences.upsert({ where: { userId: parent.id }, create: { userId: parent.id, notificationFrequency: 'never' }, update: { notificationFrequency: 'never' } });
    const n3 = await prisma.notification.create({ data: { userId: parent.id, type: 'RESOURCE_ASSIGNED', title: 'x', message: 'y', priority: 'high' } });
    const count = sent.length;
    await notificationEmail.onCreated(n3);
    expect(sent.length).toBe(count);
    await prisma.userPreferences.delete({ where: { userId: parent.id } });
  });
});
